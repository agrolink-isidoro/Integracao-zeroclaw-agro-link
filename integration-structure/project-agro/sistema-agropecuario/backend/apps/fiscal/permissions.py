from rest_framework.permissions import BasePermission


class IsStaffOrCanConfirmEstoque(BasePermission):
    """Allow access if user is staff or has explicit permission/claim for confirming estoque."""

    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
            return True
        # Support token-based scopes or custom flags
        if hasattr(user, 'scopes') and 'fiscal:confirmar_estoque' in getattr(user, 'scopes'):
            return True
        if user.has_perm('fiscal.confirmar_estoque'):
            return True
        return False


class IsStaffOrCanSendToSefaz(BasePermission):
    """Allow access if user is staff or has explicit permission for sending to SEFAZ."""

    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
            return True
        if hasattr(user, 'scopes') and 'fiscal:send_to_sefaz' in getattr(user, 'scopes'):
            return True
        if user.has_perm('fiscal.send_to_sefaz'):
            return True
        return False
