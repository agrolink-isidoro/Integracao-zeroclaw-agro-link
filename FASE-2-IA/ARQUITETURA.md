# 🏗️ ARQUITETURA: Integração Fase 2-IA com Sistema Existente

**Objetivo:** Documentar como Fase 2 se integra aos componentes existentes sem quebras.

---

## 📐 Visão Geral (Antes → Depois)

### ANTES (Fase 1 - Atual)
```
┌──────────────────────────────────────────────────────┐
│ FRONTEND                                             │
│                                                      │
│ InteligenciaNegocio (Hub)                            │
│  └─ Outlet                                           │
│     ├─ SaudePropriedade (dados históricos)           │
│     ├─ SaudeProducao (meta-dados)                    │
│     └─ SaudeTecnica (status)                         │
│                                                      │
│ useQuery → DashboardService.getFinanceiro()          │
└────────────┬──────────────────────────────────────┬──┘
             │                                      │
             ↓ GET                                  ↓ GET
┌────────────────────────────┐    ┌─────────────────────────┐
│ BACKEND (Stats)            │    │ BACKEND (Stats)         │
│ /dashboard/financeiro/     │    │ /dashboard/agricultura/ │
│ /dashboard/estoque/        │    │ /dashboard/comercial/   │
│ /dashboard/administrativo/ │    │ /dashboard/estoque/     │
└────────────┬───────────────┘    └──────────┬──────────────┘
             │                              │
             ↓ Query                        ↓ Query
    ┌────────────────────────────────────────────────┐
    │ MODELS (Domain)                                │
    │ ├─ LancamentoFinanceiro                        │
    │ ├─ Vencimento, Transferencia                   │
    │ ├─ Plantio, Colheita                           │
    │ ├─ Produto, MovimentacaoEstoque                │
    │ ├─ Equipamento                                 │
    │ └─ FolhaPagamento, DespesaAdministrativa       │
    └────────────────────────────────────────────────┘
```

### DEPOIS (Fase 2 - Com IA)
```
┌──────────────────────────────────────────────────────┐
│ FRONTEND                                             │
│                                                      │
│ InteligenciaNegocio (Hub)                            │
│  └─ Outlet                                           │
│     ├─ SaudePropriedade (histórico + PREVISÕES)      │
│     │   ├─ useQuery(getFinanceiro)      ← existente  │
│     │   └─ useQuery(getFinanceiroIA) ← NOVO         │
│     │   ├─ CashFlowForecast           ← NOVO        │
│     │   └─ RecommendationPanel        ← NOVO        │
│     ├─ SaudeProducao (meta-dados + ROI)              │
│     │   ├─ useQuery(getAgricultura)    ← existente  │
│     │   └─ useQuery(getAgriculturaIA) ← NOVO        │
│     │   └─ ROIPerTalhao               ← NOVO        │
│     └─ SaudeTecnica (status + alertas)               │
│         ├─ useQuery(getMaquinas)       ← existente  │
│         └─ useQuery(getAdministrativoIA) ← NOVO     │
│                                                      │
│ DashboardService ← ATUALIZADO (+3 métodos)           │
└─────────────────┬──────────────────────────┬──────┬──┘
                  │                          │      │
        ─ existentes ────        ─ NOVOS ────
        │       │                   │       │
        ↓       ↓                   ↓       ↓
   ┌─────────────────┐         ┌───────────────┐
   │ /dashboard/     │         │ /dashboard/   │
   │ financeiro/     │         │ financeiro-ia/│ ← NOVO
   │ agricultura/    │         │ agricultura-ia│ ← NOVO
   │ estoque/        │         │ administrativo│ ← NOVO
   │ ...             │         │ -ia/          │
   └────────┬────────┘         └───────┬───────┘
            │                          │
            │                          │
            └──────────┬───────────────┘
                       ↓
         ┌─────────────────────────────────┐
         │ GeminiAnalyticsService  ← NOVO  │
         │                                 │
         │ • analisa_fluxo_caixa()         │
         │ • analisa_producao()            │
         │ • analisa_custos_adm()          │
         │ • _call_gemini()                │
         └────────┬────────────────────────┘
                  │
                  ↓
      ┌───────────────────────────┐
      │ ZeroClaw SDK              │
      │ (Gemini 2.5 Flash)        │
      └───────────────────────────┘
            ↓
      ┌───────────────────────────┐
      │ Google Gemini API         │
      └───────────────────────────┘

         ↓ Read Only Queries

  ┌────────────────────────────────────────────────────┐
  │ MODELS (Domain) - SEM MUDANÇAS                     │
  │ ├─ LancamentoFinanceiro                            │
  │ ├─ Vencimento, Transferencia, Financiamento        │
  │ ├─ Plantio, Colheita, HarvestSession               │
  │ ├─ Produto, MovimentacaoEstoque                    │
  │ ├─ Equipamento, OrdemServico                       │
  │ ├─ FolhaPagamento, DespesaAdministrativa           │
  │ ├─ CentroCusto, RateioCusto                        │
  │ └─ Contrato, Fornecedor, VendaColheita             │
  └────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Dados em Detalhes

### Fluxo 1: Análise Financeira com Previsões

```
┌──────────────────────┐
│ Usuário clica em:    │
│ SaudePropriedade     │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────────────────────────────┐
│ React useQuery Hook                          │
│                                              │
│ const { data } = useQuery({                  │
│   queryKey: ['financeiro-ia'],               │
│   queryFn: () =>                             │
│     DashboardService.getFinanceiroIA(90)     │  (NOVO METHOD)
│ })                                           │
└──────────┬───────────────────────────────────┘
           │
           ↓ GET /api/dashboard/financeiro-ia/?period=90
