# 🌾 Sistema Agropecuário

**Sistema completo de gestão agropecuária com 7 módulos integrados**

[![Status](https://img.shields.io/badge/Status-Em%20Finaliza%C3%A7%C3%A3o-orange)](https://github.com/tyrielbr/project-agro)
[![Branch](https://img.shields.io/badge/Branch-main-blue)](https://github.com/tyrielbr/project-agro/tree/main)
[![Fase](https://img.shields.io/badge/Fase-Finaliza%C3%A7%C3%A3o%20para%20Produ%C3%A7%C3%A3o-orange)](docs/FASE_ATUAL.md)

---

## 🎯 Status Atual (Fevereiro 2026)

**Sistema com todos os módulos implementados — Fase final de integração**

- ✅ **Backend:** APIs completas para todos os módulos
- ✅ **Frontend:** Interfaces para operações agrícolas, financeiro, comercial
- ✅ **Financeiro Avançado:** Transferências (DOC/TED/PIX), fluxo de caixa, vencimentos com badges
- ✅ **Manifestações de NF-e:** Sistema completo de manifestação fiscal com certificados A3
- ✅ **RBAC completo:** controle de acesso baseado em funções está implantado. Inclui middleware de autorização, telas de gestão (usuários, perfis, auditoria) e 10+ testes e2e cobrindo fluxos de administração.
- ⚠️ **Próximos passos:** Integrações entre módulos e migração multi-tenant (RBAC single-tenant concluído).
- 📋 **Plano:** [TODO_FINALIZACAO.md](docs/TODO_FINALIZACAO.md)

### ✨ Implementações Recentes (Fevereiro 2026)
- **Manifestações de NF-e:** Seleção de certificado digital, validações preventivas (ciência/conclusiva, limite 2 retificações, prazos SEFAZ), sincronização com SEFAZ via NFeDistribuicaoDFe
- **Sincronização Remota:** Coordenação por certificado, batching, idempotência e validações
- **Certificados A3:** Suporte PKCS#11 com validation e runbook
- **Financeiro:** Transferências entre contas, fluxo de caixa com filtros avançados
- **Documentação:** [docs/04-Modulos/Fiscal/Manifestacao.md](docs/04-Modulos/Fiscal/Manifestacao.md) para fluxo completo e [docs/05-APIs-e-Endpoints.md](docs/05-APIs-e-Endpoints.md) para API reference

---

## 🚀 Início Rápido

### Para Desenvolvedores

Recomendo usar Docker Compose para um ambiente idêntico ao que usamos nos testes (Postgres + Redis + backend). Alternativamente há instruções para rodar localmente sem Docker.

**Nota sobre execução local de workflows pesados:** antes de usar `act` para reproduzir jobs do CI (por exemplo: Playwright E2E integrações ou testes de assinatura XML que exigem `xmlsec`), consulte nossa política e guia de uso em `docs/CI/ACT_POLICY.md` para práticas recomendadas, exemplos de comandos e checklist de segurança. Evite executar `act` desnecessariamente — prefira executar unidades e testes focados primeiro para acelerar o ciclo de desenvolvimento.

Nota rápida: instruções para agentes de IA estão na pasta `Double-AiA/` do projeto.
A) Backend (Docker - recomendado)

```bash
cd sistema-agropecuario
# Starta o sistema (Postgres + Redis + Backend)
docker compose up --build -d

# Verifique se o backend está saudável (healthcheck HTTP)
docker inspect --format='{{json .State.Health}}' sistema-agropecuario-backend-1

# Verifique logs e migrações aplicadas
docker compose logs --no-color backend --since 5m
docker compose exec -T backend python manage.py showmigrations
# Cheque o endpoint de saúde
curl -sS http://localhost:8001/api/health/

## Solução rápida de problemas (migrações e permissões) 🔧

**Nota rápida:** Sim — quando você roda `docker compose up`, o backend tenta aplicar as migrations automaticamente (ele executa `python manage.py migrate` no entrypoint). Isso é esperado; se a migração falhar por causa de um banco com estado antigo (ex.: `relation "comercial_contrato" already exists`), siga os passos abaixo.

- Erro de migração: `ProgrammingError: relation "comercial_contrato" already exists`
  - Causa comum: banco contém tabelas ou migrations antigas.
  - Solução simples (recomendada para desenvolvimento):

```bash
# Isto remove os volumes do compose (apaga dados do DB do compose)
docker compose down -v
# Subir a stack limpa
docker compose up --build -d
```

  - Alternativa avançada (drop do schema):

```bash
docker compose exec -T db psql -U agro_user -d agro_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
# reinicie o backend em seguida
docker compose restart backend
```

- Permissões: se aparecer `PermissionError` ao salvar arquivos (ex.: `certificados_sefaz/*`, `.pytest_cache`), corrija a propriedade:

```bash
sudo chown -R $(whoami):$(whoami) sistema-agropecuario/backend
```

- Rodar migrações manualmente:

```bash
# via Docker
docker compose exec -T backend python manage.py migrate

# local (venv)
cd sistema-agropecuario/backend
source venv/bin/activate
python manage.py migrate
```

> Dica: se você recriar ou editar migrations localmente, é provável que seja preciso resetar o DB do compose (como acima) para evitar conflitos.

- **Tela branca ao abrir http://localhost:5173 (erro de import no console do navegador):**
  - **Sintoma:** Página branca vazia, e no DevTools (F12 → Console) aparece erro como:
    ```
    Uncaught Error: Could not resolve "@emotion/react" imported by "@mui/styled-engine"
    ```
  - **Causa comum:** Dependências npm não foram instaladas corretamente ou cache do navegador está obsoleto.
  - **Solução recomendada (mais rápida):**

```bash
# Reconstruir os containers do zero (força reinstalação de todas as dependências)
cd sistema-agropecuario
docker compose down -v
docker compose up --build -d

# Aguarde 10-15 segundos para o frontend compilar completamente
# Depois, acesse http://localhost:5173 com CTRL+SHIFT+R (hard refresh)
```

  - **Solução alternativa (se apenas o frontend tiver problema):**

```bash
cd sistema-agropecuario
docker compose exec frontend npm install
docker compose restart frontend
# Acesse http://localhost:5173 com CTRL+SHIFT+R
```

  - **Dica:** Se a tela ainda permanecer branca após hard refresh, verifique:
    - `docker compose logs frontend` — procure por erros de compilação
    - Limpe o cache do navegador manualmente (DevTools → Network → Disable cache)

> Observação: o backend expõe a API no host `localhost:8001` (mapeamento do docker-compose para a porta interna `8000`).

B) Backend (local sem Docker)

```bash
cd sistema-agropecuario/backend
python -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
# Configure um Postgres local e Redis, então exporte as variáveis de ambiente:
export DATABASE_URL='postgresql://<user>:<pw>@localhost:5432/agro_db'
export REDIS_URL='redis://localhost:6379/0'
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

**Nota:** o fluxo recomendado para desenvolvimento é usar **Docker Compose** — se você estiver usando Docker, não precisa criar um virtualenv. Caso prefira rodar o backend localmente (fora do Docker), crie um ambiente virtual chamado `venv` e instale as dependências (`python -m pip install -r requirements.txt`). Durante o run limpo eu usei um `venv` local para executar testes e comandos Django; isso é necessário apenas para execução local. Para rodar testes rapidamente sem Postgres, exporte `USE_SQLITE_FOR_TESTS=1` (ver seção de testes). **Não comite** o diretório `venv` (já consta em `.gitignore`).

C) Frontend (recomendado: Docker Compose)

```bash
# Recomendado: executar o frontend em container (mesma rede do backend)
cd sistema-agropecuario
docker compose up -d --build frontend

# Acessar a UI: http://localhost:5173
# Ver logs: docker compose logs -f frontend
```

Alternativa — dev local (quando necessário):

```bash
cd sistema-agropecuario/frontend
# Ajuste VITE_API_BASE para apontar para o backend no host
VITE_API_BASE='http://localhost:8001/api/' npm ci && \
VITE_API_BASE='http://localhost:8001/api/' npm run dev -- --host 0.0.0.0 --port 5173
```

Integração Frontend↔Backend:
- O cliente usa a variável de ambiente Vite `VITE_API_BASE` para apontar a API. Quando o frontend roda dentro de Docker Compose, o proxy usa o serviço `backend` automaticamente. Quando roda localmente, defina `VITE_API_BASE='http://localhost:8001/api/'` para direcionar ao backend no host.


---

## 🔬 Testes (rápido)

Abaixo há **duas opções independentes** — escolha só uma conforme seu fluxo: **A. Dentro do Docker (recomendado)** ou **B. Local (sem Docker)**.

### A. Dentro do Docker (recomendado) ✅

1) Suba a stack (Postgres/PostGIS + Redis + Backend):

```bash
cd sistema-agropecuario
docker compose up -d
```

---

### 💠 CI: Testes de assinatura (PKCS#12 / .pfx) - configuração rápida

Há um workflow de integração que verifica assinaturas XMLDSig usando um certificado PKCS#12 de teste.

1) Gere (localmente) o `.pfx` de teste (ou use `scripts/generate_test_pfx.sh`).

2) Codifique para Base64 e adicione como Secret no GitHub (Settings → Secrets):

```bash
# gerar base64 sem quebras de linha
base64 scripts/certs/test.pfx | tr -d '\n' > test.pfx.b64
# copie o conteúdo de test.pfx.b64 e cole no secret: FISCAL_TEST_PFX_BASE64
# adicione também o FISCAL_TEST_PFX_PASS (ex.: testpass)
```

3) O workflow `Fiscal PKCS#12 Signature Integration` irá rodar apenas quando ambos os secrets existirem. Você também pode dispará-lo manualmente via *Actions -> Fiscal PKCS#12 Signature Integration -> Run workflow*.

> Nota: o job instala dependências do sistema (`xmlsec`, `libxml2`) e `signxml` no ambiente para validar as assinaturas.

---

2) Verifique rapidamente que o backend está saudável (opcional):

```bash
curl -sS http://localhost:8001/api/health/  # deve retornar {"db":"ok","redis":"ok"}
```

3) Rode os testes dentro do container backend:

```bash
docker compose exec -T backend python -m pytest
```

Dicas rápidas:
- Executar apenas um arquivo: `docker compose exec -T backend python -m pytest apps/fiscal/tests/test_upload_xml.py -q`
- Filtrar por nome com `-k` ou adicionar `-q -s` para logs em stdout.

Por que é preferível: usa o mesmo banco (PostGIS) e serviços que o ambiente de desenvolvimento/integração, evitando diferenças de ambiente.

---

### B. Local (sem Docker)

Use esta opção apenas se precisar rodar testes sem containers (mais rápido para pequenos ciclos).

1) Crie e ative o `venv` (padrão do time):

```bash
cd sistema-agropecuario/backend
python3 -m venv venv
source venv/bin/activate
```

2) Instale dependências:

```bash
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt
```

3) Testes rápidos sem Postgres (modo SQLite):

```bash
export USE_SQLITE_FOR_TESTS=1
venv/bin/python -m pytest apps/fiscal/tests -q
```

4) Para rodar a suíte completa localmente é necessário um Postgres/PostGIS e `DATABASE_URL` configurado; caso prefira, use a opção A (Docker).

Problemas comuns:
- Se aparecer `PermissionError` ao gravar arquivos (ex.: `certificados_sefaz/*`):

```bash
sudo chown -R $(whoami):$(whoami) sistema-agropecuario/backend
```

Por que usar `venv`: isola dependências, garante versões consistentes e evita poluir o Python do sistema.

**Observação final:** o fluxo recomendado é **A (Docker)**; use **B (venv/local)** apenas quando precisar de ciclos rápidos sem containers. **Não comite** o diretório `venv` (já está no `.gitignore`).

---




## 🧾 Notas sobre APIs relevantes (formato de erros)

- Upload de NF-e (`POST /api/fiscal/nfes/upload_xml/`):
  - Quando alguns campos excedem o tamanho do banco de dados, a API retorna **HTTP 400** com payload padronizado:

```json
{
  "error": "validation_error",
  "detail": "Alguns campos excedem o tamanho do banco de dados",
  "bad_fields": [
    {
      "field": "emitente_nome",
      "code": "max_length_exceeded",
      "max_length": 60,
      "length": 100,
      "message": "Campo 'emitente_nome' tem tamanho 100 que excede o máximo 60",
      "value_preview": "AAAAA..."
    }
  ]
}
```

- Upload de certificado SEFAZ (`POST /api/fiscal/certificados/`):
  - Aceitamos, por padrão, **.p12** e **.pfx**; tamanho máximo padrão **1MB**. Retorna `HTTP 201` com `{id, nome}` em uploads válidos.
  - Em erros, retorna `HTTP 400` com `error` indicando `invalid_file_type` ou `file_too_large`.
  - **Nota:** o upload básico está funcional; **metadados como `arquivo_name` agora são retornados na resposta** quando aplicável, e as rotinas de migração/rotação de certificados foram corrigidas e testadas. Veja `docs/SEFAZ_CERTIFICATE_MAINTENANCE.md` e `docs/FISCAL_API.md` para detalhes operacionais e runbook.


## 🔧 SEFAZ — Manifestações e Conexão com SEFAZ (Simulação / Homolog / Produção) ✅

### 📌 Resumo rápido
- O fluxo de manifestação pode ser executado em **modo simulado** (dev) ou **real** (homolog / produção).  
- Upload de certificados (PKCS#12: .p12/.pfx ou A3) é feito pela UI (modal "Importar Arquivos Fiscais → Certificado") e armazenado no backend (`CertificadoSefaz` / `CertificadoA3`).  
- O backend (task `send_manifestacao_task` e `SefazClient`) usa o certificado ativo para assinar/autenticar e enviar o evento ao SEFAZ.

---

### 1) Como conectar em MODO SIMULAÇÃO (desenvolvimento) ✅
- Defina variáveis de ambiente:
  - SEFAZ_AMBIENTE=2  # homologação/testes  
  - SEFAZ_SIMULATE_ON_ERROR=true  # ativa fallback/simulação quando ocorrer erro de comunicação/SSL em dev  
  - (opcional) SEFAZ_SIMULATE_ONLY=true  # força simulação sempre  
- Docker (exemplo):
```bash
export SEFAZ_AMBIENTE=2
export SEFAZ_SIMULATE_ON_ERROR=true
docker compose up -d --build
```
- Testar localmente (ex.): crie manifestação via API e execute:
```bash
# criar manifestação (ex.)
curl -X POST http://localhost:8001/api/fiscal/nfes/<NFE_ID>/manifestacao/ -H "Authorization: Bearer <token>" -d '{"tipo":"ciencia"}'

# processar pendentes (simula sucesso)
docker compose exec -T backend python manage.py process_pending_manifestacoes
```
- Para debug programático:
```py
from apps.fiscal.services.sefaz_client import SefazClient
client = SefazClient(simulate=True)
client.send_manifestacao('0'*44, 'ciencia')
```

---

### 2) Como conectar REAL em SANDBOX (homologação) 🔁
- Configuração:
  - SEFAZ_AMBIENTE=2 (homologação)
  - SEFAZ_SIMULATE_ON_ERROR=false (prefira testar com certificado válido)
  - SEFAZ_SSL_VERIFY=True (recomendado para sandbox com certificados válidos)
- Fluxo (PKCS#12):
  1. Via UI: Modal → aba *Certificado* → selecionar `.p12` / `.pfx` → Enviar (ou use `POST /api/fiscal/certificados/`).
  2. Backend valida PKCS#12 (extrai fingerprint, validade) e armazena (`CertificadoSefaz.arquivo` ou `arquivo_encrypted` se `CERT_ENCRYPTION_KEY` estiver definido).
  3. Para A3: use `POST /api/certificados-a3/upload/` e depois `POST /api/certificados-a3/<id>/ativar/`.
  4. Dispare `send_manifestacao_task(manifestacao_id)` (via Celery) ou crie e aguarde o worker.
- Endpoints úteis:
  - `POST /api/fiscal/certificados/` — upload PKCS#12 (.p12/.pfx)  
  - `POST /api/certificados-a3/upload/` — upload A3  
  - `POST /api/certificados-a3/<id>/ativar/` — ativar A3  
  - `GET /api/certificados-a3/status/` — status do A3 ativo

---

### 3) Como conectar REAL em PRODUÇÃO (fiscal real) ⚠️
- Regras imprescindíveis:
  - `DEBUG=False`
  - `SEFAZ_AMBIENTE=1`
  - `SEFAZ_SIMULATE_ON_ERROR=False` (JAMAIS simular em produção)
  - `SEFAZ_SSL_VERIFY=True`
  - Certificado A1/A3 válido (emitido por AC credenciada)
  - Proteger armazenamento do certificado (usar `CERT_ENCRYPTION_KEY` e permissões restritas)
- Checklist mínimo antes de ativar produção:
  - [ ] `DEBUG=False`
  - [ ] `SEFAZ_AMBIENTE=1`
  - [ ] `SEFAZ_SIMULATE_ON_ERROR=False`
  - [ ] Certificado válido upload feito e verificado (`CertificadoSefaz.validar_certificado()` ou A3 ativado)
  - [ ] URLs SEFAZ corretas configuradas (`SEFAZ_URLS`)
  - [ ] Logs / auditoria ativados e backup dos certificados

---

### 📥 A UI (modal de envio de certificado) — como funciona
- Componentes frontend:
  - `NfeUploadModal.tsx` — modal com aba **Certificado**.
  - `CertificadoUpload.tsx` — componente que envia para `POST /api/fiscal/certificados/`.
- Aceita: **.p12**, **.pfx**, **.pem** (frontend mostra limite 10MB).  
- Observação crítica: o backend por padrão usa `CERT_MAX_UPLOAD_SIZE = 1MB` (configurável). Ajuste `CERT_MAX_UPLOAD_SIZE` para alinhar com UI (ex.: 10MB) se necessário.
- O upload **apenas armazena/valida** o certificado — a conexão real com SEFAZ ocorre quando o sistema (task ou chamada) usa o certificado para assinar/enviar a manifestação.

---

### 🛠️ Comandos & testes úteis
- Docker compose:
```bash
docker compose up -d --build
```
- Rodar testes relevantes:
```bash
# testes SSL / fallback
docker compose exec -T backend python -m pytest apps/fiscal/tests/test_sefaz_ssl_communication.py -q

# testes integração A3 (só se houver A3 configurado)
docker compose exec -T backend python -m pytest apps/fiscal/tests/test_certificado_a3_real.py::TestCertificadoA3Real::test_manifestacao_sucesso_real_com_certificado_a3 -q
```
- Upload via curl (PKCS#12):
```bash
curl -X POST http://localhost:8001/api/fiscal/certificados/ \
  -H "Authorization: Bearer <token>" \
  -F "nome=Meu Certificado" \
  -F "arquivo=@/caminho/para/certificado.p12"
```
- A3 upload:
```bash
curl -X POST http://localhost:8001/api/certificados-a3/upload/ \
  -H "Authorization: Bearer <token>" \
  -F "nome=Meu A3" \
  -F "arquivo_certificado=@/caminho/para/certificado.p12" \
  -F "senha_certificado=SUA_SENHA"
```

---

> ⚠️ Observações finais importantes
> - A modal NÃO envia automaticamente para SEFAZ; ela faz upload/validação. A utilização real do certificado fica a cargo do backend.  
> - Ajuste `CERT_ENCRYPTION_KEY` para cifrar certificados em repouso.  
> - Em produção, NÃO use flags de simulação.

---



## 🖥️ Frontend — Implementação mínima (F)

- A página **Fiscal** (`/fiscal`) inclui agora componentes mínimos para:
  - **Upload de NF-e (XML)** — envia `POST /api/fiscal/nfes/upload_xml/` e exibe erros de validação (`bad_fields`).
  - **Upload de certificado SEFAZ** — envia `POST /api/fiscal/certificados/` com validação básica no cliente.

- Arquivos adicionados:
  - `frontend/src/services/fiscal.ts` — funções de API (`uploadXml`, `uploadCert`, `sendToSefaz`, `downloadXml`).
  - `frontend/src/components/fiscal/NfeUpload.tsx` — componente de upload XML.
  - `frontend/src/components/fiscal/CertificadoUpload.tsx` — componente de upload de certificado.
  - Testes: `frontend/src/components/fiscal/__tests__` cobrindo os fluxos básicos.


---

*Se quiser, posso também adicionar um pequeno script Makefile ou NPM script para facilitar esses passos.*
---


### Para Retomar o Trabalho

**👉 Comece aqui:** [docs/TODO_FINALIZACAO.md](docs/TODO_FINALIZACAO.md) (plano de finalização)

---

## 📚 Documentação Completa

Toda a documentação técnica está organizada na pasta [`docs/`](docs/)

### Documentos Principais

| Documento | Descrição |
|-----------|-----------|
| **[📋 TODO_FINALIZACAO.md](docs/TODO_FINALIZACAO.md)** | Plano crítico para produção - **COMECE AQUI!** |
| **[⚡ 01-Visao-Geral.md](docs/01-Visao-Geral.md)** | Visão geral do projeto (5 min) |
| **[📊 02-Setup-e-Instalacao.md](docs/02-Setup-e-Instalacao.md)** | Configuração do ambiente de desenvolvimento |
| **[🏗️ 03-Arquitetura.md](docs/03-Arquitetura.md)** | Stack, diagramas e arquitetura do sistema |
| **[📁 04-Modulos/](docs/04-Modulos/)** | Detalhes por módulo (agrícola, financeiro, comercial, etc.) |
| **[🔌 05-APIs-e-Endpoints.md](docs/05-APIs-e-Endpoints.md)** | Documentação completa da API REST |
| **[🖥️ 06-Frontend.md](docs/06-Frontend.md)** | Componentes, formulários e interface |
| **[🧪 07-Testes-e-Qualidade.md](docs/07-Testes-e-Qualidade.md)** | Estratégias de teste e qualidade |
| **[🔗 08-Integracoes-e-Relacionamentos.md](docs/08-Integracoes-e-Relacionamentos.md)** | Inter-relações entre módulos |
| **[🔄 09-Desenvolvimento.md](docs/09-Desenvolvimento.md)** | Guias de desenvolvimento e melhores práticas |
| **[📅 10-Historico-e-Mudancas.md](docs/10-Historico-e-Mudancas.md)** | Timeline completa do desenvolvimento |

**📑 Índice completo:** [docs/README.md](docs/README.md)

---

## 🎯 Status do Projeto

### 🔄 Sistema Completo - Fase de Finalização (Fevereiro 2026)

**Todos os módulos implementados - Preparação final para produção**

- ✅ **Backend:** APIs completas para 7 módulos com RBAC ativo em todas as ViewSets e middleware de permissão
- ✅ **Frontend:** Interfaces principais implementadas, agora com tabs de Gestão de Usuários, Perfis e Auditoria no módulo Administrativo
- ✅ **Financeiro:** Transferências, fluxo de caixa, vencimentos com badges
- ✅ **NFE:** Correção implementada (vendas apenas)
- ✅ **RBAC:** Totalmente implementado com 7 perfis seed, painel administrativo, delegações e auditoria. Veja seção abaixo para detalhes.
- 📋 **Plano de Ação:** [docs/TODO_FINALIZACAO.md](docs/TODO_FINALIZACAO.md)

**Cronograma Atualizado:**
- **Semana 1 (10-14/02):** Testes finais e validações
- **Semana 2 (17-21/02):** Deploy em produção e monitoramento
- **Integração IA:** Fevereiro 2026 (adiada)

---

## 🛠️ Stack Tecnológico

### Backend
- **Framework:** Django 4.2.16
- **API:** Django REST Framework
- **Database:** PostgreSQL + PostGIS
- **Python:** 3.x

### Frontend
- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite 7.2.7
- **UI:** Bootstrap 5 + React Icons
- **HTTP Client:** Axios

### DevOps
- **Controle de Versão:** Git
- **Repositório:** GitHub
- **Branch Atual:** `main`

---

## 📂 Estrutura do Projeto

```
project-agro/
├── sistema-agropecuario/    # Sistema principal
│   ├── backend/             # Django API
│   │   ├── apps/
│   │   │   ├── core/        # Autenticação, usuários, permissões
│   │   │   ├── agricultura/ # Operações, plantios, culturas
│   │   │   ├── fazendas/    # Propriedades, talhões (PostGIS)
│   │   │   ├── estoque/     # Produtos, movimentações, lotes
│   │   │   ├── maquinas/    # Equipamentos, manutenções
│   │   │   ├── financeiro/  # Créditos, rateios, contas
│   │   │   ├── comercial/   # Compras, vendas, fornecedores
│   │   │   ├── administrativo/ # Folha, impostos trabalhistas
│   │   │   └── fiscal/      # NFE, certificados SEFAZ
│   │   ├── manage.py
│   │   └── requirements.txt
│   │
│   ├── frontend/            # React SPA
│   │   ├── src/
│   │   │   ├── pages/       # Componentes de página
│   │   │   ├── services/    # API clients
│   │   │   └── components/  # Componentes reutilizáveis
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── docker-compose.yml   # Ambiente completo
│
├── docs/                    # Documentação completa (4.000+ linhas)
│   ├── 01-Visao-Geral.md
│   ├── 02-Setup-e-Instalacao.md
│   ├── TODO_FINALIZACAO.md
│   └── ...
│
└── Double-AiA/              # Sistema de agentes IA
    ├── agents.md
    ├── Manual-Comece-Aqui.md
    └── ...
```

---

## 🚀 Funcionalidades Principais

### Módulos Implementados
- 🌾 **Agrícola:** Operações, plantios, culturas, safras
- 🏠 **Fazendas:** Gestão de propriedades e talhões (PostGIS)
- 📦 **Estoque:** Produtos, movimentações, lotes
- 🚜 **Máquinas:** Equipamentos e manutenções
- 💰 **Financeiro:** Créditos, rateios, contas bancárias, transferências
- 🛒 **Comercial:** Compras, vendas, fornecedores
- 📊 **Administrativo:** Folha de pagamento, impostos trabalhistas
- 🧾 **Fiscal:** NFE, certificados SEFAZ, obrigações
- 👥 **Core:** Autenticação JWT, usuários, permissões RBAC (implementado com 7 perfis seed e auditoria)

### Destaques Técnicos
- **Geolocalização:** PostGIS para mapas e talhões
- **Integrações:** APIs entre módulos (estoque↔comercial, fiscal↔comercial)
- **Autenticação:** JWT com refresh tokens
- **Frontend:** React/TypeScript com Bootstrap 5
- **Backend:** Django REST Framework com PostgreSQL

---

## 📊 Métricas

- **Linhas de Código:** ~15.000+ (backend + frontend)
- **Documentação:** 4.000+ linhas organizadas
- **Módulos:** 7 módulos completos + core
- **APIs:** 50+ endpoints REST
- **Commits:** 50+ (desenvolvimento completo)
- **Tempo Total:** ~100+ horas de desenvolvimento
- **Status:** Sistema completo, finalização para produção

---

## 🤝 Contribuindo

Este projeto está em desenvolvimento ativo. Para contribuir:

1. Leia a documentação em [`docs/`](docs/)
2. Siga o [09-Desenvolvimento.md](docs/09-Desenvolvimento.md)
3. Crie uma branch a partir de `main`
4. Faça suas alterações
5. Envie um Pull Request

---

## 📞 Suporte

- **Documentação:** [`docs/`](docs/)
- **Problemas Comuns:** [02-Setup-e-Instalacao.md](docs/02-Setup-e-Instalacao.md)
- **Referência API:** [05-APIs-e-Endpoints.md](docs/05-APIs-e-Endpoints.md)

---

## 📝 Licença

Este projeto é privado e proprietário.

---

## 🎯 Próximos Passos

**Finalização para Produção (Fevereiro 2026):**

Ver plano completo em [docs/TODO_FINALIZACAO.md](docs/TODO_FINALIZACAO.md)

**Semana 1 (10-14/02):**
- Testes finais e validações
- Otimizações de performance
- Preparação para deploy

**Semana 2 (17-21/02):**
- Deploy em produção
- Monitoramento inicial
- Suporte pós-lançamento

---

**Desenvolvido com ❤️ para gestão agropecuária eficiente**

**Última Atualização:** 04/02/2026
