# 🔧 Configurações Django - Deploy Production Checklist

**Data:** 16 de março de 2026  
**Propósito:** Validar todas as mudanças necessárias antes do deploy em produção  
**Status:** ⏳ Ação Necessária

---

## 📋 Settings para Verificar/Corrigir

### 1. Production Settings File

**Arquivo esperado:** `backend/sistema_agropecuario/settings/production.py`  
**Status:** ⚠️ Verificar se existe

```bash
ls -la backend/sistema_agropecuario/settings/
# Esperado encontrar:
# - base.py (atual)
# - test.py (para testes)
# - production.py (NOVO)
# - development.py (opcional)
```

**Ações:**
- [ ] Verificar se production.py existe
- [ ] Se não existir, criar a partir de base.py
- [ ] Adicionar ao .gitignore: `.env.production.local`

---

### 2. SECURITY SETTINGS

#### DEBUG
```python
# ❌ ERRADO (nunca em produção)
DEBUG = True

# ✅ CERTO
DEBUG = False  # CRÍTICO!
```

**Validação:**
```bash
grep "^DEBUG" backend/sistema_agropecuario/settings/*.py
# Esperado: DEBUG = False em production.py
```

#### ALLOWED_HOSTS
```python
# ❌ ERRADO
ALLOWED_HOSTS = ['*']

# ✅ CERTO
ALLOWED_HOSTS = [
    'www.agrol1nk.com.br',
    'agrol1nk.com.br',
    '*.run.app',  # Cloud Run auto domains
    'localhost',  # Para health checks
]
```

**Validação:** Adicionar após criação de DNS

#### CSRF & Session Security
```python
# ✅ NECESSÁRIO para HTTPS
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_HTTPONLY = True

# ✅ CSRF Trusted Origins (frontend)
CSRF_TRUSTED_ORIGINS = [
    'https://www.agro-link.ia.br',
    'https://agro-link.ia.br',
]
```

**Validação:**
```bash
grep -E "CSRF_COOKIE_SECURE|SESSION_COOKIE_SECURE" backend/sistema_agropecuario/settings/*.py
# Esperado: True em production.py
```

#### SSL/HSTS
```python
# ✅ Force HTTPS
SECURE_SSL_REDIRECT = True

# ✅ HTTP Strict Transport Security (1 ano)
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```

**Validação:**
```bash
grep -E "SECURE_SSL_REDIRECT|SECURE_HSTS" backend/sistema_agropecuario/settings/*.py
# Esperado: configurado em production.py
```

---

### 3. DATABASE CONFIGURATION

#### Environment Variable
```python
# ✅ CERTO - via env var (Cloud SQL)
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.getenv('DB_NAME', 'agro_prod'),
        'USER': os.getenv('DB_USER', 'agro_app'),
        'PASSWORD': os.getenv('DB_PASSWORD'),  # CRÍTICO: sem default!
        'HOST': os.getenv('DB_HOST'),  # Cloud SQL hostname
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}
```

**Validação:**
```bash
grep -A 10 "^DATABASES" backend/sistema_agropecuario/settings/*.py | grep -E "(PASSWORD|getenv)"
# Esperado: PASSWORD via getenv, sem fallback inseguro
```

#### Connection Pooling (recomendado para Cloud Run)
```python
# Adicionar após DATABASES
if not DEBUG:
    # Cloud SQL Connector (opcional mas recomendado)
    DATABASES['default']['OPTIONS'] = {
        'connect_timeout': 10,
        'options': '-c statement_timeout=30000'  # 30s timeout
    }
```

---

### 4. REDIS CONFIGURATION

#### Production Redis
```python
# ✅ CERTO - Cloud Memorystore (Redis)
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        }
    }
}
```

---

### 5. JWT & AUTHENTICATION

#### JWT Configuration
```python
from datetime import timedelta

# ✅ CERTO - JWT com expiração
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': os.getenv('JWT_SIGNING_KEY'),  # ⚠️ GERAR!
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
}
```

**Geração de JWT_SIGNING_KEY:**
```bash
# NUNCA commitar a chave no repo!
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# Resultado: ex: "eB4z9pX_q2aL8mN0kR5vT3w6xYzU1jC4dFgHiJ7oPq9s"
# Salvar em .env.production ou GCP Secret Manager
```

**Validação:**
```bash
grep "SIGNING_KEY" backend/sistema_agropecuario/settings/*.py
# Esperado: SIGNING_KEY = os.getenv('JWT_SIGNING_KEY')
# Verificar que NÃO há string literal (segurança)
```

---

### 6. CORS CONFIGURATION

#### Frontend URL
```python
# ✅ CERTO
CORS_ALLOWED_ORIGINS = [
    'https://www.agro-link.ia.br',
    'https://agro-link.ia.br',
]

# Outras opções:
CORS_ALLOW_CREDENTIALS = True
CORS_MAX_AGE = 86400  # 24 horas
```

**Validação:**
```bash
grep -A 5 "CORS_ALLOWED_ORIGINS" backend/sistema_agropecuario/settings/*.py
# Esperado: domínios específicos, não '*'
```

---

### 7. LOGGING