┌──────────────────────────────────────────────┐
│ Django View (financeiro_ia_view)             │
│                                              │
│ 1. _get_tenant(request)                      │
│ 2. gemini_service.analisa_fluxo_caixa(...)   │  (NOVO SERVICE)
│    ├─ Query: LancamentoFinanceiro (90d) ✅  │
│    ├─ JSON: histórico                       │
│    └─ Call: Gemini IA                       │
│ 3. Retorna JSON response                     │
└──────────┬───────────────────────────────────┘
           │
           ↓ IA Processing (5-10s)
┌──────────────────────────────────────────────┐
│ GeminiAnalyticsService                       │
│                                              │
│ 1. _call_gemini(prompt=FLUXO_CAIXA_TEMPLATE) │
│    ├─ Prepared prompt com dados históricos   │
│    ├─ Chamada ZeroClaw → Gemini API          │
│    ├─ Retorna JSON com:                      │
│    │  ├─ previsao_60d[]                     │
│    │  ├─ recomendacoes[]                    │
│    │  └─ alertas[]                          │
│    │                                         │
│    └─ Cache resultado por 1h                 │
└──────────┬───────────────────────────────────┘
           │
           ↓ JSON resposta
┌──────────────────────────────────────────────┐
│ Frontend (React Query)                       │
│                                              │
│ data = {                                     │
│   kpis_avancados: { ... },                  │  (Calculados)
│   previsoes: [ ... ],                       │  (IA Generated)
│   recomendacoes: [ ... ],                   │  (IA Generated)
│   alertas_ia: [ ... ]                       │  (IA Generated)
│ }                                            │
│                                              │
│ <CashFlowForecast                            │  (NOVO Component)
│   historico={fluxo_hist}                     │
│   previsao={data.previsoes}                  │
│ />                                           │
│                                              │
│ <RecommendationPanel                         │  (NOVO Component)
│   recomendacoes={data.recomendacoes}         │
│ />                                           │
└──────────────────────────────────────────────┘
```

### Fluxo 2: Análise de ROI por Talhão

```
Similarmente para agricultura-ia/:

Usuário
  ↓
useQuery(getAgriculturaIA(safraId))
  ↓
