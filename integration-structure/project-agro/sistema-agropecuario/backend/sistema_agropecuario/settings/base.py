from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parents[2]

DEBUG = True

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-secret-key")

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "rest_framework_gis",
    "apps.i18n",
    "apps.core",
    "apps.fazendas",
    "apps.agricultura",
    "apps.financeiro",
    "apps.comercial",
    "apps.administrativo",
    "apps.estoque",
    "apps.fiscal",
    "apps.maquinas",
    "apps.dashboard",

    "channels",
]



MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    # Multi-tenant: resolve request.tenant a partir do JWT/header/user
    "apps.core.middleware.tenant.TenantMiddleware",
    # Custom: log responses that look like errors but come back as 200 with {code: 403}
    "apps.core.middleware.forbidden_logger.ResponseForbiddenMiddleware",
]

ROOT_URLCONF = "sistema_agropecuario.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "sistema_agropecuario.wsgi.application"

DATABASES = {
    "default": {
        # Default to SQLite for simple local tests, but prefer a DATABASE_URL when provided
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("DJANGO_DB_PATH", ":memory:"),
    }
}

# If a DATABASE_URL is provided (eg. postgresql://user:pass@host:port/dbname), parse it
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    # Very small parser for DATABASE_URL
    try:
        import re

        m = re.match(r"(?P<scheme>[^:]+)://(?P<user>[^:]+):(?P<pass>[^@]+)@(?P<host>[^:/]+)(:(?P<port>\d+))?/(?P<db>.+)", DATABASE_URL)
        if m:
            groups = m.groupdict()
            scheme = groups.get("scheme")
            # Use PostGIS backend for spatial features (polygons, KML import)
            engine = "django.contrib.gis.db.backends.postgis"
            DATABASES = {
                "default": {
                    "ENGINE": engine,
                    "NAME": groups.get("db"),
                    "USER": groups.get("user"),
                    "PASSWORD": groups.get("pass"),
                    "HOST": groups.get("host"),
                    "PORT": groups.get("port") or "5432",
                }
            }
    except Exception:
        # Leave default sqlite if parsing fails
        pass

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True
USE_L10N = True
USE_TZ = True

STATIC_URL = "/static/"

# Use custom user model from core app
AUTH_USER_MODEL = "core.CustomUser"

# Recommended default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Channels
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("redis", 6379)],
        },
    },
}

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    # Use page number pagination by default so list endpoints always return
    # a paginated object {count, next, previous, results} instead of a raw array.
    # Use our custom pagination class which supports `?page_size=` up to `max_page_size`.
    'DEFAULT_PAGINATION_CLASS': 'backend.apps.core.pagination.DefaultPagination',
    'PAGE_SIZE': int(os.environ.get('DJANGO_PAGE_SIZE', '25')),
    'TEST_REQUEST_RENDERER_CLASSES': [
        'rest_framework.renderers.MultiPartRenderer',
        'rest_framework.renderers.JSONRenderer',
    ],
}

# JWT Settings
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',

    'JTI_CLAIM': 'jti',

    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Trusted origins for Django's CSRF origin check (required when frontend runs on different host/port)
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', os.environ.get('REDIS_URL', 'redis://redis:6379/0'))
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', os.environ.get('REDIS_URL', 'redis://redis:6379/0'))
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# SEFAZ Configuration
# CRÍTICO: Definir ambiente correto (1=Produção, 2=Homologação)
SEFAZ_AMBIENTE = int(os.environ.get('SEFAZ_AMBIENTE', '2'))  # Default: Homologação

# SEFAZ: Modo de operação 
SEFAZ_USE_REAL_SERVICE = os.environ.get('SEFAZ_USE_REAL_SERVICE', 'true').lower() == 'true'  # Default: usar serviço real
SEFAZ_SIMULATE_ONLY = os.environ.get('SEFAZ_SIMULATE_ONLY', 'false').lower() == 'true'  # Forçar simulação
SEFAZ_SIMULATE_ON_ERROR = os.environ.get('SEFAZ_SIMULATE_ON_ERROR', 'false').lower() == 'true'  # Simular em caso de erro (dev)

# URLs por ambiente (SVRS - Sefaz Virtual Rio Grande do Sul)
# Usando versão 4.0 dos webservices (NF-e 4.0)
SEFAZ_URLS = {
    1: {  # PRODUÇÃO - DADOS REAIS
        'manifestacao': 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
        'consulta': 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
        'distribuicao': 'https://nfe.svrs.rs.gov.br/ws/NFeDistribuicaoDFe/nfedistdfe.asmx',
        'autorizacao': 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    },
    2: {  # HOMOLOGAÇÃO - TESTES
        'manifestacao': 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
        'consulta': 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
        'distribuicao': 'https://nfe-homologacao.svrs.rs.gov.br/ws/NFeDistribuicaoDFe/nfedistdfe.asmx',
        'autorizacao': 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    }
}

# IMPORTANTE: Manifestação fica habilitada por padrão, mas só funciona com certificado válido
FISCAL_MANIFESTACAO_ENABLED = os.environ.get('FISCAL_MANIFESTACAO_ENABLED', 'true').lower() == 'true'

# Path para certificados digitais (A1/A3)
CERTIFICADOS_PATH = os.environ.get('CERTIFICADOS_PATH', '/app/certificados/')

# Timeout para requisições SEFAZ
SEFAZ_TIMEOUT = int(os.environ.get('SEFAZ_TIMEOUT', '30'))

# Chave de criptografia para senhas de certificados (Fernet)
# CRÍTICO: Definir via variável de ambiente em produção
# Gerar com: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
CERT_ENCRYPTION_KEY = os.environ.get('CERT_ENCRYPTION_KEY', None)
if not CERT_ENCRYPTION_KEY and DEBUG:
    # Em desenvolvimento, gera uma chave temporária (NÃO usar em produção)
    try:
        from cryptography.fernet import Fernet
        CERT_ENCRYPTION_KEY = Fernet.generate_key().decode()
    except ImportError:
        pass
