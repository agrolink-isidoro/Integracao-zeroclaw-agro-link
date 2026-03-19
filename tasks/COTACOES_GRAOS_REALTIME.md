# 🌾 Widget de Cotações de Grãos - Atualização a Cada 15 min

**Status:** 📋 Em Planejamento  
**Prioridade:** 🔴 CRÍTICA  
**Data de Início:** 19 de março de 2026  
**Escopo:** 
- Integração com APIs de B3/CBOT
- Sync automático a cada 15 minutos (via Celery Beat)
- Widget em tempo real no dashboard
- Histórico e análises de preços

---

## 📊 FASES & TAREFAS

> **Legenda:** 
> - 🔴 P0 (Crítico): Bloqueia tudo
> - 🟠 P1 (Essencial): Bloqueia feature
> - 🟡 P2 (Support): Nice-to-have

---

## FASE 1: PESQUISA & DECISÃO TÉCNICA (P0 - 🔴)

Objetivo: Identificar API(s) estável(is) e gratuita(s) para cotações de grãos.

### 1.1 Pesquisar APIs de Cotações de Grãos
- [ ] **1.1.1** Pesquisar B3 Brasil (Bolsa de Valores)
  - [ ] Verificar se existe API pública/gratuita
  - [ ] Documentar rate limiting (requisições/min)
  - [ ] Verificar cobertura de commodities: soja, milho, sorgo, trigo
  - [ ] Formas de acesso: API REST, WebSocket, Web Scraping
  
- [ ] **1.1.2** Pesquisar CBOT (Chicago Board of Trade)
  - [ ] Verificar CME Group API (provedor oficial)
  - [ ] Documentar rate limiting
  - [ ] Verificar cobertura de commodities
  - [ ] Verificar custos (free tier vs paga)

- [ ] **1.1.3** Pesquisar APIs de Agregadores de Commodities
  - [ ] Alpha Vantage (verificar suporte a commodities agrícolas)
  - [ ] FRED - Federal Reserve Economic Data (cobertura futuro CBOT)
  - [ ] Finnhub / IEX Cloud (cobertura de commodities)
  - [ ] APIs de brokers: Mercado Físico, Cepea/FGV
  - Documentar rate limiting de cada

- [ ] **1.1.4** Avaliar Agregadores Brasileiros
  - [ ] Cepea (Centro de Estudos Avançados em Economia Aplicada)
  - [ ] Notícias Agrícolas
  - [ ] AgroLink / Cotaçõesonline
  - [ ] Mercado físico (cooperativas)

### 1.2 Documentar Decisão Técnica
- [ ] **1.2.1** Criar documento `API_CHOICE_DECISION.md` com:
  - [ ] Tabela comparativa: API, Rate Limit, Cobertura, Custo, Estabilidade
  - [ ] APIs selecionadas (principal + fallback)
  - [ ] Justificativa técnica da escolha
  - [ ] Plano de contingência se API principal falhar
  - [ ] Limites de custo (se houver)

- [ ] **1.2.2** Definir estratégia de múltiplas fontes
  - [ ] Usar média de B3 + CBOT?
  - [ ] Usar fonte com maior confiabilidade?
  - [ ] Armazenar ambas as fontes separadamente?
  - [ ] Documentar lógica de seleção

---

## FASE 2: BACKEND - INFRAESTRUTURA CELERY (P0 - 🔴)

Objetivo: Configurar Celery + Redis para tasks agendadas.

**Pré-requisito:** FASE 1 concluída

### 2.1 Instalar & Configurar Celery + Redis
- [ ] **2.1.1** Adicionar dependências ao `requirements.txt`
  - [ ] Celery >= 5.3.0
  - [ ] Redis >= 5.0.0
  - [ ] celery[redis]

- [ ] **2.1.2** Criar arquivo `backend/sistema_agropecuario/celery.py`
  - [ ] Inicializar app Celery
  - [ ] Configurar broker Redis URL
  - [ ] Configurar backend de resultados
  - [ ] Autodiscover tasks

- [ ] **2.1.3** Atualizar `backend/sistema_agropecuario/settings.py`
  - [ ] Adicionar variáveis de ambiente: CELERY_BROKER_URL, CELERY_RESULT_BACKEND
  - [ ] Configurar default para localhost:6379 (dev)
  - [ ] Configurar timezone = America/Sao_Paulo

