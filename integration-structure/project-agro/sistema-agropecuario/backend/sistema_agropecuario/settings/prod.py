from .base import *

DEBUG = False

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "prod-secret-key")

ALLOWED_HOSTS = ['*']

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