"""Validadores de segurança multi-tenant.

F3 — Garantia que FKs entre models de app não cruzam tenants.

Uso em Serializers:
    class ContaBancariaSerializer(TenantFKValidationMixin, serializers.ModelSerializer):
        # Quaisquer FK para models TenantModel serão validados automaticamente
        ...

Ou validação manual:
    validate_cross_tenant_fk(obj, tenant, field_name='fazenda')
"""

import logging
from typing import Any

from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


def validate_cross_tenant_fk(obj: Any, expected_tenant, field_name: str = 'tenant') -> None:
    """Verifica que `obj.tenant` é o mesmo que `expected_tenant`.

    Levanta ValidationError se houver mismatch, garantindo que
    registros de tenants diferentes não sejam relacionados.

    Args:
        obj: Instância de um TenantModel que está sendo referenciado como FK.
        expected_tenant: Tenant esperado (do request atual).
        field_name: Nome do campo FK (para mensagem de erro amigável).

    Raises:
        ValidationError: Se os tenants não coincidirem.
    """
    if obj is None:
        return  # FK opcional não preenchida — ok

    obj_tenant = getattr(obj, 'tenant_id', None)
    expected_id = getattr(expected_tenant, 'pk', None) if expected_tenant else None

    if obj_tenant is None:  # obj não tem campo tenant → shared/lookup table → ok
        return

    if expected_id is None:  # superuser sem tenant ativo → skip validação
        return

    if str(obj_tenant) != str(expected_id):
        logger.warning(
            "Cross-tenant FK violation: field=%s obj_pk=%s obj_tenant=%s request_tenant=%s",
            field_name, getattr(obj, 'pk', '?'), obj_tenant, expected_id,
        )
        raise ValidationError({
            field_name: f"O objeto referenciado pertence a outro tenant."
        })


class TenantFKValidationMixin:
    """Mixin para Serializers que valida FKs de TenantModel automaticamente.

    Ao ser adicionado a um serializer, verifica que todos os campos ForeignKey
    ou PrimaryKeyRelated que apontem para models com `tenant_id` pertencem ao
    mesmo tenant do request atual.

    Uso:
        class CompraSerializer(TenantFKValidationMixin, serializers.ModelSerializer):
            ...
    """

    def _get_current_tenant(self):
        """Obtém o tenant do request atual via context."""
        request = self.context.get('request')
        if request is None:
            return None
        tenant = getattr(request, 'tenant', None)
        if tenant is None:
            user = getattr(request, 'user', None)
            if user and hasattr(user, 'tenant'):
                tenant = user.tenant
        return tenant

    def validate(self, attrs):
        """Hook de validação que verifica FKs cross-tenant."""
        attrs = super().validate(attrs)
        tenant = self._get_current_tenant()

        if tenant is None:
            # Superuser global ou sistema sem tenant ativo — sem restrição
            return attrs

        # Inspecionar todos os campos do serializer
        for field_name, value in attrs.items():
            if value is None:
                continue
            # Se o valor é uma instância de model com tenant_id → validar
            if hasattr(value, 'tenant_id'):
                validate_cross_tenant_fk(value, tenant, field_name=field_name)

        return attrs
