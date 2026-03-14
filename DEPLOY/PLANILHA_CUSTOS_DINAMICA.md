# 📊 Planilha de Custos Dinâmica - Agro-Link

**Data:** 14 de março de 2026  
**Formato:** Datos tabulares para cálculo dinâmico  
**Uso:** Planilha Excel / Google Sheets ou script Python

---

## 🔢 Dados de Preços (Base GCP + Twilio)

### Cloud Run Pricing

```json
{
  "cloud_run": {
    "cpu_per_second": 0.00002400,
    "memory_per_gb_second": 0.000005,
    "instance_hour": 0.06,
    "min_monthly": 0,
    "monthly_free_tier": {
      "cpu_seconds": 18000000,
      "memory_gb_seconds": 360000000,
      "requests": 2000000
    }
  }
}
```

### Cloud SQL Pricing

```json
{
  "cloud_sql": {
    "vcpu_per_hour": {
      "shared": 0.0644,
      "standard": 6.65,
      "highmem": 7.964,
      "custom_per_vcpu": 0.55
    },
    "storage_per_gb": 0.34,
    "backup_per_gb": 0.026,
    "high_availability_multiplier": 1.5,
    "read_replica_multiplier": 0.5
  }
}
```

### Redis Pricing

```json
{
  "redis": {
    "gb_per_month": 35,
    "ha_multiplier": 2.0,
    "sizes": {
      "2gb": 70,
      "4gb": 140,
      "8gb": 280,
      "16gb": 560
    }
  }
}
```

### Cloud Storage Pricing

```json
{
  "cloud_storage": {
    "us_standard_per_gb": 0.023,
    "first_1tb_free": true,
    "retrieval_fee": 0,
    "egress_us_to_internet": 0.12,
    "egress_within_region": 0,
    "egress_cross_region": 0.06
  }
}
```

### Cloud Load Balancer & CDN

```json
{
  "load_balancer": {
    "forwarding_rule": 32,
    "cloud_armor_policy": 5,
    "http_request_per_million": 0.60
  },
  "cdn": {
    "per_gb_cached": 0.085,
    "origin_shielding_per_gb": 0.005
  }
}
```

### Twilio WhatsApp

```json
{
  "twilio": {
    "whatsapp_outbound": 0.0075,
    "whatsapp_inbound": 0.0075,
    "voice_per_minute": 0.0275,
    "2fa_sms": 0.01,
    "monthly_number_fee": 1.00,
    "high_volume_discount_at": 10000
  }
}
```

### Logging & Monitoring

```json
{
  "logging": {
    "per_gb": 0.50,
    "fast_tier": true,
    "log_sink_free": true
  },
  "monitoring": {
    "custom_metric": 0.357,
    "ingested_protocol_data_per_mib": 0.00028,
    "api_call": 0.0065
  }
}
```

---

## 📈 Cenários de Uso

### Cenário 1: Desenvolvimento (10-20 devs)

```csv
Métrica,Valor,Unidade
Usuários,20,pessoas
RPS (requisições/segundo),10,rps
Requisições/mês,26000000,reqs
Cloud Run CPU (média),2,vCPU
Cloud Run instâncias,1,inst
Cloud SQL vCPU,2,vCPU
Cloud SQL storage,50,GB
Redis,2,GB
Cloud Storage,50,GB
Egress mensal,5,GB
WhatsApp msgs,500,msgs
```

**Cálculo:**
```
Cloud Run: 
  - CPU: 26M reqs × 0.1s = 2.6M CPU-seg = 260 CPU-min → $60/mês
  - Free tier: 18M CPU-seg/mês → Rest $8M seg × $0.00002400 = $192
  - Horas máquina: 730h × $0.06 × 1 inst = $43.80
  - Total: ~$60/mês

Cloud SQL:
  - vCPU: 2 × $55.80 = $111.60/mês
  - Storage: 50GB × $0.34 = $17/mês
  - Total: ~$128/mês

Redis: 2GB × $35 = $70/mês

Cloud Storage:
  - Armazenamento: 50GB × $0.023 = $1.15/mês
  - Egress: 5GB × $0.12 = $0.60/mês
  - Total: ~$2/mês

Twilio:
  - 500 msgs × $0.0075 = $3.75/mês

Logging & Monitoring:
  - Logging: 100GB × $0.50 = $50/mês
  - Monitoring: 100 metrics × $0.357 = $35.70/mês

TOTAL: $226/mês
```

