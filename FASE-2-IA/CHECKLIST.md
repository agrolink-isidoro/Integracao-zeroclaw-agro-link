# ✅ CHECKLIST: Tarefas Fase 2-IA

**Como usar:** Copie cada tarefa em seu sistema de tracking (Jira, GitHub Projects, Notion, etc) e marque ✅ conforme completa.

---

## 📅 SEMANA 1: Setup IA & Primeiro Endpoint

### 1.1 Preparação (1h)
- [ ] Ler README.md da Fase-2-IA
- [ ] Ler ROADMAP.md semana 1
- [ ] Verificar acesso ao repositório (git pull latest)
- [ ] Verificar que ZeroClaw API key está configurada
- [ ] Testar que Gemini API está acessível

**Verificação:**
```bash
# No terminal, verificar ZeroClaw
python manage.py shell
>>> from zeroclaw_sdk import ZeroClaw
>>> zeroclaw = ZeroClaw()
>>> print(zeroclaw.model_id)  # Deve retornar modelo
```

### 1.2 Setup de Diretórios & Arquivos Iniciais (1h)
- [ ] Criar `backend/services/` (pasta)
- [ ] Criar `backend/services/__init__.py`
- [ ] Copiar código de `IMPLEMENTACAO.md` → `backend/services/gemini_analytics.py`
- [ ] Verificar imports (zeroclaw_sdk, django models)
- [ ] **Commit:** `feat: criar GeminiAnalyticsService base`

**Saída esperada:**
```
backend/
└── services/
    ├── __init__.py
    └── gemini_analytics.py (200+ linhas)
```

### 1.3 Implementar /dashboard/financeiro-ia/ (4h)
- [ ] Abrir `backend/apps/dashboard/views.py`
- [ ] Adicionar import: `from services.gemini_analytics import gemini_service`
- [ ] Copiar função `financeiro_ia_view()` de IMPLEMENTACAO.md
- [ ] Adicionar em `backend/apps/dashboard/urls.py`
- [ ] Testar import: `python manage.py shell`
  ```python
  from apps.dashboard.views import financeiro_ia_view
  print("OK")  # Deve imprimir sem erros
  ```

### 1.4 Testar com cURL (1h)
```bash
# 1. Get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/token/ \
  -d "username=admin&password=admin" | jq -r .access)

# 2. Chamar endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/dashboard/financeiro-ia/?period=90 | jq

# Deve retornar JSON com:
# - kpis_avancados{}
# - previsoes[]
# - recomendacoes[]
# - alertas_ia[]
```

- [ ] Endpoint retorna 200 OK
- [ ] Response é JSON válido
- [ ] kpis_avancados tem 8 campos
- [ ] previsoes array não vazio (60 dias)
- [ ] recomendacoes array presente
- [ ] **Commit:** `feat: endpoint /dashboard/financeiro-ia/ working`

### 1.5 Documentação Semana 1 (30m)
- [ ] Atualizar CHECKLIST.md com status
- [ ] Adicionar notas se problemas encontrados
- [ ] Commit final

**Status esperado ao fim da semana:**
```
✅ Semana 1 Completa
  ✓ GeminiAnalyticsService implementado
  ✓ /dashboard/financeiro-ia/ funcional
  ✓ Testes manuais passando
  ✓ Documentação atualizada
```

---

## 📅 SEMANA 2: Endpoints Agrícola & Administrativo

### 2.1 /dashboard/agricultura-ia/ (4h)
- [ ] Copiar padrão de financeiro_ia_view()
- [ ] Criar agricultura_ia_view() em views.py
- [ ] Implementar GeminiAnalyticsService.analisa_producao()
  - [ ] Query Plantio (safra específica ou ativa)
  - [ ] Query Colheita e RateioCusto
  - [ ] Formatar JSON para Gemini
  - [ ] Parse resposta JSON
- [ ] Testar com cURL (safraId=null E safraId=1)
- [ ] **Commit:** `feat: endpoint /dashboard/agricultura-ia/`

**Teste:**
```bash
# Sem safraId (usa ativa)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/dashboard/agricultura-ia/ | jq

# Com safraId
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/dashboard/agricultura-ia/?safraId=20 | jq
```

- [ ] Response contém: roi_por_talhao[], recomendacoes[], alertas[]
- [ ] ROI por talhão calculado corretamente

### 2.2 /dashboard/administrativo-ia/ (3h)
- [ ] Criar administrativo_ia_view() em views.py
- [ ] Implementar GeminiAnalyticsService.analisa_custos_adm()
  - [ ] Query DespesaAdministrativa (mês corrente)
  - [ ] Aggregar por CentroCusto
  - [ ] Chamar Gemini
- [ ] Testar com cURL
- [ ] **Commit:** `feat: endpoint /dashboard/administrativo-ia/`