#### Production Logging (importante!)
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': '/var/log/django.log',  # ⚠️ Cloud Run tem /tmp
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',  # Não DEBUG em produção
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    },
}
```

**Atenção Cloud Run:**
```python
# Cloud Run usa stdout/stderr, não arquivos
# Usar CloudLogging SDK:
import logging
from google.cloud import logging as cloud_logging

client = cloud_logging.Client()
client.setup_logging()
```

---

### 8. STATIC & MEDIA FILES

#### Production Static Serving
```python
# ✅ CERTO - Cloud Storage
STATIC_URL = 'https://storage.googleapis.com/agro-system-cdn/static/'
STATIC_ROOT = '/tmp/static/'  # Temp para build

MEDIA_URL = 'https://storage.googleapis.com/agro-system-media/'
MEDIA_ROOT = '/tmp/media/'  # Temp para uploads

# Usar django-storages para GCS
STORAGES = {
    'default': {
        'BACKEND': 'storages.backends.gcloud.GoogleCloudStorage',
        'LOCATION': 'agro-system-media',
    },
    'staticfiles': {
        'BACKEND': 'storages.backends.gcloud.GoogleCloudStorage',
        'LOCATION': 'agro-system-cdn/static',
    },
}
```

**Verificação de dependência:**
```bash
grep "django-storages\|google-cloud-storage" backend/requirements.txt
# Se não houver, adicionar:
# echo "django-storages==1.13.2" >> requirements.txt
# echo "google-cloud-storage==2.10.0" >> requirements.txt
```

---

### 9. EMAIL CONFIGURATION

#### SMTP via SendGrid ou Google Cloud (recomendado)
```python
# ✅ CERTO
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.sendgrid.net')
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'apikey'
EMAIL_HOST_PASSWORD = os.getenv('SENDGRID_API_KEY')
DEFAULT_FROM_EMAIL = 'noreply@agro-link.ia.br'
```

---

## 🔐 Secrets Management

### 1. Local Development
```bash
# ❌ NUNCA commitar .env ao repo
echo ".env.local" >> .gitignore
echo ".env.production.local" >> .gitignore

# ✅ CERTO: Arquivo local não versionado
cat > .env.production.local << EOF
DEBUG=False
SECRET_KEY=seu_secret_key_muito_longo
JWT_SIGNING_KEY=seu_jwt_key_muito_longo
DB_PASSWORD=senha_super_segura
SENDGRID_API_KEY=SG.xxx
REDIS_URL=redis://memorystore:6379
EOF
```

### 2. GCP Secret Manager
```bash
# Adicionar secrets ao GCP:
gcloud secrets create django-secret-key --data-file=-
gcloud secrets create jwt-signing-key --data-file=-
gcloud secrets create db-password --data-file=-

# Cloud Run vai injetar via --secrets flag:
gcloud run deploy agro-backend \
  --secrets=django-secret-key:latest \
  --secrets=jwt-signing-key:latest \
  --secrets=db-password:latest
```

---

## ✅ CHECKLIST PRE-DEPLOY

- [ ] **DEBUG = False** em production.py
- [ ] **SECRET_KEY** via env var (não hardcoded)
- [ ] **JWT_SIGNING_KEY** via env var (gerado com secrets.token_urlsafe)
- [ ] **ALLOWED_HOSTS** configurado com domínios reais
- [ ] **CSRF_TRUSTED_ORIGINS** configurado
- [ ] **CSRF_COOKIE_SECURE = True**
- [ ] **SECURE_SSL_REDIRECT = True**
- [ ] **SECURE_HSTS_SECONDS** configurado
- [ ] **DATABASE** via env vars (sem hardcode de senha)
- [ ] **REDIS** via env var (Cloud Memorystore)
- [ ] **CORS_ALLOWED_ORIGINS** configurado (não '*')
- [ ] **EMAIL_HOST_PASSWORD** via env var
- [ ] **LOGGING** configurado para Cloud
- [ ] **django-storages** instalado (para Cloud Storage)
- [ ] **.env files** no .gitignore
- [ ] **GCP Secrets** criados e mapeados

---

## 🚀 Para Fazer Agora

```bash
# 1. Verificar se production.py existe
ls -la backend/sistema_agropecuario/settings/production.py

# 2. Se não existir, criar:
cp backend/sistema_agropecuario/settings/base.py \
   backend/sistema_agropecuario/settings/production.py

# 3. Adicionar ao settings/production.py:
cat >> backend/sistema_agropecuario/settings/production.py << 'EOF'

# ===== PRODUCTION OVERRIDES =====
import os

DEBUG = False
ALLOWED_HOSTS = [
    'www.agrol1nk.com.br',
    'agrol1nk.com.br',
    '*.run.app',
]

# Security
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# Database
DATABASES['default']['PASSWORD'] = os.getenv('DB_PASSWORD')
DATABASES['default']['HOST'] = os.getenv('DB_HOST')

# Redis
REDIS_URL = os.getenv('REDIS_URL')

# JWT
SIMPLE_JWT['SIGNING_KEY'] = os.getenv('JWT_SIGNING_KEY')

# Email
EMAIL_HOST_PASSWORD = os.getenv('SENDGRID_API_KEY')
EOF

# 4. Testar:
export DJANGO_SETTINGS_MODULE=sistema_agropecuario.settings.production
python manage.py check --deploy
# Esperado: 0 errors
```

---

**Próximo passo:** Após estas mudanças, o sistema está pronto para deploy em GCP!
