# 07 - Testes e Qualidade

**Status Atual (03-Mar-2026)**

- **E2E Hardening:** Aumentos de timeout, `waitForLoadState`, e padronização de helpers (`ensureLoggedInPage`) reduziram flakiness; ver `docs/archived/E2E_TEST_IMPROVEMENT_SUMMARY.md` e `docs/archived/E2E_TEST_STATUS_FINAL.md`.
- **CI:** Workflows atualizados para instalar GDAL/GEOS/PostGIS quando necessário em testes que dependem de campos geoespaciais.
- **Recomendações:** Expor timeouts configuráveis via env vars (ex.: `E2E_TIMEOUT_SEC`) e documentar passos para reproduzir falhas intermitentes (arquivo arquivado `E2E_DEBUG_EXECUTION_SUMMARY.md`).

**Última Revisão:** Março 2026  
**Links Relacionados:** [02-Setup-e-Instalacao.md](02-Setup-e-Instalacao.md) | [09-Desenvolvimento.md](09-Desenvolvimento.md)

## 🧪 Estratégias de Teste

### Backend
- **Framework:** Pytest + Django
- **Cobertura:** pytest-cov (>80%)
- **Tipos:** Unitários, integração, E2E (Playwright planejado)

### Frontend
- **Framework:** Jest + React Testing Library
- **Cobertura:** >80%
- **Tipos:** Unitários, componentes, E2E (Cypress)

## 🔧 Execução
```bash
# Backend
cd backend && pytest --cov=. --cov-report=html

# Manifestação (tests específicos)
# Unit + integration (rápido):
cd sistema-agropecuario/backend && USE_SQLITE_FOR_TESTS=1 python -m pytest apps/fiscal/tests/test_manifestacao_api.py -q

# Integration (assinatura com PFX) — recomenda-se executar em container com libs nativas (xmlsec/signxml):
# Exemplo de reprodução local (instala dependências nativas + signxml/xmlsec e executa o teste de integração):
# (requer apt-get / permissões de root na máquina/container)

sudo apt-get update && sudo apt-get install -y --no-install-recommends python3-pip python3-dev build-essential libxml2-dev libxmlsec1-dev libxmlsec1-openssl pkg-config libssl-dev openssl && \
  pip3 install -r sistema-agropecuario/backend/requirements.txt && pip3 install signxml xmlsec && \
  mkdir -p /tmp/testcert && base64 -d sistema-agropecuario/scripts/certs/test.pfx.b64 > /tmp/testcert/test.pfx && export FISCAL_TEST_PFX_PATH=/tmp/testcert/test.pfx && export USE_SQLITE_FOR_TESTS=1 && \
  cd sistema-agropecuario/backend && python -m pytest apps/fiscal/tests/test_manifestacao_integration.py::ManifestacaoIntegrationTest::test_sign_with_local_pfx_if_present -q

# Notes:
# - Alternatively run the above inside a disposable container or CI runner that includes libxmlsec / xmlsec1 binaries. See docs/FISCAL_TEMP/TEST_CERT_GENERATION.md for full runbook.

# Playwright E2E (enqueued toast — frontend):
PLAYWRIGHT_BASE_URL=http://localhost:5173 VITE_FISCAL_MANIFESTACAO_ENABLED=true npx playwright test sistema-agropecuario/frontend/tests/e2e/manifestacao-enqueued.spec.ts -q



# Novos testes úteis
# Notificação ao fornecedor (backend):
cd sistema-agropecuario/backend && USE_SQLITE_FOR_TESTS=1 python -m pytest apps/comercial/tests/test_compra_auto_nfe_notifications.py -q
# Playwright E2E (enqueued toast — frontend):
PLAYWRIGHT_BASE_URL=http://localhost:5173 VITE_FISCAL_MANIFESTACAO_ENABLED=true npx playwright test sistema-agropecuario/frontend/tests/e2e/manifestacao-enqueued.spec.ts -q

# Frontend
cd frontend && npm test -- --coverage
```

### GIS / PostGIS (Notas de teste)
- Alguns testes (ex.: `backend/apps/fiscal/tests`) dependem de **PostGIS** e das bibliotecas nativas **GDAL/GEOS**.
- Localmente: `docker compose up -d postgis` e, a partir da raiz do repositório, rode `pytest -q backend/apps/fiscal/tests`.
- Host (Ubuntu): instale `gdal-bin libgdal-dev libgeos-dev` e configure `GDAL_LIBRARY_PATH=$(gdal-config --prefix)/lib/libgdal.so` antes de rodar testes.
- CI: os workflows foram atualizados para instalar GDAL/GEOS e definir `GDAL_LIBRARY_PATH` automaticamente.

## 📊 Qualidade
- **Linting:** ESLint (frontend), Black/Flake8 (backend)
- **CI/CD:** GitHub Actions para builds e testes
- **Monitoramento:** Sentry para erros

## ✅ Boas Práticas
- Testes por feature
- Mocks para APIs externas
- Validação de acessibilidade</content>
<parameter name="filePath">/home/felip/projeto-agro/docs/07-Testes-e-Qualidade.md

- Arquivado: ver [docs/archived/E2E_TEST_STATUS_FINAL.md](docs/archived/E2E_TEST_STATUS_FINAL.md) para status E2E.