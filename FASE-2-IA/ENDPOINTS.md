# 🔌 ENDPOINTS: Especificação API da Fase 2

**Status:** Pronto para implementação | **Formato:** OpenAPI 3.0

---

## 📋 Sumário

| Endpoint | Método | Descrição | Auth | Status |
|----------|--------|-----------|------|--------|
| `/dashboard/financeiro-ia/` | GET | Análise financeira + previsão fluxo | ✅ | 🆕 |
| `/dashboard/agricultura-ia/` | GET | Análise produção + ROI por talhão | ✅ | 🆕 |
| `/dashboard/administrativo-ia/` | GET | Análise custos + otimizações | ✅ | 🆕 |

---

## 🔸 1. GET /dashboard/financeiro-ia/

### Descrição
Análise financeira completa com previsões de fluxo de caixa geradas por IA (Gemini).

### Query Parameters
```
period: int = 90 (dias de histórico a analisar)
```

### Exemplo Request
```bash
GET /api/dashboard/financeiro-ia/?period=90
Authorization: Bearer {token}
```

### Response (200 OK)
```json
{
  "kpis_avancados": {
    "faturamento_anual": 500000.00,
    "custos_anuais": 350000.00,
    "lucro_anual": 150000.00,
    "ebitda_margem_pct": 30.0,
    "roi_anualizado": 42.86,
    "dias_caixa": 45.5,
    "custo_medio_diario": 958.90,
    "margem_bruta_pct": 30.0
  },
  "previsoes": [
    {
      "data": "2026-03-06",
      "entradas_estimadas": 25000.00,
      "saidas_estimadas": 18000.00,
      "confianca": 0.95
    },
    {
      "data": "2026-03-07",
      "entradas_estimadas": 22000.00,
      "saidas_estimadas": 16500.00,
      "confianca": 0.92
    }
    // ... mais 58 dias
  ],
  "recomendacoes": [
    {
      "prioridade": "alta",
      "descricao": "Negocie prazo de vencimento em R$ 45.000 com Fornecedor Y",
      "valor_impacto": 45000.00
    },
    {
      "prioridade": "media",
      "descricao": "Considere antecipação de recebíveis para melhorar fluxo",
      "valor_impacto": 30000.00
    }
  ],
  "alertas_ia": [
    {
      "tipo": "tendencia_negativa",
      "descricao": "Fluxo de saídas crescendo 5% ao mês",
      "urgencia": "alta"
    },
    {
      "tipo": "saldo_critico",
      "descricao": "Saldo mínimo previsto: R$ 8.500 (abaixo do recomendado)",
      "urgencia": "critica"
    }
  ],
  "last_updated": "2026-03-05T14:30:00.000Z"
}
```

### Response (400 Bad Request)
```json
{
  "error": "period deve ser um número entre 1 e 365"
}
```

### Response (403 Forbidden)
```json
{
  "detail": "Você não tem permissão para acessar este recurso"
}
```

### Notas de Implementação
- ✅ Requer autenticação
- ✅ Usa permissão `dashboard.view_financeiro`
- ✅ Escopa por tenant (multi-tenant safe)
- ⚠️ Primeira chamada pode levar ~5s (Gemini API)
- 💾 Resultado é cacheado por 1 hora (configurável)

---

## 🔸 2. GET /dashboard/agricultura-ia/

### Descrição
Análise agrícola com ROI por talhão, recomendações para próxima safra e alertas de produtividade.

### Query Parameters
```
safraId: int | null  (ID da safra; null = safra ativa)
```

### Exemplo Request
```bash
GET /api/dashboard/agricultura-ia/?safraId=20
Authorization: Bearer {token}
```

### Response (200 OK)
```json
{
  "roi_por_talhao": [
    {
      "talhao_id": 1,
      "talhao_nome": "Talhão A",
      "roi_por_ha": 150,
      "status": "otimo",
      "recomendacao": "Manter estratégia (ROI 25% acima da média)"
    },
    {
      "talhao_id": 2,
      "talhao_nome": "Talhão B",
      "roi_por_ha": 85,
      "status": "critico",
      "recomendacao": "Considerar não plantar (ROI 35% abaixo da média)"
    },
    {
      "talhao_id": 3,
      "talhao_nome": "Talhão C",
      "roi_por_ha": 110,
      "status": "medio",
      "recomendacao": "Otimizar insumos (potencial +20% ROI)"
    }
  ],
  "roi_medio": 115,
  "recomendacoes_proxima_safra": [
    {
      "talhao_id": 2,
      "acao": "nao_plantar",
      "motivo": "ROI 35% abaixo da média histórica; sugerir uso alternativo (pastagem?)"
    },
    {
      "talhao_id": 1,
      "acao": "otimizar",
      "motivo": "Investir em cultivar de maior potencial (X em vez de Y)"
    }
  ],
  "alertas": [
    {
      "tipo": "produtividade_baixa",
      "talhao_id": 2,
      "descricao": "Produtividade 15% abaixo da expectativa",
      "urgencia": "alta"
    }
  ],
  "last_updated": "2026-03-05T14:31:00.000Z"
}
```

