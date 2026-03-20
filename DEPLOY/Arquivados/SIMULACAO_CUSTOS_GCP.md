# 💰 Simulação de Custos GCP + WhatsApp - Agro-Link

**Data:** 14 de março de 2026  
**Versão:** 1.0  
**Escopo:** Produção com 2 domínios + WhatsApp

---

## 🎯 Arquitetura de Domínios

```
┌────────────────────────────────────────────────────────────────┐
│              www.agro-link.ia.br (PRINCIPAL)                   │
│  Site Institucional + Login Dashboard + Comunicações (HTTPS)   │
├────────────────────────────────────────────────────────────────┤
│ Fonte: Project-Agro-Business/Site + Integracao-zeroclaw login  │
│ • Cloud Storage (React Frontend - Project-Agro-Business)        │
│ • Cloud Load Balancer + CDN (Global)                            │
│ • Cloud Armor (WAF)                                             │
│ • Certificado SSL (Let's Encrypt)                               │
│ • Analytics & Logging                                           │
│ Funcionalidades: Site + Autenticação + Chat com Usuários        │
└────────────────────────────────────────────────────────────────┘
                              ↓ (HTTPS API calls)
┌────────────────────────────────────────────────────────────────┐
│              www.agrol1nk.com.br (BACKEND)                     │
│      Sustentação da Aplicação - APIs + Processamento (HTTPS)   │
├────────────────────────────────────────────────────────────────┤
│ Fonte: project-agro/sistema-agropecuario (Backend)              │
│ • Cloud Run (Django/DRF Backend - Privado)                      │
│ • Cloud SQL (PostgreSQL 15 - Banco Dados)                       │
│ • Memorystore Redis (Cache + Sessions)                          │
│ • Cloud Storage (Arquivos, NF-e, Certificados A3)               │
│ • Cloud Tasks + Pub/Sub (Async jobs + Zero-Claw Bot)            │
│ Funcionalidades: APIs REST + BD + IA + Integ. Terceiros         │
└────────────────────────────────────────────────────────────────┘
                              ↓
        ┌──────────────────────────────────────┐
        │  TWILIO WHATSAPP (Integração)        │
        ├──────────────────────────────────────┤
        │ Entrada: Usuário envia msg via WA    │
        │  ↓                                    │
        │ Processamento: Zero-Claw + Gemini    │
        │  ↓                                    │
        │ Saída: Resposta automática via WA    │
        │                                       │
        │ Rota: Twilio → agrol1nk.com.br/api   │
        └──────────────────────────────────────┘
```

---

## 📊 Simulação de Custos Mensais

### 🔵 CENÁRIO 1: Desenvolvimento/Staging (Pequeno)

**Usuários:** ~10-20 devs + testes  
**Requisições/mês:** ~500k  
**Dados:** ~50GB

| Serviço | Qtd | Unidade | Preço Unit | Custo/Mês |
|---------|-----|---------|-----------|-----------|
| **Cloud Run** | 0.5 | CPU-seg | $0.00002400 | $6 |
| **Cloud SQL** | 2 | vCPU | $55.80 | $111 |
| **Cloud SQL Storage** | 50 | GB | $0.34 | $17 |
| **Memorystore Redis** | 2 | GB | $35 | $35 |
| **Cloud Storage** | 50 | GB | $0.023 | $1.15 |
| **Cloud Load Balancer** | 0.025 | forwarding rule | $32 | $0.80 |
| **Cloud CDN** | 0.1 | GB | $0.085 | $0.01 |
| **Logging** | 100 | GB | $0.50 | $50 |
| **Data Transfer (egress)** | 5 | GB | $0.12 | $0.60 |
| **Cloud Tasks** | 0.1M | tasks | $0.10 / 1M | $0.01 |
| **Twilio WhatsApp** | 500 | msg | $0.0075 | $3.75 |
| ⚠️ **Subtotal** | | | | **$226 / mês** |

---

### 🟢 CENÁRIO 2: Produção Inicial (Médio)

