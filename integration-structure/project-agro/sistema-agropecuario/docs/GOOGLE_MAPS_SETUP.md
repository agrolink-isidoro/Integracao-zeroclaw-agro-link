# 🗺️ Google Maps Setup Guide

**Objetivo:** Configurar a chave de API do Google Maps para funcionar localmente e em produção.

---

## 📋 Índice

1. [Obter Google Maps API Key](#1-obter-google-maps-api-key)
2. [Configurar .env local](#2-configurar-env-local)
3. [Rodar com Docker Compose](#3-rodar-com-docker-compose)
4. [Verificar que está funcionando](#4-verificar-que-está-funcionando)
5. [Troubleshooting](#5-troubleshooting)
6. [Notas de Produção](#6-notas-de-produção)

---

## 1. Obter Google Maps API Key

### Pré-requisitos
- Conta Google (Gmail)
- Projeto no Google Cloud Console

### Passos

1. Abra [Google Cloud Console](https://console.cloud.google.com/)

2. Create a new project (ou selecione um existente)
   - Clique em **Select a project** → **New Project**
   - Nome: ex. "AgroLink-Mapa"
   - Clique em **Create**

3. Ative a **Maps JavaScript API**
   - Na barra de busca, procure por "Maps JavaScript API"
   - Clique em **Enable**

4. Obtenha a API Key
   - Vá para **Credentials** (no menu sidebar)
   - Clique em **Create Credentials** → **API Key**
   - Copie a chave gerada
   - ⚠️ **GUARDE COM SEGURANÇA** (não commitar no git!)

5. (Opcional) Restrinja a chave a domínios específicos
   - Na página de **Credentials**, clique na chave
   - Em **Application restrictions**, selecione **HTTP referrers (web sites)**
   - Adicione:
     - `http://localhost:5173` (dev local)
     - `http://localhost:3000` (se houver)
     - `https://seu-dominio.com.br` (produção)
   
6. (Opcional) Restrinja a chave a APIs específicas
   - Em **API restrictions**, selecione:
     - Maps JavaScript API
     - Geocoding API (se usar)
   - Clique em **Save**

---

## 2. Configurar .env local

### Arquivo: `.env` (raiz do projeto)

```bash
# Google Maps Configuration
VITE_GOOGLE_MAPS_API_KEY=sua_chave_aqui_sem_aspas

# Backend
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Exemplo completo (`.env.example`)

```bash
# ============================================
# SECTION: Google Maps + Frontend
# ============================================
# Google Maps API Key
# Get it from: https://console.cloud.google.com/
# Restrict to: HTTP referrers (localhost:5173 + seu dominio)
# Documentation: https://developers.google.com/maps/documentation/javascript
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDxxx...

# ============================================
# SECTION: Backend Database + Cache
# ============================================
DATABASE_URL=postgresql://user:pass@localhost:5432/agrolink_db
REDIS_URL=redis://localhost:6379/0

# ============================================
# SECTION: Django Settings
# ============================================
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1
```

### ⚠️ IMPORTANTE

```bash
# NÃO commitar com a chave real!
echo ".env" >> .gitignore  # Já está feito

# Para compartilhar com time, use .env.example (sem valores reais)
```

---

## 3. Rodar com Docker Compose

### Quick Start

```bash
# 1. Clone o repositório (se não tiver)
git clone https://github.com/agrolink-isidoro/Integracao-zeroclaw-agro-link.git
cd Integracao-zeroclaw-agro-link/integration-structure/project-agro/sistema-agropecuario

# 2. Crie o arquivo .env na raiz do projeto
cp .env.example .env
# ... edite .env e coloque sua Google Maps API Key

# 3. Suba a stack (backend + frontend)
docker compose up -d --build

# 4. Verifique se tudo está rodando
docker compose ps

# Exemplo de output esperado:
# CONTAINER ID   IMAGE                              STATUS
# abc123         sistema-agropecuario-backend:1.0  Up 2 minutes
# def456         sistema-agropecuario-frontend:1.0 Up 2 minutes
# ghi789         postgres:15                        Up 2 minutes
# jkl012         redis:7-alpine                      Up 2 minutes

# 5. Acesse a aplicação
# Frontend: http://localhost:5173
# Backend: http://localhost:8000/api/
```

### Troubleshooting Docker

```bash
# Ver logs do frontend
docker compose logs frontend -f

# Ver logs do backend
docker compose logs backend -f

# Reconstruir containers
docker compose down -v
docker compose up -d --build

# Parar tudo
docker compose down
```

---

## 4. Verificar que está funcionando

### No Frontend (http://localhost:5173)

1. Faça login na aplicação
2. Navegue para **Fazendas** → **Mapa de Talhões** (`/fazendas/mapa`)
3. Deverá ver:
   - ✅ Mapa interativo do Google Maps
   - ✅ Dropdown de filtro por fazenda
   - ✅ Legenda com cores (Própria, Arrendada, Talhão)
   - ✅ Polígonos de fazendas/talhões (se houver dados com KML)

### No Console do Navegador (F12)

```javascript
// Se a chave está funcionando, nenhum erro de API Key:
// "error message": "The Google Maps Platform rejected your request..."

// Se tudo OK, você verá os mapas carregando sem problemas
```

### Via Network (F12 → Network)

```
GET /api/geo/?fazenda=1&layer=all
Status: 200 OK
Response type: application/json
Body: { "type": "FeatureCollection", "features": [...] }
```

---

## 5. Troubleshooting

### ❌ "Google Maps API Key não configurada"

**Problema:** Mensagem no mapa dizendo que API Key não está configurada

**Solução:**
1. Verifique que `.env` tem `VITE_GOOGLE_MAPS_API_KEY`
2. Frontend precisa ser reconstruído para ler .env:
   ```bash
   docker compose down frontend
   docker compose up -d --build frontend
   ```
3. Limpe o cache do navegador (Ctrl+Shift+Del)
4. Recarregue a página (Ctrl+R)

### ❌ "The Google Maps Platform rejected your request"

**Problema:** Erro de API Key inválida ou expirada

**Solução:**
1. Verifique que a chave está correta (copie novamente do Console)
2. Verifique que a chave não foi deletada do Cloud Console
3. Inicie uma chave nova (1-2 minutos para ativar)
4. Atualize `.env` e reconstrua containers

### ❌ "Request denied. This IP, site or mobile application is not authorized..."

**Problema:** Restrições de domínio não foram adicionadas

**Solução:**
1. Vá para Google Cloud Console → Credentials
2. Clique na chave → Edit Credentials
3. Selecione **HTTP referrers (web sites)**
4. Adicione:
   ```
   http://localhost:5173
   http://127.0.0.1:5173
   ```
5. Salve e aguarde ~1-2 minutos para ativar

### ❌ Mapa em branco (sem polígonos)

**Problema:** Mapa carrega, mas não mostra os talhões

**Solução:**
1. Verifique que há dados com geometria KML:
   ```bash
   # No terminal do backend
   docker compose exec backend python manage.py shell
   >>> from apps.fazendas.models import Talhao
   >>> Talhao.objects.filter(geom__isnull=False).count()
   # Se retornar 0, não há talhões com geometria
   ```

2. Crie um talhão com KML:
   - Vá para Fazendas → Talhões
   - Clique em **Novo Talhão**
   - Upload um arquivo KML com geometry
   - Salve

3. Verifique o endpoint:
   ```bash
   # No navegador ou curl
   curl "http://localhost:8000/api/geo/?fazenda=1" \
     -H "Authorization: Bearer <seu_token>"
   # Deverá retornar GeoJSON features com geometrias
   ```

### ❌ "CORS error" no console

**Problema:** Cross-Origin Request Blocked

**Solução:** (Geralmente já configurado no projeto)
```bash
# Verificar que django-cors-headers está instalado
docker compose exec backend pip list | grep django-cors

# Verificar CORS_ALLOWED_ORIGINS em settings.py
# Deverá incluir http://localhost:5173
```

---

## 6. Notas de Produção

### Limites de Uso (Google Maps)

```
Plano Gratuito (com cartão salvo):
- $200/mês de crédito gratuito
- Maps JavaScript API: $7 por 1000 requisições após crédito
- Geocoding API: $5 por 1000 requisições

Estimativa de uso (AgroLink):
- ~1 requisição por usuário logado por sessão
- ~10 usuários simultâneos = ~10 req/min
- = ~14.4K req/mês = ~$100/mês
```

### Recomendações

1. **Ativar faturamento** no Google Cloud Console
2. **Configurar alertas** quando atingir $150/mês
3. **Restringir chave** por domínio (nunca deixar aberta)
4. **Rotacionar chave** a cada 90 dias
5. **Monitorar uso** em Cloud Console → Quotas

### Variáveis de Ambiente em Produção

```bash
# .env.production (não versionar!)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyD... (chave restrita a seu dominio)
DEBUG=False
SECRET_KEY=<random-very-long-string>
ALLOWED_HOSTS=seu-dominio.com.br,www.seu-dominio.com.br
DATABASE_URL=postgresql://user:pass@db-host:5432/agrolink_prod
REDIS_URL=redis://redis-host:6379/0
```

### Deploy

1. Teste localmente com `.env.production`
2. Configure variáveis no servidor (ex. AWS Secrets Manager, .env em servidor)
3. Deploy com `docker build` + `docker compose up`
4. Verifique logs: `docker compose logs -f`

---

## 📚 Referências

- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Maps API Pricing](https://cloud.google.com/maps-platform/pricing)
- [Maps API Usage Limits](https://developers.google.com/maps/billing-and-pricing/pricing)

---

## ✅ Checklist de Setup

- [ ] Google Maps API Key obtida do Cloud Console
- [ ] Chave restrita a domínios (localhost + produção)
- [ ] Chave restrita a Maps JavaScript API
- [ ] `.env` local criado com `VITE_GOOGLE_MAPS_API_KEY`
- [ ] `.env` adicionado ao `.gitignore`
- [ ] `.env.example` criado (sem valores reais)
- [ ] `docker compose up -d --build` executado com sucesso
- [ ] Frontend carrega em http://localhost:5173
- [ ] Mapa visível sem erros no console
- [ ] Talhões com KML aparecem no mapa
- [ ] Filtro de fazenda funciona
- [ ] Dropdown de camadas trabalha corretamente

---

**Documento:** Google Maps Setup Guide  
**Versão:** 1.0  
**Data:** 19 de março de 2026  
**Status:** 🟢 Production-Ready