### 2.2 Configurar Celery Beat Scheduler
- [ ] **2.2.1** Instalar Celery Beat support
  - [ ] Adicionar `django-celery-beat` ao requirements.txt
  - [ ] Executar `python manage.py migrate`

- [ ] **2.2.2** Criar arquivo `backend/sistema_agropecuario/celery_config.py`
  - [ ] Definir schedule: `atualizar_cotacoes_cada_15_min`
  - [ ] Schedule: 15 minutos (900 segundos)
  - [ ] Timezone: America/Sao_Paulo
  - [ ] Retry em caso de falha

- [ ] **2.2.3** Atualizar Docker Compose
  - [ ] Adicionar serviço Redis (redis:7-alpine)
  - [ ] Adicionar serviço Celery Beat
  - [ ] Volumes para persistência (opcional)
  - [ ] Health checks

- [ ] **2.2.4** Criar management command `start_beat.py`
  - [ ] `python manage.py start_beat` para subir scheduler
  - [ ] Logging de eventos

### 2.3 Testes Básicos de Infraestrutura
- [ ] **2.3.1** Verificar conexão Celery ↔ Redis
  - [ ] Teste: `celery -A sistema_agropecuario inspect active`
  - [ ] Verificar que Redis está acessível
  - [ ] Documentar em `docs/CELERY_SETUP.md`

- [ ] **2.3.2** Testar Celery Beat disponibili
  - [ ] Subir beat scheduler
  - [ ] Verificar que task aparece no schedule
  - [ ] Testar trigger manual via Celery

---

## FASE 3: BACKEND - SERVIÇO DE COTAÇÕES (P0 - 🔴)

Objetivo: Criar service para fetch & sync de cotações via APIs externas.

**Pré-requisito:** FASE 1 (decisão de API) concluída

### 3.1 Criar CotacaoService
- [ ] **3.1.1** Criar `backend/apps/fazendas/services/cotacao_service.py`
  - [ ] Classe `CotacaoService` com métodos:
    - `fetch_from_b3(cultura: str) -> Decimal`
    - `fetch_from_cbot(cultura: str) -> Decimal`
    - `fetch_from_fallback(cultura: str) -> Decimal`
  - [ ] Tratamento de erros e timeouts
  - [ ] Logging de cada fetch (sucesso/falha)

### 3.2 Implementar Fetch da B3
- [ ] **3.2.1** Implementar `fetch_from_b3()`
  - [ ] Conexão à API B3 (conforme decisão da FASE 1)
  - [ ] Parse da resposta JSON/XML
  - [ ] Mapeamento: B3 cultura → CotacaoSaca cultura
  - [ ] Conversão de unidade: se necessário (ex: contracts → saca)
  - [ ] Tratamento de ausência de dados

- [ ] **3.2.2** Adicionar retry logic
  - [ ] Max retries: 3
  - [ ] Backoff: exponential (1s, 2s, 4s)
  - [ ] Logs de cada tentativa

### 3.3 Implementar Fetch da CBOT
- [ ] **3.3.1** Implementar `fetch_from_cbot()`
  - [ ] Conexão à API CBOT (conforme decisão)
  - [ ] Parse da resposta
  - [ ] Mapeamento: CBOT commodity → CotacaoSaca cultura
  - [ ] Conversão de unidade se necessário
  - [ ] Tratamento de ausência de dados

- [ ] **3.3.2** Adicionar retry logic (mesma estratégia B3)

### 3.4 Implementar Fallback & Error Handling
- [ ] **3.4.1** Criar método `fetch_from_fallback()`
  - [ ] Se B3 falhar, tentar CBOT
  - [ ] Se ambas falharem, usar último valor no DB
  - [ ] Se nenhuma opção disponível, logar erro e retornar None

- [ ] **3.4.2** Adicionar tratamento de erros
  - [ ] NetworkError → retry
  - [ ] TimeoutError → retry
  - [ ] RateLimitError → exponential backoff
  - [ ] InvalidDataError → log + skip
  - [ ] AuthError → alert + falha

### 3.5 Implementar Persistência
- [ ] **3.5.1** Criar método `save_or_update_cotacao()`
  - [ ] Parâmetros: cultura, preco, data, fonte, metadata
  - [ ] Lógica: se existe cotação do dia → atualizar; senão → criar
  - [ ] Transação atômica (evitar race conditions)
  - [ ] Retornar objeto CotacaoSaca salvo

