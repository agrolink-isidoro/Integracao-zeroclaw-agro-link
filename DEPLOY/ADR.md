# 🏛️ Architecture Decision Records (ADR)

**Data:** 2 de março de 2026  
**Versão:** 1.0  
**Scope:** Integração ZeroClaw ↔ Agrolink MVP

---

## Índice de Decisões

1. [ADR-001: Paradigma Approval-Based vs Executor](#adr-001-paradigma-approval-based-vs-executor)
2. [ADR-002: Action Queue Pattern](#adr-002-action-queue-pattern)
3. [ADR-003: Multi-Tenant Isolation Strategy](#adr-003-multi-tenant-isolation-strategy)
4. [ADR-004: JWT com tenant_id vs Header X-Tenant-ID](#adr-004-jwt-com-tenant_id-vs-header-x-tenant-id)
5. [ADR-005: Escopo MVP](#adr-005-escopo-mvp)
6. [ADR-006: Armazenamento de Ações](#adr-006-armazenamento-de-ações)
7. [ADR-007: Permissões por Tenant](#adr-007-permissões-por-tenant)

---

## ADR-001: Paradigma Approval-Based vs Executor

### Contexto

Hadouá duas opções de arquitetura:

**Opção A (Executor):**
- ZeroClaw/Isidoro executa ações direto no banco
- User vê resultado após alguns segundos
- Rápido, mas arriscado (sem review humano)

**Opção B (Approval-Based):**
- ZeroClaw prepara draft (não executa)
- User revisa no dashboard
- User aprova/rejeita
- Backend executa só após aprovação
- Mais seguro, mais transparência

### Decisão

✅ **ADR-001: APPROVED** → Ir com Opção B (Approval-Based)

### Rationale

1. **Segurança:** User sempre vê o que bot propõe antes de executar
2. **Auditoria:** Histórico completo: quem criou, quem aprovou
3. **Controle:** User pode editar antes de aprovar
4. **Confiança:** Usuário não perde controle dos dados
5. **Escalabilidade:** Fácil adicionar outros bots (cada um propõe, user aprova)

### Implicações

- ✅ Mais complexo (Action Queue + Dashboard)
- ✅ Mais seguro (user sempre no controle)
- ✅ Melhor auditoria (histórico completo)
- ✅ Possibilita workflows (ex: 2 aprovadores)

### Alternativas Rejeitadas

❌ **Executor Model:** Bot executa direto
- Risco: User não vê o que aconteceu
- Problema: Sem auditoria clara
- Inviável para dados críticos

---

## ADR-002: Action Queue Pattern

### Contexto

Como estruturar as ações pendentes de aprovação?

**Opção A: Simples (um modelo Action)**
- `Action` com campos: `type`, `payload`, `status`
- Status: pending, approved, executed, rejected

**Opção B: Complexo (múltiplos modelos)**
- `ActionDraft`, `ActionPending`, `ActionExecuted`
- Separação por fase

### Decisão

✅ **ADR-002: APPROVED** → Ir com Opção A (um modelo Action)

### Rationale

1. **Simplicidade:** Um modelo, mais fácil entender
2. **História:** Mesmo objeto passa por states: pending → approved → executed
3. **Auditoria:** Um registro com timeline completa
4. **Performance:** Uma tabela, índices simples

### Model Design

```python
class Action(models.Model):
    id = UUIDField(primary_key=True)
    tenant = ForeignKey(Tenant)
    type = CharField(choices=[
        ("operacao_agricola", "..."),
        ("entrada_estoque", "..."),
        ...
    ])
    status = CharField(choices=[
        ("pending_approval", "Aguardando aprovação"),
        ("approved", "Aprovado"),
        ("rejected", "Rejeitado"),
        ("executed", "Executado"),
        ("failed", "Falhou na execução"),
        ("archived", "Arquivado"),
    ])
    payload = JSONField()  # Dados específicos do tipo
    
    created_by = ForeignKey(User)
    approved_by = ForeignKey(User, null=True)
    approved_at = DateTimeField(null=True)
    executed_at = DateTimeField(null=True)
    
    meta = JSONField(default=dict)  # trace_id, version, etc
```

### Implicações

- ✅ Simplicidade máxima
- ✅ Fácil adicionar novos status (ex: "awaiting_second_approval")
- ✅ Queries eficientes: `.filter(status="pending_approval", tenant_id=X)`
- ✅ Auditoria natural: timeline em um registro

---

## ADR-003: Multi-Tenant Isolation Strategy

### Contexto

Como garantir que cada tenant vê APENAS seus dados?

**Opção A: Row-Level Security (RLS) no PostgreSQL**
- Banco de dados força isolamento
- Mais complexo, mais seguro
- Requer PostgreSQL + policy

**Opção B: Application-Level Filtering**
- Django middleware + QuerySet filtering
- Mais simples, responsável pelo dev
- Risco: esquecimento de filtro

**Opção C: Híbrido**
- Django filtering (performance)
- PostgreSQL RLS (fallback security)

### Decisão

✅ **ADR-003: APPROVED** → Opção C (Híbrido)

**Fase 1 (MVP):** Só Django filtering  
**Fase 2:** Adicionar PostgreSQL RLS para defense-in-depth

### Rationale

1. **Simplicidade agora:** Django middleware suficiente para MVP
2. **Escalabilidade depois:** RLS para redundância se esquecerem filtro
3. **Performance:** Django cache locale, DB não precisa checar policy
4. **Compliance:** Duas camadas de segurança = melhor auditoria

### Implementation

```python
# Django Middleware (Fase 1)
class TenantIsolationMiddleware:
    def __call__(self, request):
        request.tenant_id = self._extract_tenant_id(request)
        request.tenant = Tenant.objects.get(id=request.tenant_id)
        return self.get_response(request)

# QuerySet Filtering (Automático)
class TenantManager(models.Manager):
    def get_queryset(self):
        qs = super().get_queryset()
        if qs.model._meta.get_field("tenant"):
            qs = qs.filter(tenant=get_current_tenant())
        return qs

# PostgreSQL RLS (Fase 2)
-- CREATE POLICY isolate_tenant ON action
-- USING (tenant_id = current_user_tenant_id())
-- WITH CHECK (tenant_id = current_user_tenant_id())
```

### Implicações

- ✅ Dupla proteção (app + database)
- ✅ Performance OK (índices em tenant_id)
- ✅ Segurança escalável
- ✅ Fácil de debugar (filtros visíveis no code)

---

## ADR-004: JWT com tenant_id vs Header X-Tenant-ID

### Contexto

Como ZeroClaw sabe qual tenant usar ao fazer requisições?

**Opção A: Extrair de JWT**
- JWT.payload = { "tenant_id": "vila-nova" }
- ZeroClaw lê e não precisa configurar
- Escalável (funciona com qualquer tenant)

**Opção B: Header X-Tenant-ID**
- ZeroClaw envia header em cada request
- Config.toml tem: `tenant_id = "vila-nova"`
- Simples, mas hardcoded por tenant

**Opção C: Ambos**
- JWT tenta primeiro
- Fallback para header
- Máxima compatibilidade

### Decisão

✅ **ADR-004: APPROVED** → Opção C (Both, com prioridade JWT)

### Rationale

1. **RFC 7519 (JWT Best Practice):** tenant_id em payload
2. **Escalabilidade:** JWT funciona com múltiplos tenants (SaaS)
3. **DevOps:** Não precisa mudar config.toml por tenant
4. **Fallback:** Header X-Tenant-ID se JWT falhar (compatibilidade)

### Implementation

```toml
# ~/.zeroclaw/config.toml

[integrations.agrolink]
auth_method = "jwt"
jwt_secret = "${AGROLINK_JWT_SECRET}"

# Estratégia de extração (ordem)
tenant_extraction = [
  "jwt_payload",           # Try 1: Leia JWT.tenant_id
  "header",               # Try 2: Leia X-Tenant-ID
]

# Fallback se nenhum funcionar
default_tenant = "vila-nova"  # Ou erro
```

### Implicações

- ✅ ZeroClaw escalável (multi-tenant pronto)
- ✅ Seguro (JWT validado no backend)
- ✅ Compatível (fallback para dev/teste)
- ✅ Configuração mínima

---

## ADR-005: Escopo MVP

### Contexto

Qual é o escopo do MVP (4 semanas)?

**Opção A: Todos os 8 módulos**
- Completo, mas arriscado
- 8-12 semanas realista

**Opção B: 4 módulos críticos**
- Fazendas, Agricultura, Máquinas, Estoque
- 4 semanas alcançável
- Leitura dos outros (sem ações)

### Decisão

✅ **ADR-005: APPROVED** → Opção B (4 módulos)

### Escopo Detalhado

**✅ ESCREVER (Action drafts):**
```
Agricultura:
  - plant (plantio)
  - harvest (colheita)
  - irrigate (irrigação)

Máquinas:
  - maintenance (manutenção)
  - refueling (abastecimento)

Estoque:
  - add_item (entrada)
  - remove_item (saída)
  - adjust (ajuste)

Fazendas:
  - (leitura apenas, sem ações)
```

**👀 LER (sem ações):**
```
Financeiro:
  - rateios (contexto de custo)
  - cash_flow (informação de fluxo)

Comercial:
  - sales (historico de vendas)
  - contracts (referência)

Fiscal:
  - nfe_status (compliance)
  - certificates (informação)

Admin:
  - user_list (referência)
```

**❌ BLOQUEADO (Fase 2+):**
```
Nenhuma ação de escrita em módulos que não MVP
```

### Rationale

1. **Realismo:** 4 semanas = 3.5 devs = ~145h
2. **Risco:** Menos módulos = menos variáveis
3. **Impacto:** 4 módulos cobrem 80% do case de uso
4. **Escalabilidade:** Padrão repetível para Fase 2

### Implicações

- ✅ Viável em 4 semanas
- ✅ Padrão testado antes de expandir
- ✅ Risco controlado
- ✅ Early feedback no MVP core

---

## ADR-006: Armazenamento de Ações

### Contexto

Onde armazenar `payload` (dados da ação)?

**Opção A: JSON no PostgreSQL**
- Flexível, busca por atributos
- Native PostgreSQL jsonb
- Query: `WHERE payload->>'tipo' = 'plant'`

**Opção B: Serializado (TEXT)**
- Simples, mas não searchable
- Sem índices em payload

**Opção C: Normalizado (Foreign Keys)**
- Ultraomplexo
- 1 table per action_type
- Não viável

### Decisão

✅ **ADR-006: APPROVED** → Opção A (JSONField/jsonb)

### Rationale

1. **Flexibilidade:** Diferentes tipos de ação têm estruturas diferentes
2. **Busca:** Índices em `payload` permitem queries eficientes
3. **Django:** JSONField nativo desde Django 3.1
4. **PostgreSQL:** jsonb com GIST índices

### Schema

```python
class Action(models.Model):
    payload = JSONField()
    
    # Exemplo: Operação Agrícola
    # {
    #   "tipo": "plantio",
    #   "cultura": "soja",
    #   "talhao_id": "uuid-123",
    #   "area_hectares": 50,
    #   "insumos": [...]
    # }

# Índice para query
class Meta:
    indexes = [
        GinIndex(fields=["payload"]),
    ]
```

### Implicações

- ✅ Flexibilidade máxima
- ✅ Queries eficientes com índices
- ✅ Sem schema migration para novo tipo de ação
- ✅ Dados históricos preservados exatamente

---

## ADR-007: Permissões por Tenant

### Contexto

Como modelar "quem pode fazer o quê em qual tenant"?

**Opção A: Roles Fixas (owner, operator, viewer)**
- Simples, não customizável
- Rápido de implementar

**Opção B: Permissões Granulares (module×action×role)**
- Customizável por tenant
- Mais complexo

### Decisão

✅ **ADR-007: APPROVED** → Opção B (Granular)

### Rationale

1. **Escalabilidade:** Diferentes propriedades podem ter regras diferentes
2. **Compliance:** Audit trail de quem pode fazer o quê
3. **Flexibilidade:** Admin de cada tenant configura suas roles
4. **Segurança:** Least privilege principle

### Models

```python
class TenantRole(models.Model):
    """Roles dentro de um tenant"""
    tenant = ForeignKey(Tenant)
    user = ForeignKey(User)
    role = CharField(max_length=50)  # "owner", "agro_op", etc

class TenantPermission(models.Model):
    """O que cada role pode fazer em cada módulo"""
    tenant = ForeignKey(Tenant)
    role = CharField(max_length=50)
    module = CharField(max_length=50)  # "agricultura"
    action = CharField(max_length=50)   # "read", "create_draft", "approve"
    
    class Meta:
        unique_together = ("tenant", "role", "module", "action")
```

### Verificação em Views

```python
def has_permission_to_action(user, tenant, module, action):
    """Checks if user can do action on module in tenant"""
    return TenantPermission.objects.filter(
        tenant=tenant,
        role__user=user,
        module=module,
        action=action
    ).exists()
```

### Implicações

- ✅ Cada tenant controla suas permissões
- ✅ Auditoria clara
- ✅ Escalável para multi-org
- ✅ Admin dashboard pode gerenciar permissões

---

## Summary Table

| ADR | Decisão | Status | Impacto |
|-----|---------|--------|---------|
| ADR-001 | Approval-Based (não Executor) | ✅ | Segurança, User Control |
| ADR-002 | Um modelo Action (não múltiplos) | ✅ | Simplicidade, Performance |
| ADR-003 | Híbrido: Django + PostgreSQL RLS | ✅ | Segurança escalável |
| ADR-004 | JWT + Header X-Tenant-ID | ✅ | Escalabilidade multi-tenant |
| ADR-005 | MVP: 4 módulos (não 8) | ✅ | Realismo, Risco controlado |
| ADR-006 | JSONField para payload | ✅ | Flexibilidade, Queries |
| ADR-007 | Permissões granulares | ✅ | Customização, Compliance |

---

## Próximos Passos

1. **Implementação (Devs):** Seguir patterns documentados em ADRs
2. **Review (Tech Lead):** Validar que code segue ADRs
3. **Feedback (Stakeholders):** Comunicar decisões arquiteturais
4. **Fase 2:** Rever ADRs baseado em learnings do MVP

---

## Como Adicionar Novo ADR

```markdown
## ADR-NNN: [Título]

### Contexto
(Explique o problema)

### Opções Consideradas
A. Opção 1
B. Opção 2
C. Opção 3

### Decisão

✅ **ADR-NNN: APPROVED** → Opção X

### Rationale
(Por que escolheu essa)

### Implicações
(Consequências)

### Alternativas Rejeitadas
(Por que não as outras)
```

---

**Documento criado:** 2 de março de 2026  
**Próxima review:** Final de Semana 1 (feedback), Final de Semana 4 (lições aprendidas)