**Usuários:** ~100-200  
**Requisições/mês:** ~5M  
**Dados:** ~300GB  
**Uptime:** 99.5%

| Serviço | Qtd | Unidade | Preço Unit | Custo/Mês |
|---------|-----|---------|-----------|-----------|
| **Cloud Run** | 5 | CPU-seg | $0.00002400 | $60 |
| **Cloud Run Memory** | 2.5 | GB-seg | $0.000005 | $30 |
| **Cloud Run (instâncias)** | 2 | instances | $0.06/h | $90 |
| **Cloud SQL** | 4 | vCPU | $55.80 | $223 |
| **Cloud SQL Storage** | 300 | GB | $0.34 | $102 |
| **Cloud SQL Backup** | 300 | GB | $0.026 | $8 |
| **Memorystore Redis** | 4 | GB | $35 | $70 |
| **Cloud Storage** | 300 | GB | $0.023 | $6.90 |
| **Cloud Load Balancer** | 1 | forwarding rule | $32 | $32 |
| **Cloud CDN** | 50 | GB | $0.085 | $4.25 |
| **Logging** | 200 | GB | $0.50 | $100 |
| **Cloud Trace** | 10 | GB | $0.25 | $2.50 |
| **Monitoring (custom metrics)** | 500 | metrics | $0.357/per | $178 |
| **Data Transfer (egress)** | 100 | GB | $0.12 | $12 |
| **Cloud Tasks** | 5M | tasks | $0.10 / 1M | $0.50 |
| **Pub/Sub** | 50M | msgs | $0.40 / 1M | $20 |
| **Cloud Scheduler** | 50 | jobs | $0.10 / 1M | $0.01 |
| **Twilio WhatsApp** | 5K | msg | $0.0075 | $37.50 |
| **Twilio Inbound** | 5K | msg | $0.0075 | $37.50 |
| ⚠️ **Subtotal** | | | | **$1,015 / mês** |

---

### 🔴 CENÁRIO 3: Produção em Escala (Grande)

**Usuários:** ~1000+  
**Requisições/mês:** ~50M  
**Dados:** ~2TB  
**Uptime:** 99.95% (SLA)

| Serviço | Qtd | Unidade | Preço Unit | Custo/Mês |
|---------|-----|---------|-----------|-----------|
| **Cloud Run** | 30 | CPU-seg | $0.00002400 | $360 |
| **Cloud Run Memory** | 20 | GB-seg | $0.000005 | $250 |
| **Cloud Run (instâncias)** | 5 | instances | $0.06/h | $225 |
| **Cloud SQL** (HA) | 8 | vCPU | $55.80 | $446 |
| **Cloud SQL Storage** | 2000 | GB | $0.34 | $680 |
| **Cloud SQL Backup** | 2000 | GB | $0.026 | $52 |
| **Memorystore Redis** (HA) | 16 | GB | $35 | $280 |
| **Cloud Storage** | 2000 | GB | $0.023 | $46 |
| **Cloud Load Balancer** | 1 | forwarding rule | $32 | $32 |
| **Cloud CDN** | 500 | GB | $0.085 | $42.50 |
| **Cloud Armor** | 1 | policy | $5 | $5 |
| **Cloud KMS** | 1 | key version | $6 | $6 |
| **Logging** | 1000 | GB | $0.50 | $500 |
| **Cloud Trace** | 100 | GB | $0.25 | $25 |
| **Monitoring (custom metrics)** | 2000 | metrics | $0.357/per | $714 |
| **Cloud Audit Logs** | 200 | GB | free | $0 |
| **Data Transfer (egress)** | 1000 | GB | $0.12 | $120 |
| **Cloud Tasks** | 50M | tasks | $0.10 / 1M | $5 |
| **Pub/Sub** | 500M | msgs | $0.40 / 1M | $200 |
| **Cloud Scheduler** | 100 | jobs | $0.10 / 1M | $0.01 |
| **Cloud Functions** | 10M | invocations | $0.40 / 1M | $4 |
| **Twilio WhatsApp** | 50K | msg | $0.0075 | $375 |
| **Twilio Inbound** | 50K | msg | $0.0075 | $375 |
| **Twilio Voice** | 10K | min | $0.0275 | $275 |
| ⚠️ **Subtotal** | | | | **$4,814 / mês** |