- [ ] **3.5.2** Adicionar validação de dados
  - [ ] Preço deve ser > 0
  - [ ] Data não pode ser no futuro
  - [ ] Cultura deve estar em CULTURA_CHOICES
  - [ ] Fonte é obrigatória

### 3.6 Testes Unitários do Service
- [ ] **3.6.1** Criar `backend/apps/fazendas/tests/test_cotacao_service.py`
  - [ ] Test: `fetch_from_b3()` com mock de API
  - [ ] Test: `fetch_from_cbot()` com mock de API
  - [ ] Test: retry logic (simular 2 falhas, depois sucesso)
  - [ ] Test: fallback (B3 falha, usa CBOT)

- [ ] **3.6.2** Testar persistência
  - [ ] Test: salvar nouvelle cotação
  - [ ] Test: atualizar cotação existente do mesmo dia
  - [ ] Test: validação de dados inválidos

- [ ] **3.6.3** Testar tratamento de erros
  - [ ] Test: NetworkError → retry 3x
  - [ ] Test: todas APIs falham → usar DB
  - [ ] Test: logging correto em cada cenário

---

## FASE 4: BACKEND - CELERY TASK (P0 - 🔴)

Objetivo: Criar task Celery que executa a cada 15 minutos.

**Pré-requisitos:** 
- FASE 2 (Celery infra) ✅
- FASE 3 (CotacaoService) ✅

### 4.1 Criar Celery Task
- [ ] **4.1.1** Criar `backend/apps/fazendas/tasks.py`
  - [ ] Função `atualizar_cotacoes()` decorada com `@shared_task`
  - [ ] Parâmetros: nenhum (executa com dados fixos)
  - [ ] Retorno: dict com resumo da execução

- [ ] **4.1.2** Implementar lógica da task
  - [ ] Para cada cultura em CULTURA_CHOICES:
    - [ ] Instanciar CotacaoService
    - [ ] Tentar fetch B3
    - [ ] Se falhar, tentar CBOT
    - [ ] Se falhar, usar fallback
    - [ ] Salvar no DB
  - [ ] Coletar resultados (sucesso/falha por cultura)
  - [ ] Retornar JSON com timestamp e status

### 4.2 Adicionar Retry Logic na Task
- [ ] **4.2.1** Configurar retry automático
  - [ ] `autoretry_for`: (Exception,)
  - [ ] `retry_kwargs`: {'max_retries': 3}
  - [ ] `default_retry_delay`: 60 segundos
  - [ ] Bind=True para acessar contexto

- [ ] **4.2.2** Adicionar logging detalhado
  - [ ] Log: "Iniciando sync de cotações..."
  - [ ] Log: "Soja: OK de B3 (R$ 142.50)"
  - [ ] Log: "Milho: Falha B3, usando fallback (R$ 67.80 do DB)"
  - [ ] Log: "Sync concluído em 2.34s"

### 4.3 Registrar Task no Beat
- [ ] **4.3.1** Adicionar ao `celery_config.py`
  - [ ] `beat_schedule['atualizar_cotacoes']`
  - [ ] `task`: 'apps.fazendas.tasks.atualizar_cotacoes'
  - [ ] `schedule`: 900 segundos (15 minutos)
  - [ ] `options`: {'expires': 600, 'max_retries': 3}

- [ ] **4.3.2** Testar agendamento
  - [ ] Subir beat scheduler
  - [ ] Verificar que task aparece em `celery -A inspect scheduled`
  - [ ] Aguardar próxima execução (15 min ou trigger manual)

### 4.4 Testes Unitários da Task
- [ ] **4.4.1** Criar `backend/apps/fazendas/tests/test_cotacao_task.py`
  - [ ] Test: `atualizar_cotacoes()` executa sem erros
  - [ ] Test: mock CotacaoService (não chamar API real)
  - [ ] Test: retorno é dict com status

- [ ] **4.4.2** Testar com Celery
  - [ ] Test: task está registrada em beat_schedule
  - [ ] Test: task executa via `celery call apps.fazendas.tasks.atualizar_cotacoes`
  - [ ] Test: verificar logs da execução

