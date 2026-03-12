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
import requests
from rest_framework.views import APIView
from rest_framework import serializers
from django.conf import settings

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

    @action(detail=False, methods=["get"], url_path="pendentes",
           permission_classes=[permissions.IsAuthenticated])
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


# ---------------------------------------------------------------------------#
#  Isidoro — Análise Inteligente via Google CSE + RAG (LLM)                  #
# ---------------------------------------------------------------------------#

_RAG_SYSTEM_PROMPT = """Você é o Isidoro, assistente agrícola especialista em agronomia e manejo.
Sua tarefa é analisar produtos fitossanitários, defensivos agrícolas ou insumos e ajudar o
usuário a tomar a melhor decisão de custo-eficiência, sempre respeitando a recomendação
técnica do agrônomo responsável.

Ao analisar produtos você deve:
1. Identificar diferenças técnicas relevantes (princípio ativo, concentração, modo de ação,
   classe toxicológica, intervalo de segurança, compatibilidade de calda, custo/ha).
2. Apontar vantagens e desvantagens de cada opção.
3. Propor uma recomendação intermediária custo-eficiente quando houver substitutos.
4. Sempre alertar que a decisão final deve ser validada pelo AGRÔNOMO RESPONSÁVEL,
   pois pode envolver registro do produto, restrições de uso e receituário agronômico.
5. Incluir citações numeradas no formato [N] para cada informação baseada em fonte.
6. Responda em Português do Brasil, de forma técnica mas acessível.

Formato da resposta (JSON válido):
{
  "resumo": "análise executiva em 2-3 frases",
  "comparativo": [
    {
      "produto": "nome do produto",
      "pontos_fortes": ["..."],
      "pontos_fracos": ["..."],
      "custo_relativo": "alto|médio|baixo",
      "adequacao": "recomendado|substituto aceitável|não recomendado"
    }
  ],
  "recomendacao": "texto com a recomendação custo-eficiente, citando fontes com [N]",
  "avisos": ["lista de ressalvas importantes"],
  "advisory": "⚠️ Esta análise é informativa. Consulte o agrônomo responsável antes de substituir ou alterar qualquer produto recomendado tecnicamente."
}"""

_RAG_USER_TEMPLATE = """Consulta do usuário: {query}

Contexto adicional:
- Cultura/safra: {cultura}
- Produtos em análise: {produtos}

Fontes de referência encontradas na web (use para embasar a análise com citações [N]):
{snippets}

Responda com o JSON solicitado."""


class _ProductAnalysisSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=1024, help_text="Pergunta ou contexto da busca")
    produtos = serializers.ListField(
        child=serializers.CharField(max_length=200),
        required=False, default=list,
        help_text="Lista de produtos a comparar (nomes/marcas/princípios ativos)",
    )
    cultura = serializers.CharField(max_length=200, required=False, default="")
    max_results = serializers.IntegerField(default=5, min_value=1, max_value=10)


def _run_google_cse(query: str, max_results: int):
    """Chama Google Custom Search JSON API. Retorna lista de {title, link, snippet}."""
    api_key = getattr(settings, 'GOOGLE_CSE_API_KEY', '')
    cse_cx = getattr(settings, 'GOOGLE_CSE_CX', '')
    if not api_key or not cse_cx:
        raise RuntimeError(
            'Google CSE não configurado. Defina GOOGLE_CSE_API_KEY e GOOGLE_CSE_CX no .env'
        )
    resp = requests.get(
        'https://www.googleapis.com/customsearch/v1',
        params={'key': api_key, 'cx': cse_cx, 'q': query, 'num': max_results},
        timeout=10,
    )
    resp.raise_for_status()
    return [
        {'title': it.get('title', ''), 'link': it.get('link', ''), 'snippet': it.get('snippet', '')}
        for it in resp.json().get('items', [])
    ]


def _call_llm_rag(query: str, produtos: list, cultura: str, cse_items: list) -> dict:
    """Monta o prompt RAG e chama o LLM (Gemini/OpenAI-compat). Retorna dict."""
    snippets_text = "\n".join(
        f"[{i+1}] {it['title']}\n    URL: {it['link']}\n    {it['snippet']}"
        for i, it in enumerate(cse_items)
    )
    user_msg = _RAG_USER_TEMPLATE.format(
        query=query,
        cultura=cultura or "não informada",
        produtos=", ".join(produtos) if produtos else "não especificados",
        snippets=snippets_text or "Nenhuma fonte encontrada — baseie-se no seu conhecimento agrícola.",
    )

    api_key = getattr(settings, 'ISIDORO_API_KEY', '')
    base_url = getattr(settings, 'ISIDORO_LLM_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai/')
    model = getattr(settings, 'ISIDORO_LLM_MODEL', 'gemini-2.5-flash')

    import json as _json
    resp = requests.post(
        base_url.rstrip('/') + '/chat/completions',
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
        json={
            'model': model,
            'temperature': 0.2,
            'messages': [
                {'role': 'system', 'content': _RAG_SYSTEM_PROMPT},
                {'role': 'user', 'content': user_msg},
            ],
            'response_format': {'type': 'json_object'},
        },
        timeout=45,
    )
    resp.raise_for_status()
    content = resp.json()['choices'][0]['message']['content']
    try:
        return _json.loads(content)
    except Exception:
        # Fallback: wrap raw string
        return {'resumo': content, 'comparativo': [], 'recomendacao': content,
                'avisos': [], 'advisory': _RAG_SYSTEM_PROMPT.split('\n')[-1]}


class GoogleSearchAPIView(APIView):
    """
    POST /api/actions/isidoro-search/

    Executa busca no Google CSE e alimenta o LLM (Isidoro/Gemini) para produzir
    análise agronômica custo-eficiente com citações e aviso de agrônomo.

    Body:
      {
        "query": "texto livre da dúvida ou produto",
        "produtos": ["Roundup", "Glifosato 480", "Glifazin"],   // opcional
        "cultura": "soja",                                       // opcional
        "max_results": 5
      }

    Response:
      {
        "resumo": "...",
        "comparativo": [...],
        "recomendacao": "...",
        "avisos": [...],
        "advisory": "⚠️ Consulte o agrônomo...",
        "citations": [{"id":1, "title":"...", "url":"...", "snippet":"..."}],
        "search_query": "..."
      }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = _ProductAnalysisSerializer(data=request.data or {})
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        query = d['query']
        produtos = d['produtos']
        cultura = d['cultura']
        max_results = d['max_results']

        # Enriquece a query com nomes dos produtos se fornecidos
        search_query = query
        if produtos:
            search_query = f"{query} {' '.join(produtos[:3])} agronomia"

        try:
            cse_items = _run_google_cse(search_query, max_results)
        except RuntimeError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as exc:
            logger.exception('Google CSE error: %s', exc)
            return Response({'detail': f'Erro na busca: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)

        try:
            analysis = _call_llm_rag(query, produtos, cultura, cse_items)
        except Exception as exc:
            logger.exception('LLM RAG error: %s', exc)
            return Response({'detail': f'Erro na análise LLM: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)

        citations = [
            {'id': i + 1, 'title': it['title'], 'url': it['link'], 'snippet': it['snippet']}
            for i, it in enumerate(cse_items)
        ]

        logger.info(
            'isidoro-search: user=%s query=%r produtos=%r citations=%d',
            request.user, query, produtos, len(citations),
        )

        return Response({**analysis, 'citations': citations, 'search_query': search_query})
