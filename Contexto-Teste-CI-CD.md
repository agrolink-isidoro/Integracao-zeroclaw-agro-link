# Contexto CI/CD – Debug dos Testes de Backend

**Data:** 16 de março de 2026  
**Branch mergeada:** `ajustes-comercial-contracts` → `main`  
**Repo:** `agrolink-isidoro/Integracao-zeroclaw-agro-link`

---

## 1. Estado Atual: O que foi feito

### Workflows GitHub Actions criados

```
.github/workflows/ci.yml      → roda em todo push/PR
.github/workflows/deploy.yml  → roda só na main (GCP Cloud Run)
.github/CICD_SETUP.md         → guia de secrets + branch protection
```

### Commits relevantes (em ordem)
```
57d514c fix(ci/pytest): renomear minimal_test.py + testpaths=apps + marker slow
66be535 fix(ci): usar PostGIS real via service container em vez de SQLite
543e4f7 fix(ci): adicionar GDAL, zbar, WeasyPrint, tesseract ao runner
0b93fec ci: adicionar workflows GitHub Actions (CI + Deploy GCP Cloud Run)
b8342f0 fix(ts): resolver todos os erros TypeScript (37 erros, tsc EXIT 0)
```

---

## 2. Estado do CI agora (run #4 – FALHOU)

### Frontend: ✅ VERDE (100% passa)
- tsc --noEmit: zero erros
- vite build: sucesso

### Backend: ❌ VERMELHO

**Configuração atual do ci.yml (job backend-tests):**
- Runner: `ubuntu-latest`
- Service container: `postgis/postgis:15-3.4`
  - DB: `agro_db`, user: `agro_user`, senha: `agro_password`, porta: `5432`
- `DATABASE_URL=postgresql://agro_user:agro_password@localhost:5432/agro_db`
- `DJANGO_SETTINGS_MODULE=sistema_agropecuario.settings.test`
- `GDAL_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/`
- Step de `python manage.py migrate` passa ✅
- Step de `pytest --tb=short -q` falha ❌

**Contagem de testes na última simulação local:**
```
346 passed, 181 failed, 8 skipped, 2 xfailed, 1 xpassed
```

---

## 3. Causa Raiz das 181 Falhas

### Problema principal: Testes de API recebem **403 Forbidden**
A maioria das falhas segue este padrão:
```
AssertionError: 403 != 201
AssertionError: 403 != 200
AssertionError: 404 != 200
```

**Por que acontece?**  
O sistema tem **multi-tenancy**: cada usuário precisa ter uma `Fazenda` associada ao seu tenant para acessar os endpoints de negócio. Nos testes, os users são criados com `User.objects.create_user(...)` sem fazenda, e o middleware de tenant retorna 403/404.

**Testes que passam** são os que usam `create_superuser` (bypass do tenant) ou que testam explicitamente a negação de acesso.

### Distribuição das falhas por arquivo
```
16  apps/fiscal/tests/test_manifestacao_api.py
10  apps/financeiro/tests/test_rateio_api.py
 6  apps/administrativo/tests/test_folha_api.py
 5  apps/financeiro/tests/test_parcelas_generation.py
 4  apps/fiscal/tests/test_upload_xml_format_support.py
 4  apps/fiscal/tests/test_sefaz_client.py
 4  apps/fiscal/tests/test_item_override_api.py
 4  apps/estoque/tests/test_api_extra.py
 4  apps/agricultura/tests/test_kpis.py
 4  apps/administrativo/tests/test_centrocusto_api.py
 3  apps/maquinas/tests/test_ordem_servico_api.py
 3  apps/fiscal/tests/test_sefaz_ssl_communication.py
 3  apps/fiscal/tests/test_sefaz_client_manifestacao.py
 3  apps/fiscal/tests/test_qr_pdf_fallbacks.py
 3  apps/fiscal/tests/test_manifestacao_e2e_homolog.py
 3  apps/fiscal/tests/test_item_override_permissions.py
 3  apps/core/test_health.py       ← problema diferente (Redis)
 3  apps/comercial/tests/test_api_contratos_vendas.py
 ... (mais ~20 arquivos com 1-2 falhas cada)
```

