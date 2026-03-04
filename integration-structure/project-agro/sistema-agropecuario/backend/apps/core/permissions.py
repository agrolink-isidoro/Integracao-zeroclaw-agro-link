"""
RBAC Permission Classes — Fase 3
=================================

Permission classes DRF reutilizáveis que verificam o modelo RBAC
(individual + grupo + delegação) via CustomUser.has_module_permission().

Uso típico:
    # ViewSet inteiro — somente quem pode ver o módulo
    permission_classes = [IsAuthenticated, HasModulePermission('financeiro', 'can_view')]

    # Action específica — exige edição
    @action(detail=True, methods=['post'],
            permission_classes=[IsAuthenticated, HasModulePermission('financeiro', 'can_edit')])
    def aprovar(self, request, pk=None): ...

    # Function-based view
    @api_view(['POST'])
    @permission_classes([IsAuthenticated])
    @require_module_permission('estoque', 'can_edit')
    def ajustar_estoque(request): ...
"""

from functools import wraps

from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied


def _is_owner_level(user) -> bool:
    """True for superusers, staff, and anyone with an owner-type cargo."""
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
        return True
    cargo = (getattr(user, 'cargo', '') or '').strip().lower()
    return cargo in {'proprietário', 'proprietario', 'owner', 'admin'}


# ============================================================
# HasModulePermission — permission class genérica (factory)
# ============================================================

class HasModulePermission(BasePermission):
    """Verifica se o usuário tem permissão RBAC em um módulo.

    Funciona como factory:
        HasModulePermission('financeiro')           → verifica can_view
        HasModulePermission('financeiro', 'can_edit') → verifica can_edit

    Para usar como classe (não instanciada), utilize `make_permission`:
        permission_classes = [HasModulePermission.make('financeiro', 'can_edit')]

    Superusers sempre passam.
    """

    # Defaults — caso instanciado sem argumentos (DRF tenta chamar a classe)
    module = None
    level = 'can_view'

    def __init__(self, module=None, level=None):
        if module:
            self.module = module
        if level:
            self.level = level

    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, 'is_authenticated', False):
            return False
        if _is_owner_level(user):
            return True

        # Se o módulo não foi definido, permitir (fallback seguro).
        if not self.module:
            return True

        return user.has_module_permission(self.module, self.level)

    @classmethod
    def make(cls, module, level='can_view'):
        """Factory que retorna uma CLASSE de permission (não instância).

        Ideal para `permission_classes = [HasModulePermission.make('estoque')]`
        porque o DRF espera classes (que instancia internamente).
        """
        return type(
            f'HasModulePermission_{module}_{level}',
            (cls,),
            {'module': module, 'level': level},
        )


# ============================================================
# Read / Write / Respond — atalhos de nível
# ============================================================

class HasModuleView(HasModulePermission):
    """Atalho para can_view — requer que o ViewSet defina `rbac_module`."""
    level = 'can_view'

    def has_permission(self, request, view):
        self.module = self.module or getattr(view, 'rbac_module', None)
        return super().has_permission(request, view)


class HasModuleEdit(HasModulePermission):
    """Atalho para can_edit — requer que o ViewSet defina `rbac_module`."""
    level = 'can_edit'

    def has_permission(self, request, view):
        self.module = self.module or getattr(view, 'rbac_module', None)
        return super().has_permission(request, view)


class HasModuleRespond(HasModulePermission):
    """Atalho para can_respond — requer que o ViewSet defina `rbac_module`."""
    level = 'can_respond'

    def has_permission(self, request, view):
        self.module = self.module or getattr(view, 'rbac_module', None)
        return super().has_permission(request, view)


# ============================================================
# RBACViewPermission — Permission "inteligente" por HTTP method
# ============================================================

class RBACViewPermission(BasePermission):
    """Permission class que mapeia HTTP methods → níveis RBAC automaticamente.

    Requer que o ViewSet defina `rbac_module`.

    Mapeamento:
        GET, HEAD, OPTIONS → can_view
        POST, PUT, PATCH, DELETE → can_edit

    Superusers sempre passam. Staff passam em GET/HEAD/OPTIONS.

    Uso:
        class EstoqueViewSet(ModelViewSet):
            rbac_module = 'estoque'
            permission_classes = [IsAuthenticated, RBACViewPermission]
    """

    # Mapeia methods para levels
    VIEW_METHODS = ('GET', 'HEAD', 'OPTIONS')
    EDIT_METHODS = ('POST', 'PUT', 'PATCH', 'DELETE')

    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, 'is_authenticated', False):
            return False
        if _is_owner_level(user):
            return True

        module = getattr(view, 'rbac_module', None)
        if not module:
            # Sem módulo definido, fallback para IsAuthenticated
            return True

        method = request.method.upper()
        if method in self.VIEW_METHODS:
            return user.has_module_permission(module, 'can_view')
        elif method in self.EDIT_METHODS:
            return user.has_module_permission(module, 'can_edit')

        return False


# ============================================================
# IsOwnerOrAdmin — para gestão de usuários
# ============================================================

class IsOwnerOrAdmin(BasePermission):
    """Permite acesso ao próprio recurso ou a admins/superusers.

    Uso em user-related views: o user pode ver/editar seu próprio perfil,
    mas somente admins podem ver/editar outros.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if _is_owner_level(user):
            return True

        # Se o objeto tem um campo 'user' ou é o próprio User
        target_user = getattr(obj, 'user', obj)
        if hasattr(target_user, 'pk') and target_user.pk == user.pk:
            return True

        # Admin com permissão de gestão de usuários
        return user.has_module_permission('user_management', 'can_edit')


# ============================================================
# IsRBACAdmin — para endpoints de gestão RBAC
# ============================================================

class IsRBACAdmin(BasePermission):
    """Somente usuários com permissão user_management + can_edit.

    Substitui IsAdminUser nos endpoints RBAC (groups, permissions, audit).
    """

    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, 'is_authenticated', False):
            return False
        if _is_owner_level(user):
            return True
            # Staff pode gerenciar — manter compatibilidade com IsAdminUser
            return True
        return user.has_module_permission('user_management', 'can_edit')


# ============================================================
# Decorator para function-based views
# ============================================================

def require_module_permission(module, level='can_view'):
    """Decorator para proteger function-based views com RBAC.

    Uso:
        @api_view(['GET'])
        @permission_classes([IsAuthenticated])
        @require_module_permission('financeiro', 'can_view')
        def relatorio_financeiro(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = request.user
            if not getattr(user, 'is_authenticated', False):
                raise PermissionDenied('Autenticação necessária.')
            if _is_owner_level(user):
                return view_func(request, *args, **kwargs)
            if not user.has_module_permission(module, level):
                raise PermissionDenied(
                    f'Permissão insuficiente: requer {level} em {module}.'
                )
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