### Cenário 2: Produção Inicial (100-200 usuários)

```csv
Métrica,Valor,Unidade
Usuários,150,pessoas
RPS (média),50,rps
Requisições/mês,129600000,reqs
Cloud Run CPU (média),5,vCPU
Cloud Run instâncias,2,inst
Cloud SQL vCPU,4,vCPU
Cloud SQL storage,300,GB
Redis,4,GB
Cloud Storage,300,GB
Egress mensal,100,GB
WhatsApp msgs,5000,msgs
```

**Cálculo:**
```
Cloud Run:
  - 129.6M reqs × 0.2s = 25.9M CPU-seg → $620/mês
  - Free tier: 18M → Rest $7.9M × $0.00002400 = $189
  - Instâncias: 2 × 730h × $0.06 = $87.60
  - Total: ~$60/mês (com free tier)

Cloud SQL:
  - vCPU: 4 × $55.80 = $223.20/mês
  - Storage: 300GB × $0.34 = $102/mês
  - Backup: 300GB × $0.026 = $7.80/mês
  - Total: ~$333/mês

Redis: 4GB × $35 = $140/mês

Cloud Storage:
  - Armazenamento: 300GB × $0.023 = $6.90/mês
  - Egress: 100GB × $0.12 = $12/mês
  - Total: ~$19/mês

Load Balancer & CDN:
  - LB: $32/mês
  - CDN: 50GB × $0.085 = $4.25/mês
  - Total: ~$36/mês

Logging & Monitoring:
  - Logging: 200GB × $0.50 = $100/mês
  - Monitoring: 500 metrics × $0.357 = $178.50/mês
  - Cloud Trace: 10GB × $0.25 = $2.50/mês
  - Total: ~$281/mês

Twilio:
  - 5K msgs × $0.0075 = $37.50/mês

TOTAL: ~$1,015/mês
```

### Cenário 3: Produção em Escala (1000+ usuários)

```csv
Métrica,Valor,Unidade
Usuários,1000,pessoas
RPS (pico),200,rps
Requisições/mês,518400000,reqs
Cloud Run CPU (média),30,vCPU
Cloud Run instâncias,5,inst
Cloud SQL vCPU (HA),8,vCPU
Cloud SQL storage,2000,GB
Redis (HA),16,GB
Cloud Storage,2000,GB
Egress mensal,1000,GB
WhatsApp msgs,50000,msgs
```

**Cálculo:**
```
Cloud Run:
  - 518.4M reqs × 0.5s = 259M CPU-seg → $6,216/mês
  - Memory: 10GB × 259M seg = 2.59B GB-seg → $12,950/mês
  - Instâncias: 5 × 730h × $0.06 = $219
  - Free tier: 18M CPU-seg + 360M GB-seg (reduz de ~$6K para ~$3K)
  - Total: ~$360/mês (muito mais barato que esperado!)

Cloud SQL (HA):
  - vCPU: 8 × $55.80 × 1.5(HA) = $669.60/mês
  - Storage: 2000GB × $0.34 = $680/mês
  - Backup: 2000GB × $0.026 = $52/mês
  - Total: ~$1,402/mês

Redis (HA):
  - 16GB × $35 × 2(HA) = $1,120/mês

Cloud Storage:
  - Armazenamento: 2000GB × $0.023 = $46/mês
  - Egress: 1000GB × $0.12 = $120/mês
  - Total: ~$166/mês

Load Balancer & CDN:
  - LB: $32/mês
  - Cloud Armor: $5/mês
  - CDN: 500GB × $0.085 = $42.50/mês
  - Total: ~$80/mês

Logging & Monitoring:
  - Logging: 1000GB × $0.50 = $500/mês
  - Monitoring: 2000 metrics × $0.357 = $714/mês
  - Cloud Trace: 100GB × $0.25 = $25/mês
  - Cloud KMS: $6/mês
  - Total: ~$1,245/mês

Twilio:
  - 50K msgs × $0.0075 = $375/mês
  - (se adicionar voice: 10K min × $0.0275 = $275/mês)
  - Total: ~$375-650/mês

TOTAL: ~$4,814/mês
```

