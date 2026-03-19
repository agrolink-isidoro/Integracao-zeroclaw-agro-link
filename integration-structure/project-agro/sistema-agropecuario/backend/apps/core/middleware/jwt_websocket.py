"""
JwtAuthMiddleware para Django Channels WebSocket.

Autentica conexões WebSocket via JWT no query string:
  ws://backend/ws/chat/?token=<jwt>

Injeta `user` e `tenant` no scope do consumer, replicando o
comportamento do TenantMiddleware + JWT do HTTP.

Para serviços de IA (isidoro_agent) sem tenant fixo, aceita o tenant
da sessão ativa via query param:
  ws://backend/ws/chat/?token=<jwt>&tenant_id=<uuid>

Segurança: tenant_id via query param só é respeitado se o JWT não tiver
tenant_id próprio (i.e., apenas para staff/superuser globais).
"""

from __future__ import annotations

import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class JwtAuthMiddleware:
    """
    ASGI Middleware que autentica a conexão WebSocket via JWT.

    Lê o token de:
      1. Query string: ws://host/ws/chat/?token=<jwt>
      2. Header Authorization: Bearer <jwt>

    Injeta no scope:
      - scope["user"] — instância de CustomUser (ou AnonymousUser)
      - scope["tenant"] — instância de Tenant (ou None)
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("websocket", "http"):
            scope["user"], scope["tenant"] = await self._authenticate(scope)
        return await self.inner(scope, receive, send)

    async def _authenticate(self, scope):
        """Extrai JWT e resolve user + tenant."""
        token = self._extract_token(scope)
        if not token:
            from django.contrib.auth.models import AnonymousUser
            return AnonymousUser(), None

        # Optional explicit tenant_id from query string (for staff/AI agents)
        explicit_tenant_id = self._extract_explicit_tenant_id(scope)
        return await self._get_user_and_tenant(token, explicit_tenant_id)

    def _extract_token(self, scope) -> str | None:
        """Extrai o token JWT do query string ou header."""
        # 1. Query string: ?token=<jwt>
        query_string = scope.get("query_string", b"")
        if isinstance(query_string, bytes):
            query_string = query_string.decode("utf-8")
        params = parse_qs(query_string)
        token_list = params.get("token", [])
        if token_list:
            return token_list[0]

        # 2. Header Authorization
        headers = dict(scope.get("headers", []))
        auth_header = headers.get(b"authorization", b"").decode("utf-8", errors="replace")
        if auth_header.startswith("Bearer "):
            return auth_header.split(" ", 1)[1]

        return None

    def _extract_explicit_tenant_id(self, scope) -> str | None:
        """Extrai tenant_id explícito do query string (para agentes de IA)."""
        query_string = scope.get("query_string", b"")
        if isinstance(query_string, bytes):
            query_string = query_string.decode("utf-8")
        params = parse_qs(query_string)
        tid_list = params.get("tenant_id", [])
        return tid_list[0] if tid_list else None

    @database_sync_to_async
    def _get_user_and_tenant(self, token_str: str, explicit_tenant_id: str | None = None):
        """Valida JWT, retorna (user, tenant) — roda em thread pool."""
        from django.contrib.auth.models import AnonymousUser

        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from django.contrib.auth import get_user_model
            from apps.core.models import Tenant

            User = get_user_model()
            token = AccessToken(token_str)

            user_id = token.get("user_id")
            jwt_tenant_id = token.get("tenant_id")

            try:
                user = User.objects.select_related().get(id=user_id)
            except User.DoesNotExist:
                logger.warning("JWT WebSocket: user_id=%s não encontrado", user_id)
                return AnonymousUser(), None

            tenant = None
            # Priority 1: tenant from JWT claim (normal users — preferred source)
            if jwt_tenant_id:
                try:
                    tenant = Tenant.objects.get(id=jwt_tenant_id, ativo=True)
                    logger.debug(
                        "JWT WebSocket: tenant resolved from JWT claim for user %s: %s",
                        getattr(user, 'username', '?'), jwt_tenant_id,
                    )
                except Tenant.DoesNotExist:
                    logger.warning("JWT WebSocket: tenant_id=%s não encontrado", jwt_tenant_id)
            # Priority 2: tenant from user.tenant FK (fallback if JWT missing/invalid)
            if not tenant and user.is_authenticated and not user.is_superuser and getattr(user, 'tenant', None):
                tenant = user.tenant
                logger.debug(
                    "JWT WebSocket: tenant resolved from user.tenant for user %s: %s",
                    getattr(user, 'username', '?'), user.tenant_id,
                )
            # Priority 3: explicit tenant_id query param — only for staff/superuser service accounts
            if not tenant and explicit_tenant_id and (getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False)):
                try:
                    tenant = Tenant.objects.get(id=explicit_tenant_id, ativo=True)
                    logger.info(
                        "JWT WebSocket: staff user %s resolved tenant via query param: %s",
                        getattr(user, 'username', '?'), explicit_tenant_id,
                    )
                except Tenant.DoesNotExist:
                    logger.warning(
                        "JWT WebSocket: explicit tenant_id=%s não encontrado", explicit_tenant_id
                    )

            return user, tenant

        except Exception as exc:
            logger.warning("JWT WebSocket: token inválido — %s", exc)
            return AnonymousUser(), None
