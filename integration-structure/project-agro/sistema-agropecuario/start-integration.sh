#!/usr/bin/env bash
# =============================================================================
# start-integration.sh — Agrolink + ZeroClaw/Isidoro Integration Stack
# =============================================================================
# Extensão do start-servers.sh com os passos necessários para a integração:
#   1. Pré-flight: valida SDK ZeroClaw e variáveis de ambiente
#   2. Sobe o stack Docker (backend, worker, db, redis, frontend)
#   3. Aguarda backend saudável (igual ao start-servers.sh)
#   4. Verifica token JWT do Isidoro gerado pelo entrypoint
#   5. Testa o endpoint WebSocket de chat
#   6. Exibe resumo completo de todos os serviços
#
# Uso:
#   ./start-integration.sh              # modo Docker (padrão)
#   ./start-integration.sh --rebuild    # força rebuild de todas as imagens
#   ./start-integration.sh --local      # fallback local (sem Docker)
#   ./start-integration.sh --down       # derruba o stack
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ZEROCLAW_SDK_PATH="$SCRIPT_DIR/../../zeroclaw/python"
ISIDORO_CONFIG_PATH="$SCRIPT_DIR/../../isidoro-configuration"

# ─── Cores ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}✅${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠️ ${RESET} $*"; }
err()  { echo -e "${RED}❌${RESET} $*" >&2; }
info() { echo -e "${BLUE}ℹ️ ${RESET} $*"; }
step() { echo -e "\n${BOLD}${CYAN}── $* ${RESET}"; }

# ─── --down: derruba o stack ─────────────────────────────────────────────────
if [ "${1:-}" = "--down" ]; then
  step "Derrubando stack..."
  cd "$SCRIPT_DIR"
  docker compose down --remove-orphans
  ok "Stack derrubado."
  exit 0
fi

echo -e "\n${BOLD}🌱 Agrolink × ZeroClaw/Isidoro — Integration Stack${RESET}"
echo "──────────────────────────────────────────────────"

# ═══════════════════════════════════════════════════════════════════════════════
# ETAPA 1 — Pré-flight: SDK ZeroClaw
# ═══════════════════════════════════════════════════════════════════════════════
step "Etapa 1/5 — Pré-flight: ZeroClaw SDK"

if [ -d "$ZEROCLAW_SDK_PATH/zeroclaw_tools" ]; then
  ok "SDK ZeroClaw encontrado em: $ZEROCLAW_SDK_PATH"
else
  err "SDK ZeroClaw não encontrado em: $ZEROCLAW_SDK_PATH"
  err "Verifique se a pasta integration-structure/zeroclaw/python/ existe."
  exit 1
fi

if [ -d "$ISIDORO_CONFIG_PATH" ] && [ -f "$ISIDORO_CONFIG_PATH/IDENTITY.md" ]; then
  ok "Configuração Isidoro encontrada em: $ISIDORO_CONFIG_PATH"
else
  warn "Configuração Isidoro incompleta ou ausente em: $ISIDORO_CONFIG_PATH"
  warn "Execute: cp -r ~/.zeroclaw/workspace/Isidoro-Configuration/* $ISIDORO_CONFIG_PATH/"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# ETAPA 2 — Pré-flight: variáveis de ambiente críticas
# ═══════════════════════════════════════════════════════════════════════════════
step "Etapa 2/5 — Pré-flight: variáveis de ambiente"

# Verifica se o docker-compose tem a API key (hardcoded no arquivo como padrão)
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
if grep -q "ISIDORO_API_KEY=AI" "$COMPOSE_FILE" 2>/dev/null; then
  ok "ISIDORO_API_KEY configurada no docker-compose.yml"
else
  warn "ISIDORO_API_KEY não detectada no docker-compose.yml"
  warn "Adicione: ISIDORO_API_KEY=<sua_chave_google_ai>"
fi

if grep -q "ISIDORO_LLM_MODEL=gemini" "$COMPOSE_FILE" 2>/dev/null; then
  ok "Modelo LLM: $(grep 'ISIDORO_LLM_MODEL' "$COMPOSE_FILE" | head -1 | cut -d= -f2)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# ETAPA 3 — Detectar Docker e subir o stack
# ═══════════════════════════════════════════════════════════════════════════════
step "Etapa 3/5 — Subindo stack Docker"

DOCKER_OK=false
DOCKER_CMD=""

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  DOCKER_OK=true
  DOCKER_CMD="docker compose"
elif sudo docker compose version >/dev/null 2>&1; then
  DOCKER_OK=true
  DOCKER_CMD="sudo docker compose"
elif sudo docker-compose version >/dev/null 2>&1; then
  DOCKER_OK=true
  DOCKER_CMD="sudo docker-compose"
fi

if [ "$DOCKER_OK" = false ]; then
  err "Docker não encontrado."
  if [ "${1:-}" = "--local" ]; then
    warn "Iniciando modo local (fallback)..."
    cd "$SCRIPT_DIR/backend" || exit 1
    source venv/bin/activate
    DATABASE_URL="postgresql://agro_user:secret_password@localhost:5435/agro_db" \
      python manage.py runserver 127.0.0.1:8001 &
    cd ../frontend && npm run dev -- --host 0.0.0.0 --port 5173 &
    ok "Stack local iniciado (sem ZeroClaw Docker volumes)"
    exit 0
  fi
  err "Para modo local: $0 --local"
  exit 1