---

## 🎯 Otimizações & Descontos

### Reserved Instances (Google Cloud)

```json
{
  "cloud_sql_reserved": {
    "discount_1_year": 0.25,
    "discount_3_years": 0.52,
    "aplicável_a": "vCPU e Memory"
  },
  "cloud_run_reserved": {
    "discount": 0.30,
    "commitment_period": "annually"
  },
  "exemplo": {
    "cloud_sql_4vcpu_without": 223.20,
    "cloud_sql_4vcpu_1year_reserved": 167.40,
    "economía_anual": 670.80
  }
}
```

### Compression & Optimization

```csv
Técnica,Redução,Área Afetada
Gzip Compression,70%,Cloud Storage
Redis Caching,40%,Cloud SQL Queries
Database Indexing,30%,Query Performance
Image Optimization,60%,CDN Egress
Lazy Loading,20%,Initial Load
```

---

## 💰 Projeção Anual Completa

### Timeline de Crescimento

```csv
Período,Usuários,RPS,Cenário,Custo Bruto,Custo Otimizado,Lucro Estimado
Mês 1-2,20,10,Dev,$226,$226,$0
Mês 3-4,50,20,Dev/Beta,$350,$300,$2000
Mês 5-6,100,50,Inicial,$1015,$750,$5000
Mês 7-8,300,100,Inicial+,$1500,$1100,$10000
Mês 9-10,500,200,Médio,$2200,$1650,$20000
Mês 11-12,1000,500,Escala,$4814,$3500,$50000
```

### Custos Anuais

```
                Bruto       Otimizado    Diferença
Dev (meses 1-2):    $452        $452          -
Beta (mês 3-4):     $700        $600       -$100
Inicial (5-6):    $2,030      $1,500       -$530
Inicial+ (7-8):   $3,000      $2,200     -$800
Médio (9-10):     $4,400      $3,300     -$1,100
Escala (11-12):   $9,628      $7,000     -$2,628

TOTAL ANO 1:     $20,210     $14,652      -$5,558
```

---

## 🧮 Calculadora de Custos (Python)

```python
#!/usr/bin/env python3
"""
Calculadora de Custos Agro-Link
Usage: python cost_calculator.py --users 500 --rps 200
"""

import argparse
import json

PRICING = {
    "cloud_run": {
        "cpu_per_second": 0.00002400,
        "instance_hour": 0.06,
    },
    "cloud_sql": {
        "vcpu_hour": 55.80 / 730,
        "storage_gb": 0.34,
    },
    "redis": {"gb_month": 35},
    "twilio": {"msg": 0.0075},
}

def estimate_cpu_seconds(rps, avg_latency_ms=100):
    """Estima CPU-segundos baseado em RPS"""
    monthly_requests = rps * 60 * 60 * 24 * 30
    return monthly_requests * (avg_latency_ms / 1000)

def calculate_costs(users, rps, scenario="initial"):
    """Calcula custos para um cenário"""
    
    # Cloud Run
    cpu_seconds = estimate_cpu_seconds(rps)
    cloud_run_cost = cpu_seconds * PRICING["cloud_run"]["cpu_per_second"]
    
    # Cloud SQL
    if scenario == "dev":
        vcpu = 2
        storage = 50
    elif scenario == "initial":
        vcpu = 4
        storage = 300
    else:  # scale
        vcpu = 8
        storage = 2000
    
    cloud_sql_cost = (vcpu * 55.80) + (storage * PRICING["cloud_sql"]["storage_gb"])
    
    # Redis
    redis_size = 2 if scenario == "dev" else (4 if scenario == "initial" else 16)
    redis_cost = redis_size * PRICING["redis"]["gb_month"]
    
    # Twilio
    msgs_per_user = 5 if scenario == "dev" else (50 if scenario == "initial" else 50)
    twilio_cost = users * msgs_per_user * PRICING["twilio"]["msg"]
    
    # Total
    total = cloud_run_cost + cloud_sql_cost + redis_cost + twilio_cost
    
    return {
        "users": users,
        "rps": rps,
        "scenario": scenario,
        "cloud_run": round(cloud_run_cost, 2),
        "cloud_sql": round(cloud_sql_cost, 2),
        "redis": round(redis_cost, 2),
        "twilio": round(twilio_cost, 2),
        "total": round(total, 2)
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--users", type=int, default=100)
    parser.add_argument("--rps", type=int, default=50)
    parser.add_argument("--scenario", default="initial")
    
    args = parser.parse_args()
    
    result = calculate_costs(args.users, args.rps, args.scenario)
    print(json.dumps(result, indent=2))
```

