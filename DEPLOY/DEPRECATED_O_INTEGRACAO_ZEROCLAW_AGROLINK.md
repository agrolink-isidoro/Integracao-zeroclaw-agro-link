# 🤖 Plano de Integração: ZeroClaw ↔ Agrolink (v2.0)

**Data:** 2 de março de 2026  
**Status:** Planejamento Detalhado (Revisão 2)  
**Escopo:** Integração de IA Consultiva (Isidoro) com Sistema Agropecuário Multimódulo  
**Paradigma:** Bot Consultor + Fila de Ações (sem execução direta)

---

## 📋 Índice

1. [Visão Geral Revisada](#visão-geral-revisada)
2. [Arquitetura de Integração](#arquitetura-de-integração)
3. [Action Queue & Interface de Aprovação](#action-queue--interface-de-aprovação)
4. [Módulos no MVP](#módulos-no-mvp)
5. [Casos de Uso Prioritários](#casos-de-uso-prioritários)
6. [Funcionalidades por Módulo](#funcionalidades-por-módulo)
7. [Roadmap de Implementação Revisado](#roadmap-de-implementação-revisado)
8. [Configurações Técnicas](#configurações-técnicas)
9. [APIs Necessárias](#apis-necessárias-mvp-read-only)
10. [Exemplos de Diálogos](#exemplos-de-diálogos-revisados)

---

## 🎯 Visão Geral Revisada

### Objetivo Fundamental
Integrar **ZeroClaw (Isidoro)** como **assistente consultor** do sistema Agrolink, permitindo:
- ✅ **Consultas de dados** (read-only) de todas as operações
- ✅ **Preenchimento inteligente de formulários** (drafts)
- ✅ **Fila de ações pendentes** para aprovação do usuário
- ✅ **Análises e insights** sobre dados históricos
- ✅ **Suporte multi-canal** (Telegram, WhatsApp, Chat Web)

### Paradigma: Consultor ≠ Executor

```
Usuário                    Isidoro (ZeroClaw)              Agrolink Backend
   │                            │                               │
   │─ Pergunta sobre dados      │                               │
   ├──────────────────────────>│                               │
   │                            │─ GET /api/agricultura...─────>│
   │                            │<─ JSON com dados────────────│
   │                            │ (Gemini analisa)            │
   │<─ Resposta consultiva──────┤                               │
   │                            │                               │
   │─ "Registre operação X"     │                               │
   ├──────────────────────────>│                               │
   │                            │ Preenche form + valida      │
   │<─ Ação preparada (draft)───┤                               │
   │   "Revisar e aprovar"      │                               │
   │                            │                               │
   │─ Aprova via UI             │                               │
   ├──────────────────────>┤─────────────────────────────────>│
   │                       │ POST /api/agricultura/operacoes  │
   │                       │<─ 201 Created───────────────────┤
   │                       └─────────────────────────────────>│
   │                            │ (Usuário é always o executor)
```

### Arquitetura Alto Nível

```
┌──────────────────────────────────────────────────────────────────┐
│                    ZeroClaw (Isidoro - Consultor)                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Gemini 2.5-flash + Memory (SQLite)                    │   │
│  │  - Chat Context (últimas 20 mensagens)                 │   │
│  │  - User Profile (fazenda, área, culturas)              │   │
│  │  - Histórico de Operações (cache)                      │   │
│  │  - Intents Recognition (agricultura, máquinas, etc)    │   │
│  └────────────────────────────────────────────────────────┘   │
│                       ⬇ READ-ONLY                              │
│        (Nenhuma escrita direta no banco)                       │
└──────────────────┬─────────────────────────────────────────────┘
                   │ API REST (GET only) + WebSocket
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼──────────────┐  ┌──▼──────────────────┐
   │  Backend API      │  │  Frontend React     │
   │  (Django)         │  │  (Vite)             │
   │                   │  │                     │
   │ - Auth (JWT)      │  │ - Chat Widget       │
   │ - Multi-tenant    │  │ - Dashboard         │
   │ - RBAC            │  │ - Action Approval   │
   │ - Action Queue    │  │   UI (visualizar,   │
   │ - Rate limiting   │  │   editar, aceitar,  │
   │ - Draft Manager   │  │   rejeitar)         │
   └────┬──────────────┘  └────────────────────┘
        │                        ⬆
        │              (via POST para executar)
        │
   ┌────▼────────────────────────────────────────────────┐
   │         Módulos Agrolink (Persistência)             │
   │                                                     │
   │  MVP (leitura + action drafts):                    │
   │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
   │  │Agricultura│ │ Máquinas │ │ Estoque  │           │
   │  └──────────┘ └──────────┘ └──────────┘           │
   │  ┌──────────┐                                       │
   │  │ Fazendas │                                       │
   │  └──────────┘                                       │
   │                                                     │
   │  Leitura apenas (sem ações):                       │
   │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
   │  │Financeiro│ │Comercial │ │  Fiscal  │           │
   │  └──────────┘ └──────────┘ └──────────┘           │
   │  ┌──────────┐                                       │
   │  │  Admin   │                                       │
   │  └──────────┘                                       │
   │                                                     │
   │              PostgreSQL + Redis                     │
   └─────────────────────────────────────────────────────┘
```

### Permissões por Módulo (MVP)

| Módulo | Leitura | Criar Drafts | Executar | Fase |
|--------|---------|--------------|----------|------|
| **Agricultura** | ✅ | ✅ | ❌ (usuário aprova) | MVP |
| **Máquinas** | ✅ | ✅ | ❌ (usuário aprova) | MVP |
| **Estoque** | ✅ | ✅ | ❌ (usuário aprova) | MVP |
| **Fazendas** | ✅ | ❌ | ❌ | MVP |
| **Financeiro** | ✅ | ❌ | ❌ | Fase 2 |
| **Comercial** | ✅ | ❌ | ❌ | Fase 2 |
| **Fiscal** | ✅ | ❌ | ❌ | Fase 2 |
| **Admin** | ✅ | ❌ | ❌ | Fase 2 |

---

## � Action Queue & Interface de Aprovação

### O que é uma "Action" (Ação)?

Uma **Action** é um **draft de operação** preparado pelo Isidoro, aguardando aprovação do usuário antes de ser executado.

```json
{
  "id": "action-12345",
  "type": "operacao_agricola",
  "status": "pending_approval",  // pending_approval | approved | rejected | executed
  "created_by": "isidoro",
  "created_at": "2026-03-02T14:30:00Z",
  "user_id": "user-xyz",
  "tenant_id": "tenant-abc",
  
  "payload": {
    "tipo": "plantio",
    "cultura": "soja",
    "talhao_id": "talhao-vila-nova",
    "area_hectares": 50,
    "data_operacao": "2026-03-01",
    "insumos": [
      { "insumo_id": "uuid-sementes", "quantidade": 100, "unidade": "kg" }
    ]
  },
  
  "validation": {
    "warnings": ["Insumo NPK em quantidade baixa"],
    "errors": []
  },
  
  "approvals": {
    "action_url": "/dashboard/actions/action-12345",
    "can_edit": true,
    "can_approve": true
  }
}
```

### Estados de Uma Action

```
           [Criada por Isidoro]
                    ↓
          [pending_approval]
          /          |          \
         /           |           \
        ↓            ↓            ↓
    [approved]  [rejected]  [edited_by_user]
        │            │            │
        ↓            ↓            ↓
    [pending_execution] [archived] [pending_approval]
        │
        ↓
    [executed]
        ↓
    [archived]
```

### Interface de Aprovação (Dashboard)

**Layout proposto:**

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 Ações Pendentes de Isidoro                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [📋 3 Ações Pendentes]  [✅ 12 Aprovadas]  [❌ 2 Rejeitadas] │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ✏️ OPERAÇÃO: Plantio de Soja em Vila Nova            │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ Criada: 2 mar 14:30 | Sugerida por: Isidoro         │ │
│  │                                                     │ │
│  │ 📊 Detalhes:                                        │ │
│  │  • Tipo: Plantio                                    │ │
│  │  • Cultura: Soja                                    │ │
│  │  • Talhão: Vila Nova (50 ha)                        │ │
│  │  • Data: 1º mar 2026                                │ │
│  │  • Insumos: 100 kg sementes NPK                     │ │
│  │                                                     │ │
│  │ ⚠️ Validações:                                      │ │
│  │  ⚠️ Aviso: Estoque de NPK baixo (2500 kg)           │ │
│  │  ✅ Talhão disponível                               │ │
│  │  ✅ Cultura válida para região                      │ │
│  │                                                     │ │
│  │ [📝 Editar]  [✅ Aprovar]  [❌ Rejeitar]            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ✏️ ENTRADA DE ESTOQUE: Adubo NPK                     │ │
│  │ ...                                                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ✏️ MANUTENÇÃO: Trator em Fazenda Central             │ │
│  │ ...                                                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Backend: Action Queue Manager

**Novos Endpoints:**

```
GET /api/actions/
  → Lista ações pendentes do usuário/tenant
  
GET /api/actions/{id}/
  → Detalhes de uma ação

POST /api/actions/{id}/approve/
  → Aprova ação (executada imediatamente ou enfileirada)

POST /api/actions/{id}/reject/
  → Rejeita ação

PUT /api/actions/{id}/
  → Edita payload da ação antes de aprovar

GET /api/actions/history/
  → Histórico de ações (aprovadas, rejeitadas, executadas)
```

### Fluxo de Execução

```
1. Usuário aprova ação no dashboard
   ↓
2. Backend valida novamente payload (segurança)
   ↓
3. Se validação OK:
   POST /api/agricultura/operacoes/ (ou /estoque/entradas/, etc)
   ↓
4. Ação marcada como "executed"
   ↓
5. Chat do Isidoro atualizado: "✅ Operação executada!"
   ↓
6. Ação armazenada em "histórico"
```

### Validações de Segurança

- ✅ **Dupla Validação:** Isidoro valida ao criar draft, Backend valida ao executar
- ✅ **Audit Trail:** Histório completo de quem criou/aprovou/executou
- ✅ **Rate Limiting:** Máximo X ações por usuário/hora
- ✅ **Permissões:** Usuário só pode aprovar ações de seu tenant
- ✅ **Rollback:** Se execução falhar, ação volta para "pending_approval"

---

## 📋 Módulos no MVP

### **Módulos com Suporte Completo (Leitura + Drafts)**

#### 1. **Agricultura**
- ✅ Consultar operações, culturas, safras, colheitas
- ✅ Preparar drafts de operações (plantio, adubação, irrigação, colheita)
- ✅ Análises de produtividade
- ✅ Recomendações de operações

#### 2. **Máquinas**
- ✅ Consultar máquinas disponíveis
- ✅ Preparar drafts de manutenções
- ✅ Registrar abastecimentos
- ✅ Histórico de uso

#### 3. **Estoque**
- ✅ Consultar itens disponíveis
- ✅ Preparar drafts de entradas/saídas
- ✅ Alertas de níveis críticos
- ✅ Histórico de movimentações

#### 4. **Fazendas**
- ✅ Consultar propriedades, talhões, geolocalização
- ✅ Visualizar ocupação por cultura
- ✅ Dados para contexto de operações
- ❌ Sem criação de novos talhões (versão futura)

### **Módulos com Leitura Apenas (Consulta)**

#### 5. **Financeiro**
- ✅ Visualizar fluxo de caixa
- ✅ Consultar vencimentos pendentes
- ✅ Ver rentabilidade por cultura
- ❌ Sem criação de rateios ou vencimentos (Fase 2)

#### 6. **Comercial**
- ✅ Visualizar vendas históricas
- ✅ Consultar preços de mercado
- ✅ Histórico de fornecedores
- ❌ Sem criação de contratos ou vendas (Fase 2)

#### 7. **Fiscal**
- ✅ Visualizar NFes processadas
- ✅ Consultar impostos/carga fiscal
- ✅ Status de compliance
- ❌ Sem criação/manifestação de NFes (Fase 2)

#### 8. **Administrativo**
- ✅ Visualizar dados de custo administrativo
- ✅ Consultar informações de funcionários (para contexto)
- ❌ Sem criação de dados administrativos (Fase 2)

---

## 💡 Casos de Uso Prioritários

### Fase 1: MVP (Semanas 1-4)

#### 1.1 Consultas de Dados
**"Quantos hectares plantei de milho esse ano?"**

```
ZeroClaw → GET /api/agricultura/culturas/?cultura=milho&ano=2026&tenant=X
← JSON com total de área plantada
```

**Implementação:**
- Criar endpoint agregado em `agricultura/api/views.py`
- Response format: `{ "cultura": "milho", "area_total_hectares": 150, "talhoes": [...] }`

#### 1.2 Registros de Operações
**"Plantei 50 hectares de soja ontem em Vila Nova"**

```
ZeroClaw → POST /api/agricultura/operacoes/
{
  "tipo": "plantio",
  "cultura": "soja",
  "area_hectares": 50,
  "talhao_id": "uuid-talhao-vila-nova",
  "data_operacao": "2026-03-01",
  "insumos": [
    { "insumo_id": "uuid", "quantidade": 100, "unidade": "kg" }
  ]
}
← { "id": "uuid-operacao", "status": "criada" }
```

**Implementação:**
- OperacaoSerializer com validação de talhão + cultura
- Trigger automático para criação de MovimentacaoEstoque (saída)

#### 1.3 Análise Rápida de Financeiro
**"Como está meu fluxo de caixa este mês?"**

```
ZeroClaw → GET /api/financeiro/fluxo_caixa/?mes=2026-03
← {
    "entradas_totais": 50000,
    "saidas_totais": 35000,
    "saldo": 15000,
    "vencimentos_proximos_30": [...]
  }
```

**Implementação:**
- Endpoint já existe (mencionar em README)
- Formatar resposta em linguagem natural para Gemini

#### 1.4 Consulta de Estoque
**"Quanto de adubo NPK temos em estoque?"**

```
ZeroClaw → GET /api/estoque/itens/?nome=NPK&tenant=X
← { "item_id": "uuid", "quantidade": 2500, "unidade": "kg", "local": "Galpão A" }
```

---

### Fase 2: Funcionalidades Avançadas (Semanas 5-8)

#### 2.1 Recomendações Baseadas em Dados
**"O que devo fazer agora para maximizar a safra de milho?"**

```
ZeroClaw faz múltiplas chamadas:
GET /api/agricultura/operacoes/?cultura=milho&ultimos_dias=30
GET /api/agricultura/safras/?cultura=milho&status=em_curso
GET /api/financeiro/custos/?cultura=milho
GET /analytics/produtividade/?cultura=milho&comparativo=2025

Gemini analisa:
- Custo vs. produtividade histórica
- Pluviosidade esperada
- Operações faltantes no ciclo
- Margem de lucro atual

Responde: "Baseado em dados históricos, você está 15% abaixo da produtividade...
Recomendo: X insumo agora, Y irrigação em Z dias"
```

#### 2.2 Previsões de Colheita
**"Quando devo colher o talhão de soja em Vila Nova?"**

```
ZeroClaw consulta:
1. Data de plantio + ciclo da cultura
2. Chuvas acumuladas (via API de clima)
3. Condições do talhão
4. Preço de mercado projetado

Responde com data estimada + margem de segurança
```

#### 2.3 Alertas Automáticos
ZeroClaw envia alertas proativos:
- ⚠️ "Vencimento crítico em 5 dias: R$ 50k"
- ⚠️ "Fertilizante em falta para semear amanhã"
- ✅ "Operação realizada com sucesso: plantio 50 ha"

---

### Fase 3: Bots Especializados (Semanas 9-12)

#### 3.1 Bot de Operações Agrícolas
Especializado em plantio, colheita, irrigação, adubação
- Voice input otimizado
- Validações de campos (geografi, cultura, insumo)
- Integração com manuais de operação

#### 3.2 Bot Financeiro
Especializado em análise de custos, rentabilidade
- Simulações "what if"
- Comparativo com histórico
- Projeções de fluxo de caixa

#### 3.3 Bot Comercial
Especializado em vendas, contratos, margens
- Comparação de preços
- Recomendações de venda
- Análise de fornecedores

---

## 📊 Funcionalidades por Módulo

### AGRICULTURA

**Consultas Possíveis:**
- "Quantas operações fiz em [mês]?"
- "Qual é a área plantada por cultura?"
- "Qual foi o custo por hectare de [cultura]?"
- "Quando foi a última manutenção de [máquina]?"
- "Qual é a taxa de germinação de [semente]?"

**Registros Possíveis:**
- Criar operação agrícola (plantio, adubação, irrigação)
- Registrar colheita com quantidade e qualidade
- Marcar manutenção de máquina
- Registrar aplicação de defensivo/fertilizante

**Análises:**
- Produtividade por talhão (histórico 3 anos)
- Comparativo cultura A vs. B
- Ciclo médio vs. esperado

**APIs Necessárias:**
```
GET /api/agricultura/operacoes/ (list, filter, aggregate)
POST /api/agricultura/operacoes/ (create)
GET /api/agricultura/culturas/ (list, stats)
GET /api/agricultura/safras/ (current, by talhao)
GET /api/agricultura/colheitas/ (list, by culture)
POST /api/agricultura/colheitas/ (create)
GET /api/agricultura/operacoes/{id}/custos/ (breakdown)
```

### FINANCEIRO

**Consultas:**
- "Qual é meu saldo de caixa total?"
- "Quantas dívidas vencer esta semana?"
- "Qual foi meu lucro no mês passado?"
- "Qual cultivo é mais rentável?"

**Registros:**
- Registrar vencimento
- Quitar dívida
- Criar rateio de custo
- Registrar transferência entre contas

**Análises:**
- Rentabilidade por talhão
- Comparativo mensal/anual
- Projeção de fluxo de caixa

**APIs Necessárias:**
```
GET /api/financeiro/lancamentos/fluxo_caixa/ (by period)
GET /api/financeiro/vencimentos/ (list, filter by status)
GET /api/financeiro/resumo/ (total, by period)
POST /api/financeiro/vencimentos/{id}/quitar/ (pay)
POST /api/financeiro/transferencias/ (create)
GET /api/financeiro/rateios/ (list, by operation)
GET /api/financeiro/analise_rentabilidade/ (by talhao, culture)
```

### FAZENDAS

**Consultas:**
- "Qual é a área total de minha fazenda?"
- "Quantos talhões tenho na fazenda [name]?"
- "Qual é a localização do talhão [name]?"
- "Qual é a cultura atual de cada talhão?"

**Registros:**
- Criar novo talhão
- Atualizar cultura de um talhão
- Registrar coleta de solo

**Análises:**
- Distribuição geográfica de culturas
- Ocupação de áreas

**APIs Necessárias:**
```
GET /api/fazendas/fazendas/ (list, by tenant)
GET /api/fazendas/talhoes/ (list, by fazenda)
GET /api/fazendas/talhoes/{id}/ (detail, with geolocation)
POST /api/fazendas/talhoes/ (create)
PUT /api/fazendas/talhoes/{id}/ (update cultura)
GET /api/fazendas/proprietarios/ (list)
```

### ESTOQUE

**Consultas:**
- "Quanto de [insumo] temos em estoque?"
- "Qual é o nível crítico de [produto]?"
- "Qual foi o ajuste de estoque para [produto]?"

**Registros:**
- Registrar entrada de insumo
- Registrar saída (uso em operação)
- Corrigir inventário

**Análises:**
- Rotatividade de estoque
- Produtos parados
- Custo médio de aquisição

**APIs Necessárias:**
```
GET /api/estoque/itens/ (list, filter by categoria)
GET /api/estoque/itens/{id}/ (detail, with levels)
POST /api/estoque/entradas/ (register entry)
POST /api/estoque/saidas/ (register exit)
GET /api/estoque/movimentacoes/ (history, by item)
GET /api/estoque/inventario/ (current levels, by location)
```

### COMERCIAL

**Consultas:**
- "Qual é o preço médio de [produto]?"
- "Quem são meus principais fornecedores?"
- "Qual é o histórico de vendas de [produto]?"

**Registros:**
- Registrar venda de produto
- Cadastrar novo fornecedor
- Registrar contrato

**Análises:**
- Margem de lucro por venda
- Sazonalidade de preços
- Performance de fornecedores

**APIs Necessárias:**
```
GET /api/comercial/vendas/ (list, filter)
POST /api/comercial/vendas/ (create)
GET /api/comercial/fornecedores/ (list)
POST /api/comercial/fornecedores/ (create)
GET /api/comercial/contratos/ (list, by status)
GET /api/comercial/analise_vendas/ (by product, period)
```

### FISCAL

**Consultas:**
- "Quais NFes estão pendentes de manifestação?"
- "Qual é o total de impostos este mês?"
- "Qual é meu calendário fiscal?"

**Registros:**
- Importar NFe (enviar XML)
- Registrar manifestação

**Análises:**
- Carga fiscal por produto
- Comparativo de impostos

**APIs Necessárias:**
```
GET /api/fiscal/nfes/ (list, filter)
POST /api/fiscal/nfes/ (upload XML)
GET /api/fiscal/nfes/{id}/impostos/ (detail)
POST /api/fiscal/nfes/{id}/manifestar/ (register manifestation)
GET /api/fiscal/dashboard/ (tax summary, compliance)
```

---

## 🚀 Roadmap de Implementação

### **FASE 1: MVP (Duração: 4 semanas)**

#### Semana 1: Setup e Autenticação
- [ ] Criar arquivo `ZEROCLAW_CONFIG.md` documentando integração
- [ ] Configurar autenticação ZeroClaw ↔ Agrolink (JWT token persistente)
- [ ] Implementar middleware de tenant no ZeroClaw
- [ ] Criar base de dados de contexto usuário (cache)
- [ ] **Sprints:** 
  - ZeroClaw lê `X-Tenant-ID` do header
  - Armazena credenciais API Agrolink de forma segura (env vars)
  - Testa autenticação em dev/staging

#### Semana 2: Consultas Básicas + Criação de Operações
- [ ] Implementar handlers de consulta (Agricultura, Fazendas, Estoque)
- [ ] Criar intent recognition para diferentes tipos de pergunta
- [ ] Builder de payloads para POST (operações agrícolas)
- [ ] Testes manuais no Telegram
- [ ] **APIs a consumir:**
  - GET `/api/agricultura/operacoes/`
  - GET `/api/estoque/itens/`
  - POST `/api/agricultura/operacoes/`

#### Semana 3: Integração Financeira + Voice
- [ ] Implementar consultas de fluxo de caixa
- [ ] Configurar Groq Whisper para Telegram (ou usar local)
- [ ] Testar dicção português
- [ ] **APIs a consumir:**
  - GET `/api/financeiro/fluxo_caixa/`
  - GET `/api/financeiro/vencimentos/`

#### Semana 4: Primeiro Bot + Testes E2E
- [ ] Criar bot especializado em Operações Agrícolas
- [ ] Testes end-to-end (Telegram → ZeroClaw → API → Banco)
- [ ] Documentação de uso (guia de produtos)
- [ ] **Resultado:** MVP funcional, MVP pronto para beta com usuários

---

### **FASE 2: Análises e Inteligência (Duração: 4 semanas)**

#### Semana 5: Agregações e Relatórios
- [ ] Criar endpoints de agregação (custos por talhão, produtividade)
- [ ] Implementar cache de analytics em Redis
- [ ] Builders de gráficos para resposta
- [ ] **APIs novas:**
  - GET `/api/agricultura/analise_produtividade/`
  - GET `/api/financeiro/analise_rentabilidade/`

#### Semana 6: System Prompts Contextuais
- [ ] Ajustar system prompt do Gemini baseado em contexto (região, safra, cultivo)
- [ ] Implementar "personality" para cada bot
- [ ] Testes de qualidade de respostas

#### Semana 7: Alertas e Notificações
- [ ] Criar sistema de alertas (vencimentos, estoque baixo, operações atrasadas)
- [ ] Scheduler para verificações periódicas
- [ ] Notificações via Telegram

#### Semana 8: Documentação + Review
- [ ] Documentar todos os intents suportados
- [ ] Criar guias de troubleshooting
- [ ] Review com stakeholders

---

### **FASE 3: Bots Especializados (Duração: 4 semanas)**

#### Semana 9-10: Bot Operações
- [ ] Implementar bot com memory específico
- [ ] Otimização para voice input
- [ ] Validações de negócio (não permitir operação sem insumo)

#### Semana 11-12: Bots Financeiro e Comercial
- [ ] Implementar análises "what if"
- [ ] Simulações de cenários
- [ ] Recomendações de venda/compra

---

## ⚙️ Configurações Técnicas

### ZeroClaw Config (`~/.zeroclaw/config.toml`)

```toml
[providers.google]
model = "gemini-2.5-flash"
region = "us-west4"
temperature = 0.3
streaming = true
prompt_caching_enabled = true
max_tokens = 2048

# Nova seção: Agrolink Integration
[integrations.agrolink]
enabled = true
api_base_url = "http://localhost:8001/api"  # ou https://agrolink.production.com/api
auth_method = "jwt"  # ou "api_key"
jwt_secret = "${AGROLINK_JWT_SECRET}"
timeout_seconds = 30

# Cache context em memoria
cache_ttl_seconds = 3600
cache_max_entries = 1000

# Módulos habilitados
modules_enabled = ["agricultura", "financeiro", "estoque", "fazendas", "comercial"]

[integrations.agrolink.logging]
log_api_calls = true
log_failures = true
log_level = "info"

# Telegram para audio
[channels.telegram]
enabled = true

[channels.telegram.transcription]
enabled = true
provider = "local"  # ou "groq"
model = "base"
language = "pt"
device = "cpu"
```

### Backend API Headers

```
Authorization: Bearer <JWT_TOKEN>
X-Tenant-ID: <TENANT_UUID>
X-User-ID: <USER_UUID>
Content-Type: application/json
```

### JWT Token Structure

```json
{
  "sub": "zeroclaw-bot",
  "tenant_id": "uuid-tenant",
  "scope": ["read:agricultura", "create:operacoes", "read:financeiro"],
  "exp": 1234567890
}
```

---

## 🔗 APIs Necessárias

### Endpoints Criação/Modificação

Todos com validação:

```
POST /api/agricultura/operacoes/
  Input: { tipo, cultura, area, talhao_id, data, insumos[] }
  Output: { id, status, validation_errors? }

POST /api/estoque/entradas/
  Input: { item_id, quantidade, data, origem }
  Output: { id, status, novo_saldo }

POST /api/financeiro/vencimentos/
  Input: { fornecedor, valor, data_vencimento, descricao, rateio_id? }
  Output: { id, status }

POST /api/financeiro/vencimentos/{id}/quitar/
  Input: { data_pagamento, forma_pagamento }
  Output: { status, saldo_atualizado }

POST /api/comercial/vendas/
  Input: { produto_id, quantidade, preco_unitario, cliente, data }
  Output: { id, status, valor_total }
```

### Endpoints Consulta/Agregação

```
GET /api/agricultura/operacoes/?cultura=X&talhao_id=Y&dias=30
GET /api/agricultura/analise_produtividade/?comparativo=1year
GET /api/financeiro/fluxo_caixa/?mes=2026-03&detalhado=true
GET /api/financeiro/rentabilidade/?talhao_id=X
GET /api/estoque/itens/?categoria=insumo
GET /api/fazendas/talhoes/?status=em_uso
GET /api/comercial/vendas/?produto_id=X&period=3month
```

---

## 💬 Exemplos de Diálogos

### Exemplo 1: Consulta Simples

```
👤 Usuário: "Quanto de adubo NPK temos?"

🤖 ZeroClaw:
  1. Extrai intent: INVENTORY_QUERY(product="NPK")
  2. Chamadas API: GET /api/estoque/itens/?nome=NPK
  3. Resposta JSON: { "quantidade": 2500, "unidade": "kg", "local": "Galpão A" }
  4. Formata com Gemini: "Temos 2.500 kg de NPK no Galpão A"

✅ Resposta ao usuário: "Você tem 2.500 kg de adubo NPK armazenado no Galpão A."
```

### Exemplo 2: Registro com Validação

```
👤 Usuário: "Plantei soja no talhão Vila Nova ontem"

🤖 ZeroClaw:
  1. Extrai: OPERACAO(tipo="plantio", cultura="soja", talhao="vila nova", data="2026-03-01")
  2. Valida: verifica se talhão existe e está disponível
  3. Necessita mais info:
     - Área plantada? (não fornecido)
     - Insumos usados? (não fornecido)
  
✅ Resposta: "Ótimo! Para finalizar o registro do plantio, me falta:
- Quantos hectares você plantou?
- Quais insumos usou (sementes, adubo, defensivo)?"

👤 Usuário: "50 hectares, com 100kg de semente e 500L de adubo"

🤖 ZeroClaw:
  1. Agora tem dados completos
  2. POST /api/agricultura/operacoes/ com payload completo
  3. Resposta: { "id": "op-12345", "status": "criada" }
  4. Trigger automático: POST /api/estoque/saidas/ (saída de insumos)

✅ Resposta: "✅ Plantio registrado com sucesso!
- Talhão: Vila Nova (50 ha)
- Insumos: 100 kg semente + 500 L adubo
- Status:criado
Insumos foram descontados do estoque."
```

### Exemplo 3: Análise com Recomendação

```
👤 Usuário: "Como está minha rentabilidade na safra de milho?"

🤖 ZeroClaw:
  1. Múltiplas chamadas:
     - GET /api/financeiro/analise_rentabilidade/?cultura=milho
     - GET /api/agricultura/analise_produtividade/?cultura=milho
     - GET /api/financeiro/custos/?cultura=milho
  
  2. Dados retornados:
     - Custo total: R$ 50k
     - Receita total: R$ 120k
     - Margem: 58%
     - Produtividade: 60 sc/ha (vs. 65 sc/ha histórico)
  
  3. Gemini analisa e recomenda:
     - Você está 7% abaixo da produtividade histórica
     - Possíveis causas: fertilizante insuficiente ou falta de chuva
     - Recomendação: aumentar adubação de cobertura ou irrigar

✅ Resposta: "Sua rentabilidade com milho está em 58% (ótimo!).
Porém, a produtividade está 7% abaixo do histórico (60 vs. 65 sc/ha).

📊 Análise:
- Custo: R$ 50.000
- Receita: R$ 120.000
- Lucro: R$ 70.000

💡 Uma recomendação: Se aumentar adubação de cobertura agora, pode recuperar até 3% de produtividade."
```

### Exemplo 4: Voice com Síntese de Resposta

```
👤 Usuário (voz): "Qual é meu saldo de caixa?" [áudio enviado]

🤖 ZeroClaw:
  1. Whisper transcribe: "Qual é meu saldo de caixa?"
  2. GET /api/financeiro/lancamentos/saldo/
  3. Resposta: { "saldo_total": 150000, "por_conta": [...] }
  4. Gemini formata: "Seu saldo de caixa total é de R$ 150 mil."
  5. (Futuro) TTS envia áudio de volta

✅ Resposta (texto): "💰 Seu saldo de caixa total é de R$ 150.000.
Distribuído em:
- Conta Corrente Bradesco: R$ 50.000
- Poupança Itaú: R$ 100.000"
```

---

## 📋 Requisitos de Implementação

### Backend (project-agro)

**Novos Endpoints:**
- [ ] `/api/agricultura/operacoes/analytics/` (agregações)
- [ ] `/api/financeiro/analise_rentabilidade/` (análise por cultura/talhão)
- [ ] `/api/estoque/alertas_nivel_critico/` (low stock alerts)
- [ ] `/api/fazendas/contexto_usuario/` (quick context fetch)

**Modificações:**
- [ ] Adicionar filtros `tenant_id` em todos os endpoints
- [ ] Adicionar rate limiting para ZeroClaw
- [ ] Criar JWT service para autenticação de bot
- [ ] Adicionar audit logging de chamadas de ZeroClaw

### Frontend (front-end-agrolink)

**Novos Componentes:**
- [ ] Chat widget persistente no dashboard
- [ ] Panel de histórico de inteligências (insights)
- [ ] Bot control panel (ativar/desativar, configurar)

**Modificações:**
- [ ] Adicionar WebSocket client para chat em real-time
- [ ] Integrar notificações de ZeroClaw

### ZeroClaw

**Novos Módulos:**
- [ ] `agrolink_integration.rs` (handlers de APIs)
- [ ] `agrolink_context.rs` (manager de contexto)
- [ ] `agrolink_intents.rs` (reconhecimento de intenções)
- [ ] `agrolink_validators.rs` (validação de dados)

**Configurações:**
- [ ] Atualizar `config.toml` com seção `[integrations.agrolink]`
- [ ] Documentar autenticação

---

## ✅ Checklist de Implementação

### Setup
- [ ] ZeroClaw e Agrolink rodando na mesma rede/ambiente
- [ ] JWT token configurado em `.env`
- [ ] Tenant ID e User ID configurados no ZeroClaw
- [ ] Rate limiting habilitado

### Fase 1: MVP
- [ ] ✅ Consultas básicas (Agricultura, Estoque, Fazendas)
- [ ] ✅ Registros de operações
- [ ] ✅ Análises simples (financeiro)
- [ ] ✅ Audio transcription (Groq ou local)
- [ ] ✅ Testes E2E

### Fase 2: Análises
- [ ] ✅ Agregações de dados
- [ ] ✅ Alertas automáticos
- [ ] ✅ Recomendações baseadas em IA
- [ ] ✅ Documentação

### Fase 3: Especialização
- [ ] ✅ Bot Operações
- [ ] ✅ Bot Financeiro
- [ ] ✅ Bot Comercial

---

## 📞 Próximos Passos

1. **Reunião de Alignment:** Confirmar prioridades e timeline com stakeholders
2. **Design API Detalhado:** Criar openapi.yaml com todos os endpoints
3. **Mock de Dados:** Preparar ambiente de teste com dados realistas
4. **Sprint Planning:** Decompor tasks e estimar esforço
5. **Begin Development:** Iniciar Semana 1 (Setup + Auth)

---

**Documento preparado por:** GitHub Copilot  
**Data:** 2 de março de 2026  
**Versão:** 1.0