**Teste:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/dashboard/administrativo-ia/ | jq
```

- [ ] Response contém: centros_criticos[], economia_potencial_mes, alertas[]

### 2.3 Registrar URLs (30m)
- [ ] Abrir `backend/apps/dashboard/urls.py`
- [ ] Adicionar 3 novas rotas:
  - `path("financeiro-ia/", ...)`
  - `path("agricultura-ia/", ...)`
  - `path("administrativo-ia/", ...)`
- [ ] **Commit:** `feat: register /dashboard/*-ia/ routes`

### 2.4 Testes Integrados (1h)
- [ ] Testar todos 3 endpoints de uma vez
- [ ] Verificar que RBAC funciona (sem token = 401)
- [ ] Verificar multi-tenant (user A não vê dados user B)
  ```bash
  # Logar como user A
  TOKEN_A=$(curl -s -X POST http://localhost:8000/api/token/ \
    -d "username=user_a&password=pass_a" | jq -r .access)
  
  # Logar como user B (tenant diferente)
  TOKEN_B=$(curl -s -X POST http://localhost:8000/api/token/ \
    -d "username=user_b&password=pass_b" | jq -r .access)
  
  # Chamar como A
  curl -H "Authorization: Bearer $TOKEN_A" \
    http://localhost:8000/api/dashboard/financeiro-ia/ | jq .kpis_avancados.lucro_anual
  # Anotary valor para user A
  
  # Chamar como B
  curl -H "Authorization: Bearer $TOKEN_B" \
    http://localhost:8000/api/dashboard/financeiro-ia/ | jq .kpis_avancados.lucro_anual
  # Deve ser DIFERENTE do valor de A
  ```

- [ ] User A vê seus dados
- [ ] User B vê dados diferentes
- [ ] Sem autenticação = 401 Unauthorized

### 2.5 Documentação Semana 2
- [ ] Atualizar ENDPOINTS.md com respostas reais (não template)
- [ ] Atualizar CHECKLIST.md
- [ ] Commit final

**Status esperado:**
```
✅ Semana 2 Completa
  ✓ Todos 3 endpoints working
  ✓ RBAC validado
  ✓ Multi-tenant testado
  ✓ JSON responses documentadas
```

---

## 📅 SEMANA 3: Frontend Integration

### 3.1 Atualizar DashboardService (2h)
- [ ] Abrir `frontend/src/services/dashboard.ts`
- [ ] Adicionar tipos (ao final do arquivo):
  - [ ] `FinanceiroIAResponse interface`
  - [ ] `AgriculturaIAResponse interface`
- [ ] Adicionar 3 novos métodos:
  - [ ] `getFinanceiroIA(period: number)`
  - [ ] `getAgriculturaIA(safraId?: number)`
  - [ ] `getAdministrativoIA()`
- [ ] **Commit:** `feat: add IA methods to DashboardService`

**Teste no navegador:**
```javascript
// Browser console
import DashboardService from '@/services/dashboard'
await DashboardService.getFinanceiroIA(90)
// Deve retornar Promise com dados
```

### 3.2 Criar CashFlowForecast Component (3h)
- [ ] Criar `frontend/src/components/CashFlowForecast.tsx`
- [ ] Copiar código de IMPLEMENTACAO.md
- [ ] Implementar gráfico:
  - [ ] Histórico (linha sólida)
  - [ ] Previsão (linha pontilhada)
  - [ ] Legend, tooltip, axes
- [ ] Testar renderização (sem dados, com dados)
- [ ] **Commit:** `feat: CashFlowForecast component`

**Teste:**
```typescript
// Story ou página de test
<CashFlowForecast 
  historico={mockHistorico}
  previsao={mockPrevisao}
/>
```

### 3.3 Criar RecommendationPanel Component (2h)
- [ ] Criar `frontend/src/components/RecommendationPanel.tsx`
- [ ] Copiar código de IMPLEMENTACAO.md
- [ ] Implementar:
  - [ ] Alert cards por prioridade (alta/media/baixa)
  - [ ] Emoji indicador
  - [ ] Valor impacto
  - [ ] Call-to-action button (opcional)
- [ ] **Commit:** `feat: RecommendationPanel component`

### 3.4 Criar ROIPerTalhao Component (2h)
- [ ] Criar `frontend/src/components/ROIPerTalhao.tsx`
- [ ] Implementar:
  - [ ] Tabela com talhões
  - [ ] ROI por hectare
  - [ ] Status visual (cores)
  - [ ] Recomendações
- [ ] **Commit:** `feat: ROIPerTalhao component`

### 3.5 Integrar em SaudePropriedade.tsx (3h)
- [ ] Abrir `frontend/src/pages/dashboard/SaudePropriedade.tsx`
- [ ] Adicionar novo useQuery:
  ```typescript
  const { data: iaData } = useQuery({
    queryKey: ['financeiro-ia'],
    queryFn: () => DashboardService.getFinanceiroIA(90)
  })
  ```
- [ ] Adicionar componentes:
  - [ ] `<CashFlowForecast historico={...} previsao={iaData?.previsoes} />`
  - [ ] `<RecommendationPanel recomendacoes={iaData?.recomendacoes} />`
- [ ] Testar no navegador
- [ ] **Commit:** `feat: integrate IA components into SaudePropriedade`

### 3.6 Integrar em SaudeProducao.tsx (2h)
- [ ] Abrir `frontend/src/pages/dashboard/SaudeProducao.tsx`
- [ ] Adicionar novo useQuery para getAgriculturaIA()
- [ ] Integrar `<ROIPerTalhao dados={iaData?.roi_por_talhao} />`
- [ ] Testar
- [ ] **Commit:** `feat: integrate ROI analysis into SaudeProducao`

### 3.7 Testes E2E (2h)
- [ ] Abrir `/dashboard/inteligencia` no navegador
- [ ] Clicar em "Dados Financeiros" → verificar:
  - [ ] Gráfico de fluxo carrega
  - [ ] Previsão IA visível (linha pontilhada)
  - [ ] Recomendações aparecem
  - [ ] Sem erros de console
- [ ] Clicar em "Dados de Produção" → verificar:
  - [ ] Tabela ROI por talhão carrega
  - [ ] Status visual (cores) corretos
  - [ ] Sem erros
- [ ] **Commit:** `test: E2E validation of IA components`

**Dica:** Se erro no console, revisar tipos TypeScript e imports

### 3.8 Documentação Semana 3
- [ ] Atualizar CHECKLIST.md
- [ ] Adicionar screenshots (opcional mas legal)
- [ ] Commit final

**Status esperado:**
```
✅ Semana 3 Completa
  ✓ Frontend service layer updated
  ✓ 3 novos componentes criados
  ✓ Integrados em 2 páginas
  ✓ E2E tests validados
  ✓ UI/UX aprovado
```

---

## 📅 SEMANA 4: Automação & Refinamento

### 4.1 Celery Background Tasks (3h)
- [ ] Verificar que Celery + Redis estão rodando
  ```bash
  celery -A projeto beat  # Em terminal separado
  ```
- [ ] Criar `backend/tasks/kpis.py`
- [ ] Implementar `calculate_kpis_ia()` task
  - [ ] Loop por todos tenants
  - [ ] Aggregar dados
  - [ ] Call GeminiAnalyticsService
  - [ ] Salvar em Redis cache
- [ ] Implementar `send_alerts_ia()` task
- [ ] Registrar em Celery Beat schedule
- [ ] **Commit:** `feat: celery tasks for IA computations`

### 4.2 Alertas Inteligentes (2h)
- [ ] Integrar com WhatsApp (via ZeroClaw):
  - [ ] Alerta de vencimento atrasado
  - [ ] Alerta de estoque baixo
  - [ ] Alerta de ROI crítico
- [ ] Testar manualmente:
  ```bash
  python manage.py shell
  >>> from tasks.kpis import send_alerts_ia
  >>> send_alerts_ia.apply()  # Teste manual
  ```
- [ ] **Commit:** `feat: WhatsApp alerts for critical events`

### 4.3 Caching (1h)
- [ ] Verificar que Redis está configurado em settings.py
- [ ] Adicionar cache logic em GeminiAnalyticsService._call_gemini()
  ```python
  cache_key = f"gemini_result_{hash_do_prompt}"
  from django.core.cache import cache
  cached = cache.get(cache_key)
  if cached:
      return cached
  # ... chamar gemini
  cache.set(cache_key, resultado, 3600)  # 1 hora
  ```
- [ ] **Commit:** `feat: add Redis caching for IA responses`

### 4.4 Performance & Monitoring (1h)
- [ ] Profile endpoint:
  ```bash
  # No settings.py temporariamente
  DEBUG = True
  
  # Chamar endpoint
  curl http://localhost:8000/api/dashboard/financeiro-ia/
  
  # Check Django debug toolbar / tempo
  ```
- [ ] Se > 2s: aumentar cache TTL
- [ ] Se < 200ms: OK, caching working
- [ ] **Commit:** `perf: optimize IA endpoint responses`

### 4.5 QA Completo (2h)
- [ ] Verificar lista de testes:
  ```
  CHECKLIST QA:
  - [ ] Todos 3 endpoints retornam 200 OK
  - [ ] JSON response válido (schema check)
  - [ ] RBAC funciona (401 sem token)
  - [ ] Multi-tenant isolado
  - [ ] Componentes React renderizam
  - [ ] Sem erros console (dev tools)
  - [ ] Sem SQL errors (logs)
  - [ ] Sem XSS vulnerabilities
  - [ ] Cache expiração funciona
  - [ ] Celery tasks executam
  ```
- [ ] Corrigir qualquer issue encontrada
- [ ] **Commit:** `test: full QA validation`

### 4.6 Documentação Final (1h)
- [ ] Atualizar README.md com "Como Usar"
- [ ] Atualizar ROADMAP.md marcando semanas completas
- [ ] Atualizar CHECKLIST.md (este arquivo)
- [ ] Criar RELEASE_NOTES.md ou adicionar em changelog
- [ ] **Commit:** `docs: update documentation for Phase 2 release`

**Status esperado:**
```
✅ Semana 4 Completa
  ✓ Background tasks working
  ✓ Alertas enviando
  ✓ Caching ativo
  ✓ Performance OK (<2s first, <200ms cached)
  ✓ QA 100% passed
  ✓ Documentação complete
```

---

## 📅 SEMANA 5 (OPCIONAL): Deploy & Estabilização

### 5.1 Deploy em Staging (1h)
- [ ] Merge feature branch → staging branch
- [ ] Run migrations on staging
- [ ] Testar endpoints em staging.agrolink.com
- [ ] Verificar logs (no errors)
- [ ] **Commit:** `deploy: Phase 2-IA to staging`

### 5.2 User Acceptance Testing (2h)
- [ ] Gerente de Fazenda testa em staging:
  - [ ] [ ] Acessa /dashboard/inteligencia
  - [ ] [ ] Vê gráficos de previsão
  - [ ] [ ] Recebe alertas WhatsApp
  - [ ] [ ] Clica em recomendações → funciona
  - [ ] [ ] Acha útil (feedback)
- [ ] Corrigir bugs encontrados
- [ ] **Commit:** `test: UAT passed`

### 5.3 Deploy em Produção (1-2h)
- [ ] Backup database produção
- [ ] Merge: staging → main
- [ ] Deploy automático (CI/CD pipeline)
- [ ] Health check endpoints:
  ```bash
  curl https://agrolink.com/api/dashboard/financeiro-ia/
  # Deve retornar 200 (ou 401 se não autenticado, normal)
  ```
- [ ] Monitor logs por 24h (alerts, errors)
- [ ] **Commit:** `deploy: Phase 2-IA to production`

### 5.4 Post-Deploy Validation (30m)
- [ ] [ ] Usuários podem acessar
- [ ] [ ] Dados aparecem corretos
- [ ] [ ] Sem erros em produção
- [ ] [ ] Performance aceitável
- [ ] [ ] Alertas WhatsApp chegando
- [ ] Celebrate 🎉 **PRONTO!**

---

## 🎯 Sumário de Progress

### Checklist Macro
- [ ] Semana 1 ✓
- [ ] Semana 2 ✓
- [ ] Semana 3 ✓
- [ ] Semana 4 ✓
- [ ] Semana 5 ✓ (opcional)

### Commits Esperados
```
[Total: ~30-40 commits]

feat: criar GeminiAnalyticsService base
feat: endpoint /dashboard/financeiro-ia/ working
feat: endpoint /dashboard/agricultura-ia/
feat: endpoint /dashboard/administrativo-ia/
feat: register /dashboard/*-ia/ routes
feat: add IA methods to DashboardService
feat: CashFlowForecast component
feat: RecommendationPanel component
feat: ROIPerTalhao component
feat: integrate IA components into SaudePropriedade
feat: integrate ROI analysis into SaudeProducao
test: E2E validation of IA components
feat: celery tasks for IA computations
feat: WhatsApp alerts for critical events
feat: add Redis caching for IA responses
perf: optimize IA endpoint responses
test: full QA validation
docs: update documentation for Phase 2 release
deploy: Phase 2-IA to staging
test: UAT passed
deploy: Phase 2-IA to production
```

---

## 🆘 Como Usar Este Checklist

1. **Copiar para Jira/Notion/GitHub Projects**
   ```
   Criar épico "Fase 2-IA"
   Criar stories por semana
   Copiar cada checkbox como subtask
   ```

2. **Daily Update**
   ```
   Cada checkpoint: [ ] Marcar quando concluído
   Se bloqueado: Anotar em comments
   ```

3. **Weekly Demo**
   ```
   Sexta-feira: demo ao PO/stakeholder dos items de semana
   Feedback → adicionar a próxima semana se necessário
   ```

---

## 📞 Suporte

**Dúvida em uma tarefa?**
- Veja IMPLEMENTACAO.md (tem código)
- Veja ENDPOINTS.md (endpoint spec)
- Veja ARQUITETURA.md (system design)

**Problema técnico?**
- Check logs: `python manage.py shell` → imports
- Check API: teste com cURL antes de integrar no frontend
- Check frontend: browser console para erros

---

**Status:** Pronto para iniciar Semana 1 ✅

Bom trabalho! 🚀
