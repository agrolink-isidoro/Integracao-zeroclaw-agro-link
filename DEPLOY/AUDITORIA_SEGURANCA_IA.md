# 🔒 Auditoria de Segurança: IA (Isidoro) — Documentação vs Implementação

**Data:** 7 de março de 2026  
**Versão:** 1.0  
**Autor:** Copilot (revisão automatizada)  
**Escopo:** Autenticação, Isolamento Multi-Tenant e RBAC da IA Isidoro

---

## 📋 Resumo Executivo

A IA Isidoro utiliza um **modelo de conta de serviço** (`isidoro_agent`) para acessar a API do Agrolink em nome dos usuários. O isolamento de dados é feito via **header `X-Tenant-ID`** por requisição, e o `TenantMiddleware` resolve o tenant para filtrar dados via `TenantQuerySetMixin`.

**Status geral:** O isolamento funciona corretamente após as correções de 2026-03-07. Existem lacunas em relação ao que foi planejado nos documentos de arquitetura.

---

## 1. Modelo de Autenticação da IA — COMO FUNCIONA HOJE

### Fluxo Completo

```
Usuário (Felipe) abre chat no frontend
  │
  ├─ WebSocket: ws://backend:8000/ws/chat/
  │   └─ Autenticação: JWT do USUÁRIO (Felipe) como query param
  │
  ├─ JwtAuthMiddleware (websocket) extrai:
  │   ├─ user_id → 8 (Felipe)
  │   └─ tenant_id → fa63bcd0-... (Fazenda Demo) ← do JWT do Felipe
  │
  ├─ IsidoroChatConsumer recebe scope["tenant"]:
  │   ├─ self.tenant_id = "fa63bcd0-..." (do Felipe, NÃO do Isidoro)
  │   └─ self.isidoro = IsidoroAgent(
  │         jwt_token = settings.ISIDORO_JWT_TOKEN,  ← JWT estático de serviço
  │         tenant_id = self.tenant_id,              ← tenant do USUÁRIO
  │       )
  │
  ├─ IsidoroAgent(tenant_id) injeta em todas as chamadas:
  │   ├─ get_agrolink_tools(tenant_id=tenant_id) → closures com tenant_id
  │   ├─ _fetch_safras_ativas(tenant_id=tenant_id) → httpx com X-Tenant-ID
  │   └─ Cada tool → _client(tenant_id=tenant_id) → httpx com X-Tenant-ID
  │
  └─ Backend recebe requisição HTTP da IA:
      ├─ Authorization: Bearer <ISIDORO_JWT>
      ├─ X-Tenant-ID: fa63bcd0-...
      │
      └─ TenantMiddleware resolve:
          1. JWT → sem tenant_id claim (bypassed) ✓
          2. user.tenant → None (isidoro_agent sem tenant) ✓
          3. X-Tenant-ID → fa63bcd0-... → request.tenant = Fazenda Demo ✓
```

### Usuário de Serviço: `isidoro_agent`

| Propriedade     | Valor                         | Motivo                                      |
|-----------------|-------------------------------|---------------------------------------------|
| `is_staff`      | `True`                        | Permite usar `X-Tenant-ID` header           |
| `is_superuser`  | `False`                       | Não pode ver TODOS os dados sem tenant      |
| `tenant`        | `None`                        | Serviço global, tenant vem do header        |
| `cargo`         | `Agente IA (ZeroClaw/Isidoro)`| Identificação                               |
| JWT             | `AccessToken.for_user(user)`  | 30 dias, sem `tenant_id` claim              |

### Segurança do Modelo

| Cenário                           | Resultado                                  |
|-----------------------------------|--------------------------------------------|
| IA sem `X-Tenant-ID`             | `request.tenant = None` → `qs.none()` → ø |
| IA com `X-Tenant-ID: tenant-A`   | Dados apenas do tenant-A                   |
| IA com `X-Tenant-ID: tenant-B`   | Dados apenas do tenant-B                   |
| Usuário comum envia `X-Tenant-ID`| Header **ignorado**, usa JWT do usuário     |

---

## 2. Documentação Planejada vs Implementação Atual

### Camadas de Segurança (7 planejadas)

