#!/bin/bash

# Script para iniciar os servidores do Sistema Agropecuário

echo "🚀 Iniciando Sistema Agropecuário..."

# Verificar se os containers Docker estão disponíveis e preferir Docker Compose
echo "📦 Verificando disponibilidade do Docker..."


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

if [ "$DOCKER_OK" = true ]; then
  echo "🐳 Docker disponível — usando Docker Compose (modo recomendado)"
  cd "$(dirname "$0")" || exit 1
  $DOCKER_CMD up -d --build || {
    echo "❌ Falha ao rodar '$DOCKER_CMD up'. Verifique permissões do Docker.";
    exit 1;
  }
  echo "Aguardando backend ficar saudável..."
  # Wait for backend health
  for i in {1..60}; do
    if curl -sS http://localhost:8001/api/health/ >/dev/null 2>&1; then
      echo "✅ Backend saudável"
      break
    fi
    sleep 1
  done
  if ! curl -sS http://localhost:8001/api/health/ >/dev/null 2>&1; then
    echo "❌ Backend não respondeu após timeout"
    exit 1
  fi

  # Wait for frontend server to be ready
  echo "Aguardando frontend (Vite) ficar disponível..."
  for i in {1..30}; do
    if curl -sS -o /dev/null -I http://localhost:5173/ >/dev/null 2>&1; then
      echo "✅ Frontend disponível"
      break
    fi
    sleep 1
  done
  if ! curl -sS -o /dev/null -I http://localhost:5173/ >/dev/null 2>&1; then
    echo "⚠️ Frontend não respondeu após timeout (mas backend está OK)."
  else
    # Test whether /api/health is reachable through the frontend proxy
    if curl -sS http://localhost:5173/api/health/ >/dev/null 2>&1; then
      echo "✅ Proxy /api/health/ funcionando (via frontend)"
    else
      echo "⚠️ Proxy /api/health/ não responde via frontend. Você pode acessar backend em http://localhost:8001/"
      echo "Se estiver usando Docker, a aplicação tenta encaminhar /api ao serviço 'backend' no Docker network. Se falhar, verifique o container 'frontend' ou ajuste VITE_API_BASE." 
    fi
  fi

  echo "✅ Todos os serviços Docker iniciados"
  echo "🌐 Frontend: http://localhost:5173"
  echo "🔌 Backend:  http://localhost:8001"
  echo "🗄️  Database: PostgreSQL (via Docker)"
  echo ""
  echo "Para parar os serviços: docker compose down"
  exit 0
fi

# Fallback: iniciar localmente (use apenas se não usar Docker)
if [ "$1" = "--local" ]; then
  echo "⚠️  Docker não disponível — iniciando localmente (fallback)"
  # Parar qualquer servidor anterior
  pkill -f "manage.py runserver" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true

  echo "🐍 Iniciando Backend Django (local)..."
  cd "$(dirname "$0")"/backend || exit 1
  source venv/bin/activate
  DB_PORT="${DATABASE_PORT:-5435}"
  DATABASE_URL="postgresql://agro_user:secret_password@localhost:${DB_PORT}/agro_db" python manage.py runserver 127.0.0.1:8001 &
  BACKEND_PID=$!

  echo "⚛️  Iniciando Frontend (local)..."
  cd ../frontend || exit 1
  VITE_API_BASE='http://localhost:8001/api/' nohup npm run dev -- --host 0.0.0.0 --port 5173 > /tmp/vite.log 2>&1 &
  FRONTEND_PID=$!

  echo "✅ Sistema iniciado (local fallback)"
  echo "🌐 Frontend: http://localhost:5173"
  echo "🔌 Backend:  http://localhost:8001"
  exit 0
fi

# If we reach here, Docker wasn't available and --local was not specified
echo "❌ Docker não encontrado. Para iniciar localmente, execute: $0 --local"
