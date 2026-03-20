import environ
from .base import *

env = environ.Env()
env.read_env(env.str('ENV_FILE', '.env'))

DEBUG = False

# SECURITY: Sem fallback! Se DJANGO_SECRET_KEY não existir no prod, quebra a subida do container.
SECRET_KEY = env('DJANGO_SECRET_KEY')

# SECURITY: Ler do env: "api.agrolink.com,admin.agrolink.com". Default: agrol1nk.com.br (Produção Oficial)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['www.agrol1nk.com.br', 'agrol1nk.com.br', 'localhost', 'backend'])

# SECURITY: Headers SSL e Cookies Seguros OBRIGATÓRIOS
SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# SECURITY: Hardening de CORS
# Default de produção: apenas o site principal / CRM e o domínio IA da frente.
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'https://www.agro-link.ia.br',
    'https://agro-link.ia.br',
])
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[
    'https://www.agro-link.ia.br',
    'https://agro-link.ia.br',
    'https://www.agrol1nk.com.br',
    'https://agrol1nk.com.br',
])

# Force PostgreSQL for production
DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": "agro_db",
        "USER": "agro_user",
        "PASSWORD": "secret_password",
        "HOST": "localhost",
        "PORT": "5433",
    }
}

# PRODUÇÃO: Configurações críticas de segurança
DEBUG = False  # JAMAIS True em produção!

# SEFAZ: OBRIGATÓRIO usar ambiente de produção
SEFAZ_AMBIENTE = int(os.environ.get('SEFAZ_AMBIENTE', '1'))  # Produção por padrão

# PRODUÇÃO: Usar serviço SEFAZ real obrigatoriamente
SEFAZ_USE_REAL_SERVICE = True  # SEMPRE usar serviço real
SEFAZ_SIMULATE_ONLY = False  # JAMAIS simular
SEFAZ_SIMULATE_ON_ERROR = False  # JAMAIS simular em produção

# PRODUÇÃO: Certificado digital obrigatório
CERTIFICADOS_PATH = os.environ.get('CERTIFICADOS_PATH', '/app/certificados/')

# Validações de segurança em produção
if SEFAZ_AMBIENTE != 1:
    import warnings
    warnings.warn("ATENÇÃO: Produção deve usar SEFAZ_AMBIENTE=1 (Produção)")

# PRODUÇÃO: Log de segurança
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'detailed': {
            'format': '{levelname} {asctime} {name} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/app/logs/fiscal.log',
            'formatter': 'detailed',
        },
    },
    'loggers': {
        'apps.fiscal': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}