# Manual de Integração — Agrolink × ZeroClaw/Isidoro

> **Stack**: Django 4 + Celery + Redis + PostgreSQL + Channels (WebSocket)
> **Agente**: Isidoro via ZeroClaw SDK (Gemini 2.5 Flash)
> **Data de revisão**: Março 2026

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Primeira execução](#2-primeira-execução)
3. [Comandos do dia a dia](#3-comandos-do-dia-a-dia)
4. [Endpoints disponíveis](#4-endpoints-disponíveis)
5. [Serviços e portas](#5-serviços-e-portas)
6. [Variáveis de ambiente](#6-variáveis-de-ambiente)
7. [Isidoro — JWT e WebSocket](#7-isidoro--jwt-e-websocket)
8. [Celery — tarefas assíncronas](#8-celery--tarefas-assíncronas)
9. [Troubleshooting](#9-troubleshooting)
10. [Arquitetura resumida](#10-arquitetura-resumida)

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima | Verificar |
|---|---|---|
| Docker | 24+ | `docker --version` |
| Docker Compose | v2 (plugin) | `docker compose version` |
| Chave Google AI | — | `~/.zeroclaw/config.toml` → `api_key` |

> O SDK ZeroClaw é montado via volume Docker — **não precisa instalar** nada localmente para Python.

### ⚠️ Permissão Docker (OBRIGATÓRIO antes da primeira execução)

O usuário precisa estar no grupo `docker` para rodar sem `sudo`. Se docker retornar "permission denied":

```bash
# Adicionar usuário ao grupo docker (requer logout/login depois)
sudo usermod -aG docker $USER

# Aplicar sem logout (apenas na sessão atual):
newgrp docker

# Verificar se funcionou:
docker ps
```

> Após `newgrp docker` ou novo login, o `./start-integration.sh` vai funcionar diretamente sem `sudo`.

---

## 2. Primeira execução

### 2.1 Iniciar o stack completo (recomendado)

```bash
cd integration-structure/project-agro/sistema-agropecuario

./start-integration.sh
```

Na **primeira rodada** o script:
1. Valida que o SDK ZeroClaw existe em `../../zeroclaw/python/`
2. Constrói as imagens Docker (`--build` automático se imagens não existem)
3. Sobe: `db (PostgreSQL)`, `redis`, `backend (Django/Daphne)`, `worker (Celery)`, `frontend (Vite)`
4. O `docker-entrypoint.sh` do backend executa automaticamente:
   - `python manage.py migrate` — cria todas as tabelas incluindo `actions_action` e `actions_uploadedfile`
   - `python manage.py seed_dev` — cria superusuário admin (se `CREATE_DEV_USER=true`)
   - `python manage.py generate_isidoro_token` — cria usuário `isidoro_agent` e gera JWT de 30 dias
5. Aguarda health-checks de backend, frontend, Celery
6. Exibe resumo com todas as URLs

### 2.2 Rebuild (após mudanças no backend)

```bash
./start-integration.sh --rebuild
```

ou diretamente:

```bash
docker compose up -d --build
```

### 2.3 Parar tudo

```bash
./start-integration.sh --down

# ou:
docker compose down
```

Para parar **e remover volumes** (apaga banco de dados):
```bash
docker compose down -v
```

---

## 3. Comandos do dia a dia

### Stack

```bash
# Ver status de todos os containers
docker compose ps

# Ver logs em tempo real (backend)
docker compose logs -f backend

# Ver logs do Celery worker
docker compose logs -f worker

# Reiniciar apenas o backend (sem rebuild)
docker compose restart backend

# Reiniciar backend + worker
docker compose restart backend worker
```

### Django Management

```bash
# Entrar no container backend
docker compose exec backend bash

# Dentro do container — exemplos:
python manage.py migrate
python manage.py createsuperuser
python manage.py shell

# Da máquina host (sem entrar no container):
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py shell
```

### Token Isidoro

```bash
# Gerar/renovar JWT do agente Isidoro (30 dias)
docker compose exec backend python manage.py generate_isidoro_token

# Token com validade customizada (90 dias)
docker compose exec backend python manage.py generate_isidoro_token --days 90

# Ver token atual (gerado no startup)
docker compose exec backend cat /tmp/isidoro_token.txt
```

### Celery

```bash
# Ver workers ativos
docker compose exec worker celery -A sistema_agropecuario inspect active

# Verificar fila de tarefas
docker compose exec worker celery -A sistema_agropecuario inspect reserved

# Purgar fila (cuidado: remove tarefas pendentes)
docker compose exec worker celery -A sistema_agropecuario purge
```

### Banco de dados

```bash
# Acessar PostgreSQL direto
docker compose exec db psql -U agro_user -d agro_db

# Backup rápido
docker compose exec db pg_dump -U agro_user agro_db > backup_$(date +%Y%m%d).sql
```

---

## 4. Endpoints disponíveis

### API REST

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/health/` | GET | Health check do backend |
| `/api/actions/` | GET, POST | Listar / criar Actions |
| `/api/actions/{id}/` | GET, PATCH, DELETE | Action individual |
| `/api/actions/{id}/approve/` | POST | Aprovar Action |
| `/api/actions/{id}/reject/` | POST | Rejeitar Action |
| `/api/actions/{id}/execute/` | POST | Executar Action aprovada |
| `/api/actions/uploads/` | GET, POST | Upload de arquivos |
| `/api/actions/uploads/{id}/` | GET | Status do upload |
| `/admin/` | — | Django Admin |

### WebSocket

| Rota | Protocolo | Descrição |
|---|---|---|
| `ws://localhost:8001/ws/chat/?token=<jwt>` | WS | Chat com Isidoro |

**Protocolo de mensagens WebSocket:**

```json
// Cliente → Servidor
{ "type": "message", "text": "Pulverizei o talhão 3 com Roundup hoje, 3L/ha" }
{ "type": "ping" }

// Servidor → Cliente
{ "type": "message", "text": "...", "sender": "isidoro", "timestamp": "..." }
{ "type": "typing", "is_typing": true }
{ "type": "action_created", "action_id": "uuid", "module": "agricultura", "action_type": "..." }
{ "type": "error", "message": "..." }
{ "type": "pong" }
```

---

## 5. Serviços e portas

| Serviço | Porta host | Porta container | Descrição |
|---|---|---|---|
| `frontend` | 5173 | 5173 | Vite + React |
| `backend` | 8001 | 8000 | Django + Daphne (HTTP + WS) |
| `db` | 5432 | 5432 | PostgreSQL 15 |
| `redis` | 6379 | 6379 | Redis (Celery + Channels) |
| `worker` | — | — | Celery (sem porta exposta) |

> **Acesso principal:** http://localhost:5173 (frontend com proxy `/api/` → backend)

---

## 6. Variáveis de ambiente

Definidas em `docker-compose.yml`. Para sobrescrever, crie um arquivo `.env` na mesma pasta ou exporte antes de rodar:

```bash
export ISIDORO_API_KEY=sua_chave_aqui
docker compose up -d
```

### Variáveis principais

| Variável | Padrão | Descrição |
|---|---|---|
| `ISIDORO_LLM_MODEL` | `gemini-2.5-flash` | Modelo Gemini |
| `ISIDORO_API_KEY` | _(google ai key)_ | Chave da API Google AI |
| `ISIDORO_LLM_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/` | Endpoint OpenAI-compat do Gemini |
| `ISIDORO_LLM_TEMPERATURE` | `0.3` | Temperatura do modelo |
| `AGROLINK_API_URL` | `http://backend:8000/api` | URL interna da API (container-to-container) |
| `ISIDORO_JWT_TOKEN` | _(gerado no startup)_ | JWT gerado pelo `generate_isidoro_token` |
| `DATABASE_URL` | `postgresql://agro_user:secret_password@db:5432/agro_db` | Conexão PostgreSQL |
| `REDIS_URL` | `redis://redis:6379/0` | Redis para Channels |
| `CELERY_BROKER_URL` | `redis://redis:6379/0` | Redis para Celery |
| `DEBUG` | `True` | Modo debug Django |
| `CREATE_DEV_USER` | `true` | Cria admin/admin123 no startup |
| `DEV_SUPERUSER_PASSWORD` | `admin123` | Senha do admin de dev |

---

## 7. Isidoro — JWT e WebSocket

### Como o token é gerado

1. O `docker-entrypoint.sh` chama `generate_isidoro_token` após as migrations
2. O comando cria (ou reutiliza) o usuário `isidoro_agent` no banco
3. Gera um JWT de 30 dias via `rest_framework_simplejwt`
4. Salva em `/tmp/isidoro_token.txt` dentro do container `backend`
5. O entrypoint exporta como `ISIDORO_JWT_TOKEN` para o processo Django

### Conectar ao WebSocket manualmente

```bash
# Obtendo o token
TOKEN=$(docker compose exec backend cat /tmp/isidoro_token.txt)

# Testando com wscat (npm install -g wscat)
wscat -c "ws://localhost:8001/ws/chat/?token=$TOKEN"

# Enviando mensagem
> {"type": "message", "text": "Olá Isidoro, quais ações estão pendentes?"}
```

### Autenticação no frontend

O `ChatWidget.tsx` obtém o token via `localStorage` (chave `access_token`) e conecta:
```
ws://localhost:8001/ws/chat/?token=<access_token>
```

A `JwtAuthMiddleware` (em `apps/core/middleware/jwt_websocket.py`) decodifica o JWT e injeta `request.user` e `request.tenant` no scope do WebSocket.

---

## 8. Celery — tarefas assíncronas

### Task principal: `parse_upload_task`

Acionada automaticamente quando um arquivo é enviado via `/api/actions/uploads/`.

```
POST /api/actions/uploads/
  Content-Type: multipart/form-data
  file: <arquivo>
  module: "agricultura" | "estoque" | "fazendas" | "maquinas"
```

O worker processa:
1. Identifica o parser pelo `module` + MIME type
2. Extrai registros do arquivo (Excel, CSV, KML, PDF)
3. Cria Actions com `status=pending_approval`
4. Atualiza `UploadedFile.status` → `completed` ou `failed`

### Monitorar em tempo real

```bash
docker compose logs -f worker
```

---

## 9. Troubleshooting

### Backend não sobe / erro de migração

```bash
docker compose logs backend | tail -50
# Se migrations falharam:
docker compose exec backend python manage.py migrate --run-syncdb
```

### "No module named zeroclaw_tools"

O SDK não está sendo montado. Verifique o volume no `docker-compose.yml`:
```yaml
volumes:
  - ../../zeroclaw/python:/zeroclaw_sdk
```
E que `PYTHONPATH=/app/backend:/zeroclaw_sdk` está configurado.

### WebSocket retorna 4001 (não autenticado)

O JWT expirou ou é inválido. Renovar:
```bash
# Fazer login novamente no frontend, ou:
docker compose exec backend python manage.py generate_isidoro_token
```

### Isidoro não responde (timeout do LLM)

```bash
# Verificar chave e conectividade:
docker compose exec backend python -c "
import os; os.environ['DJANGO_SETTINGS_MODULE']='sistema_agropecuario.settings.base'
import django; django.setup()
from django.conf import settings
print('Model:', settings.ISIDORO_LLM_MODEL)
print('Key prefix:', settings.ISIDORO_API_KEY[:8] + '...')
"
```

### Celery worker travado / sem processar

```bash
docker compose restart worker
docker compose exec worker celery -A sistema_agropecuario inspect ping
```

### Frontend não conecta em `/api/`

Verifique se o proxy do Vite está apontando para `http://backend:8000` (dentro do Docker) ou `http://localhost:8001` (acesso direto). Arquivo: `frontend/vite.config.ts`.

### Resetar tudo do zero

```bash
docker compose down -v       # remove volumes (apaga banco)
docker compose up -d --build # reconstrói e recria tudo
```

---

## 10. Arquitetura resumida

```
                        ┌─────────────────────────────────┐
                        │  FRONTEND (Vite/React :5173)    │
                        │  ChatWidget ──WS──► /ws/chat/   │
                        │  ActionsPanel ──REST──► /api/   │
                        └──────────────┬──────────────────┘
                                       │ proxy /api/ + WS
                        ┌──────────────▼──────────────────┐
                        │  BACKEND (Django+Daphne :8000)  │
                        │  ┌──────────┐ ┌───────────────┐ │
                        │  │ REST API │ │ WS Consumer   │ │
                        │  │/api/     │ │ IsidoroChat   │ │
                        │  └────┬─────┘ └──────┬────────┘ │
                        │       │               │          │
                        │  ┌────▼───────────────▼──────┐  │
                        │  │ IsidoroAgent (ZeroClaw SDK)│ │
                        │  │ ZeroclawAgent + LangGraph  │  │
                        │  │ Gemini 2.5 Flash via HTTPS │  │
                        │  └───────────────────────────┘  │
                        └────────┬────────────────────────┘
                                 │
             ┌───────────────────┼─────────────────────┐
             │                   │                      │
    ┌────────▼───────┐  ┌────────▼───────┐  ┌──────────▼──────┐
    │ PostgreSQL :5432│  │  Redis :6379   │  │ Celery Worker   │
    │  agro_db        │  │  Channels +    │  │ parse_upload_   │
    │  Action table   │  │  Celery broker │  │ task            │
    └────────────────┘  └────────────────┘  └─────────────────┘
                                                       │
                                          ┌────────────▼──────────┐
                                          │  Parsers              │
                                          │  agricultura_parser   │
                                          │  estoque_parser       │
                                          │  fazendas_parser      │
                                          │  maquinas_parser      │
                                          └───────────────────────┘
```

---

**Credenciais de desenvolvimento padrão:**
- Admin Django: `admin` / `admin123` → http://localhost:8001/admin/
- Banco: `agro_user` / `secret_password` / `agro_db`
- Agente: usuário `isidoro_agent` (sem senha — usa JWT)
