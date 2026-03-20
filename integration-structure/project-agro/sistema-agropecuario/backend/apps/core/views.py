from apps.core.mixins import TenantQuerySetMixin
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from django.views.decorators.http import require_GET
from django.http import JsonResponse

from .models import (
    ModulePermission, PermissionGroup, GroupPermission,
    UserGroupAssignment, DelegatedPermission, PermissionAuditLog, Tenant,
)
from .serializers import (
    UserSerializer, UserListSerializer, ModulePermissionSerializer,
    PermissionGroupSerializer, PermissionGroupListSerializer,
    GroupPermissionSerializer, UserGroupAssignmentSerializer,
    DelegatedPermissionSerializer, PermissionAuditLogSerializer,
    EffectivePermissionsSerializer, TenantSerializer, TenantOwnerCreateSerializer,
)
from .permissions import IsRBACAdmin, IsOwnerOrAdmin


User = get_user_model()


# ============================================================
# Utility: Registrar ação no log de auditoria
# ============================================================

def _log_audit(request, action, target_user=None, module='', changes=None):
    """Helper para criar entrada no log de auditoria."""
    ip = None
    if request:
        ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
    PermissionAuditLog.objects.create(
        user=request.user if request and request.user.is_authenticated else None,
        action=action,
        target_user=target_user,
        module=module,
        changes=changes or {},
        ip_address=ip,
    )


# ============================================================
# User Management
# ============================================================

class UserViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")
    serializer_class = UserSerializer
    rbac_module = 'user_management'
    permission_classes = [permissions.IsAuthenticated, IsRBACAdmin]
    pagination_class = None

    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        return UserSerializer

    @action(detail=True, methods=['get'])
    def permissions(self, request, pk=None):
        """Retorna as permissões individuais do usuário"""
        user = self.get_object()
        perms = ModulePermission.objects.filter(user=user)
        serializer = ModulePermissionSerializer(perms, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='effective-permissions')
    def effective_permissions(self, request, pk=None):
        """Retorna as permissões efetivas do usuário (individual + grupo + delegação)."""
        user = self.get_object()
        assignments = UserGroupAssignment.objects.filter(user=user).select_related('group')
        data = {
            'user_id': user.id,
            'username': user.username,
            'is_superuser': user.is_superuser,
            'groups': [{'id': a.group.id, 'nome': a.group.nome} for a in assignments],
            'permissions': user.get_effective_permissions(),
        }
        return Response(data)

    def perform_create(self, serializer):
        tenant = self._get_request_tenant()
        kwargs = {}
        if tenant is not None:
            kwargs['tenant'] = tenant
        user = serializer.save(**kwargs)
        _log_audit(self.request, 'create_user', target_user=user)

    def perform_update(self, serializer):
        # Impede que usuários comuns alterem o tenant via PATCH.
        # Superusers podem trocar tenant explicitamente pelo body.
        request_user = self.request.user
        if not (request_user.is_superuser or request_user.is_staff):
            # Remove tenant do validated_data — non-superuser não pode trocar
            serializer.validated_data.pop('tenant', None)
        user = serializer.save()
        _log_audit(self.request, 'update_user', target_user=user)

    def perform_destroy(self, instance):
        _log_audit(self.request, 'delete_user', target_user=instance,
                   changes={'username': instance.username})
        instance.delete()


# ============================================================
# Permission Groups (Perfis)
# ============================================================

class PermissionGroupViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """CRUD de grupos/perfis de permissão."""
    queryset = PermissionGroup.objects.prefetch_related('permissions', 'user_assignments')
    serializer_class = PermissionGroupSerializer
    rbac_module = 'user_management'
    permission_classes = [permissions.IsAuthenticated, IsRBACAdmin]

    def get_serializer_class(self):
        if self.action == 'list':
            return PermissionGroupListSerializer
        return PermissionGroupSerializer

    def perform_create(self, serializer):
        tenant = self._get_request_tenant()
        kwargs = {}
        if tenant is not None:
            kwargs['tenant'] = tenant
        group = serializer.save(**kwargs)
        _log_audit(self.request, 'create_group', changes={'nome': group.nome})

    def perform_update(self, serializer):
        group = serializer.save()
        _log_audit(self.request, 'update_group', changes={'nome': group.nome})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {'error': 'Grupos de sistema não podem ser excluídos.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        _log_audit(request, 'delete_group', changes={'nome': instance.nome})
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# Group Permissions (permissões de um grupo por módulo)
# ============================================================

class GroupPermissionViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """CRUD de permissões de grupo por módulo."""
    queryset = GroupPermission.objects.select_related('group')
    serializer_class = GroupPermissionSerializer
    rbac_module = 'user_management'
    permission_classes = [permissions.IsAuthenticated, IsRBACAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        group_id = self.request.query_params.get('group')
        module = self.request.query_params.get('module')
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        if module:
            queryset = queryset.filter(module=module)
        return queryset

    def perform_create(self, serializer):
        gp = serializer.save()
        _log_audit(self.request, 'grant_permission', module=gp.module,
                   changes={'group': gp.group.nome, 'can_view': gp.can_view,
                            'can_edit': gp.can_edit, 'can_respond': gp.can_respond})

    def perform_update(self, serializer):
        gp = serializer.save()
        _log_audit(self.request, 'update_permission', module=gp.module,
                   changes={'group': gp.group.nome, 'can_view': gp.can_view,
                            'can_edit': gp.can_edit, 'can_respond': gp.can_respond})


# ============================================================
# Atribuição Usuário ↔ Grupo
# ============================================================

class UserGroupAssignmentViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """Atribuir/remover usuários de grupos."""
    queryset = UserGroupAssignment.objects.select_related('user', 'group', 'assigned_by')
    serializer_class = UserGroupAssignmentSerializer
    rbac_module = 'user_management'
    permission_classes = [permissions.IsAuthenticated, IsRBACAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user')
        group_id = self.request.query_params.get('group')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        return queryset

    def perform_create(self, serializer):
        assignment = serializer.save()
        _log_audit(self.request, 'assign_group',
                   target_user=assignment.user,
                   changes={'group': assignment.group.nome})

    def perform_destroy(self, instance):
        _log_audit(self.request, 'remove_group',
                   target_user=instance.user,
                   changes={'group': instance.group.nome})
        instance.delete()


# ============================================================
# Permissões Individuais por Módulo (ModulePermission — já existia)
# ============================================================

class ModulePermissionViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    queryset = ModulePermission.objects.all().order_by("user__username", "module")
    serializer_class = ModulePermissionSerializer
    rbac_module = 'user_management'
    permission_classes = [permissions.IsAuthenticated, IsRBACAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user', None)
        module = self.request.query_params.get('module', None)

        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if module:
            queryset = queryset.filter(module=module)

        return queryset

    def perform_create(self, serializer):
        mp = serializer.save()
        _log_audit(self.request, 'grant_permission',
                   target_user=mp.user, module=mp.module,
                   changes={'can_view': mp.can_view, 'can_edit': mp.can_edit, 'can_respond': mp.can_respond})

    def perform_update(self, serializer):
        mp = serializer.save()
        _log_audit(self.request, 'update_permission',
                   target_user=mp.user, module=mp.module,
                   changes={'can_view': mp.can_view, 'can_edit': mp.can_edit, 'can_respond': mp.can_respond})

    def perform_destroy(self, instance):
        _log_audit(self.request, 'revoke_permission',
                   target_user=instance.user, module=instance.module)
        instance.delete()


# ============================================================
# Delegação Temporária de Permissões
# ============================================================

class DelegatedPermissionViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """CRUD de delegações temporárias de permissão."""
    queryset = DelegatedPermission.objects.select_related('from_user', 'to_user')
    serializer_class = DelegatedPermissionSerializer
    rbac_module = 'user_management'
    permission_classes = [permissions.IsAuthenticated, IsRBACAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user')
        active_only = self.request.query_params.get('active')
        if user_id:
            queryset = queryset.filter(to_user_id=user_id)
        if active_only == '1':
            from django.utils import timezone
            now = timezone.now()
            queryset = queryset.filter(is_active=True, valid_until__gte=now)
        return queryset

    def perform_create(self, serializer):
        dp = serializer.save()
        _log_audit(self.request, 'delegate_permission',
                   target_user=dp.to_user, module=dp.module,
                   changes={'from_user': dp.from_user.username,
                            'valid_until': str(dp.valid_until)})

    @action(detail=True, methods=['post'])
    def revogar(self, request, pk=None):
        """Revogar uma delegação ativa."""
        dp = self.get_object()
        dp.is_active = False
        dp.save(update_fields=['is_active'])
        _log_audit(request, 'revoke_delegation',
                   target_user=dp.to_user, module=dp.module,
                   changes={'from_user': dp.from_user.username})
        return Response({'detail': 'Delegação revogada.'})


# ============================================================
# Auditoria de Permissões (somente leitura)
# ============================================================

class PermissionAuditLogViewSet(TenantQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    """Consultar logs de auditoria de permissões."""
    queryset = PermissionAuditLog.objects.select_related('user', 'target_user')
    serializer_class = PermissionAuditLogSerializer
    rbac_module = 'user_management'
    permission_classes = [permissions.IsAuthenticated, IsRBACAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user')
        target_id = self.request.query_params.get('target_user')
        action_filter = self.request.query_params.get('action')
        module = self.request.query_params.get('module')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if target_id:
            queryset = queryset.filter(target_user_id=target_id)
        if action_filter:
            queryset = queryset.filter(action=action_filter)
        if module:
            queryset = queryset.filter(module=module)
        return queryset


# ============================================================
# CSRF Helper (Django raw view — não DRF)
# ============================================================

@require_GET
@ensure_csrf_cookie
def csrf(request):
    """Ensure a CSRF cookie is set for the client and return the token for debugging."""
    from django.conf import settings

    token = get_token(request)
    payload = {"csrfToken": token}
    if settings.DEBUG:
        payload["csrfTrustedOrigins"] = list(getattr(settings, 'CSRF_TRUSTED_ORIGINS', []))
    return JsonResponse(payload)


# ============================================================
# Tenant Management
# ============================================================

class TenantViewSet(viewsets.ModelViewSet):
    """CRUD de Tenants — apenas superusers e admins globais.

    - GET  /api/tenants/        → lista todos os tenants
    - POST /api/tenants/        → cria novo tenant
    - GET  /api/tenants/{id}/   → detalhe
    - PATCH /api/tenants/{id}/  → atualiza
    - DELETE /api/tenants/{id}/ → remove (soft: seta ativo=False)
    """

    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get_queryset(self):
        qs = Tenant.objects.all().order_by('nome')
        ativo = self.request.query_params.get('ativo')
        if ativo is not None:
            qs = qs.filter(ativo=ativo.lower() in ('true', '1'))
        return qs

    def create(self, request, *args, **kwargs):
        """Cria um novo Tenant, e opcionalmente o usuário proprietário.

        Se o payload incluir ``initial_owner`` (dict com username, email,
        password, first_name, last_name, cargo), esse usuário é criado
        atomicamente junto com o tenant e vinculado a ele com o cargo
        informado (padrão: 'proprietário').
        """
        owner_raw = request.data.get('initial_owner')

        # Valida dados do tenant (sem o campo initial_owner)
        tenant_data = {k: v for k, v in request.data.items() if k != 'initial_owner'}
        serializer = self.get_serializer(data=tenant_data)
        serializer.is_valid(raise_exception=True)

        # Valida dados do proprietário, se fornecidos
        owner_serializer = None
        if owner_raw and isinstance(owner_raw, dict):
            owner_serializer = TenantOwnerCreateSerializer(data=owner_raw)
            owner_serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            try:
                tenant = serializer.save()
            except Exception as exc:
                from django.db import IntegrityError
                if isinstance(exc, IntegrityError):
                    msg = str(exc)
                    if 'cnpj' in msg:
                        raise serializers.ValidationError({'cnpj': 'Já existe um tenant com este CNPJ.'})
                    if 'cpf' in msg:
                        raise serializers.ValidationError({'cpf': 'Já existe um tenant com este CPF.'})
                    if 'slug' in msg:
                        raise serializers.ValidationError({'slug': 'Já existe um tenant com este slug.'})
                    raise serializers.ValidationError({'detail': 'Erro de integridade: verifique os dados informados.'})
                raise
            created_owner_info = None

            if owner_serializer:
                validated = owner_serializer.validated_data
                owner_user = User(
                    tenant=tenant,
                    username=validated['username'],
                    email=validated.get('email', ''),
                    first_name=validated.get('first_name', ''),
                    last_name=validated.get('last_name', ''),
                    cargo=validated.get('cargo', 'proprietário'),
                    is_active=True,
                )
                owner_user.set_password(validated['password'])
                owner_user.save()
                _log_audit(
                    request, 'create_user', target_user=owner_user,
                    changes={'source': 'tenant_creation', 'tenant_id': str(tenant.id)},
                )
                created_owner_info = {
                    'id': owner_user.id,
                    'username': owner_user.username,
                    'email': owner_user.email,
                    'cargo': owner_user.cargo,
                }

        headers = self.get_success_headers(serializer.data)
        response_data = dict(serializer.data)
        if created_owner_info:
            response_data['initial_owner_created'] = created_owner_info
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: desativa o tenant em vez de deletar do banco."""
        tenant = self.get_object()
        tenant.ativo = False
        tenant.save(update_fields=['ativo'])
        return Response({'detail': 'Tenant desativado com sucesso.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reativar(self, request, pk=None):
        """Reativa um tenant previamente desativado."""
        tenant = self.get_object()
        tenant.ativo = True
        tenant.save(update_fields=['ativo'])
        return Response({'detail': 'Tenant reativado com sucesso.'})

    @action(detail=True, methods=['post'], url_path='set_owner')
    def set_owner(self, request, pk=None):
        """Vincula um usuário existente ao tenant como proprietário (root).

        Payload: { "user_id": <int> }

        - Atualiza user.tenant = este tenant
        - Atualiza user.cargo = 'proprietário'
        - Registra no log de auditoria
        """
        tenant = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'detail': 'Campo user_id é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Usuário não encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        previous_tenant = str(target_user.tenant_id) if target_user.tenant_id else None

        target_user.tenant = tenant
        target_user.cargo = 'proprietário'
        target_user.save(update_fields=['tenant', 'cargo'])

        _log_audit(
            request, 'update_user', target_user=target_user,
            changes={
                'action': 'set_tenant_owner',
                'tenant_id': str(tenant.id),
                'tenant_nome': tenant.nome,
                'previous_tenant_id': previous_tenant,
            },
        )

        return Response({
            'detail': f'Usuário @{target_user.username} definido como proprietário de "{tenant.nome}".',
            'user_id': target_user.id,
            'username': target_user.username,
            'tenant_id': str(tenant.id),
            'tenant_nome': tenant.nome,
        })