### Outros problemas menores
- `apps/core/test_health.py` — testa Redis indisponível (mock), mas Redis está UP no CI. Os testes `test_health_check_redis_error` e `test_health_check_redis_missing_lib` esperam 503 mas recebem 200.
- `apps/fiscal/tests/test_sefaz_client.py` — testes de produção SEFAZ que podem precisar de cert/mock

---

## 4. Como reproduzir localmente

### Ambiente de dev local
```bash
# Container backend da stack de dev:
docker exec sistema-agropecuario-backend-1 sh -c "
  cd /app/backend
  DATABASE_URL='postgresql://agro_user:TlQp86uSldDS7TtOBQ90kyGlTnBB7g23@db:5432/agro_db' \
  DJANGO_SETTINGS_MODULE=sistema_agropecuario.settings.test \
  SECRET_KEY=ci-only-key DEBUG=True ISIDORO_API_KEY=ci-placeholder \
  python -m pytest apps/ --tb=short -q
"
```

### Simular CI exatamente (PostGIS fresh, senha agro_password)
```bash
# 1. Criar DB idêntico ao CI
docker run --name ci-postgres-test --rm -d \
  -e POSTGRES_DB=agro_db -e POSTGRES_USER=agro_user -e POSTGRES_PASSWORD=agro_password \
  -p 5433:5432 postgis/postgis:15-3.4

sleep 8

# 2. Rodar migrate
docker exec sistema-agropecuario-backend-1 sh -c "
  cd /app/backend
  DATABASE_URL='postgresql://agro_user:agro_password@172.17.0.1:5433/agro_db' \
  DJANGO_SETTINGS_MODULE=sistema_agropecuario.settings.test \
  SECRET_KEY=ci-only-key DEBUG=True ISIDORO_API_KEY=ci-placeholder \
  python manage.py migrate --noinput"

# 3. Rodar pytest
docker exec sistema-agropecuario-backend-1 sh -c "
  cd /app/backend
  DATABASE_URL='postgresql://agro_user:agro_password@172.17.0.1:5433/agro_db' \
  DJANGO_SETTINGS_MODULE=sistema_agropecuario.settings.test \
  SECRET_KEY=ci-only-key DEBUG=True ISIDORO_API_KEY=ci-placeholder \
  python -m pytest apps/ --tb=short -q"

# 4. Cleanup
docker rm -f ci-postgres-test
```

---

## 5. O que precisa ser corrigido nos testes

### Opção A — Corrigir setUp dos testes para criar tenant (RECOMENDADO)
Os testes precisam criar uma `Fazenda` + associar ao user antes de chamar APIs.

Padrão esperado no setUp:
```python
from apps.fazendas.models import Fazenda, Proprietario

def setUp(self):
    self.user = User.objects.create_user(username='testuser', password='pass')
    # Criar estrutura mínima de tenant
    self.proprietario = Proprietario.objects.create(nome='Test', cpf_cnpj='12345678901', user=self.user)
    self.fazenda = Fazenda.objects.create(nome='Fazenda Test', proprietario=self.proprietario)
    self.client = APIClient()
    self.client.force_authenticate(self.user)
```

Verificar como o middleware de tenant resolve o user → fazenda:
```
backend/sistema_agropecuario/middleware.py  (ou similar)
backend/apps/core/middleware.py
```

### Opção B — Criar fixture de tenant no conftest.py
Adicionar uma fixture de session/function que cria a estrutura mínima de tenant e pode ser reutilizada por todos os testes.

### Opção C — Usar superuser nos testes
Trocar `create_user` por `create_superuser` nos testes que testam funcionalidade (não permissões).

---

## 6. Estrutura do projeto (para referência)

```
integration-structure/project-agro/sistema-agropecuario/
├── backend/
│   ├── pytest.ini                 ← testpaths=apps, marker slow adicionados
│   ├── conftest.py                ← fixtures de certificado PKCS#12
│   ├── apps/
│   │   ├── core/
│   │   ├── fiscal/
│   │   ├── financeiro/
│   │   ├── administrativo/
│   │   ├── agricultura/
│   │   ├── comercial/
│   │   ├── estoque/
│   │   ├── maquinas/
│   │   └── fazendas/
│   └── sistema_agropecuario/
│       └── settings/
│           ├── base.py
│           ├── test.py            ← usa DATABASE_URL se definido
│           ├── minimal_testing.py ← renomeado de minimal_test.py (era coletado como teste)
│           ├── dev.py
│           └── prod.py
└── frontend/
    ├── package.json               ← @testing-library/user-event adicionado
    └── src/
```

