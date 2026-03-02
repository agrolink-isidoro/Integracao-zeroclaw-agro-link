# 📋 Resumo Executivo: Plano Zeroclaw ↔ Agrolink v2.0

**Data:** 2 de março de 2026  
**Versão:** v2.0 (Revisado com restrições)

---

## 🎯 O Que Mudou

### De v1.0 (Descartado) Para v2.0 (Adotado)

| Aspecto | v1.0 | v2.0 |
|---------|------|------|
| **Execução** | ❌ Bot executa direto | ✅ Bot prepara drafts para aprovaçãe |
| **Acesso ao BD** | ❌ Escrita direta | ✅ Leitura apenas (read-only) |
| **Interface** | ❓ Sem dashboard | ✅ Dashboard de ações |
| **Aprovação** | ❓ Implícita | ✅ Explícita + Histórico |
| **Módulos MVP** | Todos 8 | ✅ Apenas 4: Agri, Máquinas, Estoque, Fazendas |
| **Módulos Leitura** | - | ✅ Financeiro, Comercial, Fiscal, Admin |
| **Fase 2** | Não planejada | ✅ Fase 2 com Comercial, Fiscal, Financeiro |

---

## 🏗️ Arquitetura (1 Minuto)

```
Usuário (Tenant: Vila Nova) → Telegram/Chat
   ↓ (tenant_id = vila-nova em JWT)
Isidoro (ZeroClaw/Gemini)
   ├─ LÊ dados de vila-nova (GET only)
   ├─ PREPARA draft isolado
   └─ PROPÕE ao usuário
   ↓
   ↓ POST /api/actions/ (com X-Tenant-ID: vila-nova)
   ↓
Backend (Django)
   ├─ Valida tenant = vila-nova
   ├─ Filtra dados APENAS de vila-nova
   └─ Armazena Action isolada
   ↓
Dashboard (React - vila-nova)
   ├─ Exibe APENAS ações de vila-nova
   ├─ Usuário REVISA
   ├─ Usuário EDITA (se quiser)
   └─ Usuário APROVA
   ↓
   ↓ POST /api/actions/{id}/approve/ (isolado)
   ↓
Backend EXECUTA
   ├─ POST /api/agricultura/operacoes/ (tenant=vila-nova)
   ├─ POST /api/estoque/entradas/ (tenant=vila-nova)
   └─ etc...
   ↓
Chat atualizado: "✅ Executado!"
```

**🔒 Multi-Tenant:** Cada tenant (propriedade) vê APENAS seus dados

---

## 📊 Escopo do MVP (4 Semanas)

### ✅ Com Ações (Leitura + Draft)

- **Agricultura:** Plantio, colheita, adubação, irrigação
- **Máquinas:** Manutenção, abastecimento
- **Estoque:** Entradas, saídas, ajustes
- **Fazendas:** Visualização (sem criação)

### 👀 Leitura Apenas (Sem Ações)

- **Financeiro:** Consultas para contexto
- **Comercial:** Histórico de vendas
- **Fiscal:** Compliance
- **Admin:** [Dados de apoio

### ❌ Não no MVP

- Registros comerciais
- Manifestações fiscais
- Rateios financeiros
- Dados administrativos

---

## 📱 Exemplos Rápidos

### Exemplo 1: Consulta
```
👤 "Quantos ha de milho plantei?"
🤖 "150 hectares em 2026"
```

### Exemplo 2: Preparação de Operação
```
👤 "Plantei 50ha soja em Vila Nova"
🤖 "Preparei! Aprova aqui: [dashboard-link]"
👤 [Acessa dashboard, clica APROVAR]
🤖 "✅ Executado!"
```

### Exemplo 3: Análise
```
👤 "Qual foi meu custo de milho?"
🤖 "R$ 1.500/hectare (detalhes...)"
```

---

## 🔐 Segurança

- ✅ Dupla validação (Isidoro + Backend)
- ✅ Histórico completo de quem aprovou/rejeitou
- ✅ Usuário sempre no controle
- ✅ Rate limiting
- ✅ Audit trail

---

## 📅 Roadmap (3 Meses)

| Fase | Semanas | O Que | Status |
|------|---------|-------|--------|
| MVP | 1-4 | Agri + Máquinas + Estoque | Planejado |
| Refinamento | 5-8 | Análises avançadas + Fase 2 | Depois |
| Especialização | 9-12 | Bots especializados | Depois |

---

## 💰 Custos

- **ZeroClaw:** Gratuito (seu servidor)
- **Gemini 2.5:** Conforme uso (tokens)
- **Whisper:** 
  - Option A: Groq (~$0.04/hora, acesso à voz)
  - Option B: Local faster-whisper ($0, ja instalado)
- **Infra:** Django + React (seu servidor)

---

## ✅ Próximas Ações

1. ✅ **Este documento** lido e validado
2. [ ] Reunião de alignment com stakeholders
3. [ ] Design ER Diagram (Action model)
4. [ ] Sprint planning (jira/github)
5. [ ] Inicia Semana 1

**Documentos:**
- `PLANO_INTEGRACAO_ZEROCLAW_AGROLINK_V2.md` ← Completo
- `RESUMO_EXECUTIVO.md` ← Você está aqui