---

## FASE 5: BACKEND - CACHE & API ENDPOINTS (P1 - 🟠)

Objetivo: Cache em tempo real + endpoints para histórico/análise.

**Pré-requisito:** FASE 4 (atualização automática) ✅

### 5.1 Implementar Cache em Redis
- [ ] **5.1.1** Adicionar caching no CotacaoService
  - [ ] Após salvar cotação, armazenar em Redis
  - [ ] Cache key: `cotacao:cultura:ultima` (ex: `cotacao:soja:ultima`)
  - [ ] TTL: 5 minutos (refetch se expicar)
  - [ ] Lock para evitar race conditions (redemption pattern)

- [ ] **5.1.2** Criar método `get_cached_cotacao(cultura)`
  - [ ] Procurar em Redis primeiro
  - [ ] Se não encontrar, query DB
  - [ ] Atualizar cache
  - [ ] Retornar cotação

### 5.2 Criar Endpoint de Histórico
- [ ] **5.2.1** Criar viewset `CotacaoHistoricoViewSet`
  - [ ] Endpoint: `GET /api/cotacoes-saca/historico/`
  - [ ] Query params: `cultura=soja&data_inicio=2026-03-01&data_fim=2026-03-19`
  - [ ] Query params: `dias=7` (últimos 7 dias)
  - [ ] Retorno: Array de cotações ordenadas por data

- [ ] **5.2.2** Adicionar paginação
  - [ ] Padrão: 100 registros por página
  - [ ] Usar `PageNumberPagination`
  - [ ] Ordem: descendente por data

### 5.3 Criar Endpoint de Análise
- [ ] **5.3.1** Criar action `cotacao-análise`
  - [ ] Endpoint: `GET /api/cotacoes-saca/analise/?cultura=soja&dias=30`
  - [ ] Calcula: média, mín, máx, desvio padrão
  - [ ] Retorno: JSON com statisticas

- [ ] **5.3.2** Implementar cálculos
  - [ ] Média diária dos últimos N dias
  - [ ] Mínimo (data + preço)
  - [ ] Máximo (data + preço)
  - [ ] Desvio padrão
  - [ ] Variação % (últimos 24h / últimos 7 dias)

### 5.4 Testes de API
- [ ] **5.4.1** Testar endpoint `/historico/`
  - [ ] Test: retorna cotações do período
  - [ ] Test: filtro por data funciona
  - [ ] Test: paginação funciona

- [ ] **5.4.2** Testar endpoint `/analise/`
  - [ ] Test: cálculos estão corretos
  - [ ] Test: com dados vazios retorna null/0

---

## FASE 6: FRONTEND - WIDGET DE COTAÇÕES (P1 - 🟠)

Objetivo: Componente React que exibe cotações em tempo real no dashboard.

**Pré-requisito:** FASE 5 (APIs prontas) ✅

### 6.1 Criar Componente React
- [ ] **6.1.1** Criar `frontend/src/components/dashboard/CotacoesWidget.tsx`
  - [ ] Props: opcional (nenhum obrigatório)
  - [ ] State: Array<Cotacao>, loading, error, lastUpdated
  - [ ] Hook: useApiQuery para buscar `/api/cotacoes-saca/`

- [ ] **6.1.2** Implementar layout do widget
  - [ ] Título: "📊 Cotações de Grãos (Tempo Real)"
  - [ ] Grid 2x2 ou 1x4 (soja, milho, sorgo, trigo)
  - [ ] Cada card: ícone cultura + preço + tendência
  - [ ] Footer: timestamp + status (atualizado/etc)

### 6.2 Exibir Dados
- [ ] **6.2.1** Renderizar preços
  - [ ] Formato: "R$ 142,50"
  - [ ] Cultura: nome legível (com ícone)
  - [ ] Fonte: "(B3)" ou "(CBOT)" ou "(Fallback)"

- [ ] **6.2.2** Indicadores de tendência
  - [ ] Comparar com cotação anterior (24h atrás)
  - [ ] ↑ verde se subiu (ex: +2,50)
  - [ ] ↓ vermelha se caiu (ex: -1,20)
  - [ ] → cinza se manteve (ex: ±0,00)
  - [ ] Percentual: (-1.77%) em vermelho

