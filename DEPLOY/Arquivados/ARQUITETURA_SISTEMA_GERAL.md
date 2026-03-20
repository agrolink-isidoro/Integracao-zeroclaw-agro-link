# 🏗️ Arquitetura Geral: ZeroClaw ↔ Agrolink ↔ Isidoro

**Data:** 2 de março de 2026  
**Versão:** 1.0  
**Status:** Definição de Segurança & Arquitetura  

---

## 📊 Visão Macro

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CAMADA DE APRESENTAÇÃO                         │
│                    (Web UI: React/Dashboard Browser)                    │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    NÍVEL 1: ISOLAMENTO POR REDE                         │
│                                                                          │
│  ┌──────────────┐          ┌──────────────┐       ┌──────────────┐    │
│  │ Agrolink App │          │  ZeroClaw    │       │   Isidoro    │    │
│  │ (Django)     │◄────────►│  (Node.js)   │◄─────►│   Config     │    │
│  │ localhost:   │  TCP     │  localhost:  │ HTTP  │  (File-based)│    │
│  │ 8000/API     │ 5432     │  9999/RPC    │ JSON  │              │    │
│  │              │ Socket   │              │       │              │    │
│  └──────────────┘          └──────────────┘       └──────────────┘    │
│      │                          │                        │             │
│      └──────────┬───────────────┴────────────┬──────────┘             │
│                 ↓                            ↓                         │
│        PostgreSQL                    SQLite (brain.db)               │
│        (Multi-tenant)                (Memory only)                   │
│                                                                       │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────────────────┐
│           NÍVEL 2: ISOLAMENTO POR PROCESSAMENTO & PERMISSÕES            │
│                                                                          │
│  AGROLINK (Django)                                                      │
│  ├─ /api/agriculture/    [READ-WRITE] (via Isidoro approval)          │
│  ├─ /api/estoque/        [READ-WRITE]                                 │
│  ├─ /api/fazendas/       [READ-WRITE]                                 │
│  ├─ /api/maquinas/       [READ-WRITE]                                 │
│  ├─ /api/financeiro/     [READ-ONLY]  (consulta apenas)               │
│  ├─ /api/fiscal/         [READ-ONLY]  (não acessa, só lê)            │
│  ├─ /api/admin/          [BLOCKED]    (forbidden to ZeroClaw)        │
│  └─ /api/users/          [ADMIN-ONLY] (forbidden to ZeroClaw)        │
│                                                                       │
│  ZEROCLAW/ISIDORO (Node.js)                                          │
│  ├─ Intent Detection → Action Draft                                   │
│  ├─ Field Extraction → Validation                                     │
│  ├─ User Prompt → Correction                                          │
│  ├─ Read-only queries (for context)                                   │
│  └─ NO direct DB access (always via API)                             │
│                                                                       │
│  ISIDORO CONFIG (File-based)                                         │
│  ├─ AGENTS.md → Agent definitions (READ-ONLY to Isidoro)            │
│  ├─ SOUL.md → Values & constraints (READ-ONLY)                       │
│  ├─ memory/brain.db → Personal context (NO access from outside)     │
│  └─ state/json → Runtime state (LOCAL only)                          │
│                                                                       │
└────────┬────────────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────────────────┐
│         NÍVEL 3: VALIDAÇÃO & AUTORIZAÇÃO (JWT + Multi-Tenant)          │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Request: ZeroClaw → Agrolink API                               │  │
│  │                                                                 │  │
│  │ 1️⃣ JWT Token validation (signed by Django)                    │  │
│  │ 2️⃣ Tenant ID verification (header: X-Tenant-ID)               │  │
│  │ 3️⃣ Permission matrix (per endpoint, per tenant)               │  │
│  │ 4️⃣ Row-level security (WHERE tenant_id = ?)                  │  │
│  │ 5️⃣ Rate limiting (100 req/min per tenant)                     │  │
│  │                                                                 │  │
│  │ Deny: If any check fails → 403 Forbidden                      │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Estrutura de Diretórios