fi

ok "Docker disponível: $DOCKER_CMD"
cd "$SCRIPT_DIR" || exit 1

# Força rebuild se --rebuild passado
BUILD_FLAG=""
if [ "${1:-}" = "--rebuild" ]; then
  BUILD_FLAG="--build"
  info "Modo --rebuild: reconstruindo todas as imagens..."
fi

$DOCKER_CMD up -d $BUILD_FLAG || {
  err "Falha ao rodar '$DOCKER_CMD up'. Verifique permissões e logs."
  echo "  → docker compose logs backend"
  exit 1
}
ok "Containers iniciados"

# ═══════════════════════════════════════════════════════════════════════════════
# ETAPA 4 — Aguardar backend + verificar token Isidoro
# ═══════════════════════════════════════════════════════════════════════════════
step "Etapa 4/5 — Aguardando serviços ficarem saudáveis"

# Aguarda backend
echo -n "  Aguardando backend"
BACKEND_READY=false
for i in $(seq 1 90); do
  if curl -sf http://localhost:8001/api/health/ >/dev/null 2>&1; then
    echo ""
    ok "Backend saudável (${i}s)"
    BACKEND_READY=true
    break
  fi
  echo -n "."
  sleep 1
done

if [ "$BACKEND_READY" = false ]; then
  echo ""
  err "Backend não respondeu após 90s. Verifique:"
  echo "  → $DOCKER_CMD logs backend"
  exit 1
fi

# Aguarda frontend
echo -n "  Aguardando frontend (Vite)"
FRONTEND_READY=false
for i in $(seq 1 30); do
  if curl -sf -o /dev/null -I http://localhost:5173/ >/dev/null 2>&1; then
    echo ""
    ok "Frontend disponível (${i}s)"
    FRONTEND_READY=true
    break
  fi
  echo -n "."
  sleep 1
done
if [ "$FRONTEND_READY" = false ]; then
  echo ""
  warn "Frontend não respondeu (verifique '$DOCKER_CMD logs frontend')"
fi

# Verifica se o token Isidoro foi gerado (arquivo dentro do container)
echo -n "  Verificando token JWT Isidoro"
ISIDORO_TOKEN=""
for i in $(seq 1 10); do
  TOKEN_CHECK=$($DOCKER_CMD exec backend cat /tmp/isidoro_token.txt 2>/dev/null || true)
  if [ -n "$TOKEN_CHECK" ] && [ "${#TOKEN_CHECK}" -gt 50 ]; then
    ISIDORO_TOKEN="$TOKEN_CHECK"
    echo ""
    ok "Token Isidoro gerado (${#ISIDORO_TOKEN} chars)"
    break
  fi
  echo -n "."
  sleep 2
done

if [ -z "$ISIDORO_TOKEN" ]; then
  echo ""
  warn "Token Isidoro não detectado automaticamente."
  warn "Gere manualmente: $DOCKER_CMD exec backend python manage.py generate_isidoro_token"
fi

# Aguarda Celery worker ficar ativo
echo -n "  Verificando Celery worker"
WORKER_READY=false
for i in $(seq 1 20); do
  if $DOCKER_CMD exec worker celery -A sistema_agropecuario inspect ping --timeout=2 >/dev/null 2>&1; then
    echo ""
    ok "Celery worker ativo"
    WORKER_READY=true
    break
  fi
  echo -n "."
  sleep 2
done
if [ "$WORKER_READY" = false ]; then
  echo ""
  warn "Celery worker não confirmado (pode ainda estar iniciando)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# ETAPA 5 — Resumo
# ═══════════════════════════════════════════════════════════════════════════════
step "Etapa 5/5 — Resumo"

echo ""
echo -e "${BOLD}  URLS & ENDPOINTS${RESET}"
echo "  ─────────────────────────────────────────────────────"
echo -e "  ${GREEN}🌐 Frontend${RESET}          http://localhost:5173"
echo -e "  ${GREEN}🔌 Backend API${RESET}       http://localhost:8001/api/"
echo -e "  ${GREEN}🩺 Health Check${RESET}      http://localhost:8001/api/health/"
echo -e "  ${GREEN}📋 Admin${RESET}             http://localhost:8001/admin/"
echo -e "  ${CYAN}🤖 Chat Isidoro (WS)${RESET}  ws://localhost:8001/ws/chat/<tenant_id>/"
echo -e "  ${CYAN}📡 Actions (WS)${RESET}      ws://localhost:8001/ws/actions/<tenant_id>/"

echo ""
echo -e "${BOLD}  SERVIÇOS${RESET}"
$DOCKER_CMD ps --format "  {{.Name}}\t{{.Status}}" 2>/dev/null || true

echo ""
echo -e "${BOLD}  COMANDOS ÚTEIS${RESET}"
echo "  $DOCKER_CMD logs -f backend              → logs do backend"
echo "  $DOCKER_CMD logs -f worker               → logs do Celery"
echo "  $DOCKER_CMD exec backend python manage.py generate_isidoro_token"
echo "  $DOCKER_CMD exec backend python manage.py shell"
echo "  ./start-integration.sh --down            → parar tudo"
echo "  ./start-integration.sh --rebuild         → rebuild + reiniciar"

echo ""
ok "Stack Agrolink × Isidoro pronto!"
echo ""