### 6.3 Estados Visuais
- [ ] **6.3.1** Estado loading
  - [ ] Skeleton loaders nos cards
  - [ ] Texto: "Carregando cotações..."

- [ ] **6.3.2** Estado erro
  - [ ] Mensagem: "Erro ao carregar cotações"
  - [ ] Botão retry
  - [ ] ícone de aviso

- [ ] **6.3.3** Estado vazio
  - [ ] Se nenhuma cotação: "Sem dados disponíveis"

### 6.4 Timestamp & Refresh
- [ ] **6.4.1** Mostrar timestamp
  - [ ] Última atualização: "19/03/2026 14:30"
  - [ ] Próxima atualização em: "14:45" (countdown)

- [ ] **6.4.2** Implementar auto-refresh
  - [ ] Recarregar a cada 30 segundos (ou quando useQuery com staleTime expira)
  - [ ] Fade animation nas mudanças de preço

### 6.5 Testes Unitários do Widget
- [ ] **6.5.1** Criar `frontend/src/components/dashboard/__tests__/CotacoesWidget.test.tsx`
  - [ ] Test: renderiza 4 culturas (soja, milho, sorgo, trigo)
  - [ ] Test: exibe preços com formato correto
  - [ ] Test: indicadores de tendência aparecem
  - [ ] Test: loading state funciona
  - [ ] Test: erro state funciona

---

## FASE 7: FRONTEND - REAL-TIME COM WEBSOCKET (P2 - 🟡)

Objetivo: Atualizações em tempo real via WebSocket (não apenas polling).

**Pré-requisito:** FASE 6 (widget básico) ✅

### 7.1 Configurar WebSocket Backend
- [ ] **7.1.1** Instalar Django Channels
  - [ ] Adicionar `channels[daphne]` ao requirements.txt
  - [ ] Adicionar `daphne >= 4.0.0`

- [ ] **7.1.2** Configurar ASGI
  - [ ] Atualizar `backend/sistema_agropecuario/asgi.py`
  - [ ] Importar ChannelsAsgiApp
  - [ ] Suportar WebSocket

- [ ] **7.1.3** Criar consumer WebSocket
  - [ ] Arquivo: `backend/apps/fazendas/consumers.py`
  - [ ] Event: `/ws/cotacoes/` (connect, disconnect)
  - [ ] Broadcast: quando nova cotação atualizar, enviar a todos

### 7.2 Implementar Broadcast na Task
- [ ] **7.2.1** Adicionar notify ao final da task
  - [ ] Após salvar todas cotações, enviar WebSocket broadcast
  - [ ] Payload: Array com todas cotações atualizadas
  - [ ] Event: `cotacoes.updated`

### 7.3 Conectar Widget ao WebSocket
- [ ] **7.3.1** Criar hook `useWebsocketCotacoes()`
  - [ ] Conectar ao `/ws/cotacoes/` quando componente monta
  - [ ] Escutar evento `cotacoes.updated`
  - [ ] Atualizar state com novos preços
  - [ ] Desconectar quando componente desmonta

- [ ] **7.3.2** Implementar reconexão automática
  - [ ] Se desconectar, tentar reconectar a cada 5s
  - [ ] Max retries: 10
  - [ ] Exponential backoff

### 7.4 Testes E2E
- [ ] **7.4.1** Criar teste Playwright
  - [ ] File: `frontend/tests/e2e/cotacoes-realtime.spec.ts`
  - [ ] Test: Página carrega com cotações
  - [ ] Test: WebSocket conecta
  - [ ] Test: Preço atualiza quando nova cotação chega

---

## FASE 8: TESTES COMPLETOS & QA (P0 - 🔴)

Objetivo: Validação completa (unitários, integração, E2E).

**Pré-requisito:** FASE 7 concluída ✅

### 8.1 Testes Unitários Completos
- [ ] **8.1.1** Backend: CotacaoService
  - [ ] 6+ testes já criados nas FASES 3-4
  - [ ] Cobertura: >80%

- [ ] **8.1.2** Backend: Task Celery
  - [ ] 3+ testes já criados na FASE 4
  - [ ] Mock de APIs externas

- [ ] **8.1.3** Frontend: CotacoesWidget
  - [ ] 5+ testes já criados na FASE 6
  - [ ] Mocking de useApiQuery

