from .base import *
import os

# Check if DATABASE_URL is provided (PostgreSQL)
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    # Only use SQLite fallback if no DATABASE_URL is provided
    # Remove GIS apps for development with SQLite
    INSTALLED_APPS = [app for app in INSTALLED_APPS if app not in ['django.contrib.gis', 'rest_framework_gis']]

    # Use SQLite for development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# DESENVOLVIMENTO: Configurações específicas para testes
DEBUG = True

# SEFAZ: Forçar ambiente de homologação em desenvolvimento
SEFAZ_AMBIENTE = 2  # Sempre homologação em dev

# DESENVOLVIMENTO: Usar SEFAZ REAL (sandbox/homologação) por padrão
SEFAZ_USE_REAL_SERVICE = True  # Requisições reais para sandbox SEFAZ
SEFAZ_SIMULATE_ONLY = False  # Não forçar simulação
SEFAZ_SIMULATE_ON_ERROR = True  # Simular apenas quando falhar conexão/certificado

# Development-only flags: enable to bypass external SEFAZ validations during local testing.
# WARNING: These MUST NOT be enabled in production.
FISCAL_SIMULATE_SEFAZ_SUCCESS = True  # When True, tasks will mark manifestacoes as sent (simulated) instead of calling SEFAZ
FISCAL_SKIP_CHAVE_VALIDATION = True  # When True, upload will skip 'chave de acesso' structural validation (dev only)

# Log mais verboso em desenvolvimento
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'apps.fiscal': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}