```
/home/agrolink/.zeroclaw/workspace/

├── 📦 PROJECT-AGRO (Agrolink Main App)
│   ├── manage.py
│   ├── requirements.txt
│   ├── docker-compose.yml
│   ├── apps/
│   │   ├── agricultura/
│   │   ├── estoque/
│   │   ├── fazendas/
│   │   ├── maquinas/
│   │   ├── financeiro/  [READ-ONLY API]
│   │   ├── fiscal/      [READ-ONLY API]
│   │   └── channels/    [WhatsApp/Telegram/WebSocket]
│   ├── core/
│   │   ├── models.py    (Tenant + BaseModel)
│   │   ├── permissions.py
│   │   └── middleware.py (Tenant + JWT check)
│   └── .env.example
│
├── 📦 ZEROCLAW (AI Agent Framework - remoto/container)
│   ├── config.toml
│   ├── agents/
│   │   └── isidoro/
│   │       ├── config.yaml
│   │       ├── system_prompt.txt
│   │       └── capabilities.json
│   └── integrations/
│       └── agrolink_client.py
│           └── REST client com JWT
│
├── 📦 ISIDORO-CONFIGURATION (Configuração local)
│   ├── AGENTS.md
│   ├── SOUL.md
│   ├── IDENTITY.md
│   ├── TOOLS.md
│   ├── memoria/
│   │   ├── brain.db (ISOLADO - não acessível)
│   │   └── obras/ (referências)
│   └── state/
│       └── *.json (estado local apenas)
│
├── 📦 INTEGRACAO-ZEROCLAW-AGRO-LINK (Planejamento)
│   ├── PLANO_INTEGRACAO_V2.md
│   ├── CHECKLIST_IMPLEMENTACAO_MVP.md
│   └── ... (documentação)
│
└── 📁 WORKSPACE (local)
    ├── MEMORIA.md
    ├── SOUL.md
    ├── TOOLS.md
    └── memory/ (local - NÃO sincronizado com ZeroClaw)
```

---

## 🔐 Dois Níveis de Segurança

### **NÍVEL 1: Isolamento Arquitetural**

**Objetivo:** Fazer burlar permissões ser fisicamente difícil

```
┌─────────────────────────────────────────────────────────────┐
│ ZEROCLAW/ISIDORO Process                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✅ CAN:                        ❌ CANNOT:                   │
│ ├─ Call /api/agriculture/*    ├─ Execute SQL directly     │
│ ├─ Call /api/estoque/*        ├─ Access PostgreSQL port   │
│ ├─ Call /api/fazendas/*       │   (5432 firewall blocked) │
│ ├─ Call /api/maquinas/*       ├─ Read /admin/users data   │
│ ├─ Call /api/financeiro (RO)  ├─ Write /fiscal/nf        │
│ ├─ Call /api/fiscal (RO)      ├─ Access memory/brain.db   │
│ ├─ Read AGENTS.md             │   (file permission 400)   │
│ ├─ Read SOUL.md               ├─ Call /api/admin/*       │
│ └─ Access web chat API        ├─ Modify SOUL.md          │
│                               ├─ Delete any data         │
│                               └─ Escalate privileges     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 1.1 Network Isolation

```ini
# Docker Compose (project-agro)
[services.django]
ports:
  - "8000:8000"      # HTTP API (public)
  - "5432:5432"      # PostgreSQL (local only!)

[services.zeroclaw]
ports:
  - "9999:9999"      # RPC (local only via socket)

networks:
  backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

#### 1.2 File System Permissions

