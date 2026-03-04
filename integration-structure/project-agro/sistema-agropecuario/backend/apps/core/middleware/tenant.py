"""TenantMiddleware — resolução de tenant por requisição.

Estratégia de resolução (em ordem de prioridade):
1. Claim 'tenant_id' do JWT — assinado, imutável, fonte confiável.
2. user.tenant — fallback para autenticação por session.
3. Header X-Tenant-ID — aceito APENAS se o JWT não tiver tenant_id
   (ou seja, apenas para superusers globais ou serviços internos).

Regra de segurança: um usuário comum NÃO pode trocar de tenant via header.
O tenant vem sempre do JWT assinado pelo servidor.
Se o JWT tem tenant_id, o header X-Tenant-ID é ignorado para esse usuário.

Se um tenant_id é encontrado mas não existe/inativo → request.tenant = None.
Se nenhum tenant é encontrado (request anônima ou superuser global) → request.tenant = None.
"""

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


def _extract_tenant_id_from_jwt(request) -> Optional[str]:
    """Tenta extrair tenant_id do token JWT no header Authorization."""
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return None

    token_str = auth_header.split(' ', 1)[1]

    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = AccessToken(token_str)
        return str(token.get('tenant_id') or '')
    except Exception:
        return None


class TenantMiddleware:
    """Middleware que resolve e injeta request.tenant em cada request.

    Deve ser posicionado APÓS AuthenticationMiddleware no settings.
    """

    def __init__(self, get_response: Any):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = self._resolve_tenant(request)
        response = self.get_response(request)
        return response

    def _resolve_tenant(self, request):
        """Resolve o Tenant para este request. Retorna None se não aplicável."""

        # ── 1) JWT claim — fonte de verdade para usuários comuns ──────────────
        # O JWT é assinado pelo servidor: não pode ser forjado pelo cliente.
        jwt_tenant_id = _extract_tenant_id_from_jwt(request) or None

        if jwt_tenant_id:
            # JWT tem tenant: usa diretamente, ignora qualquer header externo.
            return self._fetch_tenant(jwt_tenant_id)

        # ── 2) Usuário autenticado com tenant no banco (session auth) ─────────
        user = getattr(request, 'user', None)
        if user and user.is_authenticated and not user.is_superuser:
            tenant_obj = getattr(user, 'tenant', None)
            if tenant_obj is not None:
                return tenant_obj

        # ── 3) Header X-Tenant-ID — permitido apenas para superusers/serviços ─
        # Usuários comuns já foram tratados acima.
        # Aqui só chegam requests anônimas ou de superusers globais.
        header_tid = request.META.get('HTTP_X_TENANT_ID', '').strip()
        if header_tid:
            # Validar que quem envia o header tem permissão (é staff/superuser).
            if user and user.is_authenticated and not (user.is_staff or user.is_superuser):
                logger.warning(
                    "TenantMiddleware: usuário comum %s tentou usar X-Tenant-ID=%s — ignorado.",
                    getattr(user, 'username', '?'), header_tid,
                )
                # Retorna o tenant do próprio usuário (segurança)
                tenant_obj = getattr(user, 'tenant', None)
                return tenant_obj
            return self._fetch_tenant(header_tid)

        return None  # request anônima ou superuser global sem seleção de tenant

    def _fetch_tenant(self, tenant_id: str):
        """Busca e valida o Tenant pelo UUID. Retorna None se não encontrado/inativo."""
        from apps.core.models import Tenant
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except (Tenant.DoesNotExist, Exception):
            logger.warning("TenantMiddleware: tenant_id=%s não encontrado", tenant_id)
            return None

        if not tenant.ativo:
            logger.warning("TenantMiddleware: tenant %s está inativo", tenant.slug)
            return None

        return tenant
