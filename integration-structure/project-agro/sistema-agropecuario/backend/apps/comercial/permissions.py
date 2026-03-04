from rest_framework.permissions import BasePermission


class IsComercialAdmin(BasePermission):
    """Grant access to users with administrative rights over Comercial.

    Default logic: allow if user.is_staff or user.is_superuser or has attribute
    `is_comercial_admin` set to True. This is intentionally permissive to fit the
    current model where user-company relations are not yet implemented. When a
    proper membership model exists, adapt `has_permission` accordingly.
    """

    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
            return True
        # project-specific flag (optional)
        if getattr(user, 'is_comercial_admin', False):
            return True
        return False


class CanExportCSV(BasePermission):
    """Optional permission that can restrict CSV exports to admin roles.

    By default this allows export for authenticated users; to tighten, update
    logic to require admin flag or group membership.
    """

    def has_permission(self, request, view):
        # If request is not asking for CSV, don't block
        fmt = request.query_params.get('format') or ''
        if not (fmt == 'csv' or request.path.endswith('/csv/')):
            return True
        # For CSV requests, require authenticated user; prefer admin for global exports
        user = request.user
        return getattr(user, 'is_authenticated', False)


class IsEmpresaMember(BasePermission):
    """Check whether the requesting user is a member of the target Empresa.

    Current heuristic: allow if user.is_staff/superuser or if the User model has
    a relation `empresas` and the user belongs to the empresa id provided in
    request (either from kwargs `pk` or `empresa` query/data param).

    Update to reflect actual membership model when available.
    """

    def _empresa_id_from_request(self, request, view):
        pk = getattr(view, 'kwargs', {}).get('pk')
        if pk:
            return pk
        val = request.query_params.get('empresa') or request.data.get('empresa')
        return val

    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
            return True
        empresa_id = self._empresa_id_from_request(request, view)
        if not empresa_id:
            # no empresa specified, deny by default for safety
            return False
        # if the User model has empresas relation, use it
        empresas_attr = getattr(user, 'empresas', None)
        if empresas_attr is not None:
            try:
                return empresas_attr.filter(id=empresa_id).exists()
            except Exception:
                # defensive: if the relation doesn't support filter, deny
                return False
        # fallback: if no relation exists, be permissive and allow authenticated users
        return True
