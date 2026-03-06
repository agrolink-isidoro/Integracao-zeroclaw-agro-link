# 🐳 Configuração Docker - Projeto Agrolink

**Data:** 4 de março de 2026  
**Local:** `sistema-agropecuario/`

---

## ✅ Arquivos Docker Presentes

```
integration-structure/project-agro/
├── Dockerfile.ci                           [CI/CD image]
├── sistema-agropecuario/
│   ├── docker-compose.yml                  [MAIN COMPOSE - v3.8]
│   ├── docker-compose.celery.snippet.yml   [CELERY addon]
│   └── backend/Dockerfile                  [BACKEND image]
└── [scripts/docker-entrypoint.sh]          [início container]
```

---

## 🔧 Serviços Docker (docker-compose.yml)

### 1️⃣ PostgreSQL + PostGIS
```yaml
Service: db
Image: postgis/postgis:15-3.4
Port: 5435:5432 (local:container)
Credentials:
  - User: agro_user
  - Password: secret_password
  - Database: agro_db
Health Check: pg_isready (5s interval, max 10 retries)
Volume: postgres_data (persistente)
Init Scripts: ./backend/sql/ (docker-entrypoint)
```

### 2️⃣ Redis
```yaml
Service: redis
Image: redis:7-alpine
Port: 6380:6379 (local:container)
Volume: redis_data (persistente)
```

### 3️⃣ Backend Django
```yaml
Service: backend
Image: Custom (build from ./backend/Dockerfile)
Port: 8001:8000 (local:container)
Working Dir: /app/backend
Entrypoint: /app/backend/docker-entrypoint.sh
Command: python manage.py runserver 0.0.0.0:8000
Health Check: GET http://localhost:8000/api/health/ (10s interval)
Dependencies: db (healthy), redis (started)
```

### 4️⃣ Frontend Node.js
```yaml
Service: frontend
Image: node:20
Port: 5173 (default)
Working Dir: /app/frontend
Command: npm ci && npm run dev -- --host 0.0.0.0
```

---

## 🔐 Variáveis de Ambiente (Backend)

### Críticas
```env
# Database
DATABASE_URL=postgresql://agro_user:secret_password@db:5432/agro_db
DB_HOST=db
DB_PORT=5432
POSTGRES_USER=agro_user

# Redis
REDIS_URL=redis://redis:6379/0

# Criptografia (MESMA em todos containers!)
CERT_ENCRYPTION_KEY=FiWNDA006OucJwSuejkt-EjBpmybzMLwq_zMYR_z-98=

# Desenvolvimento
CREATE_DEV_USER=true
DEV_SUPERUSER_PASSWORD=admin123
DEBUG=True
PYTHONPATH=/app/backend
```

### SEFAZ (Nota Fiscal)
```env
SEFAZ_AMBIENTE=2                    # 2 = homologação
SEFAZ_SIMULATE_ONLY=True
SEFAZ_SSL_VERIFY=False
SEFAZ_DISTRIB_ENDPOINT=https://hom.nfe.fazenda.gov.br/...
```

---

## 📦 Backend Dockerfile - Dependências

- PostgreSQL client
- GDAL (geoespacial)
- Tesseract OCR
- xmlsec para certificados
- Python 3.12-slim

---

## 🚀 Como Usar

```bash
# Start full stack
make up

# Start só frontend
make frontend

# Logs
make logs-backend

# Stop
make stop
```

---

## ⚠️ Dados/Integration

### SQL Init Scripts
```
Localização: sistema-agropecuario/backend/sql/
Uso: Restaurar dados/criar schema
```

### Volumes Docker
```
postgres_data:/var/lib/postgresql/data/
redis_data:/data/
```

---

## 🔄 Integration com ZeroClaw/Isidoro

### URLs
```
Local: http://localhost:8001
Docker internal: http://backend:8000
Health Check: curl http://localhost:8001/api/health/
```

---

✅ **Estrutura consolidada em `/Integracao-zeroclaw-agro-link/integration-structure/project-agro/`**

