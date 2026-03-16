# 🚀 Configuração Google Cloud - Sistema Agropecuário

**Data:** 14 de março de 2026  
**Status:** Guia de Inicialização  
**Tempo Total:** ~1 hora de setup  

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Autenticação & Projeto](#autenticação--projeto)
3. [Serviços Essenciais](#serviços-essenciais)
4. [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
5. [Storage & Armazenamento](#storage--armazenamento)
6. [URL de APIs](#url-de-apis)
7. [Variáveis de Ambiente](#variáveis-de-ambiente)
8. [Deploy Backend](#deploy-backend)
9. [Deploy Frontend](#deploy-frontend)
10. [Monitoramento](#monitoramento)

---

## Pré-requisitos

### ✅ Verificação Local

```bash
# 1. Verificar gcloud SDK
gcloud --version
# Esperado: Google Cloud SDK 560.0.0+

# 2. Verificar autenticação
gcloud auth list
# Esperado: "No credentialed accounts" (normal, vamos configurar)

# 3. Ter conta Google Cloud
# → Se não tiver, crie em https://console.cloud.google.com
```

### 📦 Dependências Necessárias

- [x] Google Cloud SDK (✅ já instalado em `/home/agrolink/google-cloud-sdk/`)
- [ ] Conta Google Cloud (crie em console.cloud.google.com)
- [ ] Projeto GCP criado
- [ ] Keys de API geradas
- [ ] Docker instalado (para deploy Cloud Run)
- [ ] git configurado

---

## Autenticação & Projeto

### 🔐 Passo 1: Fazer Login no Google Cloud

```bash
# Fazer login (abre navegador)
gcloud auth login

# Selecione a conta Google com acesso ao projeto
# Autorize o gcloud
```

### 📍 Passo 2: Criar/Selecionar Projeto GCP

```bash
# Ver projetos disponíveis
gcloud projects list

# SE JÁ TEM PROJETO:
gcloud config set project PROJECT_ID
# Exemplo: gcloud config set project agro-system-prod-2026

# SE PRECISA CRIAR NOVO:
gcloud projects create PROJECT_ID --name="Sistema Agropecuário"
gcloud config set project PROJECT_ID

# Verificar configuração
gcloud config get-value project
```

### 🔑 Passo 3: Autenticação por Serviço (para CI/CD)

```bash
# Criar service account
gcloud iam service-accounts create agro-backend \
  --display-name="Agro Backend Service Account"

# Criar e salvar chave
gcloud iam service-accounts keys create ~/agro-backend-key.json \
  --iam-account=agro-backend@PROJECT_ID.iam.gserviceaccount.com

# Guardar arquivo com segurança (adicione ao .gitignore)
echo "agro-backend-key.json" >> .gitignore
```

---

## Serviços Essenciais

### ☁️ Ativar APIs Necessárias

```bash
# Database (Cloud SQL)
gcloud services enable sqladmin.googleapis.com

# Cache (Memorystore Redis)
gcloud services enable redis.googleapis.com

# Container (Cloud Run)
gcloud services enable run.googleapis.com

# Storage (Cloud Storage dos arquivos)
gcloud services enable storage-api.googleapis.com

# Artifact Registry (imagens Docker)
gcloud services enable artifactregistry.googleapis.com

# Cloud Build (CI/CD)
gcloud services enable cloudbuild.googleapis.com

# Logging & Monitoring
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com

# VPC (redes)
gcloud services enable compute.googleapis.com

# Verificar ativadas
gcloud services list --enabled
```

### 🌍 Escolher Região

```bash
# Definir região (recomendado: us-central1 ou southamerica-east1 para LATAM)
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a

# Ou se preferir (mais próximo do Brasil):
# gcloud config set compute/region southamerica-east1
# gcloud config set compute/zone southamerica-east1-a
```

---

## Configuração do Banco de Dados

### 🗄️ Cloud SQL (PostgreSQL)

```bash
# Criar instância PostgreSQL
gcloud sql instances create agro-postgres-prod \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-8192 \
  --region=us-central1 \
  --availability-type=REGIONAL \
  --backup-start-time=03:00 \
  --enable-bin-log

# Atribuir acesso ao service account
gcloud sql instances patch agro-postgres-prod \
  --database-flags=cloudsql_iam_authentication=on

# Criar banco de dados
gcloud sql databases create agro_prod \
  --instance=agro-postgres-prod

# Criar usuário de app
gcloud sql users create agro_app \
  --instance=agro-postgres-prod \
  --password=[SENHA_SEGURA]

# Criar usuário IAM (recomendado para Cloud Run)
gcloud sql users create agro_backend@PROJECT_ID.iam \
  --instance=agro-postgres-prod \
  --type=CLOUD_IAM_SERVICE_ACCOUNT

# Verifica conexão
gcloud sql connect agro-postgres-prod --user=root
```

### 💾 Redis (Memorystore)

```bash
# Criar instância Redis
gcloud redis instances create agro-redis-prod \
  --size=2 \
  --region=us-central1 \
  --redis-version=7.2

# Ver detalhes (incluindo IP interno)
gcloud redis instances describe agro-redis-prod --region=us-central1
```

---

## Storage & Armazenamento

### 🗂️ Cloud Storage (Arquivos, PDFs, NF-e)

```bash
# Criar buckets
gsutil mb -c STANDARD -l us-central1 -b on gs://agro-system-prod-documents/
gsutil mb -c STANDARD -l us-central1 -b on gs://agro-system-prod-certificates/
gsutil mb -c STANDARD -l us-central1 -b on gs://agro-system-prod-backups/

# Configurar versionamento (importante para notas fiscais!)
gsutil versioning set on gs://agro-system-prod-documents/
gsutil versioning set on gs://agro-system-prod-certificates/

# Configurar acesso público ou privado
# Para documentos privados (padrão):
gsutil acl ch -u agro-backend@PROJECT_ID.iam.gserviceaccount.com:O gs://agro-system-prod-documents/

# Para certificados (sempre privado):
gsutil acl ch -u agro-backend@PROJECT_ID.iam.gserviceaccount.com:O gs://agro-system-prod-certificates/

# Listar buckets
gsutil ls -b
```

---

## Configuração de VPC

### 🌐 Rede Privada (recomendado)

```bash
# Criar VPC
gcloud compute networks create agro-vpc \
  --subnet-mode=custom

# Subnet para aplicação
gcloud compute networks subnets create agro-subnet-app \
  --network=agro-vpc \
  --range=10.0.1.0/24 \
  --region=us-central1

# Canal de dados privado para Cloud SQL/Redis
gcloud compute networks peerings create agro-cloudsql-peering \
  --network=agro-vpc

# Firewall (abrir necessário)
gcloud compute firewall-rules create agro-allow-internal \
  --network=agro-vpc \
  --allow=tcp,udp \
  --source-ranges=10.0.0.0/8
```

---

## URL de APIs

Após configurar no GCP, você terá:

```
# Cloud SQL (interno no Cloud Run)
DATABASE_URL=cloudsqlproxy://agro-postgres-prod:5432/agro_prod

# Redis (interno no Cloud Run)
REDIS_URL=redis://IP_INTERNO:6379/0

# Cloud Storage
BUCKET_DOCUMENTS=gs://agro-system-prod-documents
BUCKET_CERTIFICATES=gs://agro-system-prod-certificates

# Localidade
GCP_REGION=us-central1
GCP_PROJECT=PROJECT_ID
```

---

## Variáveis de Ambiente

### 📝 Arquivo `.env.gcp` (NÃO fazer commit)

```bash
# GCP Configuration
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1
GCP_SERVICE_ACCOUNT=agro-backend@PROJECT_ID.iam.gserviceaccount.com

# Database
DATABASE_URL=postgresql://agro_app:PASSWORD@/agro_prod?host=/cloudsql/PROJECT_ID:us-central1:agro-postgres-prod

# Redis
REDIS_URL=redis://REDIS_IP:6379/0

# Storage
GCS_BUCKET_DOCUMENTS=agro-system-prod-documents
GCS_BUCKET_CERTIFICATES=agro-system-prod-certificates

# Security
SECRET_KEY=your-django-secret-key
DEBUG=False
ALLOWED_HOSTS=backend.seu-dominio.com,*.cloudrun.app
```

### ✅ Adicionar ao `.gitignore`

```bash
.env.gcp
agro-backend-key.json
.env.production
cloudsql-key.json
```

---

## Deploy Backend

### 🐳 Preparar Dockerfile

Seu projeto deve ter `Dockerfile` e `.dockerignore`:

```bash
# Verificar se tem Dockerfile
ls -la Dockerfile
# Se não tiver, criar conforme seção "Criar Dockerfile" abaixo
```

### 📝 Criar Dockerfile (se não tiver)

```dockerfile
# Dockerfile no raiz do projeto
FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar requisitos
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Dar permissão de execução
RUN chmod +x entrypoint.sh || true

# Expor porta
EXPOSE 8000

# Command
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "config.wsgi:application"]
```

### 🚀 Deploy para Cloud Run

```bash
# 1. Fazer build e push para Artifact Registry
gcloud builds submit --tag=gcr.io/PROJECT_ID/agro-backend:latest

# 2. Deploy para Cloud Run
gcloud run deploy agro-backend \
  --image=gcr.io/PROJECT_ID/agro-backend:latest \
  --platform=managed \
  --region=us-central1 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=3600 \
  --set-env-vars="DATABASE_URL=cloudsqlproxy://...,REDIS_URL=redis://...,GCP_PROJECT=PROJECT_ID" \
  --add-cloudsql-instances=PROJECT_ID:us-central1:agro-postgres-prod \
  --service-account=agro-backend@PROJECT_ID.iam.gserviceaccount.com \
  --allow-unauthenticated

# 3. Salvar URL de deploy
gcloud run services describe agro-backend --region=us-central1 --format='value(status.url)'
```

### ⚙️ Variáveis de Ambiente no Cloud Run

```bash
# Via comando
gcloud run services update agro-backend \
  --region=us-central1 \
  --set-env-vars=DEBUG=False,ENVIRONMENT=production

# Ver logs
gcloud run services logs read agro-backend --region=us-central1 --limit=50
```

---

## Deploy Frontend

### 🔨 Build da aplicação React

```bash
# No diretório do Integracao-zeroclaw-agro-link/
npm run build

# Resultado: /build (ou /dist)
```

### 🌐 Deploy para Cloud Storage + CDN

```bash
# 1. Criar bucket para frontend
gsutil mb -c STANDARD -l us-central1 gs://agro-system-prod-frontend/

# 2. Fazer upload (com cache)
gsutil -m cp -r build/* gs://agro-system-prod-frontend/

# 3. Verificar
gsutil ls gs://agro-system-prod-frontend/

# 4. [Opcional] Configurar Cloud CDN
# Ver seção "Cloud CDN" abaixo
```

### 🔒 Configurar Acesso Público

```bash
# Permitir leitura pública no bucket
gsutil iam ch serviceAccount:allUsers:objectViewer gs://agro-system-prod-frontend/

# Ou criar Load Balancer com CDN
```

---

## Monitoramento

### 📊 Cloud Logging

```bash
# Ver logs da aplicação
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=agro-backend" \
  --limit=50 \
  --format=json

# Salvar em arquivo
gcloud logging read "resource.type=cloud_run_revision" \
  --limit=100 \
  --format=json > logs.json
```

### 📈 Cloud Monitoring

```bash
# Criar alertas (via console ou gcloud)
# 1. Ir a: https://console.cloud.google.com/monitoring
# 2. Criar alertas para:
#    - CPU > 80%
#    - Memória > 90%
#    - Erros HTTP 5xx
#    - Latência > 1s
```

---

## Checklist de Configuração

- [ ] **Autenticação**
  - [ ] `gcloud auth login` completo
  - [ ] Projeto selecionado: `gcloud config set project PROJECT_ID`
  - [ ] Service account criado

- [ ] **Serviços Habilitados**
  - [ ] sqladmin, redis, run, storage, artifactregistry, cloudbuild, logging

- [ ] **Banco de Dados**
  - [ ] Cloud SQL PostgreSQL criado
  - [ ] Banco `agro_prod` criado
  - [ ] Usuário `agro_app` criado
  - [ ] Redis criado

- [ ] **Storage**
  - [ ] 3 buckets criados (documents, certificates, backups)
  - [ ] Versionamento habilitado

- [ ] **VPC & Segurança**
  - [ ] VPC criada
  - [ ] Firewall configurado
  - [ ] Peering de dados privados

- [ ] **Backend**
  - [ ] Dockerfile preparado
  - [ ] `.dockerignore` configurado
  - [ ] Deploy Cloud Run funcionando
  - [ ] Variáveis de ambiente setadas

- [ ] **Frontend**
  - [ ] Build otimizado em production
  - [ ] Deploy em Cloud Storage
  - [ ] CDN habilitado

- [ ] **Monitoramento**
  - [ ] Logs habilitados
  - [ ] Alertas configurados
  - [ ] Rastreamento de erros ativo

---

## Próximos Passos

1. **Imediatamente:**
   ```bash
   gcloud auth login
   gcloud config set project PROJECT_ID
   ```

2. **Em 5 min:**
   - Ativar serviços essenciais

3. **Em 15 min:**
   - Criar Cloud SQL + Redis

4. **Em 30 min:**
   - Deploy backend no Cloud Run

5. **Em 45 min:**
   - Deploy frontend no Cloud Storage

6. **Depois:**
   - Configurar domínio customizado
   - Configurar backups automáticos
   - Configurar monitoramento avançado

---

## Referências

- 📚 [Google Cloud Platform Console](https://console.cloud.google.com)
- 📖 [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference)
- 🐳 [Cloud Run Quickstart](https://cloud.google.com/run/docs/quickstarts)
- 💾 [Cloud SQL Docs](https://cloud.google.com/sql/docs)
- 📦 [Cloud Storage Guide](https://cloud.google.com/storage/docs)
**Documentos da pasta:** `Integracao-zeroclaw-agro-link/DEPLOY/`
- [GOOGLE_CLOUD_QUICKSTART.md](GOOGLE_CLOUD_QUICKSTART.md)
- [SIMULACAO_CUSTOS_GCP.md](SIMULACAO_CUSTOS_GCP.md)
- [ARQUITECTURA_WHATSAPP_2DOMINIOS.md](ARQUITETURA_WHATSAPP_2DOMINIOS.md)
---

**Dúvidas?** Consult a documentação oficial do GCP ou abra uma issue no projeto.

**Status:** ✅ Pronto para usar