| # | Camada                          | Doc Referência                   | Status         |
|---|----------------------------------|----------------------------------|----------------|
| 1 | Isolamento de Rede (firewall)   | ARQUITETURA_SISTEMA_GERAL.md     | ✅ Docker network |
| 2 | JWT Validation                   | ADR.md (ADR-004)                 | ✅ Implementado |
| 3 | Tenant Isolation (X-Tenant-ID)   | ZEROCLAW_MULTITENANT_ARCHITECTURE| ✅ Implementado (via TenantMiddleware) |
| 4 | Endpoint Whitelist               | ARQUITETURA_SISTEMA_GERAL.md     | ❌ Não implementado |
| 5 | Permission Matrix (banco)        | ARQUITETURA_SISTEMA_GERAL.md     | ❌ Não implementado |
| 6 | SQL Injection Detection          | RESUMO_ARQUITETURA.md            | ❌ Não implementado |
| 7 | PostgreSQL RLS                   | ADR.md (ADR-003, Fase 2)         | ❌ Não implementado |

### Decisões Arquiteturais (ADRs)

| ADR   | Decisão                              | Status                                      |
|-------|--------------------------------------|---------------------------------------------|
| ADR-003 | Isolamento Híbrido (Django + RLS)  | ⚠️ Parcial — só Django filtering            |
| ADR-004 | JWT (prio) + X-Tenant-ID (fallback)| ✅ Implementado corretamente                |
| ADR-007 | RBAC Granular (TenantRole/Perm)    | ⚠️ Parcial — usa ModulePermission, não TenantRole |

### Funcionalidades Planejadas vs Implementadas

| Funcionalidade                        | Documentação                          | Implementado |
|---------------------------------------|---------------------------------------|:------------:|
| `TenantIsolationMiddleware`           | ZEROCLAW_MULTITENANT, CHECKLIST       | ✅ (como `TenantMiddleware`) |
| `TenantManager` (auto-filter)         | ZEROCLAW_MULTITENANT                  | ✅ (como `TenantQuerySetMixin`) |
| JWT com `tenant_id` claim (usuários)  | ADR-004                               | ✅ via `CustomTokenObtainPairSerializer` |
| `X-Tenant-ID` header (serviços)      | ADR-004, múltiplos docs               | ✅ Aceito para `is_staff` |
| `IsTenantMember` permission class     | ZEROCLAW_MULTITENANT                  | ❌ Não implementado |
| Cross-tenant rejection (user ≠ tenant)| ZEROCLAW_MULTITENANT                  | ⚠️ Parcial (header ignorado para comuns) |
| API Key para ZeroClaw                 | ARQUITETURA_SISTEMA_GERAL, CHECKLIST  | ❌ Usa JWT, não API key |
| Rate limiting por tenant              | ENDPOINTS (FASE-2), RESUMO            | ❌ Não implementado |
| Audit logging                         | RESUMO_ARQUITETURA                    | ❌ Não implementado |
| PostgreSQL RLS                        | RESUMO_ARQUITETURA, ADR-003           | ❌ Planejado para Fase 2 |
| WebSocket JWT validation              | CHECKLIST                             | ✅ `JwtAuthMiddleware` |
| Endpoint whitelist para IA            | ARQUITETURA_SISTEMA_GERAL             | ❌ Não implementado |
| Read-only financeiro/fiscal para IA   | ARQUITETURA_SISTEMA_GERAL             | ❌ Não enforced |

---

## 3. Lacunas Críticas e Recomendações

### 🔴 Prioridade Alta

#### 3.1 Sem validação cross-tenant para `isidoro_agent`
O `isidoro_agent` (`is_staff=True`) pode enviar qualquer `X-Tenant-ID` sem validação de autorização para aquele tenant específico.

**Risco:** Se o JWT do Isidoro for comprometido, pode acessar qualquer tenant.  
**Mitigação atual:** JWT é interno (Docker network), 30 dias de validade.  
**Recomendação:** Implementar `IsTenantMember` ou whitelist de tenants.

#### 3.2 Expiração silenciosa do token
Se `ISIDORO_JWT_TOKEN` expirar (30 dias), todas as chamadas da IA falham silenciosamente.

**Recomendação:** Monitorar expiração e alertar; ou regenerar no startup (já feito no `docker-entrypoint.sh`).

### 🟡 Prioridade Média

