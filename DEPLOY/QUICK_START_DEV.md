# 🚀 Quick Start - Dev Sprint Setup

**Data:** 2 de março de 2026  
**Para:** Developers começando hoje  
**Tempo:** 15 minutos de setup

---

## ⚡ 30 Segundos (Visão Geral)

Você vai construir uma **fila de ações com aprovação humana** integrada com **ZeroClaw/Isidoro**:

```
Usuário dita: "Plantei soja" 
   ↓
Isidoro cria draft da ação
   ↓
Usuário aprova via dashboard
   ↓
Backend executa ação
```

**Escopo:** Agricultura, Máquinas, Estoque, Fazendas (MVP)  
**Tempo:** 4 semanas, 3.5 devs  
**Multi-tenant:** Cada propriedade vê só seus dados

---

## 📚 Leia Em Ordem

1. **RESUMO_EXECUTIVO_ZEROCLAW_AGROLINK.md** (5 min)
   - Entende o "por quê"
   
2. **PLANO_INTEGRACAO_ZEROCLAW_AGROLINK_V2.md** (45 min)
   - Entende o "o quê" e "como"
   
3. **ZEROCLAW_MULTITENANT_ARCHITECTURE.md** (30 min)
   - Entende isolamento de dados (**CRÍTICO!**)
   
4. **CHECKLIST_IMPLEMENTACAO_MVP.md** (seu dia-a-dia)
   - Segue semana-a-semana

---

## 💻 Dev Roles & Responsabilidades

### Backend Developer (Dev A)
**Semana 1-2:** Action Queue + ZeroClaw Integration

```bash
# Seu trabalho:
1. Criar Action model com tenant_id
2. Implementar TenantIsolationMiddleware
3. Criar ActionSerializer + ViewSets
4. Endpoints: POST /api/actions/, GET /api/actions/{id}/approve/
5. Tests (unit + integration + security)
```

**Documentação:**
- ZEROCLAW_MULTITENANT_ARCHITECTURE.md → "Backend Settings"
- PLANO_V2 → "APIs Necessárias - MVP"
- CHECKLIST → "Semana 1"

---

### Frontend Developer (Dev C)
**Semana 3:** Dashboard de Aprovação

```bash
# Seu trabalho:
1. ActionsList.tsx → lista de ações pendentes
2. ActionDetail.tsx → mostra detalhes
3. ActionEditor.tsx → permite editar draft
4. ActionApprovalFlow.tsx → APROVAR/REJEITAR
5. Integração ao Dashboard existente
```

**Documentação:**
- RESUMO_EXECUTIVO → "Exemplos Rápidos" (UX)
- PLANO_V2 → "Exemplos de Diálogos" (negócio)
- CHECKLIST → "Semana 3"

---

### ZeroClaw Integration (Dev B)
**Semana 2:** Config + Intent Recognition

```bash
# Seu trabalho:
1. Mapear intents: "Plantei X" → agricultura/plant
2. Config ZeroClaw (config.toml) com tenant_id
3. API client para chamar backend
4. Prompt engineering para extrair dados
5. Tests E2E (full flow chat → action)
```

**Documentação:**
- PLANO_V2 → "Casos de Uso" (UC-1 a UC-5)
- PLANO_V2 → "Configurações Técnicas"
- CHECKLIST → "Semana 2"

---

## 🏗️ Arquitetura (Visual)

```
Frontend                Backend              ZeroClaw
┌──────────────┐       ┌──────────────┐      ┌────────────┐
│ Dashboard    │       │ Django       │      │ Gemini     │
│              │────→  │              │  ←─  │            │
│ Aprovar Ação │       │ SQL:         │      │ (LLM)      │
└──────────────┘       │  Tenant      │      └────────────┘
                       │  Action      │            ↑
                       │  Operacao    │            │
                       │  etc...      │
                       │              │
                       │ Middleware:  │
                       │  TenantIsolation
                       │  IsTenantMember
                       └──────────────┘
```

**Fluxo:**
1. Frontend envia ação (com X-Tenant-ID header)
2. Backend valida tenant + permissões
3. Cria Action.draft_status = pending_approval
4. Frontend mostra em dashboard
5. Usuário aprova → Backend executa

**Isolamento:**
- Cada request tem tenant_id
- Middleware valida tenant_id
- QuerySets filtram por tenant
- User nunca vê dados de outro tenant

---

## 🔐 Multi-Tenant (Não Pule Isso!)

**Princípio:**
```
Uma propriedade = Um tenant
Múltiplas propriedades = Múltiplos tenants
ZeroClaw precisa saber qual tenant está consultando
```

**Como funciona:**
```python
# Request chega com JWT contendo tenant_id
JWT.payload = {
  "sub": "user-456",
  "tenant_id": "vila-nova",  # ← ZeroClaw extrai daqui
  ...
}

# Backend filtra:
Action.objects.filter(tenant="vila-nova")

# User de outra propriedade vê página em branco
# (seu tenant_id não corresponde)
```

**Validação (3 características):**
1. ✅ JWT contém tenant_id correto
2. ✅ User pertence ao tenant (TenantRole)
3. ✅ Dados filtrados por tenant (QuerySet.filter)

Se falhar em (1) ou (2) → 403 Forbidden  
Se falhar em (3) → 404 Not Found

---

