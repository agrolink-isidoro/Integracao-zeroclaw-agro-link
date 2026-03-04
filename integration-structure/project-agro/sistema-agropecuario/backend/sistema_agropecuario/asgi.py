"""
ASGI config for sistema_agropecuario project (Django Channels).

Suporta:
  - HTTP (via Django WSGI-compatible middleware)
  - WebSocket em ws://backend/ws/chat/ → IsidoroChatConsumer

Para JWT auth no WebSocket usamos middleware customizado que lê
o token do query string (?token=<jwt>) ou do header Authorization.
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application
from django.urls import path

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sistema_agropecuario.settings.base")

# Inicializa Django antes de importar consumers
django_asgi_app = get_asgi_application()

from apps.actions.consumers import IsidoroChatConsumer  # noqa: E402
from apps.core.middleware import JwtAuthMiddleware       # noqa: E402 (pode não existir ainda)


websocket_urlpatterns = [
    path("ws/chat/", IsidoroChatConsumer.as_asgi()),
]


def _build_application():
    """Constrói a aplicação ASGI com middlewares de auth."""
    try:
        # Prefere JWT middleware (resolve request.user e request.tenant via JWT)
        ws_stack = JwtAuthMiddleware(URLRouter(websocket_urlpatterns))
    except ImportError:
        # Fallback: session auth padrão do Django
        ws_stack = AuthMiddlewareStack(URLRouter(websocket_urlpatterns))

    return ProtocolTypeRouter({
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(ws_stack),
    })


application = _build_application()