```bash
# Configuração de arquivos
-rw-r--r--  AGENTS.md    (readable)
-rw-r--r--  SOUL.md      (readable: defines constraints)
-r--------  brain.db     (400: Zeroclaw NÃO pode ler)
-rw-rw-r--  state/json   (only local access)

# Isidoro process user != postgres user != django user
ps aux
  zeroclaw  pts/0  ... node /zeroclaw/agents/isidoro
  django    pts/1  ... python manage.py runserver
  postgres  pts/2  ... postgre
```

#### 1.3 API Gateway (primeiro filtro)

```python
# project-agro/core/middleware.py
class TenantAndPermissionMiddleware:
    def __call__(self, request):
        # 1. Extrai tenant do header
        tenant_id = request.headers.get('X-Tenant-ID')
        if not tenant_id:
            return 403  # Forbidden
        
        # 2. Valida JWT
        token = request.headers.get('Authorization')
        try:
            payload = jwt.decode(token, SECRET_KEY)
        except:
            return 401  # Unauthorized
        
        # 3. Mapeia tenant → permissões
        allowed_endpoints = TENANT_PERMISSIONS[tenant_id]
        if request.path not in allowed_endpoints:
            return 403  # Forbidden
        
        # 4. Injeta tenant no request
        request.tenant_id = tenant_id
        return next(request)
```

---

### **NÍVEL 2: Validação em Profundidade**

**Objetivo:** Mesmo se conseguir burlar Level 1, Level 2 bloqueia

#### 2.1 Permission Matrix (Banco de Dados)

```sql
CREATE TABLE IF NOT EXISTS core_apipermission (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    allowed_endpoints TEXT[] NOT NULL,    -- ['/api/agriculture/*']
    read_only_modules TEXT[] NOT NULL,    -- ['financeiro', 'fiscal']
    forbidden_modules TEXT[] NOT NULL,    -- ['admin', 'users']
    rate_limit INT DEFAULT 100,           -- requests/minute
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- Exemplo: Isidoro config para agro-demo tenant
INSERT INTO core_apipermission VALUES (
    'isidoro-api-key-xxx',
    'agro-demo',
    ARRAY[
        '/api/agriculture/*',
        '/api/estoque/*',
        '/api/fazendas/*',
        '/api/maquinas/*',
        '/api/channels/messages/*',
        '/api/actions/*'
    ],
    ARRAY['financeiro', 'fiscal'],       -- read-only
    ARRAY['admin', 'users', 'settings'], -- forbidden
    100
);
```

#### 2.2 Row-Level Security (RLS)

```sql
-- PostgreSQL RLS Policy
CREATE POLICY tenant_isolation ON operacoes_agricolas
USING (tenant_id = current_setting('app.current_tenant_id'));

ALTER TABLE operacoes_agricolas ENABLE ROW LEVEL SECURITY;

-- Django Middleware
class TenantIsolationMiddleware:
    def process_request(self, request):
        # Set PostgreSQL context
        with connection.cursor() as cursor:
            cursor.execute(
                f"SET app.current_tenant_id = '{request.tenant_id}'"
            )
```

#### 2.3 Validation at Request Entry

```python
# project-agro/core/permissions.py
class ZeroclawPermissionValidator:
    """Validates every ZeroClaw API request"""
    
    def validate_request(self, request):
        checks = [
            self.check_jwt_valid(request),
            self.check_tenant_exists(request),
            self.check_endpoint_allowed(request),
            self.check_rate_limit(request),
            self.check_payload_safe(request),
            self.check_no_injection(request),
        ]
        
        if not all(checks):
            raise PermissionDenied("Request blocked by security policy")
        
        return True
    
    def check_endpoint_allowed(self, request):
        permission = ApiPermission.objects.get(
            api_key=request.headers['X-API-Key']
        )
        path = request.path
        return any(
            fnmatch(path, allowed)
            for allowed in permission.allowed_endpoints
        )
    
    def check_payload_safe(self, request):
        # Validate JSON structure matches allowed fields
        if request.method in ['POST', 'PATCH']:
            allowed_fields = self.get_allowed_fields(request.path)
            payload_fields = set(request.data.keys())
            
            if not payload_fields.issubset(allowed_fields):
                return False  # Attempt to access forbidden fields
        
        return True
    
    def check_no_injection(self, request):
        # XSS, SQL injection, etc.
        dangerous_patterns = [
            r'<script', r'DROP TABLE', r'--', r'/*'
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, str(request.data)):
                return False
        
        return True
```