## 📋 Semana 1 Checklist (Backend Dev A)

### Segunda-feira
- [ ] Leia PLANO_V2 completo
- [ ] Leia ZEROCLAW_MULTITENANT_ARCHITECTURE.md
- [ ] Leia CHECKLIST seção "Semana 1"
- [ ] Clone/pull project-agro

### Terça-feira
- [ ] Criar apps/actions/models.py com Action model
- [ ] Criar apps/actions/models.py com ActionStatus enum
- [ ] Migrations (makemigrations + migrate)
- [ ] Testes do model

### Quarta-feira
- [ ] Criar ActionSerializer em serializers.py
- [ ] Criar ActionsViewSet em views.py
- [ ] Registrar em urls.py + router
- [ ] Testes básicos (POST /api/actions/)

### Quinta-feira
- [ ] Implementar ActionApproveView
- [ ] Implementar ActionRejectView
- [ ] Testes de permissions
- [ ] Code review

### Sexta-feira
- [ ] Integration tests (full flow)
- [ ] Security tests (tenant isolation)
- [ ] Documentation (endpoints)
- [ ] Demo ao time

---

## 🧪 Testing Mindset

Sempre testar:

```python
# 1. Happy path
POST /api/actions/ → 201 Created ✅

# 2. Tenant isolation
User de "vila-nova" não vê actions de "fazenda-grande" ✅

# 3. Permissions
Usuário sem role "agro_operator" não pode aprovar ✅

# 4. Validations
POST /api/actions/ com dados inválidos → 400 Bad Request ✅

# 5. Security
User não consegue acessar action de outro tenant → 404 ✅
```

---

## 🎯 MVP Scope (Não Implemente Além Disso!)

### ✅ IMPLEMENTE (Semanas 1-4)

```
Agricultura:
  - Criar draft de plantio
  - Criar draft de colheita
  - Criar draft de irrigação

Máquinas:
  - Criar draft de manutenção
  - Criar draft de abastecimento

Estoque:
  - Criar draft de entrada
  - Criar draft de saída
  - Criar draft de ajuste

Fazendas:
  - Ler (GET only, sem drafts)
```

### ❌ NÃO IMPLEMENTE (Fase 2)

```
Financeiro: Leitura apenas (sem ações)
Comercial: Bloqueado
Fiscal: Bloqueado
Admin: Bloqueado
```

---

## 🔄 Fluxo Completo (Dev A + Dev B + Dev C)

```
MON-WED (Semana 1)
└─ Backend Dev A: Action model + endpoints ✓

THU-FRI (Semana 1)
└─ Backend Dev A: Tests + security ✓
└─ ZeroClaw Dev B: Intent mapping setup

MON-WED (Semana 2)
└─ ZeroClaw Dev B: API client + config ✓
└─ Frontend Dev C: Design dashboard

THU-FRI (Semana 2)
└─ ZeroClaw Dev B: E2E tests ✓
└─ Frontend Dev C: Start coding ActionsList

MON-WED (Semana 3)
└─ Frontend Dev C: All components + integration ✓

THU-FRI (Semana 3)
└─ Frontend Dev C: Tests + polish ✓
└─ Full team: Integration testing

MON-WED (Semana 4)
└─ Full team: Scenario testing ✓
└─ Full team: Security audit ✓

THU-FRI (Semana 4)
└─ Full team: Documentation + demo
└─ Go live!
```

---

## 🚨 Gotchas (Armadilhas Comuns)

### 1. Esquecer Multi-Tenant
❌ `Action.objects.all()` → vê ações de TODOS os tenants!  
✅ `Action.objects.filter(tenant=request.tenant_id)` → só seu tenant

### 2. JWT sem tenant_id
❌ JWT não contém tenant_id  
✅ Adicione ao payload na autenticação

### 3. Não Validar Header X-Tenant-ID
❌ Confiar só em JWT  
✅ Validar: `user.tenant_id == request.META.get("HTTP_X_TENANT_ID")`

### 4. Índices Missing no Banco
❌ Queries lentas com 10k+ actions  
✅ Criar: `Index(fields=["tenant", "status"])`

### 5. ZeroClaw sem Access ao Tenant Correto
❌ ZeroClaw cria action com tenant=None  
✅ Config toml com: `tenant_extraction = "jwt_payload"`

---

## 📞 Suporte & Perguntas

**Documentação Central:** [INDEX.md](INDEX.md)

**Se tem dúvida sobre:**
- Arquitetura → PLANO_V2.md
- Multi-tenant → ZEROCLAW_MULTITENANT_ARCHITECTURE.md  
- Checklist → CHECKLIST_IMPLEMENTACAO_MVP.md
- Fluxos → RESUMO_EXECUTIVO.md

**Se precisa conversar:**
- Tech lead
- Product manager
- ZeroClaw expert

---

## ✅ Pronto Para Começar?

```bash
# 1. Leia os documentos (2 horas)
# 2. Clone o repositório
# 3. Crie seu branch de feature
# 4. Comece com o CHECKLIST Phase 0
# 5. Use Semana 1 como guia

# Commands úteis:
python manage.py startapp actions
python manage.py makemigrations
python manage.py migrate
python manage.py test apps.actions
```

**Good luck! 🚀**

Documento criado: 2 de março de 2026  
Status: Ready to code
