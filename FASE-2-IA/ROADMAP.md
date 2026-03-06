# 📅 ROADMAP FASE 2-IA: Implementação Semana-a-Semana

**Timeline Total:** 4-5 semanas | **Esforço:** ~30-40 horas | **Equipe:** 1-2 devs

---

## 📍 SEMANA 1: Fundação IA (Dias 5-9 Mar)

### Objetivo
Criar infraestrutura base para IA insights e 1º endpoint funcional

### Tarefas

#### 1.1 Setup & Integração Gemini (4h)
```
☐ [ ] Revisar IMPLEMENTACAO.md - seção "Integração Gemini"
☐ [ ] Criar arquivo: backend/services/gemini_analytics.py
☐ [ ] Implementar classe GeminiAnalyticsService
☐ [ ] Testar chamada básica à API Gemini (verificação de credenciais)
☐ [ ] Documentar prompts base (financeiro, agricultura, administrativo)
```

**Saída esperada:**
```python
# backend/services/gemini_analytics.py (80 linhas)
class GeminiAnalyticsService:
    def analisa_fluxo_caixa(self, dados: dict) -> dict:
        """Analisa fluxo e retorna previsão + insights"""
        # Implementado
```

#### 1.2 Criar Endpoint /dashboard/financeiro-ia/ (6h)
```
☐ [ ] Criar view: dashboard/views.py → financeiro_ia_view()
☐ [ ] Aggregar dados históricos (últimos 90 dias)
☐ [ ] Chamar GeminiAnalyticsService.analisa_fluxo_caixa()
☐ [ ] Formatar resposta com:
       • kpis_avancados (8 novos: ROI anualizado, etc)
       • previsoes (fluxo +60d)
       • recomendacoes (lista de ações)
       • alertas_ia (insights críticos)
☐ [ ] Adicionar em urls.py
☐ [ ] Testar com Postman: GET /dashboard/financeiro-ia/?period=90
```

**Saída esperada:**
```json
{
  "kpis_avancados": {
    "roi_anualizado": 0.15,
    "ebitda_margem": 0.35,
    "dias_caixa": 45
  },
  "previsoes": {
    "fluxo_60d": [...],
    "saldo_minimo_previsto": 50000
  },
  "recomendacoes": [
    "Negocie prazo de vencimento em R$XXX com fornecedor Y"
  ],
  "alertas_ia": ["⚠️  Dívida crescendo 5% ao mês"]
}
```

#### 1.3 Testes & Documentação (2h)
```
☐ [ ] Teste manual do endpoint (GET + POST)
☐ [ ] Verificar se dados retornam corretos
☐ [ ] Documentar no ENDPOINTS.md
☐ [ ] Commit: "feat: endpoint /dashboard/financeiro-ia/"
```

### 💡 Dica da Semana
Foque em fazer 1 endpoint 100% funcional. Qualidade > velocidade. Próximas semanas usam esse pattern.

---

## 📍 SEMANA 2: Endpoints Restantes (Dias 12-16 Mar)

### Objetivo
Criar endpoints de agricultura e administrativo IA, seguindo pattern da semana 1

### Tarefas

#### 2.1 Endpoint /dashboard/agricultura-ia/ (4h)
```
☐ [ ] Copiar pattern de financeiro_ia_view() em dashboard/views.py
☐ [ ] Aggregar dados: plantios, colheitas, custos por talhão
☐ [ ] Implementar GeminiAnalyticsService.analisa_producao()
☐ [ ] Retornar:
       • roi_por_talhao (novo!)
       • recomendacoes_proxima_safra
       • analise_variedades
       • alertas_produtividade
☐ [ ] Registrar em urls.py
☐ [ ] Testar: GET /dashboard/agricultura-ia/?safraId=20
```

**Exemplo resposta:**
```json
{
  "roi_por_talhao": [
    {"talhao": "A", "roi_por_ha": 150, "status": "otimo"},
    {"talhao": "B", "roi_por_ha": 85, "status": "critico"}
  ],
  "recomendacoes": [
    "Considere não plantar em Talhão B próxima safra (ROI baixo)"
  ]
}
```