---

## 7. ci.yml atual

```yaml
name: CI
on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  backend-tests:
    name: Backend Tests (pytest + PostGIS)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: integration-structure/project-agro/sistema-agropecuario/backend

    services:
      db:
        image: postgis/postgis:15-3.4
        env:
          POSTGRES_DB: agro_db
          POSTGRES_USER: agro_user
          POSTGRES_PASSWORD: agro_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U agro_user -d agro_db"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4
      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
      - name: Install system dependencies
        run: |
          sudo apt-get update -qq
          sudo apt-get install -y --no-install-recommends \
            build-essential pkg-config libxml2-dev libxslt1-dev \
            libxmlsec1-dev libxmlsec1-openssl xmlsec1 \
            libssl-dev libjpeg-dev poppler-utils libpq-dev postgresql-client \
            gdal-bin libgdal-dev libgeos-dev libproj-dev \
            libzbar0 libzbar-dev tesseract-ocr libtesseract-dev libleptonica-dev \
            libcairo2 libcairo2-dev libpango-1.0-0 libpango1.0-dev libpangoft2-1.0-0 \
            fonts-dejavu-core libffi-dev
      - name: Install Python dependencies
        run: pip install -r requirements.txt
      - name: Run migrations
        env:
          DATABASE_URL: postgresql://agro_user:agro_password@localhost:5432/agro_db
          DJANGO_SETTINGS_MODULE: sistema_agropecuario.settings.test
          SECRET_KEY: ci-only-insecure-key
          GDAL_LIBRARY_PATH: /usr/lib/x86_64-linux-gnu/
          GDAL_CONFIG: /usr/bin/gdal-config
        run: python manage.py migrate --noinput
      - name: Run pytest (PostGIS real)
        env:
          DATABASE_URL: postgresql://agro_user:agro_password@localhost:5432/agro_db
          DJANGO_SETTINGS_MODULE: sistema_agropecuario.settings.test
          SECRET_KEY: ci-only-insecure-key
          DEBUG: 'True'
          ISIDORO_API_KEY: ci-placeholder
          GDAL_LIBRARY_PATH: /usr/lib/x86_64-linux-gnu/
          GDAL_CONFIG: /usr/bin/gdal-config
        run: pytest --tb=short -q

  frontend-check:
    name: Frontend (tsc + vite build)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: integration-structure/project-agro/sistema-agropecuario/frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - name: TypeScript
        run: npx tsc --noEmit
      - name: Vite build
        run: npm run build
        env:
          NODE_ENV: production
```

---

## 8. Próximos passos (para continuar na outra sessão)

1. **Entender o middleware de tenant** — ler `backend/sistema_agropecuario/middleware.py` (ou onde esteja)
2. **Criar helper/fixture de tenant** no `conftest.py` para ser reutilizado nos testes
3. **Corrigir os 181 testes** adicionando a criação de fazenda/tenant no setUp
4. **Corrigir test_health** — os mocks de Redis precisam de patch correto
5. **Verificar test_sefaz_client** — pode precisar de variáveis de ambiente ou mocks adicionais
6. Push e confirmar CI verde

---

## 9. Informações de acesso

- **Repo:** https://github.com/agrolink-isidoro/Integracao-zeroclaw-agro-link
- **Branch principal após merge:** `main`
- **Workspace local:** `/home/agrolink/Integracao-zeroclaw-agro-link/`
- **Backend path:** `integration-structure/project-agro/sistema-agropecuario/backend/`
- **Frontend path:** `integration-structure/project-agro/sistema-agropecuario/frontend/`
- **Container backend:** `sistema-agropecuario-backend-1` (docker exec)
- **DB local dev:** senha `TlQp86uSldDS7TtOBQ90kyGlTnBB7g23` (arquivo `.env`)
- **DB CI simulado:** senha `agro_password` (definida no workflow)
