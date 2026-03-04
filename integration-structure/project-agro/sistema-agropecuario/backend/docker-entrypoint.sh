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

# Execute the container command (e.g., runserver)
exec "$@"