#### 2.2 Endpoint /dashboard/administrativo-ia/ (4h)
```
☐ [ ] Padrão similar: administrativo_ia_view()
☐ [ ] Aggregar: folha, despesas adm, centros de custo
☐ [ ] GeminiAnalyticsService.analisa_custos_adm()
☐ [ ] Retornar:
       • custo_por_funcionario
       • despesas_vs_orcamento
       • recomendacoes_otimizacao
       • alertas_desvios
☐ [ ] Registrar em urls.py
☐ [ ] Testar: GET /dashboard/administrativo-ia/
```

#### 2.3 Consolidação & Testes (2h)
```
☐ [ ] Testar todos 3 endpoints juntos
☐ [ ] Validar respostas JSON (schema válido)
☐ [ ] Commit: "feat: endpoints /dashboard/*-ia/ completos"
☐ [ ] Update ENDPOINTS.md com OpenAPI spec
```

### 💡 Dica da Semana
Reutilize componentes + helpers. Se vir código duplicado, refatore em `backend/services/dashboard_utils.py`.

---

## 📍 SEMANA 3: Frontend Integration (Dias 19-23 Mar)

### Objetivo
Integrar novos endpoints no React + criar componentes visuais

### Tarefas

#### 3.1 Frontend Service Layer (3h)
```
☐ [ ] Atualizar: frontend/src/services/dashboard.ts
☐ [ ] Adicionar métodos:
       • getFinanceiroIA(period: number)
       • getAgriculturaIA(safraId: number)
       • getAdministrativoIA()
☐ [ ] Type definitions em frontend/src/types/
☐ [ ] Teste com React Query browser devtools
```

#### 3.2 Componente: CashFlowForecast (4h)
```
☐ [ ] Criar: frontend/src/components/CashFlowForecast.tsx
☐ [ ] Renderizar gráfico com:
       • Histórico (90d real)
       • Previsão (60d estimada com IA)
       • Linhas diferentes para past/future
☐ [ ] Adicionar tooltip com confiança (e.g., "92% confiança")
☐ [ ] Integrar em SaudePropriedade.tsx
☐ [ ] Teste no navegador
```

#### 3.3 Componente: RecommendationPanel (3h)
```
☐ [ ] Criar: frontend/src/components/RecommendationPanel.tsx
☐ [ ] Display de recomendações IA:
       • Ícone de prioridade (🔴 crítica / 🟡 alta / 🟢 normal)
       • Descrição clara
       • Call-to-action (link para ação)
☐ [ ] Integrar em SaudePropriedade + SaudeProducao
```

#### 3.4 Componente: ROIPerTalhao (3h)
```
☐ [ ] Criar: frontend/src/components/ROIPerTalhao.tsx
☐ [ ] Tabela interativa com:
       • Talhão | ROI/ha | Status | Recomendação
☐ [ ] Cores: verde (bom) / amarelo (médio) / vermelho (crítico)
☐ [ ] Integrar em SaudeProducao.tsx
```

#### 3.5 Testes E2E (2h)
```
☐ [ ] Abrir frontend no navegador
☐ [ ] Clicar em "Central de Inteligência"
☐ [ ] Verificar que componentes novos aparecem
☐ [ ] Testar carregamento de dados (React Query)
☐ [ ] Documento: PROBLEMA? → Adicionar log no CHECKLIST.md
```

### 💡 Dica da Semana
Use `React Query`'s `useQuery()` hook. Não reinvente a roda. Segue padrão já usado em SaudePropriedade.

---

## 📍 SEMANA 4: Automação & Refinamento (Dias 26-30 Mar)

### Objetivo
Setup de tasks automatizadas + ajustes finais + QA

### Tarefas

#### 4.1 Celery Tasks para Cálculos Background (4h)
```
☐ [ ] Criar: backend/tasks/kpis.py
☐ [ ] Task: calculate_kpis_ia() → executa diariamente 000:00
☐ [ ] Task: send_alerts_ia() → 06:00 (wakes up gerente)
☐ [ ] Configurar Celery Beat em settings.py
☐ [ ] Testar localmente: celery -A projeto beat
```

