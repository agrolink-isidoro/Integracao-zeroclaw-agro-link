# Makefile - helper targets for local development (Docker-first)
# All docker compose commands use the compose file in sistema-agropecuario/

.PHONY: up frontend start stop logs

# Start full stack using Docker Compose (recommended)
up:
	cd sistema-agropecuario && docker compose up -d --build

# Start only frontend container
frontend:
	cd sistema-agropecuario && docker compose up -d --build frontend

# Start both backend and frontend
start:
	cd sistema-agropecuario && docker compose up -d --build backend frontend

# Stop all services
stop:
	cd sistema-agropecuario && docker compose down

# Follow frontend logs
logs-frontend:
	cd sistema-agropecuario && docker compose logs -f frontend

# Follow backend logs
logs-backend:
	cd sistema-agropecuario && docker compose logs -f backend

# Run frontend in local preview mode (fallback)
preview-local:
	cd sistema-agropecuario/frontend && npm ci && npm run build && npm run preview -- --port 5173

# Helper to run Playwright tests using existing services
playwright:
	cd sistema-agropecuario/frontend && npx playwright test --config=playwright.config.ts
