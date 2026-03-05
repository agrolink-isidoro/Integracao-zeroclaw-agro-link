#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${POSTGRES_USER:-agro_user}"

echo "$(date -u) - entrypoint: waiting for db at ${DB_HOST}:${DB_PORT}..."
# Wait for DB to be ready
until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}"; do
  echo "waiting for db"
  sleep 1
done

echo "DB ready, running migrations..."
# Run migrations with explicit error handling for clearer feedback
python manage.py migrate --noinput || { echo "ERROR: Migrations failed. See logs above for details." >&2; exit 1; }

# Optionally create a development superuser and demo data when explicitly enabled
if [ "${CREATE_DEV_USER:-false}" = "true" ]; then
  echo "Creating development superuser and demo data (if not present)..."
  python manage.py seed_dev
fi

# Ensure daphne is installed (ASGI server required for WebSockets)
if ! command -v daphne &> /dev/null; then
  echo "Installing daphne (ASGI server for WebSocket support)..."
  pip install daphne==4.1.2 -q
fi

# Ensure LangChain packages are installed (required for AI/WebSocket consumers)
echo "Checking LangChain dependencies..."
pip install -q \
  langchain-core>=0.3.0 \
  langchain-openai>=0.2.0 \
  langgraph>=0.2.0 \
  2>/dev/null || echo "LangChain already installed"

# Gera/renova o JWT do agente Isidoro (usuário de serviço ZeroClaw)
echo "Gerando JWT para o agente Isidoro..."
python manage.py generate_isidoro_token || echo "AVISO: Falha ao gerar token Isidoro (continuando...)"
if [ -f /tmp/isidoro_token.txt ]; then
  export ISIDORO_JWT_TOKEN
  ISIDORO_JWT_TOKEN=$(cat /tmp/isidoro_token.txt)
  echo "ISIDORO_JWT_TOKEN configurado (${#ISIDORO_JWT_TOKEN} chars)"
fi

# Execute the container command (e.g., daphne or runserver)
exec "$@"