### 8.2 Testes de Integração
- [ ] **8.2.1** Criar `backend/apps/fazendas/tests/test_cotacao_integration.py`
  - [ ] Test: Task executa → DB é atualizado → API retorna dados
  - [ ] Test: Cache é invalidado corretamente
  - [ ] Test: Histórico retorna dados corretos

- [ ] **8.2.2** Testar fluxo end-to-end
  - [ ] Task inicia → Fetch B3/CBOT → Salva DB → API retorna → Widget exibe

### 8.3 Testes E2E (Playwright)
- [ ] **8.3.1** Teste smoke básico
  - [ ] File: `frontend/tests/e2e/cotacoes-smoke.spec.ts`
  - [ ] Abrir dashboard → Widget carrega → Exibe 4 culturas

- [ ] **8.3.2** Teste real-time
  - [ ] File: `frontend/tests/e2e/cotacoes-realtime.spec.ts`
  - [ ] Já criado na FASE 7

### 8.4 Validação de Rate Limiting
- [ ] **8.4.1** Testar rate limits das APIs
  - [ ] Executar task 10x em 1 minuto
  - [ ] Verificar que não bloqueia
  - [ ] Verificar logs de backoff

- [ ] **8.4.2** Testar degradação graciosa
  - [ ] Simular API externa down
  - [ ] Verificar que fallback funciona
  - [ ] Logs apropriados

### 8.5 Performance & Carga
- [ ] **8.5.1** Teste de carga Celery
  - [ ] 1000+ requisições simultaneas ao endpoint
  - [ ] Task executa sem deadlock
  - [ ] Response time < 500ms

- [ ] **8.5.2** Teste de cache
  - [ ] Sem cache: 100 requests → N queries ao DB
  - [ ] Com cache: 100 requests → 1 query ao DB (5min)

---

## FASE 9: DOCUMENTAÇÃO (P1 - 🟠)

Objetivo: Documentar arquitetura, setup e troubleshooting.

**Pré-requisito:** FASE 8 (tudo pronto) ✅

### 9.1 Documentação Técnica
- [ ] **9.1.1** Criar `docs/COTACOES_GRAINS_REALTIME.md`
  - [ ] Arquitetura: diagrama de fluxo (Task → API → Widget → WebSocket)
  - [ ] Componentes: Backend, Celery, Redis, Frontend
  - [ ] APIs utilizadas: B3, CBOT, detalhes de cada
  - [ ] Rate limits de cada API
  - [ ] Contingency plan (se API falhar)

- [ ] **9.1.2** Criar `docs/CELERY_SETUP.md`
  - [ ] Como configurar Celery localmente
  - [ ] Como subir beat scheduler
  - [ ] Como monitorar tasks
  - [ ] Logs e debugging

### 9.2 GUID de Configuração
- [ ] **9.2.1** Atualizar `.env.example`
  - [ ] Adicionar variáveis Celery:
    - `CELERY_BROKER_URL=redis://localhost:6379/0`
    - `CELERY_RESULT_BACKEND=redis://localhost:6379/1`
    - `CELERY_TIMEZONE=America/Sao_Paulo`
  - [ ] Adicionar variáveis de APIs:
    - `B3_API_KEY=xxx` (se aplicável)
    - `CBOT_API_KEY=xxx` (se aplicável)

- [ ] **9.2.2** Criar `docs/COTACOES_SETUP.md`
  - [ ] Passo-a-passo: local dev setup
  - [ ] Passo-a-passo: Docker setup
  - [ ] Verificação: Como saber se está funcionando
  - [ ] Test endpoints manualmente

### 9.3 Troubleshooting
- [ ] **9.3.1** Criar `docs/COTACOES_TROUBLESHOOTING.md`
  - [ ] "Task não executa": verificar Redis/Celery Beat
  - [ ] "Preço não atualiza": verificar logs da task
  - [ ] "API retorna erro": timeout vs auth error
  - [ ] "Widget não carrega": console logs vs network tab
  - [ ] "WebSocket desconecta": reconexão automática?

### 9.4 Runbook de Operação
- [ ] **9.4.1** Criar `docs/COTACOES_RUNBOOK.md`
  - [ ] Iniciar sistemas: Redis, Celery, Beat, Backend, Frontend
  - [ ] Monitorar execução: logs, métricas
  - [ ] Alertas: quando intervir
  - [ ] Rollback: se algo quebrar
  - [ ] Contatos de suporte

