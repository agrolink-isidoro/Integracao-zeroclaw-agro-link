# 02 - Setup e Instalação

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — revise variáveis `TENANT_*` no ambiente.
- **Servidores:** Evitar executar `npm run dev` ou `python manage.py runserver` como `root`; use Docker Compose em dev ou um usuário não-root.
- **E2E:** Pipeline requer PostGIS/GDAL — CI foi atualizado; ver `docs/archived/E2E_TEST_STATUS_FINAL.md`.

**Última Revisão:** Março 2026
**Links Relacionados:** [01-Visao-Geral.md](01-Visao-Geral.md) | [03-Arquitetura.md](03-Arquitetura.md) | [README.md](../README.md)

## 🚀 Setup Rápido (5 minutos)

### Pré-requisitos
- Docker & Docker Compose
- Git
- Python 3.10+ (opcional para dev local)
- Node.js 18+ (opcional para dev local)

### 1. Clone e Dependências
```bash
git clone https://github.com/tyrielbr/project-agro.git
cd project-agro/sistema-agropecuario
```

### 2. Iniciar Serviços (Docker Recomendado)
```bash
# Build e start todos os serviços
docker compose up -d --build

# Verificar status
docker compose ps
```

**Serviços Iniciados:**
- Backend (Django): http://localhost:8000
- Frontend (React): http://localhost:5173
- DB (PostgreSQL/PostGIS): Porta 5432
- Redis: Porta 6379

### 3. Verificação
- Acesse http://localhost:5173 para UI
- API Health: curl http://localhost:8000/api/health/
- Logs: docker compose logs -f [service]

## 🛠️ Desenvolvimento Local (Alternativo)

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔧 Troubleshooting Comum

### Erro: Porta ocupada
```bash
# Matar processo na porta
lsof -ti:8000 | xargs kill -9
```

### DB não conecta
- Verificar `docker compose logs db`
- Reset: `docker compose down -v && docker compose up -d db`

### Dependências desatualizadas
```bash
# Backend
pip install -r requirements.txt --upgrade

# Frontend
npm update
```

### GDAL / PostGIS (Requisitos para testes GIS)
- Para executar testes que usam campos geoespaciais e a integração fiscal, é necessário PostGIS e bibliotecas nativas GDAL/GEOS.
- Em Ubuntu:
```bash
sudo apt-get update
sudo apt-get install -y gdal-bin libgdal-dev libgeos-dev
export GDAL_LIBRARY_PATH=$(gdal-config --prefix)/lib/libgdal.so
```
- Alternativa (recomendado): use o `postgis` service em `docker compose` para reproduzir o ambiente de CI (`docker compose up -d postgis`).

## 📋 Próximos Passos
Após setup, consulte [03-Arquitetura.md](03-Arquitetura.md) para entender o sistema.</content>
<parameter name="filePath">/home/felip/projeto-agro/docs/02-Setup-e-Instalacao.md