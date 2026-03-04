# 📁 Estrutura do Projeto - Referência Oficial para Agentes

**Data:** 23 de Janeiro de 2026  
**Versão:** 1.0  
**Propósito:** Garantir que agentes AI usem a estrutura correta do projeto

---

## 🎯 ESTRUTURA OFICIAL DO PROJETO

```
/home/felip/projeto-agro/
│
├── Double-AiA/               ← Sistema de agentes (VOCÊ ESTÁ AQUI)
│
├── sistema-agropecuario/     ← 🎯 PROJETO PRINCIPAL
│   ├── backend/              ← Django 4.2 + DRF + PostgreSQL
│   │   ├── apps/            ← Módulos: agricultura, fazendas, estoque, etc.
│   │   ├── manage.py
│   │   └── sistema_agropecuario/
│   │
│   ├── frontend/            ← React 18 + TypeScript + Vite
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── docker-compose.yml   ← Orquestração containers
│
├── docs/                     ← Documentação técnica do projeto
└── (outros diretórios...)    ← Não modificar
```

---

## 🚨 REGRAS ABSOLUTAS PARA AGENTES

### ❌ PROIBIDO:

1. **NUNCA criar pastas no root do projeto:**
   - ❌ `/home/felip/projeto-agro/backend/`
   - ❌ `/home/felip/projeto-agro/frontend/`
   - ❌ `/home/felip/projeto-agro/project-agro/`

2. **NUNCA duplicar estruturas:**
   - ❌ `sistema-agropecuario/sistema-agropecuario/`
   - ❌ `backend/backend/`
   - ❌ Qualquer nesting duplicado

3. **NUNCA modificar diretórios protegidos:**
   - ❌ `Double-AiA/` (exceto por manutenção autorizada)
   - ❌ `scripts/` (scripts auxiliares)

---

## ✅ COMANDOS CORRETOS PARA AGENTES

### Architect Planning:
Quando planejar features, SEMPRE use caminhos corretos:

```markdown
## Tarefa: Criar nova API no backend

**Caminho correto:**
- Criar arquivo em: `/home/felip/projeto-agro/sistema-agropecuario/backend/apps/<modulo>/views.py`

**Comandos:**
```bash
cd /home/felip/projeto-agro/sistema-agropecuario/backend
python manage.py startapp <nome_app>
```
```

### Implementer Execution:
Quando executar tarefas, SEMPRE iniciar do diretório correto:

```bash
# ✅ CORRETO - Base do projeto principal
cd /home/felip/projeto-agro/sistema-agropecuario

# Backend
cd backend/apps/<modulo>

# Frontend
cd frontend/src/<pasta>
```

### Tester Validation:
Quando testar, SEMPRE usar caminhos corretos:

```bash
# ✅ CORRETO - Testes Backend
cd /home/felip/projeto-agro/sistema-agropecuario/backend
pytest apps/<modulo>/tests/

# ✅ CORRETO - Testes Frontend
cd /home/felip/projeto-agro/sistema-agropecuario/frontend
npm test
```

---

## 🔍 VALIDAÇÃO PRÉ-EXECUÇÃO

**Checklist obrigatório para TODOS os agentes antes de criar/modificar arquivos:**

```bash
# 1. Verificar caminho base
pwd | grep "sistema-agropecuario" || echo "⚠️ ERRO: Caminho incorreto!"

# 2. Validar estrutura
ls -la /home/felip/projeto-agro/ | grep -E "^d" | grep -v "sistema-agropecuario\|docs\|Double-AiA\|scripts"

# 3. Confirmar ausência de duplicações
[[ ! -d "/home/felip/projeto-agro/backend" ]] || echo "🚨 DUPLICAÇÃO!"
[[ ! -d "/home/felip/projeto-agro/frontend" ]] || echo "🚨 DUPLICAÇÃO!"
[[ ! -d "/home/felip/projeto-agro/project-agro" ]] || echo "🚨 DUPLICAÇÃO!"
```

---

## 📝 TEMPLATES PARA TAREFAS

### Template para tasks/ (CORRETO):

```markdown
# Task: Implementar funcionalidade X

## Estrutura do projeto
Base: `/home/felip/projeto-agro/sistema-agropecuario/`

## Comandos sugeridos
```bash
# Navegação
cd /home/felip/projeto-agro/sistema-agropecuario

# Backend
cd backend/apps/<modulo>
touch views.py

# Frontend
cd frontend/src/pages
touch Dashboard.tsx
```
```

### Exemplo ERRADO (NÃO USAR):

```markdown
# ❌ ERRADO - Não fazer isso!
```bash
cd /home/felip/projeto-agro
mkdir backend  # NUNCA!
mkdir frontend # NUNCA!
```
```

---

## 🛠️ CASOS DE USO COMUNS

### 1. Criar novo módulo Django:
```bash
cd /home/felip/projeto-agro/sistema-agropecuario/backend
python manage.py startapp <nome>
```

### 2. Criar novo componente React:
```bash
cd /home/felip/projeto-agro/sistema-agropecuario/frontend/src/components
touch <Nome>Component.tsx
```

### 3. Executar testes:
```bash
# Backend
cd /home/felip/projeto-agro/sistema-agropecuario/backend
pytest

# Frontend
cd /home/felip/projeto-agro/sistema-agropecuario/frontend
npm test
```

### 4. Docker Compose:
```bash
cd /home/felip/projeto-agro/sistema-agropecuario
docker compose up -d
```

---

## 📊 HISTÓRICO DE PROBLEMAS

### Problema Recorrente: Duplicação de Pastas
- **Datas:** 21/01/2026 e 23/01/2026
- **Causa:** Agentes criando pastas `backend/`, `frontend/`, `project-agro/` no root
- **Impacto:** ~15M de arquivos duplicados
- **Solução:** Remoção manual + estas instruções
- **Prevenção:** SEMPRE consultar este documento antes de criar arquivos

---

## 🔗 REFERÊNCIAS

- Estrutura completa: [../../.copilot/PROJETO_ESTRUTURA.md](../../.copilot/PROJETO_ESTRUTURA.md)
- Instruções Raptor Mini: [../../.github/RAPTOR_MINI_INSTRUCTIONS.md](../../.github/RAPTOR_MINI_INSTRUCTIONS.md)
- Documentação do projeto: [../../docs/](../../docs/)

---

## ⚠️ MENSAGEM FINAL PARA AGENTES

**ANTES de criar qualquer arquivo ou executar qualquer comando:**

1. ✅ Consulte este documento
2. ✅ Valide o caminho com o checklist acima
3. ✅ Confirme que está trabalhando em `sistema-agropecuario/`
4. ✅ Em caso de dúvida, PARE e peça confirmação ao usuário

**REGRA DE OURO:** Todo trabalho deve estar em `/home/felip/projeto-agro/sistema-agropecuario/` ✨
