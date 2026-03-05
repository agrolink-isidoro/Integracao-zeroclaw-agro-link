"""
Views para o Action Queue — fila de aprovação de ações do ZeroClaw/Isidoro.

Fluxo:
  1. Isidoro (via API) cria Action com status=pending_approval
  2. Humano lista, aprova ou rejeita
  3. Worker executa ação aprovada e atualiza status
  4. Uploads disparam parse async → geram N Actions em draft
"""
import logging
from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.mixins import TenantQuerySetMixin
from apps.core.permissions import RBACViewPermission

from .models import Action, UploadedFile, ActionStatus
from .serializers import (
    ActionSerializer,
    ActionCreateSerializer,
    ActionApproveSerializer,
    ActionRejectSerializer,
    BulkApproveSerializer,
    UploadedFileSerializer,
)

logger = logging.getLogger(__name__)


class ActionViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """
    CRUD + transições de estado para Actions (fila de aprovação).

    Permissões:
    - Isidoro (API key / JWT) pode criar (POST) em qualquer módulo.
    - Usuário humano pode listar, detalhar, aprovar, rejeitar — restrito a seus módulos via RBAC.
    - Apenas pending_approval pode ser aprovada/rejeitada.
    - Apenas pending_approval pode ser editada (PATCH).
    """

    rbac_module = "actions"
    queryset = Action.objects.select_related(
        "criado_por", "aprovado_por", "upload"
    ).order_by("-criado_em")
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "module", "action_type", "criado_por"]
    search_fields = ["draft_data", "meta"]
    ordering_fields = ["criado_em", "atualizado_em", "status", "module"]
    ordering = ["-criado_em"]

    def get_serializer_class(self):
        if self.action == "create":
            return ActionCreateSerializer
        if self.action == "approve":
            return ActionApproveSerializer
        if self.action == "reject":
            return ActionRejectSerializer
        if self.action == "bulk_approve":
            return BulkApproveSerializer
        return ActionSerializer

    def perform_create(self, serializer):
        serializer.save(
            criado_por=self.request.user,
            **self._get_tenant_kwargs(),
        )

    def update(self, request, *args, **kwargs):
        """Apenas editar se ainda estiver pending_approval."""
        instance = self.get_object()
        if instance.status != ActionStatus.PENDING_APPROVAL:
            return Response(
                {"detail": "Somente ações com status pending_approval podem ser editadas."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)

    # ------------------------------------------------------------------ #
    #  Transitions                                                         #
    # ------------------------------------------------------------------ #

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """Aprova e executa uma action pendente. Status: pending_approval → approved → executed."""
        obj = self.get_object()
        try:
            obj.approve(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        logger.info("Action %s aprovada por %s", obj.id, request.user)

        # Executa imediatamente após aprovação
        try:
            from .executors import execute_action
            execute_action(obj)
        except Exception as exc:  # execute_action já chama mark_failed internamente
            logger.error("execute_action falhou silenciosamente: action=%s erro=%s", obj.id, exc)

        # Re-fetch para garantir status atualizado (executed ou failed)
        obj.refresh_from_db()
        return Response(ActionSerializer(obj, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        """Rejeita uma action pendente. Status: pending_approval → rejected."""
        obj = self.get_object()
        serializer = ActionRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        motivo = serializer.validated_data.get("motivo", "")
        try:
            obj.reject(request.user, motivo)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        logger.info("Action %s rejeitada por %s", obj.id, request.user)
        return Response(ActionSerializer(obj, context={"request": request}).data)

    @action(detail=False, methods=["post"], url_path="bulk-approve")
    def bulk_approve(self, request):
        """
        Aprova múltiplas actions de uma vez.

        Body: { "action_ids": ["uuid1", "uuid2", ...] }
        Resposta: { "aprovadas": N, "erros": [...] }
        """
        serializer = BulkApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["action_ids"]

        tenant = getattr(request, "tenant", None)
        qs = Action.objects.filter(
            id__in=ids,
            status=ActionStatus.PENDING_APPROVAL,
        )
        if tenant:
            qs = qs.filter(tenant=tenant)

        aprovadas = 0
        erros = []
        approved_objects = []

        with transaction.atomic():
            for obj in qs.select_for_update():
                try:
                    obj.approve(request.user)
                    approved_objects.append(obj)
                    aprovadas += 1
                except Exception as exc:
                    erros.append({"id": str(obj.id), "erro": str(exc)})

        # Executa ações após o commit do atomic (fora do lock)
        from .executors import execute_action
        for obj in approved_objects:
            try:
                execute_action(obj)
            except Exception as exc:
                logger.error("bulk_approve execute falhou: action=%s erro=%s", obj.id, exc)

        logger.info(
            "Bulk approve: %d aprovadas, %d erros — por %s",
            aprovadas, len(erros), request.user,
        )
        return Response({"aprovadas": aprovadas, "erros": erros})

    @action(detail=False, methods=["get"], url_path="pendentes")
    def pendentes(self, request):
        """Atalho: lista apenas actions com status=pending_approval."""
        qs = self.get_queryset().filter(status=ActionStatus.PENDING_APPROVAL)
        serializer = ActionSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)


# ---------------------------------------------------------------------------#
#  Upload                                                                     #
# ---------------------------------------------------------------------------#

class UploadedFileViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """
    Upload de arquivos para parse → geração de Actions em draft.

    POST /api/actions/uploads/{module}/
    GET  /api/actions/uploads/{id}/status/   ← polling do parse
    """

    rbac_module = "actions"
    queryset = UploadedFile.objects.select_related("criado_por").order_by("-criado_em")
    serializer_class = UploadedFileSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["module", "status"]
    ordering_fields = ["criado_em", "status"]
    ordering = ["-criado_em"]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def perform_create(self, serializer):
        instance = serializer.save(
            criado_por=self.request.user,
            **self._get_tenant_kwargs(),
        )
        # Dispara parse assíncrono (Celery task)
        self._dispatch_parse_task(instance)

    def _dispatch_parse_task(self, upload_instance: UploadedFile) -> None:
        """Tenta enfileirar task Celery; se Celery não estiver disponível, loga."""
        try:
            from .tasks import parse_upload_task
            parse_upload_task.delay(str(upload_instance.id))
        except Exception as exc:
            logger.warning(
                "Não foi possível despachar parse_upload_task para %s: %s",
                upload_instance.id, exc,
            )

    @action(detail=True, methods=["get"], url_path="status")
    def file_status(self, request, pk=None):
        """Retorna status do parse + drafts gerados (se houver)."""
        obj = self.get_object()
        data = UploadedFileSerializer(obj, context={"request": request}).data
        # Inclui actions geradas a partir deste upload
        actions = Action.objects.filter(upload=obj).values(
            "id", "action_type", "status", "criado_em"
        )
        data["actions_geradas"] = list(actions)
        return Response(data)
