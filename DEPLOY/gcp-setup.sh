#!/bin/bash

# Script de Setup Automatizado - Google Cloud
# Sistema Agropecuário 🌾
# Data: 14/03/2026

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  🚀 Sistema Agropecuário - GCP Setup${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Função para imprimir com status
log_step() {
    echo -e "${BLUE}→${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

# ============================================
# STEP 1: Verificações Pré-requisitos
# ============================================
echo -e "\n${BLUE}PASSO 1: Verificando Pré-requisitos${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_step "Verificando Google Cloud SDK..."
if gcloud --version > /dev/null 2>&1; then
    GCLOUD_VERSION=$(gcloud --version | head -1)
    log_success "Google Cloud SDK: $GCLOUD_VERSION"
else
    log_error "Google Cloud SDK não encontrado!"
    echo "   Instale em: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

log_step "Verificando Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    log_success "Docker: $DOCKER_VERSION"
else
    log_warning "Docker não encontrado (necessário para build de imagens)"
    echo "   Instale em: https://docs.docker.com/install"
fi

log_step "Verificando git..."
if command -v git &> /dev/null; then
    log_success "Git instalado"
else
    log_error "Git não encontrado!"
    exit 1
fi

# ============================================
# STEP 2: Autenticação Google Cloud
# ============================================
echo -e "\n${BLUE}PASSO 2: Autenticação Google Cloud${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if gcloud auth list 2>&1 | grep -q "ACTIVE"; then
    log_success "Já autenticado no Google Cloud"
else
    log_step "Abrindo navegador para autenticação..."
    gcloud auth login
    log_success "Autenticação completa"
fi

# ============================================
# STEP 3: Selecionar/Criar Projeto GCP
# ============================================
echo -e "\n${BLUE}PASSO 3: Selecionando Projeto GCP${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_step "Listando projetos disponíveis..."
gcloud projects list

echo -e "\n${YELLOW}Qual é o PROJECT_ID que deseja usar?${NC}"
read -p "PROJECT_ID (ex: agro-system-prod): " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    log_error "PROJECT_ID não pode estar vazio"
    exit 1
fi

log_step "Configurando projeto: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

log_step "Obtendo informações do projeto..."
gcloud projects describe "$PROJECT_ID" > /dev/null || {
    log_error "Projeto não encontrado ou sem permissão"
    exit 1
}

log_success "Projeto configurado: $PROJECT_ID"

# Salvar PROJECT_ID
echo "$PROJECT_ID" > .gcp-project-id

# ============================================
# STEP 4: Configuração de Região
# ============================================
echo -e "\n${BLUE}PASSO 4: Configurando Região${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "Regiões recomendadas:"
echo "  1. us-central1          (EUA - padrão)"
echo "  2. southamerica-east1   (Brasil - mais próximo)"
echo "  3. Outra"

read -p "Escolha a região (padrão: us-central1): " REGION
REGION=${REGION:-us-central1}

gcloud config set compute/region "$REGION"
gcloud config set compute/zone "$REGION-a"
log_success "Região configurada: $REGION"

# ============================================
# STEP 5: Ativar APIs
# ============================================
echo -e "\n${BLUE}PASSO 5: Ativando APIs Necessárias${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

APIs=(
    "sqladmin.googleapis.com"
    "redis.googleapis.com"
    "run.googleapis.com"
    "storage-api.googleapis.com"
    "artifactregistry.googleapis.com"
    "cloudbuild.googleapis.com"
    "logging.googleapis.com"
    "monitoring.googleapis.com"
    "compute.googleapis.com"
)

for api in "${APIs[@]}"; do
    log_step "Ativando $api..."
    gcloud services enable "$api" --quiet
done

log_success "Todas as APIs ativadas"

# ============================================
# STEP 6: Criar Service Account
# ============================================
echo -e "\n${BLUE}PASSO 6: Criando Service Account${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SA_NAME="agro-backend"
SA_EMAIL="$SA_NAME@${PROJECT_ID}.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "$SA_EMAIL" > /dev/null 2>&1; then
    log_success "Service Account já existe: $SA_EMAIL"
else
    log_step "Criando Service Account: $SA_NAME"
    gcloud iam service-accounts create "$SA_NAME" \
        --display-name="Agro Backend Service Account" \
        --quiet
    log_success "Service Account criado"
fi

# Dar permissões
log_step "Configurando permissões..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/cloudsql.client" \
    --quiet

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/storage.objectAdmin" \
    --quiet

log_success "Permissões configuradas"

# Salvar chave
KEY_FILE="agro-backend-key.json"
if [ ! -f "$KEY_FILE" ]; then
    log_step "Gerando chave do Service Account..."
    gcloud iam service-accounts keys create "$KEY_FILE" \
        --iam-account="$SA_EMAIL"
    log_success "Chave salva em: $KEY_FILE"
    
    # Adicionar ao .gitignore
    if [ -f ".gitignore" ]; then
        if ! grep -q "^$KEY_FILE\$" .gitignore; then
            echo "$KEY_FILE" >> .gitignore
        fi
    fi
else
    log_warning "Chave já existe em: $KEY_FILE"
fi

# ============================================
# STEP 7: Criar Cloud SQL
# ============================================
echo -e "\n${BLUE}PASSO 7: Criando Cloud SQL (PostgreSQL)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SQL_INSTANCE="agro-postgres-prod"
SQL_VERSION="POSTGRES_15"

if gcloud sql instances describe "$SQL_INSTANCE" --region="$REGION" > /dev/null 2>&1; then
    log_success "Cloud SQL já existe: $SQL_INSTANCE"
else
    log_step "Criando instância Cloud SQL..."
    echo -e "${YELLOW}Isso pode levar alguns minutos...${NC}"
    
    gcloud sql instances create "$SQL_INSTANCE" \
        --database-version="$SQL_VERSION" \
        --tier=db-custom-2-8192 \
        --region="$REGION" \
        --availability-type=REGIONAL \
        --backup-start-time=03:00 \
        --enable-bin-log \
        --quiet
    
    log_success "Cloud SQL criado"
fi

# Criar banco de dados
log_step "Criando banco de dados..."
gcloud sql databases create agro_prod \
    --instance="$SQL_INSTANCE" \
    --quiet 2>/dev/null || log_warning "Banco de dados pode já existir"

log_success "Banco 'agro_prod' configurado"

# ============================================
# STEP 8: Criar Redis
# ============================================
echo -e "\n${BLUE}PASSO 8: Criando Redis (Memorystore)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REDIS_INSTANCE="agro-redis-prod"

if gcloud redis instances describe "$REDIS_INSTANCE" --region="$REGION" > /dev/null 2>&1; then
    log_success "Redis já existe: $REDIS_INSTANCE"
else
    log_step "Criando instância Redis..."
    echo -e "${YELLOW}Isso pode levar alguns minutos...${NC}"
    
    gcloud redis instances create "$REDIS_INSTANCE" \
        --size=2 \
        --region="$REGION" \
        --redis-version=7.2 \
        --quiet
    
    log_success "Redis criado"
fi

# ============================================
# STEP 9: Criar Cloud Storage Buckets
# ============================================
echo -e "\n${BLUE}PASSO 9: Criando Cloud Storage Buckets${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BUCKETS=("documents" "certificates" "backups")

for bucket in "${BUCKETS[@]}"; do
    BUCKET_NAME="agro-system-prod-$bucket"
    
    if gsutil ls "gs://$BUCKET_NAME" > /dev/null 2>&1; then
        log_success "Bucket já existe: gs://$BUCKET_NAME"
    else
        log_step "Criando bucket: $BUCKET_NAME"
        gsutil mb -c STANDARD -l "$REGION" -b on "gs://$BUCKET_NAME"
        
        # Versioning para documentos críticos
        if [ "$bucket" != "backups" ]; then
            gsutil versioning set on "gs://$BUCKET_NAME"
        fi
        
        log_success "Bucket criado: $BUCKET_NAME"
    fi
done

# ============================================
# STEP 10: Gerar arquivo .env.gcp
# ============================================
echo -e "\n${BLUE}PASSO 10: Gerando Arquivo de Configuração${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_step "Coletando informações finais..."

# Obter IP do Redis
REDIS_IP=$(gcloud redis instances describe "$REDIS_INSTANCE" \
    --region="$REGION" \
    --format='value(host)' 2>/dev/null || echo "OBTER_MANUALMENTE")

# Criar .env.gcp
ENV_FILE=".env.gcp"

cat > "$ENV_FILE" << EOF
# Google Cloud Configuration
GCP_PROJECT_ID=$PROJECT_ID
GCP_REGION=$REGION
GCP_SERVICE_ACCOUNT=$SA_EMAIL

# Database (Cloud SQL)
DATABASE_URL=postgresql://agro_app:PASSWORD_AQUI@/agro_prod?host=/cloudsql/$PROJECT_ID:$REGION:$SQL_INSTANCE

# Redis (Memorystore)
REDIS_HOST=$REDIS_IP
REDIS_PORT=6379
REDIS_URL=redis://$REDIS_IP:6379/0

# Cloud Storage
GCS_BUCKET_DOCUMENTS=agro-system-prod-documents
GCS_BUCKET_CERTIFICATES=agro-system-prod-certificates
GCS_BUCKET_BACKUPS=agro-system-prod-backups

# Application
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=GERAR_CHAVE_SEGURA_AQUI
DEBUG=False
ALLOWED_HOSTS=*.cloudrun.app,seu-dominio.com

# Logging
LOG_LEVEL=INFO
EOF

log_success "Arquivo de configuração criado: $ENV_FILE"

# Adicionar ao .gitignore
if [ -f ".gitignore" ]; then
    if ! grep -q "^\.env\.gcp\$" .gitignore; then
        echo ".env.gcp" >> .gitignore
    fi
fi

# ============================================
# RESUMO FINAL
# ============================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Configuração Completa!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${BLUE}📋 Resumo da Configuração:${NC}"
echo "  Project ID:     $PROJECT_ID"
echo "  Região:         $REGION"
echo "  Service Account: $SA_EMAIL"
echo "  Cloud SQL:      $SQL_INSTANCE"
echo "  Redis:          $REDIS_INSTANCE"
echo "  Buckets:        3 (documents, certificates, backups)"
echo "  Arquivo Config: $ENV_FILE"

echo -e "\n${YELLOW}⚠️  Próximos Passos:${NC}"
echo "  1. Edite $ENV_FILE e configure:"
echo "     - PASSWORD_AQUI → senha do usuário agro_app"
echo "     - GERAR_CHAVE_SEGURA_AQUI → gere uma SECRET_KEY"
echo "     - seu-dominio.com → seu domínio customizado"
echo ""
echo "  2. Crie usuário no Cloud SQL:"
echo "     gcloud sql connect $SQL_INSTANCE --user=root"
echo "     CREATE USER agro_app WITH PASSWORD 'PASSWORD_AQUI';"
echo "     GRANT ALL PRIVILEGES ON DATABASE agro_prod TO agro_app;"
echo ""
echo "  3. Deploy do Backend (próximo passo)"
echo "     Veja: GOOGLE_CLOUD_SETUP.md - Seção 'Deploy Backend'"

echo -e "\n${GREEN}✓ Pronto para começar!${NC}\n"