---

## 📈 Comparação Visual dos Cenários

```
Custo Mensário (USD)
│
│ ████ $226 (Dev/Staging)
│ ███████████████████ $1,015 (Produção Inicial)
│ ████████████████████████████████████████ $4,814 (Larga Escala)
│
└─────────────────────────────────────────
  Dev    Inicial    Escala
```

---

## 🌐 Integração WhatsApp - Detalhamento

### Opção 1: Twilio (Recomendada)

**Preços Twilio (por mensagem):**
- **Outbound SMS/WhatsApp:** $0.0075/msg
- **Inbound SMS/WhatsApp:** $0.0075/msg
- **Voice (se implementar):** $0.0275/min
- **Verificação 2FA:** $0.01/msg

**Arquitetura:**
```
Zero-Claw Bot 
    ↓
Cloud Run (Backend)
    ↓
Twilio API
    ↓
WhatsApp
    ↓
Usuário Final
```

**Fluxo Exemplo:**
```
Usuário envia: "Plantei soja"
    ↓
Recebe em /api/whatsapp/webhook (Twilio)
    ↓
Processa com Zero-Claw/Gemini
    ↓
Responde: "Preparei plantio! Aprove aqui: [link]"
    ↓
Via Twilio → WhatsApp
    ↓
Usuário vê no telefone
```

**Estimativa Mensal (Produção Médio):**
- 10K mensagens/mês (entrada + saída)
- Custo: **$75-100/mês**

---

### Opção 2: Meta WhatsApp Business API (Alternativa)

**Preços Meta:**
- Setup: $15/mês (plano básico)
- Mensagens: $0.0436/msg (para Brasil)
- Template messages: $0.0087/msg

**Principais diferenças:**
- Melhor para volume alto (10K+ msgs/mês beneficia-se mais)
- Integração direta com Meta
- Pode ser mais barato em escala

---

## 💳 Projeção Anual (Todos os Cenários)

### Desenvolvimento → Produção (Timeline 12 meses)

| Mês | Usuários | Cenário | RPS | Custo/Mês | Acumulado |
|-----|----------|---------|-----|-----------|-----------|
| 1-2 | 20 | Dev | 10 | $226 | $452 |
| 3-4 | 50 | Dev/Staging | 50 | $350 | $1,152 |
| 5-6 | 100 | Inicial | 200 | $1,015 | $3,182 |
| 7-8 | 300 | Inicial+ | 500 | $1,500 | $6,182 |
| 9-10 | 500 | Médio | 1000 | $2,200 | $10,582 |
| 11-12 | 1000+ | Larga Escala | 5000+ | $4,814 | $20,210 |

**Total Ano 1: ~$20,210**

---

## 🎯 Breakdown Detalhado por Componente

### Frontend (www.agro-link.ia.br)

```
Cloud Storage + CDN
    ↓
┌─────────────────────────┐
│ Static Files (React)    │ ~$10/mês
├─────────────────────────┤
│ Cloud CDN               │ ~$40/mês
├─────────────────────────┤
│ Cloud Load Balancer     │ ~$32/mês
├─────────────────────────┤
│ SSL Certificate         │ FREE (Let's Encrypt)
├─────────────────────────┤
│ Analytics               │ ~$50/mês
└─────────────────────────┘
        TOTAL: ~$132/mês
```

### Backend (www.agrol1nk.com.br)