#### 3.3 Endpoint Whitelist não implementado
Os docs planejam que a IA só pode acessar rotas específicas (`/api/agriculture/*`, `/api/estoque/*`). Hoje o token `is_staff` dá acesso a toda a API.

**Recomendação:** Criar um middleware que filtre endpoints permitidos para `isidoro_agent`.

#### 3.4 Read-only para financeiro/fiscal não enforced
Os docs definem que a IA deve ter acesso read-only a financeiro e fiscal. Hoje, nada impede POST/PUT/DELETE.

**Recomendação:** Adicionar permission class que verifique o módulo e restrinja métodos HTTP.

#### 3.5 Documentação referencia RLS que não existe
`RESUMO_ARQUITETURA.md` e `ARQUITETURA_SISTEMA_GERAL.md` descrevem PostgreSQL RLS como se já existisse. Não existe.

**Recomendação:** Atualizar docs para refletir "Planejado para Fase 2".

### 🟢 Prioridade Baixa

#### 3.6 Inconsistência API Key vs JWT
Alguns docs mencionam `API_KEY`/`ZEROCLAW_API_KEY`, outros JWT. A implementação usa JWT.

**Recomendação:** Padronizar documentação para JWT only.

#### 3.7 Rate Limiting
Documentado mas não implementado. Baixo risco no MVP.

---

## 4. Arquivos Relevantes

### Backend (Django)
| Arquivo | Função |
|---------|--------|
| `core/middleware/tenant.py` | `TenantMiddleware` — resolve `request.tenant` |
| `core/middleware/jwt_websocket.py` | `JwtAuthMiddleware` — auth WebSocket |
| `core/mixins.py` | `TenantQuerySetMixin` — filtra querysets por tenant |
| `core/permissions.py` | `RBACViewPermission` — check module permissions |
| `actions/management/commands/generate_isidoro_token.py` | Criação/renovação do `isidoro_agent` |
| `actions/consumers.py` | `IsidoroChatConsumer` — WebSocket chat handler |

### ZeroClaw/Isidoro (Python)
| Arquivo | Função |
|---------|--------|
| `integrations/agrolink.py` | `IsidoroAgent` — LLM agent wrapper |
| `tools/agrolink_tools.py` | LangChain tools com `X-Tenant-ID` header |

---

## 5. Correções Aplicadas (2026-03-07)

| Problema | Causa Raiz | Correção |
|----------|-----------|----------|
| `isidoro_agent.tenant = Fazenda Demo` | Middleware step 2 retornava tenant fixo, `X-Tenant-ID` nunca lido | `tenant = None` no `generate_isidoro_token` |
| `_fetch_safras_ativas` sem tenant | httpx client sem header `X-Tenant-ID` | Adicionado parâmetro `tenant_id` e header |
| `agrolink_tools.py` sem tenant | `_client()`, `_get()`, `_post_action()` sem tenant_id | Todos atualizados com `X-Tenant-ID` |
| Dashboard 500 (Talhao FieldError) | `Area` e `Talhao` não são `TenantModel` | Filtros corrigidos: `fazenda__tenant`, `area__fazenda__tenant` |
| Actions 403 (RBAC) | Felipe sem permissão "actions" module | Endpoint `pendentes` usa apenas `IsAuthenticated` |

---

## 6. Validação do Isolamento

### Teste realizado (2026-03-07)

```
# Sem X-Tenant-ID → 0 resultados (safe failure) ✅
curl -H "Authorization: Bearer $ISIDORO_JWT" /api/agricultura/plantios/
→ Count: 0

# Com X-Tenant-ID correto → dados do tenant ✅
curl -H "Authorization: ..." -H "X-Tenant-ID: fa63bcd0-..." /api/agricultura/plantios/
→ Count: 2 (Safra Tomate, Safra Soja — Fazenda Demo)

# Com X-Tenant-ID de outro tenant → 0 resultados ✅
curl -H "Authorization: ..." -H "X-Tenant-ID: 74d233a4-..." /api/agricultura/plantios/
→ Count: 0 (tenant Fazenda Santana — sem dados próprios)

# Com X-Tenant-ID de outro tenant → 0 resultados ✅
curl -H "Authorization: ..." -H "X-Tenant-ID: 688f446a-..." /api/agricultura/plantios/
→ Count: 0 (tenant Rancho-Fundo — sem dados próprios)
```