---

## 🎯 Fluxo de Segurança Detalhado

### Cenário: Isidoro tenta acessar dados financeiros (READ-ONLY)

```
1️⃣ NÍVEL 1 - REDE
   Isidoro → TCP localhost:8000/api/financeiro/
   ✅ Conexão aceita (port aberto)

2️⃣ NÍVEL 2 - JWT + TENANT
   Header: Authorization: Bearer <JWT>
   Header: X-Tenant-ID: agro-demo
   
   ✅ JWT válido
   ✅ Tenant existe
   
3️⃣ NÍVEL 3 - ENDPOINT PERMISSION
   Checando: /api/financeiro/ em allowed_endpoints
   
   ✅ Endpoint in read_only_modules
   ✅ Permitido apenas GET (read-only)

4️⃣ NÍVEL 4 - RLS (Row-Level Security)
   PostgreSQL SET app.current_tenant_id = 'agro-demo'
   SELECT * FROM financial_transactions
   WHERE tenant_id = 'agro-demo'  ← RLS policy
   
   ✅ Retorna apenas dados do tenant agro-demo

❌ RESULTADO: Acesso concedido (GET), mas APENAS dados do tenant
```

### Cenário: Isidoro tenta acessar /api/users/ (ADMIN-ONLY)

```
1️⃣ NÍVEL 1 - REDE
   Isidoro → TCP localhost:8000/api/users/
   ✅ Conexão aceita

2️⃣ NÍVEL 2 - JWT + TENANT
   ✅ JWT válido
   ✅ Tenant existe

3️⃣ NÍVEL 3 - ENDPOINT PERMISSION
   Checando: /api/users/ em allowed_endpoints
   Checando: users em forbidden_modules
   
   ❌ BLOCKED: users está em forbidden_modules
   Response: 403 Forbidden

❌ RESULTADO: Acesso negado (antes do DB)
```

### Cenário: Isidoro tenta SQL injection

```
Request Payload:
{
  "cultura": "soja'; DROP TABLE operacoes_agricolas; --"
}

1️⃣ NÍVEL 3 - Injection Detection
   check_no_injection() detecta padrão "DROP TABLE"
   
   ❌ BLOCKED: Payload rejected
   Response: 400 Bad Request

❌ RESULTADO: Payload sanitizado (sem acesso ao DB)
```

---

## 📋 Checklist de Segurança por Componente

### **Agrolink (Django)**
- [ ] JWT authentication middleware
- [ ] Tenant ID validation on every request
- [ ] Row-level security policies (PostgreSQL)
- [ ] Permission matrix database table
- [ ] Rate limiting per tenant
- [ ] SQL injection protection (ORM only)
- [ ] XSS prevention (JSON serialization)
- [ ] CORS headers (whitelist ZeroClaw origin)
- [ ] API logging (audit trail)
- [ ] Secrets in .env (not in git)

### **ZeroClaw/Isidoro**
- [ ] No direct database access (API only)
- [ ] JWT token passed in every request
- [ ] Tenant ID in request headers
- [ ] Read-only mode for financeiro/fiscal
- [ ] No access to memory/brain.db
- [ ] SOUL.md as read-only constraint file
- [ ] Fallback to user approval on denied requests
- [ ] Request retries with exponential backoff
- [ ] Timeout on blocked requests (5s)