GET /dashboard/agricultura-ia/?safraId=20
  ↓
agricultura_ia_view()
  ├─ _get_tenant()
  ├─ gemini_service.analisa_producao(tenant, safra_id)
  │  ├─ Query: Plantio, Colheita (safra específica)
  │  ├─ Query: RateioCusto (gastos)
  │  ├─ Call: Gemini ANALISE_PRODUCAO_TEMPLATE
  │  └─ Retorna ROI por talhão + recomendações
  │
  └─ Response JSON
        ↓
Frontend
  ├─ <ROIPerTalhao dados={data.roi_por_talhao} />
  └─ <RecommendationPanel recomendacoes={...} />
```

---

## 🔐 Segurança & Multi-tenant

### Isolamento de Dados

```
✅ Todo endpoint verifica tenant:
   tf = _tf(request)  # {"tenant": request.tenant} ou {}
   
   Queries like:
   LancamentoFinanceiro.objects.filter(**tf, ...)
   // Só retorna dados do tenant do usuário

✅ Permissões RBAC aplicadas:
   @permission_classes([IsAuthenticated])
   // Apenas usuários logados
   
   // Futuramente adicionar:
   @permission_classes([IsAuthenticated, DjangoModelPermissions])
   // Só users com perms específicas
```

### Dados Sensíveis

```
⚠️ GeminiAnalyticsService envia para IA:
   - Dados históricos anônimos (datas, valores)
   - NÃO envia: nomes de clientes, dados pessoais

✅ Cache local em Redis (não na nuvem)
   - Dados em cache ficam no servidor
   - TTL: 1-2 horas
```

---

## 📊 Schemas Database (Zero Novas Tabelas)

**Grande vantagem:** Fase 2 NÃO cria novas modelos!

```
Existentes (Reutilizados):
✅ LancamentoFinanceiro       (financeiro)
✅ Vencimento, Transferencia  (financeiro)
✅ Financiamento, Emprestimo  (financeiro)
✅ Plantio, Colheita          (agricultura)
✅ HarvestSession             (agricultura novo - já existe)
✅ Produto, Movimentacao      (estoque)
✅ Equipamento                (maquinas)
✅ FolhaPagamento             (administrativo)
✅ DespesaAdministrativa      (administrativo)
✅ CentroCusto, RateioCusto   (administrativo)

ZERO novas migrations necessárias ✅
```

---

## 🔄 Ciclo de Vida: Dados → IA → Decisão

```
DIÁRIO:

06:00 - Celery task executa:
  ├─ calculate_kpis_ia() (NOVO - Fase 2)
  │  ├─ Para cada tenant:
  │  │  ├─ Aggregar dados financeiro (90d)
  │  │  ├─ Call Gemini (5-10s)
  │  │  └─ Salvar em cache Redis por 1h
  │  │
  │  └─ send_alerts_ia() (NOVO - Fase 2)
  │     ├─ Verificar alertas críticos
  │     └─ Enviar WhatsApp/Email
  │
  └─ Usuário acorda e vê:
     ├─ Alertas WhatsApp: "Fluxo crítico! Saldo mínimo R$8.500"
     └─ Abre app → CentralInteligência → dados + recomendações já carregados

12:00 - Usuário acessa SaudePropriedade:
  ├─ React Query vê: "dados expirados?" (staleTime)
  ├─ Se sim: refetch GET /dashboard/financeiro-ia/
  └─ Acesso cache Redis (rápido <200ms)
     ou refetch se necessário

15:00 - Novo vencimento adicionado:
  ├─ Backend registra LancamentoFinanceiro
  ├─ React Query invalidates cache (manual)
  ├─ Próximo GET /dashboard/financeiro-ia/ = fresh IA analysis
  └─ Usuário vê novo alerta dentro de segundos
```

---

## 🚀 Performance & Scalability

### Timeframe Esperados

```
Primeira Chamada:
  ├─ Query DB: 200ms  (last 90 days dados)
  ├─ Gemini API: 5-10s (IA analysis)
  └─ Total: ~7-12 segundos