**Exemplo:**
```python
@shared_task
def calculate_kpis_ia():
    """Calcula KPIs IA diariamente para cada tenant"""
    for tenant in Tenant.objects.all():
        dados = aggregar_dados_financeiro(tenant)
        recomendacoes = GeminiAnalyticsService.analisa_fluxo(dados)
        salvar_em_cache(f"kpis_ia_{tenant.id}", recomendacoes)
```

#### 4.2 Alertas Inteligentes (3h)
```
☐ [ ] Integrar com WhatsApp (via ZeroClaw SDK):
       • Alerta de vencimento atrasado
       • Alerta de estoque crítico
       • Alerta de ROI baixo (semanal)
☐ [ ] Testar envio manual: python manage.py send_alert --type vencimento
```

#### 4.3 Otimizações & Performance (2h)
```
☐ [ ] Profile: /dashboard/financeiro-ia/ demora quanto?
☐ [ ] Se > 2s, adicionar caching:
       • Cache gerado por Celery task
       • TTL: 1 hora
☐ [ ] Testar resposta com cache ativo
```

#### 4.4 QA & Documentação Final (3h)
```
☐ [ ] Executar checklist em CHECKLIST.md
☐ [ ] Verificar se todos endpoints retornam válido
☐ [ ] Atualizar OpenAPI docs (Swagger)
☐ [ ] Review de segurança (permissões, SQL injection?, XSS?)
☐ [ ] Atualizar README com "Como Usar"
```

### 💡 Dica da Semana
Não perfeição, qualidade. Se algo não está 100% pronto, documente como "fase 3" e prossiga.

---

## 📍 SEMANA 5 (Opcional): Deploy & Estabilização

### Objetivo
Deploy em staging → testes → produção

### Tarefas

#### 5.1 Deploy Staging (1h)
```
☐ [ ] Feature branch → staging
☐ [ ] Rodar migrations
☐ [ ] Testar endpoints em staging.agrolink.com
```

#### 5.2 User Acceptance Testing (UAT) (4h)
```
☐ [ ] Gerente de FFazenda testa:
       ✓ Acessa /dashboard/inteligencia
       ✓ Vê previsões de fluxo
       ✓ Recebe alertas via WhatsApp
       ✓ Clica em recomendação → vai para ação
☐ [ ] Feedback → ajustes em CHECKLIST.md
```

#### 5.3 Deploy Produção (1h)
```
☐ [ ] Merge: staging → main
☐ [ ] Deploy automático (CI/CD)
☐ [ ] Validar em produção
☐ [ ] Celebrar 🎉
```

---

## 📊 Dependências & Bloqueadores

| Bloqueador | Solução | Status |
|-----------|---------|--------|
| Gemini API key | ✅ Já existe (ZeroClaw SDK) | 🟢 OK |
| Dados históricos | ✅ 90+ dias em production | 🟢 OK |
| React Query | ✅ Já usado no projeto | 🟢 OK |
| Celery + Redis | ✅ Já configurado | 🟢 OK |
| Permissions (RBAC) | ⚠️ Precisa validar | 🟡 Verificar |

---

## 🎯 Milestones & Go/No-Go

| Milestone | Data | Go/No-Go |
|-----------|------|----------|
| **M1:** 1º endpoint completo | 9 Mar | Semana 1 |
| **M2:** Todos 3 endpoints | 16 Mar | Semana 2 |
| **M3:** Frontend integrado | 23 Mar | Semana 3 |
| **M4:** Automação funcionando | 30 Mar | Semana 4 |
| **M5:** Deploy produção | 6 Abr | Semana 5 (opt) |

---

## 📋 Checklist Macro

- [ ] Semana 1 completa
- [ ] Semana 2 completa
- [ ] Semana 3 completa
- [ ] Semana 4 completa
- [ ] ENDPOINTS.md atualizado
- [ ] README.md atualizado
- [ ] E2E tests passando
- [ ] Produção validada

---

**Próximo:** Abra [IMPLEMENTACAO.md](IMPLEMENTACAO.md) para ver código pronto para copiar-colar.
