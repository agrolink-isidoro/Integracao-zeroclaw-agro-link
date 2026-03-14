# 🏢 Multi-Tenant Architecture - Integração ZeroClaw ↔ Agrolink

**Data:** 2 de março de 2026  
**Versão:** 1.0  
**Escopo:** MVP Multi-Tenant (Semanas 1-4)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Como ZeroClaw Sabe Qual Tenant Usar](#como-zeroclaw-sabe-qual-tenant-usar)
3. [Isolamento de Dados](#isolamento-de-dados)
4. [Permissões por Tenant](#permissões-por-tenant)
5. [Fluxos Multi-Tenant](#fluxos-multi-tenant)
6. [Segurança & Validações](#segurança--validações)
7. [Configuração Técnica](#configuração-técnica)
8. [Exemplos Práticos](#exemplos-práticos)

---

## Visão Geral

### O Problema

A Agrolink é **multi-tenant**:
- Múltiplas propriedades rurais (cada uma é um "tenant")
- Cada tenant tem seus próprios dados (fazendas, operações, máquinas, estoque)
- Cada tenant tem seus próprios usuários com permissões
- ZeroClaw (Isidoro) precisa saber qual tenant está consultando

### A Solução

```
┌─────────────────────────────────────────────────┐
│ Telegram (Usuário da Propriedade "Vila Nova")   │
│                                                   │
│ "Plantei 50ha de soja"                          │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓ (com tenant_id = "vila-nova")
┌─────────────────────────────────────────────────┐
│ ZeroClaw/Isidoro                                │
│                                                   │
│ ✅ Sabe: tenant_id = "vila-nova"                │
│ ✅ Sabe: user_id = "user-456"                   │
│ ✓ Extrai: operacao_draft                       │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓ (headers: X-Tenant-ID: vila-nova)
┌─────────────────────────────────────────────────┐
│ Backend Django                                   │
│                                                   │
│ 1. Valida X-Tenant-ID contra JWT                │
│ 2. Carrega APENAS dados de "vila-nova"         │
│ 3. Cria Action isolado a "vila-nova"           │
│ 4. Retorna action_id                            │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ Dashboard React (Vila Nova)                     │
│                                                   │
│ ✅ Vê APENAS ações de "vila-nova"               │
│ ✅ Usuário aprova ação                          │
└─────────────────────────────────────────────────┘
```

---

## Como ZeroClaw Sabe Qual Tenant Usar

### Opção 1: Via JWT Token (Recomendado) ⭐

**Fonte:** O próprio token JWT contém `tenant_id`

```json
{
  "sub": "user-456",
  "tenant_id": "vila-nova",
  "email": "operator@vilanova.com",
  "roles": ["agro_operator"],
  "exp": 1234567890
}
```

**Como ZeroClaw usa:**

```python
# ~/.zeroclaw/agents/agrolink_assistant.py

import jwt
from fastapi import Request

async def get_tenant_from_token(request: Request) -> str:
    """Extrai tenant_id do JWT token"""
    auth_header = request.headers.get("Authorization")
    token = auth_header.split(" ")[1]  # "Bearer <token>"
    
    payload = jwt.decode(
        token, 
        options={"verify_signature": False}  # ⚠️ Verificar no backend!
    )
    
    return payload["tenant_id"]  # "vila-nova"
```

**Vantagens:**
- ✅ Zero configuração no ZeroClaw (extrai do token)
- ✅ Funciona para qualquer tenant
- ✅ Seguro (token validado no backend)

**Setup:**

```toml
# ~/.zeroclaw/config.toml

[integrations.agrolink]
base_url = "http://localhost:8000/api"
auth_method = "jwt"
jwt_secret = "${AGROLINK_JWT_SECRET}"
tenant_extraction = "jwt_payload"  # ← Extrai de JWT
```

---

### Opção 2: Via X-Tenant-ID Header (Fallback)

**Fonte:** Header HTTP `X-Tenant-ID`

```bash
curl -X POST http://localhost:8000/api/actions/ \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "X-Tenant-ID: vila-nova" \  ← Explicit tenant
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Como ZeroClaw usa:**

```python
# ZeroClaw coloca header em TODAS as requisições

def create_action(module, action_type, data, tenant_id):
    headers = {
        "Authorization": f"Bearer {self.jwt_token}",
        "X-Tenant-ID": tenant_id,  # ← Explicit
        "Content-Type": "application/json"
    }
    
    response = requests.post(
        f"{self.base_url}/api/actions/",
        json={...},
        headers=headers
    )
```

**Setup:**

```toml
# ~/.zeroclaw/config.toml

[integrations.agrolink]
base_url = "http://localhost:8000/api"
auth_method = "jwt"
tenant_extraction = "header"  # ← Ou de header
tenant_header = "X-Tenant-ID"
```

**Vantagens:**
- ✅ Explícito (fica visível)
- ✅ Funciona se JWT não tem tenant_id

---

### Opção 3: Via Config TOML (Estática)

**Fonte:** Hard-coded no config.toml (para single-tenant ZeroClaw)

```toml
# ~/.zeroclaw/config.toml
# Para ZeroClaw dedicada a "vila-nova"

[integrations.agrolink]
base_url = "http://localhost:8000/api"
auth_method = "jwt"
tenant_id = "vila-nova"  # ← Static
```

**Vantagens:**
- ✅ Simples (ZeroClaw serve 1 tenant)

**Desvantagens:**
- ❌ Não escala (1 ZeroClaw por tenant)

---

## Isolamento de Dados

### No Backend Django

**Middleware de Tenant Validation:**

```python
# apps/core/middleware.py

class TenantIsolationMiddleware:
    """Garante que cada request acessa APENAS dados do seu tenant"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # 1. Extrai tenant_id do request
        tenant_id = self._get_tenant_id(request)
        
        if not tenant_id:
            return JsonResponse(
                {"error": "X-Tenant-ID ou tenant_id em JWT obrigatório"},
                status=400
            )
        
        # 2. Valida que usuário pertence a este tenant
        if request.user.tenant_id != tenant_id:
            return JsonResponse(
                {"error": "Você não tem acesso a este tenant"},
                status=403
            )
        
        # 3. Armazena na request para QuerySet filtering
        request.tenant = Tenant.objects.get(id=tenant_id)
        request.tenant_id = tenant_id
        
        response = self.get_response(request)
        return response
    
    def _get_tenant_id(self, request):
        """Extrai tenant_id (ordem de prioridade)"""
        # 1. Header X-Tenant-ID
        if request.META.get("HTTP_X_TENANT_ID"):
            return request.META.get("HTTP_X_TENANT_ID")
        
        # 2. JWT token
        if hasattr(request, "user") and request.user.tenant_id:
            return request.user.tenant_id
        
        return None
```

**Instalação em settings.py:**

```python
# myproject/settings.py

MIDDLEWARE = [
    # ... outros middlewares ...
    "apps.core.middleware.TenantIsolationMiddleware",
]
```

---

### QuerySet Filtering (Automático)

**Manager com tenant auto-filter:**

```python
# apps/core/models.py

class TenantManager(models.Manager):
    """Manager que filtra automaticamente por tenant"""
    
    def get_queryset(self):
        qs = super().get_queryset()
        
        # ⚠️ Filtra por tenant se request.tenant existe
        # Implementado via ThreadLocal ou django-contextvars
        current_tenant = get_current_tenant()
        
        if current_tenant:
            qs = qs.filter(tenant=current_tenant)
        
        return qs
```

**Uso:**

```python
# Sempre retorna APENAS dados do tenant atual

operacoes = OperacaoAgricola.objects.all()
# ✅ Automatically: OperacaoAgricola.objects.filter(tenant=request.tenant)

fazendas = Fazenda.objects.all()
# ✅ Automatically: Fazenda.objects.filter(tenant=request.tenant)
```

---

### Validação em Cada Model

```python
# apps/agricultura/models.py

class OperacaoAgricola(models.Model):
    id = models.UUIDField(primary_key=True)
    tenant = models.ForeignKey(
        "core.Tenant",
        on_delete=models.CASCADE,
        db_index=True  # ← IMPORTANTE: índice para performance
    )
    user = models.ForeignKey(User)
    
    # ... outros campos ...
    
    class Meta:
        # ← Cria índice composto para queries por (tenant, status)
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "created_at"]),
        ]
    
    def save(self, *args, **kwargs):
        """Validação: always has tenant"""
        if not self.tenant:
            # Extrai do contexto
            self.tenant = get_current_tenant()
        
        if not self.tenant:
            raise ValueError("Operação DEVE ter um tenant!")
        
        super().save(*args, **kwargs)
```

---

## Permissões por Tenant

### Modelo RBAC (Role-Based Access Control)

```python
# apps/core/models.py

class Tenant(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=255)  # "Vila Nova"
    slug = models.SlugField(unique=True)     # "vila-nova"
    # ...

class TenantRole(models.Model):
    """Roles dentro de cada tenant"""
    
    ROLE_CHOICES = [
        ("owner", "Proprietário"),
        ("agro_operator", "Operador Agrícola"),
        ("machine_operator", "Operador de Máquinas"),
        ("stock_operator", "Operador de Estoque"),
        ("finance_viewer", "Consultor Financeiro (Leitura)"),
        ("admin", "Administrador"),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    
    class Meta:
        unique_together = ("tenant", "user", "role")

class TenantPermission(models.Model):
    """O que cada role pode fazer em cada módulo"""
    
    ACTION_CHOICES = [
        ("read", "Ler"),
        ("create_draft", "Criar Draft"),
        ("approve", "Aprovar Ação"),
        ("edit", "Editar"),
        ("delete", "Deletar"),
    ]
    
    MODULE_CHOICES = [
        ("agricultura", "Agricultura"),
        ("maquinas", "Máquinas"),
        ("estoque", "Estoque"),
        ("fazendas", "Fazendas"),
        ("financeiro", "Financeiro"),
        ("comercial", "Comercial"),
        ("fiscal", "Fiscal"),
        ("admin", "Admin"),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    module = models.CharField(max_length=50, choices=MODULE_CHOICES)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    
    class Meta:
        unique_together = ("tenant", "role", "module", "action")
```

### Matriz de Permissões (MVP)

```
┌──────────────────┬──────────┬──────────┬─────────┬──────────┐
│ Módulo           │ Owner    │ Operator │ Finance │ Admin    │
├──────────────────┼──────────┼──────────┼─────────┼──────────┤
│ Agricultura      │ R/W/A    │ R/W/A    │ R       │ R        │
│ Máquinas         │ R/W/A    │ R/W/A    │ R       │ R        │
│ Estoque          │ R/W/A    │ R/W/A    │ R       │ R        │
│ Fazendas         │ R/W      │ R        │ R       │ R        │
├──────────────────┼──────────┼──────────┼─────────┼──────────┤
│ Financeiro       │ R        │ -        │ R       │ R        │
│ Comercial        │ R        │ -        │ R       │ R        │
│ Fiscal           │ R        │ -        │ R       │ R        │
│ Admin            │ R/W      │ -        │ -       │ R/W/A    │
└──────────────────┴──────────┴──────────┴─────────┴──────────┘

Legenda:
R   = Read (Ler)
W   = Write/Draft (Criar draft)
A   = Approve (Aprovar ações)
-   = Sem acesso
```

---

## Fluxos Multi-Tenant

### Fluxo 1: Dois Usuários, Dois Tenants

```
┌─────────────────────┐         ┌──────────────────┐
│ Telegram User 1     │         │ Telegram User 2  │
│ Tenant: Vila Nova   │         │ Tenant: Fazenda  │
│ Role: agro_operator │         │ Role: owner      │
│                     │         │                  │
│ "Plantei 50ha soja" │         │ "Colhi trigo"    │
└─────────┬───────────┘         └────────┬─────────┘
          │                              │
          │JWT: tenant=vila-nova         │JWT: tenant=fazenda
          ↓                              ↓
     ┌────────────────────────────────────────┐
     │ Backend Agrolink                       │
     │                                        │
     │ POST /api/actions/                     │
     │ {                                      │
     │   "tenant_id": "vila-nova",            │
     │   "type": "operacao_agricola",        │
     │   "payload": {...}                     │
     │ }                                      │
     │          &                             │
     │ POST /api/actions/                     │
     │ {                                      │
     │   "tenant_id": "fazenda",              │
     │   "type": "operacao_agricola",        │
     │   "payload": {...}                     │
     │ }                                      │
     └────────────────────────────────────────┘
          │                              │
          ↓ isolado em "vila-nova"       ↓ isolado em "fazenda"
     
     Action #1                      Action #2
     tenant=vila-nova               tenant=fazenda
     Visible only to Vila Nova      Visible only to Fazenda
```

### Fluxo 2: ZeroClaw Detecta Tenant Automaticamente

```
Cenário: Chat integrado no Dashboard React (Vila Nova)

1. Usuário logado em: https://agrolink.com/v/vila-nova/chat

2. Frontend envia:
   POST /api/zeroclaw/message
   Body: { "message": "Plantei 50ha soja" }
   Headers: {
     "Authorization": "Bearer JWT(tenant=vila-nova)",
     "X-Tenant-ID": "vila-nova"
   }

3. Backend extrai tenant_id de JWT ou header
   request.tenant_id = "vila-nova"

4. Backend chama ZeroClaw com contexto:
   POST zeroclaw-service:8001/chat
   Body: {
     "message": "Plantei 50ha soja",
     "tenant_id": "vila-nova",
     "user_id": "user-456",
     "context": {
       "fazendas": [...],  # ← Apenas fazendas de vila-nova
       "maquinas": [...],  # ← Apenas máquinas de vila-nova
     }
   }

5. ZeroClaw cria Action:
   POST localhost:8000/api/actions/
   Headers: {
     "Authorization": "Bearer zeroclaw-jwt(tenant=vila-nova)",
     "X-Tenant-ID": "vila-nova"
   }

6. Backend aprova (isolado):
   - Cria Action.tenant = vila-nova
   - Não vê ações de outros tenants
   - Resposta só mostra ações de vila-nova
```

---

## Segurança & Validações

### Checklist de Segurança

- [ ] **JWT Validation**
  ```python
  # settings.py
  REST_FRAMEWORK = {
      "DEFAULT_AUTHENTICATION_CLASSES": [
          "rest_framework_simplejwt.authentication.JWTAuthentication",
      ]
  }
  ```
  
- [ ] **Tenant Match Validation**
  ```python
  # apps/core/permissions.py
  class IsTenantMember(permissions.BasePermission):
      def has_permission(self, request, view):
          tenant_id = request.META.get("HTTP_X_TENANT_ID")
          user_tenant = request.user.tenant_id
          
          if tenant_id != user_tenant:
              return False  # Reject!
          
          return True
  ```

- [ ] **QuerySet Filtering**
  ```python
  # apps/core/views.py
  class ActionsViewSet(viewsets.ModelViewSet):
      permission_classes = [IsAuthenticated, IsTenantMember]
      
      def get_queryset(self):
          return Action.objects.filter(
              tenant__id=self.request.tenant_id
          )
  ```

- [ ] **Database Indexes**
  ```python
  # models.py
  class Meta:
      indexes = [
          models.Index(fields=["tenant", "status"]),
          models.Index(fields=["tenant", "created_at"]),
      ]
  ```

- [ ] **Audit Logging**
  ```python
  # Log quem aprovou/rejeitou cada ação
  class Action(models.Model):
      # ...
      approver = ForeignKey(User, null=True)
      approved_at = DateTimeField(null=True)
      tenant = ForeignKey(Tenant)
  ```

---

## Configuração Técnica

### Backend Settings

```python
# myproject/settings.py

# JWT com tenant_id
SIMPLE_JWT = {
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': env('JWT_SECRET'),
    'PAYLOAD_CLAIMS': {
        'tenant_id': 'tenant_id',
        'sub': 'user_id',
    }
}

# Middleware de tenant
MIDDLEWARE = [
    # ...
    'apps.core.middleware.TenantIsolationMiddleware',
]

# DRF Permissions
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
        'apps.core.permissions.IsTenantMember',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
}
```

### ZeroClaw Config

```toml
# ~/.zeroclaw/config.toml

[integrations.agrolink]
enabled = true
api_base_url = "http://localhost:8000/api"
auth_method = "jwt"
jwt_secret = "${AGROLINK_JWT_SECRET}"
tenant_extraction = "jwt_payload"  # ← Extrai de JWT

# Ou se preferir header explícito:
# tenant_extraction = "header"
# tenant_header = "X-Tenant-ID"

read_only = true
action_queue_enabled = true

# Módulos por tenant (todos têm acesso)
action_modules = ["agricultura", "maquinas", "estoque"]

# Rate limiting por tenant
rate_limiting = true
rate_limit_per_tenant = 100  # requests/minute
```

### Frontend Context

```typescript
// src/context/TenantContext.tsx

interface TenantContext {
  tenant_id: string;      // "vila-nova"
  tenant_name: string;    // "Vila Nova"
  user_role: string;      // "agro_operator"
}

// Usado em TODAS as requisições
const headers = {
  "Authorization": `Bearer ${jwt_token}`,
  "X-Tenant-ID": tenantContext.tenant_id,
  "Content-Type": "application/json"
};
```

---

## Exemplos Práticos

### Exemplo 1: POST Action com Tenant Isolation

```bash
# Usuário de "vila-nova" cria ação

curl -X POST http://localhost:8000/api/actions/ \
  -H "Authorization: Bearer eyJ0eX...&tenant_id=vila-nova&..." \
  -H "X-Tenant-ID: vila-nova" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "operacao_agricola",
    "payload": {
      "cultura": "soja",
      "area_hectares": 50,
      "talhao_id": "talhao-uuid"
    }
  }'

# Backend:
# 1. Valida JWT → tenant_id = "vila-nova"
# 2. Valida X-Tenant-ID = "vila-nova"
# 3. Valida user.tenant_id = "vila-nova"
# 4. Cria Action(tenant="vila-nova", ...)
# 5. Retorna action_id

HTTP/1.1 201 Created
{
  "id": "action-uuid-123",
  "tenant_id": "vila-nova",
  "type": "operacao_agricola",
  "status": "pending_approval",
  "created_by": "user-456",
  "created_at": "2026-03-02T14:30:00Z"
}
```

### Exemplo 2: GET Actions Filtra por Tenant

```bash
# Dashboard de vila-nova pede suas ações

curl -X GET "http://localhost:8000/api/actions/?status=pending_approval" \
  -H "Authorization: Bearer JWT(tenant=vila-nova)" \
  -H "X-Tenant-ID: vila-nova"

# Backend:
# 1. Middleware extrai tenant = "vila-nova"
# 2. QuerySet filtra: Action.objects.filter(tenant="vila-nova")
# 3. Retorna APENAS ações de vila-nova

HTTP/1.1 200 OK
{
  "count": 3,
  "results": [
    {
      "id": "action-1",
      "tenant_id": "vila-nova",
      "type": "operacao_agricola",
      "status": "pending_approval"
    },
    {
      "id": "action-2",
      "tenant_id": "vila-nova",
      "type": "entrada_estoque",
      "status": "pending_approval"
    },
    {
      "id": "action-3",
      "tenant_id": "vila-nova",
      "type": "manutencao_maquina",
      "status": "pending_approval"
    }
  ]
}
```

### Exemplo 3: Tentativa de Acesso Cruzado (BLOQUEADA)

```bash
# User de "vila-nova" tenta acessar ação de "fazenda-grande"

curl -X GET "http://localhost:8000/api/actions/action-xyz/" \
  -H "Authorization: Bearer JWT(tenant=vila-nova)" \
  -H "X-Tenant-ID: vila-nova"

# Backend:
# 1. Token diz: tenant = "vila-nova"
# 2. Middleware valida: OK
# 3. Get Action(id=action-xyz) → tenant = "fazenda-grande"
# 4. Valida: vila-nova != fazenda-grande
# 5. REJEITA

HTTP/1.1 404 Not Found
{
  "detail": "Not found."
}
```

---

## Checklist de Implementação Multi-Tenant

### Fase 0: Design (1 semana)

- [ ] Definir estratégia de extração de tenant_id (JWT vs Header)
- [ ] Desenhar ER diagram com tenant_id em todos os modelos
- [ ] Identificar índices de banco de dados necessários
- [ ] Definir RBAC matrix (roles × módulos × actions)

### Fase 1: Backend (2 semanas)

- [ ] Adicionar tenant_id a TODOS os models
- [ ] Criar Tenant, TenantRole, TenantPermission models
- [ ] Implementar TenantIsolationMiddleware
- [ ] Criar TenantManager para auto-filtering
- [ ] Adicionar IsTenantMember permission class
- [ ] Migrations + validações de integridade
- [ ] Testes de isolamento (usuário não vê dados de outro tenant)

### Fase 2: ZeroClaw Integration (1 semana)

- [ ] Configurar ZeroClaw para incluir X-Tenant-ID header
- [ ] Testar: ZeroClaw cria action com tenant correto
- [ ] Validar: Ações isoladas por tenant

### Fase 3: Frontend (1 semana)

- [ ] Adicionar TenantContext
- [ ] Incluir X-Tenant-ID em todas as requisições
- [ ] Dashboard lista APENAS ações do tenant atual
- [ ] Testes de isolamento visual

### Fase 4: QA (1 semana)

- [ ] Teste de segurança: Acesso cruzado negado
- [ ] Performance: Índices otimizados
- [ ] Auditoria: Logs de quem aprovou/rejeitou/executou

---

## Resumo

| Aspecto | Solução | Status |
|---------|---------|--------|
| Como ZeroClaw sabe o tenant | JWT payload + X-Tenant-ID header | ✅ |
| Isolamento de dados | Middleware + QuerySet filtering | ✅ |
| Permissões | RBAC (roles × modules × actions) | ✅ |
| Segurança | Validação em cada request + índices | ✅ |
| Escalabilidade | Índices compostos (tenant, status, etc) | ✅ |
