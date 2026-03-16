# CI/CD Setup – GitHub Actions + GCP Cloud Run

## Estrutura dos Workflows

```
.github/workflows/
  ci.yml      → Roda em TODA branch/PR: pytest + tsc + vite build
  deploy.yml  → Roda SOMENTE na main: build Docker → GCR → Cloud Run
```

---

## Passo 1 – Configurar GitHub Secrets

Acesse: **GitHub → Repositório → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Valor | Onde obter |
|---|---|---|
| `GCP_PROJECT_ID` | `agro-system-prod-2026` | `gcloud config get-value project` |
| `GCP_SA_KEY` | JSON em base64 | Ver Passo 2 |
| `GCP_REGION` | `us-central1` | Escolha seu datacenter |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Cloud SQL / Connection String |
| `REDIS_URL` | `redis://host:6379/0` | Memorystore |
| `SECRET_KEY` | string aleatória 50+ chars | `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `ISIDORO_API_KEY` | chave Gemini API | Google AI Studio |
| `CERT_ENCRYPTION_KEY` | base64 de 32 bytes | `python -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"` |

---

## Passo 2 – Criar Service Account para CI/CD

```bash
# 1. Criar a SA
gcloud iam service-accounts create github-actions-deploy \
  --display-name="GitHub Actions Deploy"

# 2. Conceder permissões mínimas necessárias
PROJECT_ID=$(gcloud config get-value project)
SA="github-actions-deploy@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/iam.serviceAccountUser"

# 3. Gerar chave JSON e converter para base64
gcloud iam service-accounts keys create /tmp/gha-key.json \
  --iam-account=$SA

cat /tmp/gha-key.json | base64 -w 0
# → Cole o output como secret GCP_SA_KEY no GitHub
rm /tmp/gha-key.json
```

---

## Passo 3 – Branch Protection na main

Acesse: **GitHub → Settings → Branches → Add branch ruleset**

Configurações recomendadas para `main`:

- [x] **Require a pull request before merging**
  - [x] Require approvals: 1
- [x] **Require status checks to pass before merging**
  - Adicionar: `Backend Tests (pytest)`
  - Adicionar: `Frontend (tsc + vite build)`
- [x] **Require branches to be up to date before merging**
- [x] **Do not allow bypassing the above settings**

---

## Passo 4 – Habilitar Artifact Registry (se ainda não habilitado)

```bash
gcloud services enable \
  run.googleapis.com \
  containerregistry.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# Configurar Docker para usar GCR
gcloud auth configure-docker
```

---

## Fluxo completo após configurado

```
feature/xxx  →  push  →  CI roda (pytest + tsc + build)
     ↓
  PR para main  →  CI obrigatório verde para merge
     ↓
  merge main  →  Deploy automático no Cloud Run
```