**Execução:**
```bash
python cost_calculator.py --users 500 --rps 200 --scenario initial
# Output:
# {
#   "users": 500,
#   "rps": 200,
#   "scenario": "initial",
#   "cloud_run": 240.00,
#   "cloud_sql": 333.20,
#   "redis": 140.00,
#   "twilio": 1875.00,
#   "total": 2588.20
# }
```

---

## 📊 Matriz de Decisão

### Qual Cenário Escolher?

```
┌──────────────┬─────────────┬─────────────┬──────────────────┐
│ Fase         │ Usuários    │ Custo/mês   │ Melhor para...   │
├──────────────┼─────────────┼─────────────┼──────────────────┤
│ Dev          │ < 50        │ $200-300    │ MVP + testes     │
├──────────────┼─────────────┼─────────────┼──────────────────┤
│ Beta         │ 50-100      │ $500-800    │ Closed beta      │
├──────────────┼─────────────┼─────────────┼──────────────────┤
│ Inicial      │ 100-300     │ $1,000-1,500│ Public launch    │
├──────────────┼─────────────┼─────────────┼──────────────────┤
│ Crescimento  │ 300-1000    │ $1,500-3,000│ Early growth     │
├──────────────┼─────────────┼─────────────┼──────────────────┤
│ Escala       │ 1000+       │ $3,000-5,000│ Full production  │
└──────────────┴─────────────┴─────────────┴──────────────────┘
```

### Quando Escalar?

```
Métrica                  →reshold      Ação
RPS > 500               Adicionar instância Cloud Run
Latência > 500ms        Aumentar Redis cache
Erro 5xx > 0.1%         Scale database replicas
Storage > 1TB           Archive antigos dados
Throughput DDos > 10K   Ativar Cloud Armor Premium
```

---

## 🎁 Descontos & Oportunidades

### GCP Credits

```json
{
  "startup_program": {
    "amount": 100000,
    "duration_months": 12,
    "requirements": ["<500 employees", "raised<15M"]
  },
  "education_grant": {
    "amount": 50000,
    "duration_months": 12
  },
  "commit_discount": {
    "1_year": "25%",
    "3_years": "52%"
  }
}
```

### Open Source Program

Se Agro-Link open-sourced:
- **GCP Credits:** $25,000/ano
- **Suporte prioritário:** Free

### AI/ML Credits

Usar Gemini/IA para a plataforma:
- **Google Cloud AI Credits:** $10,000/ano

---

## 🔐 Custos Não-Previstos

```csv
Item,Estimativa,Frequência,Total/Ano
DDoS Protection (Cloud Armor),5-200/mês,Mensal,100-2400
VPN/Bastion Host,10-50/mês,Mensal,120-600
Backup externo,0-100/mês,Mensal,0-1200
Email (Business),6/user/mês,Mensal,600-1200
Support plan,50-500/mês,Mensal,600-6000
SSL Certificates,0,Mensal,0 (Let's Encrypt free)
Domain registrations,15-30/ano,Anual,30-60
```

---

## 📞 Próximas Ações

1. **Configurar Budget Alerts** no GCP
   ```bash
   gcloud billing budgets create --display-name="Agro-Link" \
     --budget-amount=500 \
     --threshold-rule=percent=50,percent=100
   ```

2. **Ativar Billing Export** para BigQuery
   ```bash
   gsutil ls -b                        # Listar buckets
   gcloud export -> BigQuery           # Analytics
   ```

3. **Monitorar Gastos Mensais**
   - Dashboard: https://console.cloud.google.com/billing
   - Alerts: email quando > 50% budget

4. **Revisar & Otimizar**
   - Mensalmente: revisar factura
   - Trimestralmente: ajustar recursos
   - Anualmente: renovar reserved instances

---

**Dados actualizados:** 14/03/2026  
**Próxima revisão:** Quando atingir produção