COM CACHE (Redis):
  ├─ Cache hit: <200ms
  ├─ Cache miss: 7-12s (recalcula)
  └─ TTL: 1 hora (configurável)

Recomendação:
  • Primeira visualização: mostrar spinner + loading message
  • Segunda visualização (dentro 1h): instant load
  • Celery task background: atualiza cache antes de expirar
```

### Escalabilidade

```
Single Server:
  ├─ ~50-100 users simultâneos (frontend)
  ├─ Gemini API throttling: ~5 requests/segundo
  └─ Redis cache evita D

OS IA redundantes

Multi-tenant:
  ├─ Setup: 1 Redis cache compartilhado
  ├─ Keys: kpis_ia_{tenant_id}  (isolado por tenant)
  └─ Load: Proporcional ao número de tenants
```

---

## 📁 Estrutura de Pastas (Completa)

```
projeto-agro/
├── backend/
│   ├── apps/
│   │   ├── dashboard/              (existente, atualizado)
│   │   │   ├── views.py            ← add 3 novos endpoints
│   │   │   ├── urls.py             ← add 3 novas rotas
│   │   │   ├── serializers.py      (sem mudanças)
│   │   │   └── ...
│   │   ├── financeiro/             (existente, sem mudanças)
│   │   │   ├── models.py
│   │   │   ├── views.py
│   │   │   └── ...
│   │   ├── agricultura/            (existente, sem mudanças)
│   │   ├── administrativo/         (existente, sem mudanças)
│   │   ├── estoque/                (existente, sem mudanças)
│   │   └── ...
│   ├── services/                   ← NOVO DIRETÓRIO
│   │   ├── __init__.py
│   │   ├── gemini_analytics.py     ← NOVO (GeminiAnalyticsService)
│   │   └── dashboard_utils.py      (helpers)
│   ├── tasks/                      ← NOVO (Celery tasks)
│   │   ├── __init__.py
│   │   └── kpis.py                 (background processing)
│   ├── settings.py                 (sem mudanças maiores)
│   ├── requirements.txt            (no changes needed - zeroclaw já existe)
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   └── dashboard.ts        ← add 3 novos métodos IA
│   │   ├── components/
│   │   │   ├── CashFlowForecast.tsx        ← NOVO
│   │   │   ├── RecommendationPanel.tsx     ← NOVO
│   │   │   ├── ROIPerTalhao.tsx            ← NOVO
│   │   │   └── ... (existentes)
│   │   ├── pages/
│   │   │   └── dashboard/
│   │   │       ├── SaudePropriedade.tsx    ← atualizar (add componentes)
│   │   │       ├── SaudeProducao.tsx       ← atualizar (add componentes)
│   │   │       ├── SaudeTecnica.tsx        (sem mudanças)
│   │   │       ├── InteligenciaNegocio.tsx (sem mudanças)
│   │   │       └── ...
│   │   └── ...
│   └── package.json                (sem mudanças)
│
└── FASE-2-IA/                      ← Esta pasta
    ├── README.md
    ├── ROADMAP.md
    ├── IMPLEMENTACAO.md
    ├── ARQUITETURA.md              ← Você está aqui
    ├── ENDPOINTS.md
    ├── CHECKLIST.md
    └── src/
        └── (snippets de código pronto)
```

---

## ✅ Compatibilidade Checklist

- [x] Django REST Framework (existente) - 100% compatível
- [x] React Query (existente) - 100% compatível
- [x] ZeroClaw SDK (existente) - 100% compatível
- [x] Gemini API (novo) - parte do ZeroClaw
- [x] Redis Cache (pode ser novo) - opcional mas recomendado
- [x] Celery Tasks (pode ser novo) - opcional mas recomendado
- [x] Multi-tenant (existente) - respeitado em todos endpoints

---

**Próximo:** Veja [CHECKLIST.md](CHECKLIST.md) para começar implementação!