```
Application Layer
    ↓
┌─────────────────────────┐
│ Cloud Run               │ ~$60-360/mês
├─────────────────────────┤
│ Cloud Tasks             │ ~$0.50/mês
├─────────────────────────┤
│ Pub/Sub                 │ ~$20/mês
├─────────────────────────┤
│ Functions               │ ~$4/mês
└─────────────────────────┘
        TOTAL: ~$85-385/mês

Database Layer
    ↓
┌─────────────────────────┐
│ Cloud SQL (DB)          │ ~$223-446/mês
├─────────────────────────┤
│ Cloud SQL (Storage)     │ ~$102-680/mês
├─────────────────────────┤
│ Cloud SQL (Backup)      │ ~$8-52/mês
├─────────────────────────┤
│ Memorystore Redis       │ ~$70-280/mês
└─────────────────────────┘
        TOTAL: ~$403-1,458/mês

Storage Layer
    ↓
┌─────────────────────────┐
│ Cloud Storage           │ ~$7-46/mês
├─────────────────────────┤
│ Backups                 │ ~$1-50/mês
└─────────────────────────┘
        TOTAL: ~$8-96/mês

Observability
    ↓
┌─────────────────────────┐
│ Logging                 │ ~$50-500/mês
├─────────────────────────┤
│ Monitoring              │ ~$2.50-714/mês
├─────────────────────────┤
│ Trace                   │ ~$2.50-25/mês
└─────────────────────────┘
        TOTAL: ~$55-1,239/mês

Security
    ↓
┌─────────────────────────┐
│ Cloud Armor             │ ~$5/mês
├─────────────────────────┤
│ Cloud KMS               │ ~$6/mês
├─────────────────────────┤
│ VPC Service Controls    │ ~$0/mês (free)
└─────────────────────────┘
        TOTAL: ~$11/mês
```

### WhatsApp Integration

```
Twilio WhatsApp
    ↓
┌─────────────────────────┐
│ Outbound Messages       │ ~$37.50/mês
├─────────────────────────┤
│ Inbound Messages        │ ~$37.50/mês
├─────────────────────────┤
│ Voice (opt.)            │ ~$275/mês
├─────────────────────────┤
│ 2FA Verification        │ ~$10/mês
└─────────────────────────┘
        TOTAL: ~$75-322/mês
```

---

## 💡 Otimizações para Reduzir Custos

### 1. **Auto-scaling Inteligente** 📊
```
Horário Pico:  Cloud Run + 5 instâncias
               ↓ (noite)
Horário Baixo: Cloud Run + 1 instância

Economia: ~40% em CPU/mês
```

### 2. **Database Query Optimization** 🚀
```
Antes: 1000 queries/request × 10k req = 10M queries
Com índices/cache: 100 queries/request × 10k req = 1M queries

Economia: ~30% em CPU do Cloud SQL
```

### 3. **Compressão de Dados** 📦
```
Cloud Storage: Habilitar compressão gzip
Antes: 2000 GB armazenados
Depois: 600 GB (70% do tamanho)

Economia: ~$400/mês
```

### 4. **Reserved Instances** 💰
```
Google Cloud oferece desconto de ~30% para:
- Cloud SQL (1 ano reservado)
- Cloud Run (commitment)
- Compute Engine

Economia: ~$300/mês em produção
```

### 5. **Smart Caching com Redis** ⚡
```
Antes: Toda requisição bate no BD
Depois: Redis cache de 5 minutos + invalidação inteligente

Economia: ~40% em Cloud SQL queries
```

### 6. **CDN Agressivo** 🌐
```
Implementar service worker para:
- Cache offline-first
- Compressão no cliente
- Lazy loading de imagens

Economia: ~30% em egress de dados
```

---

## 📊 Simulação de Crescimento

```
Mês 1-2:   ~$226/mês (Dev)
Mês 3-4:   ~$350/mês (Entrada dev)
Mês 5-6:   ~$1,015/mês (Produção inicial)
             │
             ├─→ Otimizações aplicadas (-20%)
             ├─→ Reserved instances (-30%)
             └─→ Caching melhorado (-30%)
             
Mês 5-6 (Otimizado): ~$507/mês

Mês 7-8:   ~$1,500/mês (100-300 usuários)
Otimizado: ~$750/mês

Mês 9-10:  ~$2,200/mês (300-500 usuários)
Otimizado: ~$1,100/mês

Mês 11-12: ~$4,814/mês (1000+ usuários)
Otimizado: ~$2,407/mês

Total Ano 1: ~$20,210 (bruto)
Total Ano 1: ~$10,105 (com otimizações)
```