### 9.5 Diagrama de Arquitetura
- [ ] **9.5.1** Criar diagrama visual (Mermaid/SVG)
  - [ ] Componentes: B3 API, CBOT API, Backend, Redis, Celery Beat, Task, DB
  - [ ] Fluxo: 15 min → Task dispara → Fetch APIs → Save DB → Notify WebSocket
  - [ ] Frontend: subscribe WebSocket → atualiza widget em tempo real

---

## FASE 10: DEPLOY & VALIDAÇÃO EM PRODUÇÃO (P1 - 🟠)

Objetivo: Deploy seguro e validação final.

**Pré-requisito:** FASE 9 (docs prontas) ✅

### 10.1 Preparar Deploy
- [ ] **10.1.1** Atualizar docker-compose.yml para produção
  - [ ] Redis com persistência (RDB/AOF)
  - [ ] Celery Beat em container próprio
  - [ ] Worker Celery opcional (se necessário paralelismo)
  - [ ] Health checks

- [ ] **10.1.2** Configurar variáveis de ambiente
  - [ ] API keys em secrets/vault (não no git)
  - [ ] URLs de produção para APIs externas
  - [ ] Timeout mais conservador (retry em caso de falha)

### 10.2 Testes em Staging
- [ ] **10.2.1** Deploy em ambiente de staging
  - [ ] Rodar todos testes
  - [ ] Verificar que task executa a cada 15 min
  - [ ] Monitorar por 1 hora: tudo estável?

- [ ] **10.2.2** Validação manual
  - [ ] Abrir widget no dashboard
  - [ ] Verificar que preços aparecem
  - [ ] Aguardar próxima atualização (15 min)
  - [ ] Verificar que preço mudou

### 10.3 Deploy em Produção
- [ ] **10.3.1** Executar deploy
  - [ ] Docker compose pull + up
  - [ ] Executar migrations se houver
  - [ ] Warm-up: pré-carregar últimas cotações no cache

- [ ] **10.3.2** Health check pós-deploy
  - [ ] Verificar que task está agendada
  - [ ] Verificar que próxima execução é em ~15 min
  - [ ] Verificar que endpoint `/api/cotacoes-saca/` responde

### 10.4 Monitoramento Contínuo
- [ ] **10.4.1** Configurar alertas
  - [ ] Task não executou por 30 min → alertar
  - [ ] Task executou com erro → alertar
  - [ ] Redis disconnect → alertar
  - [ ] API externa down → alertar

- [ ] **10.4.2** Logging & Métricas
  - [ ] Adicionar ao observability stack (Prometheus, ELK, etc. se houver)
  - [ ] Rastrear tempo de fetch por API
  - [ ] Métricas: sucesso/falha por fonte

---

## ✅ CHECKLIST DE CONCLUSÃO

Quando TUDO estiver pronto:

- [ ] **Código:** Todas as fases implementadas e testadas
- [ ] **Testes:** Cobertura >80%, todos passando
- [ ] **Documentação:** Todas as guias atualizadas
- [ ] **Deploy:** Rodando em produção com sucesso
- [ ] **Monitoramento:** Alertas configurados
- [ ] **Validação:** 7 dias de uptime sem falhas

**Parabéns!** 🎉 Widget de Cotações pronto para usar.

---

## 📝 NOTAS IMPORTANTES

### Prioridades
1. FASE 1-4: **Bloqueia tudo** (pesquisa, infra, service, task)
2. FASE 5-6: **Esenncial** (cache, widget)
3. FASE 7-10: **Support** (real-time, docs, deploy)

### Dependências Críticas
- FASE 1 → determine qual API usar (B3, CBOT, fallback)
- FASE 2 → Docker será modificado (Redis + Beat)
- FASE 4 → Task executa a cada 15 min (testar tempo exato)
- FASE 6 → Widget no dashboard principal

### Riscos Identificados
1. **API indisponível:** Fallback já documentado → mitigado
2. **Rate limiting:** Cache + retry exponential → mitigado
3. **Bug em task:** Testes unit + integration → mitigado
4. **WebSocket desconecta:** Reconexão automática → mitigado

---

**Data de Atualização:** 19 de março de 2026  
**Status:** 📋 Planejamento em Andamento
