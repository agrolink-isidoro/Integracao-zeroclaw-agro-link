# 💻 IMPLEMENTAÇÃO: Código Pronto para Copiar-Colar

**Status:** Tudo aqui é copiar-colar | **Contexto:** Backend Django + Frontend React-Query

---

## 📋 Índice

1. [Backend: GeminiAnalyticsService](#backend-geminianalyticsservice)
2. [Backend: Novos Endpoints](#backend-novos-endpoints)
3. [Frontend: Service Layer](#frontend-service-layer)
4. [Frontend: Componentes React](#frontend-componentes-react)
5. [Configurações & Integração](#configurações--integração)

---

## Backend: GeminiAnalyticsService

### Arquivo: `backend/services/gemini_analytics.py`

```python
"""
GeminiAnalyticsService: Análise financeira, agrícola e administrativa com Gemini IA
Integra com ZeroClaw SDK para chamadas à API Gemini 2.5 Flash
"""

import json
from decimal import Decimal
from typing import Dict, Any, List
from django.utils import timezone
from zeroclaw_sdk import ZeroClaw  # ✅ Já existe no projeto

from apps.financeiro.models import LancamentoFinanceiro, Vencimento
from apps.agricultura.models import Plantio, Colheita
from apps.administrativo.models import FolhaPagamento, DespesaAdministrativa


class PromptTemplates:
    """Prompts otimizados para Gemini IA"""

    ANALISE_FLUXO_CAIXA = """
Você é um analista financeiro especialista em agronegócio. Analise os dados de fluxo de caixa:

HISTÓRICO (últimos 90 dias):
{historico_json}

CONTEXTO:
- Propriedade rural / Agronegócio
- Receitas: vendas, financiamentos
- Despesas: insumos, folha, manutenção

TAREFA:
1. Identifique padrões e tendências
2. Preveja fluxo dos próximos 60 dias (dataframe JSON)
3. Máximo 3 recomendações prioritárias
4. Máximo 3 alertas críticos

RESPONDA EM JSON:
{{
  "analise": "resumo em 1-2 linhas",
  "previsao_60d": [
    {{"data": "YYYY-MM-DD", "entradas_estimadas": 50000, "saidas_estimadas": 35000, "confianca": 0.95}},
    ...
  ],
  "recomendacoes": [
    {{"prioridade": "alta", "descricao": "...", "valor_impacto": 25000}}
  ],
  "alertas": [
    {{"tipo": "vencimento_atrasado", "descricao": "...", "urgencia": "critica"}}
  ]
}}
"""

    ANALISE_PRODUCAO = """
Analise dados de produção agrícola e ROI:

SAFRA:
{safra_json}

CUSTOS E ROI:
{custos_json}

ANÁLISE:
1. Calcule ROI imediato por talhão
2. Compare vs histórico (se disponível)
3. Identifique talhões com baixo ROI
4. Sugira otimizações para próxima safra

RESPONDA EM JSON:
{{
  "roi_por_talhao": [
    {{"talhao_id": 1, "roi_por_ha": 150, "status": "bom", "recomendacao": "..."}}
  ],
  "roi_medio": 120,
  "recomendacoes_proxima_safra": [
    {{"talhao_id": 2, "acao": "nao_plantar|reduzir|otimizar", "motivo": "..."}}
  ]
}}
"""

    ANALISE_CUSTOS_ADM = """
Analise custos administrativos:

DADOS:
{custos_json}

Identifique:
1. Centros de custo acima do esperado
2. Comparativos mês/mês ou vs orçamento
3. Oportunidades de redução

RESPONDA EM JSON:
{{
  "centros_criticos": [
    {{"centro": "...", "valor_atual": 5000, "variacao_pct": 15, "recomendacao": "..."}}
  ],
  "economia_potencial_mes": 2000,
  "alertas": []
}}
"""


class GeminiAnalyticsService:
    """Serviço de análise IA usando Gemini"""

    def __init__(self):
        self.zeroclaw = ZeroClaw()  # ✅ Já inicializado no projeto
        self.model = "gemini-2.5-flash"

    def _call_gemini(self, prompt: str) -> Dict[str, Any]:
        """Chama Gemini e retorna JSON parseado"""
        try:
            response = self.zeroclaw.generate_content(
                prompt=prompt,
                model=self.model,
                temperature=0.3,  # Determinístico para análise
                max_tokens=2000,
            )
            
            # Parse JSON da resposta
            json_str = response.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:-3]  # Remove ``` delimiters
            
            return json.loads(json_str)
        except Exception as e:
            print(f"Erro ao chamar Gemini: {e}")
            return self._dados_default()

    def _dados_default(self) -> Dict[str, Any]:
        """Retorno padrão se IA falhar (graceful degradation)"""
        return {
            "analise": "Erro ao processar - dados indisponíveis",
            "previsao_60d": [],
            "recomendacoes": [],
            "alertas": [],
        }

    # ─────────────────────────────────────────────────────────
    # ANÁLISE FINANCEIRA
    # ─────────────────────────────────────────────────────────

    def analisa_fluxo_caixa(self, tenant, period_days: int = 90) -> Dict[str, Any]:
        """Análise de fluxo de caixa com previsão"""
        from datetime import timedelta
        from django.db.models import Sum, Q

        today = timezone.now().date()
        period_start = today - timedelta(days=period_days)

        # Aggregar dados históricos
        historico = (
            LancamentoFinanceiro.objects
            .filter(tenant=tenant, data__gte=period_start, data__lte=today)
            .values("data")
            .annotate(
                entradas=Sum("valor", filter=Q(tipo="entrada")),
                saidas=Sum("valor", filter=Q(tipo="saida")),
            )
            .order_by("data")
        )

        historico_json = json.dumps([
            {
                "data": str(h["data"]),
                "entradas": float(h["entradas"] or 0),
                "saidas": float(h["saidas"] or 0),
            }
            for h in historico
        ], ensure_ascii=False)

        # Chamar Gemini
        prompt = PromptTemplates.ANALISE_FLUXO_CAIXA.format(historico_json=historico_json)
        resultado = self._call_gemini(prompt)

        return {
            "kpis_avancados": self._calcula_kpis_financeiro(tenant),
            "previsoes": resultado.get("previsao_60d", []),
            "recomendacoes": resultado.get("recomendacoes", []),
            "alertas_ia": resultado.get("alertas", []),
        }

    def _calcula_kpis_financeiro(self, tenant) -> Dict[str, float]:
        """Calcula KPIs avançados de financeiro"""
        from datetime import timedelta
        from django.db.models import Sum, Q, F
        
        today = timezone.now().date()
        year_ago = today - timedelta(days=365)

        # KPIs
        faturamento_ano = LancamentoFinanceiro.objects.filter(
            tenant=tenant,
            tipo="entrada",
            data__gte=year_ago
        ).aggregate(Sum("valor"))["valor__sum"] or Decimal("0")

        custos_ano = LancamentoFinanceiro.objects.filter(
            tenant=tenant,
            tipo="saida",
            data__gte=year_ago
        ).aggregate(Sum("valor"))["valor__sum"] or Decimal("0")

        lucro_ano = faturamento_ano - custos_ano
        ebitda_margem = (lucro_ano / faturamento_ano * 100) if faturamento_ano > 0 else 0

        # Dias de caixa
        saldo = LancamentoFinanceiro.objects.filter(
            tenant=tenant
        ).aggregate(
            total=Sum(F("valor"), filter=Q(tipo="entrada"), output_field=Decimal)
        )["total"] or Decimal("0")
        
        custo_medio_dia = float(custos_ano) / 365
        dias_caixa = float(saldo) / custo_medio_dia if custo_medio_dia > 0 else 0

        return {
            "faturamento_anual": float(faturamento_ano),
            "custos_anuais": float(custos_ano),
            "lucro_anual": float(lucro_ano),
            "ebitda_margem_pct": float(ebitda_margem),
            "roi_anualizado": float((lucro_ano / custos_ano * 100) if custos_ano > 0 else 0),
            "dias_caixa": round(dias_caixa, 1),
            "custo_medio_diario": round(custo_medio_dia, 2),
            "margem_bruta_pct": float(ebitda_margem),
        }

    # ─────────────────────────────────────────────────────────
    # ANÁLISE AGRÍCOLA
    # ─────────────────────────────────────────────────────────

    def analisa_producao(self, tenant, safra_id: int = None) -> Dict[str, Any]:
        """Análise de produção com ROI por talhão"""
        
        # Carregar safra
        if safra_id:
            safra = Plantio.objects.filter(tenant=tenant, id=safra_id).first()
        else:
            safra = Plantio.objects.filter(tenant=tenant, status="em_andamento").first()

        if not safra:
            return {"erro": "Nenhuma safra encontrada"}

        # Aggregar custos por talhão
        from apps.financeiro.models import RateioCusto
        
        custos_talhao = (
            RateioCusto.objects
            .filter(tenant=tenant, plantio=safra)
            .values("talhao_id")
            .annotate(custo_total=Sum("valor"))
        )

        # Produção por talhão
        colheitas_talhao = (
            Colheita.objects
            .filter(tenant=tenant, plantio=safra)
            .values("items__talhao_id")
            .annotate(producao_kg=Sum("items__quantidade_colhida"))
        )

        # Formatar para JSON
        safra_json = json.dumps({
            "id": safra.id,
            "cultura": safra.cultura.nome if safra.cultura else "?",
            "area_total_ha": float(safra.area_plantada),
            "talhoes": [
                {
                    "id": t.id,
                    "nome": t.name,
                    "area_ha": float(t.area_size or 0),
                }
                for t in safra.talhoes.all()
            ]
        }, ensure_ascii=False)

        # Chamar Gemini
        prompt = PromptTemplates.ANALISE_PRODUCAO.format(
            safra_json=safra_json,
            custos_json=json.dumps(list(custos_talhao), default=str)
        )
        resultado = self._call_gemini(prompt)

        return {
            "roi_por_talhao": resultado.get("roi_por_talhao", []),
            "recomendacoes_proxima_safra": resultado.get("recomendacoes_proxima_safra", []),
            "alertas": resultado.get("alertas", []),
        }

    # ─────────────────────────────────────────────────────────
    # ANÁLISE ADMINISTRATIVA
    # ─────────────────────────────────────────────────────────

    def analisa_custos_adm(self, tenant) -> Dict[str, Any]:
        """Análise de custos administrativos"""
        from datetime import timedelta
        from django.db.models import Sum

        today = timezone.now().date()
        month_start = today.replace(day=1)

        # Aggregar por centro de custo
        custos_centro = (
            DespesaAdministrativa.objects
            .filter(tenant=tenant, data__gte=month_start)
            .values("centro_custo__nome")
            .annotate(valor_total=Sum("valor"))
        )

        # Chamar Gemini
        prompt = PromptTemplates.ANALISE_CUSTOS_ADM.format(
            custos_json=json.dumps(list(custos_centro), default=str)
        )
        resultado = self._call_gemini(prompt)

        return {
            "centros_criticos": resultado.get("centros_criticos", []),
            "economia_potencial_mes": resultado.get("economia_potencial_mes", 0),
            "alertas": resultado.get("alertas", []),
        }


# ✅ Singleton instance
gemini_service = GeminiAnalyticsService()
```

---

## Backend: Novos Endpoints

### Arquivo: `backend/apps/dashboard/views.py` (adicione ao final)

```python
# ───────────────────────────────────────────────────────────────
# IA ENDPOINTS (Fase 2)
# ───────────────────────────────────────────────────────────────

from services.gemini_analytics import gemini_service

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def financeiro_ia_view(request):
    """
    GET /dashboard/financeiro-ia/?period=90
    Retorna análise IA de fluxo de caixa com previsões + recomendações
    """
    tf = _tf(request)
    period = int(request.query_params.get("period", 90))
    
    resultado = gemini_service.analisa_fluxo_caixa(
        tenant=_get_tenant(request),
        period_days=period
    )
    
    return Response({
        **resultado,
        "last_updated": _now_iso(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def agricultura_ia_view(request):
    """
    GET /dashboard/agricultura-ia/?safraId=20
    Retorna análise IA com ROI por talhão + recomendações próxima safra
    """
    safra_id = request.query_params.get("safraId")
    safra_id = int(safra_id) if safra_id else None
    
    resultado = gemini_service.analisa_producao(
        tenant=_get_tenant(request),
        safra_id=safra_id
    )
    
    return Response({
        **resultado,
        "last_updated": _now_iso(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def administrativo_ia_view(request):
    """
    GET /dashboard/administrativo-ia/
    Retorna análise IA de custos administrativos + otimizações
    """
    resultado = gemini_service.analisa_custos_adm(
        tenant=_get_tenant(request)
    )
    
    return Response({
        **resultado,
        "last_updated": _now_iso(),
    })
```

### Arquivo: `backend/apps/dashboard/urls.py` (atualizar)

```python
from django.urls import path
from . import views

app_name = "dashboard"

urlpatterns = [
    # Existentes
    path("resumo/", views.resumo_view, name="resumo"),
    path("financeiro/", views.financeiro_view, name="financeiro"),
    path("estoque/", views.estoque_view, name="estoque"),
    path("comercial/", views.comercial_view, name="comercial"),
    path("administrativo/", views.administrativo_view, name="administrativo"),
    path("agricultura/", views.agricultura_view, name="agricultura"),
    
    # 🆕 NOVOS ENDPOINTS IA (Fase 2)
    path("financeiro-ia/", views.financeiro_ia_view, name="financeiro_ia"),
    path("agricultura-ia/", views.agricultura_ia_view, name="agricultura_ia"),
    path("administrativo-ia/", views.administrativo_ia_view, name="administrativo_ia"),
]
```

---

## Frontend: Service Layer

### Arquivo: `frontend/src/services/dashboard.ts` (atualizar)

```typescript
// Adicione ao final do arquivo (depois dos métodos existentes)

export interface FinanceiroIAResponse {
  kpis_avancados: {
    faturamento_anual: number;
    custos_anuais: number;
    lucro_anual: number;
    ebitda_margem_pct: number;
    roi_anualizado: number;
    dias_caixa: number;
    custo_medio_diario: number;
    margem_bruta_pct: number;
  };
  previsoes: Array<{
    data: string;
    entradas_estimadas: number;
    saidas_estimadas: number;
    confianca: number;
  }>;
  recomendacoes: Array<{
    prioridade: "alta" | "media" | "baixa";
    descricao: string;
    valor_impacto: number;
  }>;
  alertas_ia: Array<{
    tipo: string;
    descricao: string;
    urgencia: "critica" | "alta" | "media";
  }>;
  last_updated: string;
}

export interface AgriculturaIAResponse {
  roi_por_talhao: Array<{
    talhao_id: number;
    roi_por_ha: number;
    status: string;
    recomendacao: string;
  }>;
  roi_medio: number;
  recomendacoes_proxima_safra: Array<{
    talhao_id: number;
    acao: string;
    motivo: string;
  }>;
  last_updated: string;
}

// ──────────────────────────────────────────────────────────────
// NOVOS MÉTODOS IA
// ──────────────────────────────────────────────────────────────

class DashboardService {
  // ... métodos existentes ...

  async getFinanceiroIA(period = 90): Promise<FinanceiroIAResponse> {
    const response = await api.get(`/dashboard/financeiro-ia/?period=${period}`);
    return response.data;
  }

  async getAgriculturaIA(safraId: number | null = null): Promise<AgriculturaIAResponse> {
    const url = safraId
      ? `/dashboard/agricultura-ia/?safraId=${safraId}`
      : '/dashboard/agricultura-ia/';
    const response = await api.get(url);
    return response.data;
  }

  async getAdministrativoIA(): Promise<any> {
    const response = await api.get('/dashboard/administrativo-ia/');
    return response.data;
  }
}

export default new DashboardService();
```

---

## Frontend: Componentes React

### Componente 1: `frontend/src/components/CashFlowForecast.tsx`

```typescript
import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';

interface CashFlowForecastProps {
  historico: Array<{ date: string; entradas: number; saidas: number; saldo: number }>;
  previsao: Array<{ data: string; entradas_estimadas: number; saidas_estimadas: number; confianca: number }>;
}

export default function CashFlowForecast({ historico, previsao }: CashFlowForecastProps) {
  const chartData = useMemo(() => {
    // Combinar histórico + previsão
    const datas_hist = historico.map(h => h.date);
    const datas_prev = previsao.map(p => p.data);
    const todas_datas = [...datas_hist, ...datas_prev];

    return {
      labels: todas_datas,
      datasets: [
        // Histórico - linha sólida verde
        {
          label: 'Saldo (Histórico)',
          data: [
            ...historico.map(h => h.saldo),
            ...Array(previsao.length).fill(null),
          ],
          borderColor: '#198754',
          backgroundColor: 'rgba(25, 135, 84, 0.1)',
          tension: 0.4,
          fill: false,
          borderWidth: 2,
          pointRadius: 3,
        },
        // Previsão - linha pontilhada azul
        {
          label: 'Saldo (Previsão IA +60d)',
          data: [
            ...Array(historico.length).fill(null),
            ...previsao.map(p => (p.entradas_estimadas - p.saidas_estimadas)),
          ],
          borderColor: '#0d6efd',
          borderDash: [5, 5],
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          tension: 0.4,
          fill: false,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#0d6efd',
        },
      ],
    };
  }, [historico, previsao]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          footer: (context: any) => {
            const idx = context[0]?.dataIndex;
            if (idx != null && idx >= historico.length) {
              const conf = previsao[idx - historico.length]?.confianca;
              return `Confiança: ${(conf * 100).toFixed(0)}%`;
            }
            return '';
          },
        },
      },
    },
    scales: {
      y: {
        title: { display: true, text: 'Valor (R$)' },
      },
    },
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-0">
        <h6 className="mb-0">
          <i className="bi bi-graph-up me-2" />
          Fluxo de Caixa: Histórico + Previsão IA
        </h6>
      </div>
      <div className="card-body">
        <Line data={chartData} options={options} height={80} />
        <small className="text-muted d-block mt-2">
          <i className="bi bi-info-circle me-1" />
          Área previsão: Estimativa IA baseada em padrões históricos (90 dias)
        </small>
      </div>
    </div>
  );
}
```

### Componente 2: `frontend/src/components/RecommendationPanel.tsx`

```typescript
import React from 'react';

interface Recommendation {
  prioridade?: 'alta' | 'media' | 'baixa';
  descricao: string;
  valor_impacto?: number;
  acao_url?: string;
  acao_label?: string;
}

interface RecommendationPanelProps {
  recomendacoes: Recommendation[];
  titulo?: string;
  icone?: string;
}

export default function RecommendationPanel({
  recomendacoes,
  titulo = '💡 Recomendações IA',
  icone = 'bi-lightbulb',
}: RecommendationPanelProps) {
  if (!recomendacoes || recomendacoes.length === 0) {
    return null;
  }

  const getPriorityColor = (prio?: string) => {
    switch (prio) {
      case 'alta': return 'danger';
      case 'media': return 'warning';
      default: return 'info';
    }
  };

  const getPriorityEmoji = (prio?: string) => {
    switch (prio) {
      case 'alta': return '🔴';
      case 'media': return '🟡';
      default: return '🟢';
    }
  };

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-header bg-white border-0">
        <h6 className="mb-0">
          <i className={`bi ${icone} me-2`} />
          {titulo}
        </h6>
      </div>
      <div className="card-body">
        {recomendacoes.map((rec, idx) => (
          <div
            key={idx}
            className={`alert alert-${getPriorityColor(rec.prioridade)} border-0 mb-2`}
            role="alert"
          >
            <div className="d-flex gap-2">
              <span>{getPriorityEmoji(rec.prioridade)}</span>
              <div className="flex-grow-1">
                <strong>{rec.descricao}</strong>
                {rec.valor_impacto && (
                  <small className="d-block text-muted mt-1">
                    Impacto potencial: R$ {rec.valor_impacto.toLocaleString('pt-BR')}
                  </small>
                )}
              </div>
              {rec.acao_url && (
                <a href={rec.acao_url} className="btn btn-sm btn-outline-dark">
                  {rec.acao_label || 'Ver'} →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Componente 3: `frontend/src/components/ROIPerTalhao.tsx`

```typescript
import React from 'react';

interface ROIItem {
  talhao_id: number;
  talhao_nome?: string;
  roi_por_ha: number;
  status: 'otimo' | 'bom' | 'medio' | 'critico';
  recomendacao?: string;
}

interface ROIPerTalhaoProps {
  dados: ROIItem[];
  titulo?: string;
}

export default function ROIPerTalhao({ dados, titulo = 'ROI por Talhão' }: ROIPerTalhaoProps) {
  if (!dados || dados.length === 0) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2" />Nenhum dado de ROI disponível
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'otimo': return '#198754';
      case 'bom': return '#40916c';
      case 'medio': return '#ffc107';
      case 'critico': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'otimo': return '✅';
      case 'bom': return '👍';
      case 'medio': return '⚠️';
      case 'critico': return '🔴';
      default: return '❓';
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-0">
        <h6 className="mb-0">
          <i className="bi bi-pie-chart me-2" />
          {titulo}
        </h6>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead>
              <tr>
                <th>Talhão</th>
                <th>ROI/ha</th>
                <th>Status</th>
                <th>Recomendação</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((item, idx) => (
                <tr key={idx}>
                  <td className="fw-semibold">{item.talhao_nome || `Talhão ${item.talhao_id}`}</td>
                  <td>
                    <strong style={{ color: getStatusColor(item.status) }}>
                      R$ {item.roi_por_ha.toFixed(0)}
                    </strong>
                  </td>
                  <td>
                    <span>{getStatusEmoji(item.status)} {item.status.toUpperCase()}</span>
                  </td>
                  <td>
                    <small className="text-muted">{item.recomendacao || '—'}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## Configurações & Integração

### Settings: `backend/settings.py`

```python
# Adicione ao INSTALLED_APPS
INSTALLED_APPS = [
    # ... existing ...
    'services',  # 🆕 Nossa pasta de serviços
]

# Configuração Gemini (já existe no projeto)
ZEROCLAW_API_KEY = os.getenv('ZEROCLAW_API_KEY')

# Cache para KPIs IA (opcional, mas recomendado)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

### Estrutura de Pastas

```
backend/
├── services/
│   ├── __init__.py
│   ├── gemini_analytics.py          🆕 Novo
│   └── dashboard_utils.py           (existente)
├── apps/
│   ├── dashboard/
│   │   ├── views.py                 (atualizar)
│   │   ├── urls.py                  (atualizar)
│   │   └── ...
│   └── ...
└── ...

frontend/
├── src/
│   ├── services/
│   │   └── dashboard.ts             (atualizar)
│   ├── components/
│   │   ├── CashFlowForecast.tsx     🆕 Novo
│   │   ├── RecommendationPanel.tsx  🆕 Novo
│   │   ├── ROIPerTalhao.tsx         🆕 Novo
│   │   └── ...
│   └── pages/
│       └── dashboard/
│           ├── SaudePropriedade.tsx (atualizar)
│           ├── SaudeProducao.tsx    (atualizar)
│           └── InteligenciaNegocio.tsx
└── ...
```

---

## ✅ Checklist Implementação

```
BACKEND:
- [ ] Criar backend/services/ folder
- [ ] Copiar GeminiAnalyticsService para gemini_analytics.py
- [ ] Atualizar views.py com 3 novos endpoints
- [ ] Atualizar urls.py com rotas
- [ ] Testar com Postman: GET /dashboard/financeiro-ia/
- [ ] Testar com Postman: GET /dashboard/agricultura-ia/
- [ ] Testar com Postman: GET /dashboard/administrativo-ia/

FRONTEND:
- [ ] Atualizar dashboard.ts com novos métodos
- [ ] Criar CashFlowForecast.tsx
- [ ] Criar RecommendationPanel.tsx
- [ ] Criar ROIPerTalhao.tsx
- [ ] Integrar em SaudePropriedade.tsx
- [ ] Integrar em SaudeProducao.tsx
- [ ] Testar no navegador

CONFIGURAÇÃO:
- [ ] Validar settings.py
- [ ] Verificar ZeroClaw API key
- [ ] Verificar Redis (se usando cache)
```

---

**Próximo:** Vá para [CHECKLIST.md](CHECKLIST.md) e comece a marcar tarefas conforme implementa!