---

## 🔐 Custos Ocultos (Não esquecer!)

| Item | Preço | Quando |
|------|-------|--------|
| **Domain agro-link.ia.br** | $25/ano | Anual |
| **Domain agrol1nk.com.br** | $20/ano | Anual |
| **Email (Gmail Business)** | $6/user/mês | Mensal |
| **Backup externo** | $0-100/mês | Mensal |
| **Twilio Premium support** | $50/mês | Mensal (opt.) |
| **GCP Support Plan** | $100-500/mês | Mensal (opt.) |
| **Certificados SSL** | FREE | - |
| **DDoS Protection** | $50-200/mês | Mensal (opt.) |

---

## 🎓 Recomendações por Fase

### ✅ FASE 1 (Meses 1-3): Desenvolvimento
```
Custo: ~$226-350/mês
Usar: Tier mais baixo possível
Config:
  - Cloud SQL: 2 vCPU
  - Redis: 2 GB  
  - Cloud Run: Pay-as-you-go
  - Logging: Básico
```

### ✅ FASE 2 (Meses 4-6): Beta Interno
```
Custo: ~$1,015/mês
Usar: Configuração média com otimizações
Config:
  - Cloud SQL: 4 vCPU
  - Redis: 4-8 GB
  - Cloud Run: 2-3 instâncias
  - Logging: Detalhado
  - Enabled: Cloud Armor básico
```

### ✅ FASE 3 (Meses 7-9): Produção Inicial
```
Custo: ~$1,100-1,500/mês (otimizado)
Usar: Alta disponibilidade
Config:
  - Cloud SQL HA: 4 vCPU
  - Redis HA: 8+ GB
  - Cloud Run: 3-5 instâncias
  - Enabled: Auto-scaling, Cloud Armor, backups
  - Reserved: SQL instances (30% desconto)
```

### ✅ FASE 4 (Meses 10-12): Escala
```
Custo: ~$2,407/mês (otimizado)
Usar: Full enterprise stack
Config:
  - Cloud SQL HA: 8+ vCPU
  - Redis HA: 16+ GB
  - Cloud Run: 5+ instâncias com auto-scaling
  - Enabled: All security features
  - Reserved: SQL + Compute (30% desconto)
  - Monitoring: Full observability
```

---

## 📋 Checklist de Configuração de Custos

- [ ] **Ativar** budgets e alertas no GCP
  ```bash
  gcloud billing budgets create --display-name="Agro-Link Monthly" \
    --budget-amount=1000 \
    --threshold-rule=percent=50,percent=100
  ```

- [ ] **Configurar** billing account
- [ ] **Habilitar** AutoML para otimização
- [ ] **Implementar** tagging de recursos
- [ ] **Revisar** monthly billing report
- [ ] **Documentar** cost allocation by project/service
- [ ] **Testar** scaling automático
- [ ] **Medir** RPS real vs estimado

---

## 🎯 Meta de Custo por Usuário

| Métrica | Alvo |
|---------|------|
| Custo/mês por usuário ativo | $1-5 |
| Custo/mês por requisição (M) | $0.20-0.50 |
| Custo infra / Revenue | < 10% |
| Time-to-scale (2x usuários) | < 2 semanas |

**Exemplo:**
- 500 usuários × $3/mês = $1,500/mês custo
- Se ticket médio = $50/mês → revenue = $25,000
- Margem: 94% (muito bom!)

---

## 📞 Contato para Dúvidas

- GCP Support: https://cloud.google.com/support
- Twilio Support: https://support.twilio.com
- Discussão no projeto: #gcp-costs

---

**Próximo passo:** Configure alertas de orçamento no GCP

```bash
cd Integracao-zeroclaw-agro-link/DEPLOY
# Execute ./gcp-setup.sh para criar o projeto
```