### Response (404 Not Found)
```json
{
  "error": "Safra não encontrada"
}
```

### Notas de Implementação
- ✅ Se `safraId` omitido, usa safra ativa (status="em_andamento")
- ✅ Calcula ROI via: (Receita - Custos) / Custos
- ⚠️ Requer dados de colheita (se nenhuma colheita, ROI não calculado)
- 💾 Cacheado por 2 horas

---

## 🔸 3. GET /dashboard/administrativo-ia/

### Descrição
Análise de custos administrativos com identificação de desvios, centros críticos e oportunidades de economia.

### Query Parameters
```
(nenhum)
```

### Exemplo Request
```bash
GET /api/dashboard/administrativo-ia/
Authorization: Bearer {token}
```

### Response (200 OK)
```json
{
  "centros_criticos": [
    {
      "centro": "Folha de Pagamento",
      "valor_atual": 22000.00,
      "variacao_pct": 15,
      "recomendacao": "Crescimento 15% em relação ao mês anterior; revisar adicionais"
    },
    {
      "centro": "Combustível/Energia",
      "valor_atual": 5500.00,
      "variacao_pct": 8,
      "recomendacao": "Dentro do esperado, mas monitor próximas semanas (sazonalidade)"
    }
  ],
  "economia_potencial_mes": 2000.00,
  "economia_potencial_anual": 24000.00,
  "alertas": [
    {
      "tipo": "desvio_positivo",
      "centro": "Manutenção",
      "valor": 500.00,
      "descricao": "Gasto R$ 500 abaixo do orçado"
    },
    {
      "tipo": "desvio_negativo",
      "centro": "Alimentação",
      "valor": 1500.00,
      "descricao": "Gasto R$ 1.500 acima do orçado"
    }
  ],
  "last_updated": "2026-03-05T14:32:00.000Z"
}
```

### Notas de Implementação
- ✅ Analisa despesas do mês corrente vs mês anterior
- ✅ Compara com orçamento se disponível
- ⚠️ Centros com variação > 10% marcados como "críticos"
- 💾 Cacheado por 1 hora

---

## 🚨 Error Handling

Todos os endpoints retornam erros padrão DRF:

### 401 Unauthorized
```json
{
  "detail": "Credenciais de autenticação não fornecidas."
}
```

### 403 Forbidden
```json
{
  "detail": "Você não tem permissão para acessar este recurso."
}
```

### 500 Internal Server Error (Gemini timeout ou falha)
```json
{
  "detail": "Erro ao processar análise IA. Tente novamente em alguns instantes."
}
```

**Comportamento:** Se Gemini falhar, endpoint retorna dados padrão/cached:
```json
{
  "kpis_avancados": { ... },
  "previsoes": [],
  "recomendacoes": [],
  "alertas_ia": [{"tipo": "api_indisponivel", "urgencia": "media"}]
}
```

---

## 📊 Detalhes Técnicos

### Performance
- **Primeira chamada:** ~3-5s (Gemini API)
- **Com cache:** <200ms
- **Timeout:** 30s

### Rate Limiting
- 60 requisições/minuto por usuário
- 1000 requisições/hora por tenant

### RBAC Permissions
```
Todos requerem:
- user.is_authenticated = True
- user.has_perm('dashboard.view_*')
```

### Dados Multi-tenant
```
Todos os endpoints respeitam tenant do usuário
Superuser vê todos os tenants
usuário normal vê apenas seu tenant
```

---

## 🧪 Teste com cURL

```bash
# 1. Login e obter token
curl -X POST http://localhost:8000/api/token/ \
  -d "username=your_user&password=your_pass" | jq -r .access

# Export token
TOKEN="seu_token_aqui"

# 2. Testar /financeiro-ia/
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/dashboard/financeiro-ia/?period=90 | jq

# 3. Testar /agricultura-ia/
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/dashboard/agricultura-ia/?safraId=20 | jq

# 4. Testar /administrativo-ia/
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/dashboard/administrativo-ia/ | jq
```

---

## 📱 Integração Frontend

### Exemplo React Hook
```typescript
import { useQuery } from '@tanstack/react-query';
import DashboardService from '@/services/dashboard';

function MyComponent() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['financeiro-ia'],
    queryFn: () => DashboardService.getFinanceiroIA(90),
    staleTime: 60 * 60 * 1000, // 1 hora
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorAlert />;

  return (
    <>
      <CashFlowForecast
        historico={data?.fluxo_caixa_historico}
        previsao={data?.previsoes}
      />
      <RecommendationPanel recomendacoes={data?.recomendacoes} />
    </>
  );
}
```

---

**Próximo:** Vá para [CHECKLIST.md](CHECKLIST.md) e comece desenvolvimento!
