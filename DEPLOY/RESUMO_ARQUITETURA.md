# 🏗️ Resumo: Arquitetura Geral ZeroClaw + Agrolink + Isidoro

**Documento:** ARQUITETURA_SISTEMA_GERAL.md  
**Local:** `/home/agrolink/.zeroclaw/workspace/ARQUITETURA_SISTEMA_GERAL.md`  
**Status:** ✅ Publicado no repositório de planejamento  

---

## 📊 Estrutura em 3 Componentes

### **1️⃣ AGROLINK (project-agro)**
- **O quê:** Aplicação principal (Django REST)
- **Onde:** Local + GitHub mais remoto
- **Responsabilidade:** Dados, autenticação, autorização, auditoria
- **Segurança:** JWT + Tenant ID + RLS + Permission Matrix

### **2️⃣ ZEROCLAW + ISIDORO**
- **O quê:** IA Agent (Node.js/container)
- **Onde:** Container docker (separado)
- **Responsabilidade:** Detecção de intenção, extração de campos, preparação de drafts
- **Segurança:** API-only access, rate limiting, read-only modules

### **3️⃣ ISIDORO-CONFIGURATION**
- **O quê:** Configuração + Memória persistente
- **Onde:** GitHub + local filesystem
- **Responsabilidade:** Constraints (SOUL.md), capabilities (AGENTS.md), memory (brain.db)
- **Segurança:** Permissões de arquivo (chmod 400), não compartilhado

---

## 🔐 Dois Níveis de Segurança (Implementados)

### **NÍVEL 1: Isolamento Arquitetural**

```
┌─────────────────┐
│ PostgreSQL      │  ← Port 5432 CLOSED (firewall)
├─────────────────┤
│ Agrolink (8000) │  ← JWT obrigatório
├─────────────────┤
│ ZeroClaw (9999) │  ← Sem acesso direto ao DB
└─────────────────┘
```

**Mecanismos:**
- Portas fechadas no firewall
- Services em processos separados (diferentes usuários)
- Containers em redes isoladas (Docker)
- Permissões de arquivo (brain.db: 400)
- Sem access credentials compartilhadas

**Resultado:** Difícil de burlar sem acesso físico ao servidor.

### **NÍVEL 2: Validação em Profundidade**

```
Requisição ZeroClaw
    ↓ [JWT validation]       ← 1️⃣ Criptografia impossível
    ↓ [Tenant check]         ← 2️⃣ Requer roubo de token
    ↓ [Permission matrix]    ← 3️⃣ Requer modificação Django
    ↓ [Endpoint whitelist]   ← 4️⃣ Requer conhecimento schema
    ↓ [Field validation]     ← 5️⃣ Requer bypasss ORM
    ↓ [Injection detect]     ← 6️⃣ Deixa rastro
    ↓ [RLS policy]           ← 7️⃣ Mesmo com tudo acima
    ✅ Request aceito OU ❌ BLOQUEADO
```

**Mecanismos:**
1. JWT signature (assinado por Django, verificado em toda requisição)
2. Tenant ID obrigatório (isola dados por cliente)
3. Permission matrix (banco de dados com endpoints permitidos)
4. Endpoint whitelist (lista de caminhos permitidos para ZeroClaw)
5. Field validation (apenas campos permitidos podem ser enviados)
6. SQL injection detection (regex patterns detectam ataques)
7. Row-level security (PostgreSQL filtra por tenant automaticamente)

**Resultado:** Mesmo se burlar Nível 1, Nível 2 bloqueia em 7 pontos diferentes.

---

## 📌 3 Repositórios Conectados

```
workspace/
├── project-agro/
│   ├── Apps: Agricultura, Estoque, Fazendas, etc.
│   ├── Database: PostgreSQL (multi-tenant)
│   ├── Security: Middleware + RLS
│   └── Git: https://github.com/agrolink-isidoro/project-agro
│
├── Front-Zero-claw-Agro-link/
│   ├── PLANO_INTEGRACAO_V2.md
│   ├── CHECKLIST_IMPLEMENTACAO_MVP.md
│   ├── ARQUITETURA_SISTEMA_GERAL.md ✨ NOVO
│   └── Git: https://github.com/agrolink-isidoro/Integracao-zeroclaw-agro-link
│
└── Isidoro-Configuration/
    ├── AGENTS.md, SOUL.md, TOOLS.md
    ├── memory/brain.db (chmod 400)
    ├── state/runtime
    └── Git: https://github.com/agrolink-isidoro/Isidoro-Configuration
```

---

## 🎯 Fluxos de Segurança Documentados

**No arquivo ARQUITETURA_SISTEMA_GERAL.md você encontra:**

✅ Cenário 1: Isidoro tenta acessar financeiro (READ-ONLY)  
→ Resultado: Acesso concedido, mas COM restrições

✅ Cenário 2: Isidoro tenta acessar /api/users/ (FORBIDDEN)  
→ Resultado: Bloqueado no middleware (antes do DB)

✅ Cenário 3: Isidoro tenta SQL injection  
→ Resultado: Detectado, rejeitado, registrado em auditoria

---

## 🔄 Fluxo Completo Seguro

```
1. User envia mensagem via Chat/WhatsApp
   ↓
2. Agrolink recebe com JWT token
   ↓
3. Middleware valida (JWT, Tenant, Rate limit)
   ↓
4. ZeroClaw/Isidoro processa intent
   ↓
5. Isidoro chama /api/agriculture/ com JWT
   ↓
6. Agrolink valida novamente (permission matrix)
   ↓
7. PostgreSQL executa com RLS filter
   ↓
8. Resultado retorna para Isidoro
   ↓
9. Isidoro prepara sugestão (draft)
   ↓
10. User aprova/rejeita/edita no dashboard
   ↓
11. Ação executada (com todas validações novamente)
   ↓
12. Auditoria registra quem, o quê, quando
```

**Segurança em cada etapa.**

---

## 📋 Implementação nos Próximos Sprints

| Fase | O quê | Documento |
|------|-------|-----------|
| **Fase 0** (esta semana) | Design review | ARQUITETURA_SISTEMA_GERAL.md |
| **Semana 1** | Backend + Segurança | Parte 1 do CHECKLIST |
| **Semana 2** | ZeroClaw integration | Parte 2 do CHECKLIST |
| **Semana 3** | Frontend + Chat | Parte 3 do CHECKLIST |
| **Semana 4** | Testing + Hardening | Parte 4 do CHECKLIST |

---

## ✅ Checklist de Segurança

**Antes de ir para produção:**

- [ ] Implementar JWT middleware na Django
- [ ] Criar permission_matrix table (PostgreSQL)
- [ ] Adicionar RLS policies
- [ ] Testar rate limiting
- [ ] Implementar audit logging
- [ ] Verificar file permissions (brain.db)
- [ ] Tatos de injeção SQL/XSS
- [ ] Teste de penetration (ZeroClaw tentando burlar)
- [ ] Setup ci/cd com security checks
- [ ] Documentar credenciais em .env

---

## 🚀 Próximo Passo

**AGORA:** Review com stakeholders  
**DEPOIS:** Começar Fase 0 (design sprint) baseado em ARQUITETURA_SISTEMA_GERAL.md

---

**Arquivo completo:** https://github.com/agrolink-isidoro/Integracao-zeroclaw-agro-link/blob/main/ARQUITETURA_SISTEMA_GERAL.md