### **Isidoro Configuration**
- [ ] SOUL.md (immutable constraints)
- [ ] AGENTS.md (defines capabilities)
- [ ] memory/brain.db (chmod 400, user access only)
- [ ] state/*.json (local only, not synced)
- [ ] .gitignore (exclude credentials)

---

## 🔄 Fluxo de Requisição com Segurança

```
User (Web UI)
    ↓
[JWT Token + Tenant ID]
    ↓
Django API Gateway
    ├─ Middleware 1: Extract JWT/Tenant
    ├─ Middleware 2: Validate JWT signature
    ├─ Middleware 3: Check tenant exists
    └─ Middleware 4: Rate limiters
    ↓
Permission Check
    ├─ Check endpoint in allowed list
    ├─ Check not in forbidden list
    ├─ Check method (GET vs POST)
    └─ Check payload for injections
    ↓
View/Serializer
    ├─ Filter queryset by tenant (RLS)
    ├─ Validate input fields
    └─ Log audit trail
    ↓
PostgreSQL (with RLS policies)
    └─ Return only tenant's data
    ↓
Response (JSON)
    ├─ Serialize safely (no PII)
    └─ Return to user
```

---

## 🛡️ Resumo de Defesa em Camadas

| Nível | Mecanismo | Bloqueador | Bypass Dificuldade |
|-------|-----------|-----------|-------------------|
| 0 | Network/Firewall | Port 5432 closed | Extremamente difícil |
| 1 | JWT Validation | Invalid token | Criptograficamente impossível |
| 2 | Tenant Isolation | Wrong tenant | Requer roubo de token |
| 3 | Endpoint Whitelist | Path not allowed | Requer modificação código Django |
| 4 | Field Validation | Forbidden field | Requer conhecimento schema |
| 5 | SQL Injection Check | Pattern detected | Requer contorno do ORM |
| 6 | Row-Level Security | Tenant mismatch | Requer accesso DB direto |
| 7 | Audit Logging | Request logged | Deixa rastro, é descoberto |

**Conclusão:** Para Isidoro acessar dados não permitidos, precisaria:
1. ✅ Roubar JWT (difícil)
2. ✅ Modificar código Django (acesso servidor)
3. ✅ Contornar SQLite (acesso filesystem)
4. ✅ Deixar rastro (audit log)

---

## 🚀 Deployment (Docker)

```yaml
version: '3.9'

services:
  # Agrolink App (port 8000)
  django:
    image: agrolink:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/agrolink
      - LOG_LEVEL=INFO
      - ALLOWED_ORIGINS=http://localhost:3000
    depends_on:
      - postgres
    networks:
      - backend

  # PostgreSQL (INTERNAL ONLY - no port exposed)
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: agrolink
      POSTGRES_USER: agrouser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend

  # ZeroClaw/Isidoro (separate container)
  zeroclaw:
    image: zeroclaw:latest
    ports:
      - "9999:9999"
    environment:
      - AGROLINK_API_URL=http://django:8000
      - API_KEY=${ZEROCLAW_API_KEY}
      - TENANT_ID=agro-demo
    volumes:
      - ./isidoro-config:/zeroclaw/config:ro
    networks:
      - backend

volumes:
  pgdata:

networks:
  backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

---

## 📝 Notas Finais

**Dois Níveis de Segurança Implementados:**

✅ **Nível 1 (Arquitetural):**
- Isolamento físico por rede
- Permissões de sistema de arquivos
- JWT obrigatório
- Endpoints whitelist

✅ **Nível 2 (Aplicação):**
- Row-level security no PostgreSQL
- Validação de payload
- Injection detection
- Rate limiting
- Audit logging

**Defesa em Profundidade:** Múltiplas camadas garantem que mesmo com falha em uma, a próxima bloqueia.

---

**Próximos Passos:**
1. Implementar Permission Matrix em PostgreSQL
2. Adicionar RLS policies
3. Criar Zeroclaw integration com JWT
4. Testes de segurança (penetration testing)
5. Audit logging setup
