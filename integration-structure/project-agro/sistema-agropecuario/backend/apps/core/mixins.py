"""TenantQuerySetMixin — filtra e injeta tenant automaticamente em ViewSets.

Uso:
    class ContaBancariaViewSet(TenantQuerySetMixin, ModelViewSet):
        queryset = ContaBancaria.objects.all()
        serializer_class = ContaBancariaSerializer

O mixin:
- Filtra get_queryset() pelo request.tenant do request
- Injeta tenant em perform_create() ao salvar
- Permite superusers filtrarem por ?tenant_id= para suporte cross-tenant
- Retorna 403 se request não tem tenant e usuário não é superuser
"""

import logging

from rest_framework.exceptions import PermissionDenied

logger = logging.getLogger(__name__)


class TenantQuerySetMixin:
    """Mixin para ViewSets que precisam de isolamento por tenant.

    Deve ser colocado ANTES de GenericAPIView na ordem de herança:
        class MyViewSet(TenantQuerySetMixin, ModelViewSet): ...
    """

    def _get_tenant_kwargs(self) -> dict:
        """Retorna {'tenant': tenant} se o tenant for resolvido, senão {}.

        Uso em perform_create com kwargs extras:
            serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())
        """
        tenant = self._get_request_tenant()
        if tenant is not None:
            return {'tenant': tenant}
        return {}

    def _get_request_tenant(self):
        """Retorna o tenant ativo para o request atual."""
        request = self.request
        user = getattr(request, 'user', None)

        # Superuser global pode sobrescrever o tenant via query param
        if user and user.is_superuser and not user.tenant_id:
            tenant_id_param = request.query_params.get('tenant_id')
            if tenant_id_param:
                from apps.core.models import Tenant
                try:
                    return Tenant.objects.get(id=tenant_id_param, ativo=True)
                except Tenant.DoesNotExist:
                    raise PermissionDenied("Tenant especificado não encontrado.")

            # Superuser sem tenant_id param → acesso a todos (retorna None → sem filtro)
            return None

        tenant = getattr(request, 'tenant', None)
        if tenant is None and user and user.tenant:
            tenant = user.tenant

        return tenant

    def get_queryset(self):
        qs = super().get_queryset()
        tenant = self._get_request_tenant()

        if tenant is None:
            # Superuser global sem filtro de tenant → retorna tudo
            if self.request.user and self.request.user.is_superuser:
                return qs
            # Usuário comum sem tenant → nenhum resultado (segurança)
            return qs.none()

        # Filtro por tenant — o campo se chama 'tenant' em todos os TenantModel
        if hasattr(qs.model, 'tenant_id'):
            return qs.filter(tenant=tenant)

        return qs

    def perform_create(self, serializer):
        tenant = self._get_request_tenant()
        if tenant is None and not (self.request.user and self.request.user.is_superuser):
            raise PermissionDenied("Não é possível criar registros sem um tenant ativo.")

        kwargs = {}
        if tenant is not None:
            kwargs['tenant'] = tenant

        serializer.save(**kwargs)

    def perform_update(self, serializer):
        """Garante que o tenant não seja alterado durante updates.

        Mesmo que o cliente submeta um tenant diferente no corpo da requisição,
        o tenant original da instância é sempre preservado.
        """
        instance = serializer.instance
        kwargs = {}
        if hasattr(instance, 'tenant_id') and instance.tenant_id is not None:
            kwargs['tenant_id'] = instance.tenant_id
        serializer.save(**kwargs)
