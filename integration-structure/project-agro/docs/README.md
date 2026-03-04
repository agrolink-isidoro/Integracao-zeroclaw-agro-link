
# Documentação do Agrolink

**Versão:** 4.1 (Agrolink - gestão otimizada via inteligência artificial)  
**Última Revisão:** Fevereiro 2026  
**Ponto de Entrada:** Esta é a documentação navegável e estruturada para desenvolvedores.

## 📋 Visão Geral
Agrolink full-stack (Django + React) para gestão otimizada via inteligência artificial. **100% IMPLEMENTADO** com módulos operacionais, sincronização remota, validações robustas e suporte A3/PKCS#11.

## 🚀 Início Rápido
1. **[01-Visao-Geral.md](01-Visao-Geral.md)** — Entenda o projeto (5 min)
2. **[02-Setup-e-Instalacao.md](02-Setup-e-Instalacao.md)** — Configure o ambiente (5 min)
3. **[03-Arquitetura.md](03-Arquitetura.md)** — Veja diagramas e stack (10 min)

## 📁 Estrutura da Documentação

### Documentação Principal
- **[01-Visao-Geral.md](01-Visao-Geral.md)** — Objetivos, escopo, arquitetura high-level
- **[02-Setup-e-Instalacao.md](02-Setup-e-Instalacao.md)** — Setup Docker/local, troubleshooting
- **[03-Arquitetura.md](03-Arquitetura.md)** — Stack, diagramas Mermaid, integrações
- **[04-Modulos/](04-Modulos/)** — Detalhes por módulo (subpasta)
- **[05-APIs-e-Endpoints.md](05-APIs-e-Endpoints.md)** — Endpoints detalhados (ATUALIZADO FEV2026)
- **[06-Frontend.md](06-Frontend.md)** — Componentes, hooks, UI specs
- **[07-Testes-e-Qualidade.md](07-Testes-e-Qualidade.md)** — Estratégias, cobertura, CI/CD
- **[08-Integracoes-e-Relacionamentos.md](08-Integracoes-e-Relacionamentos.md)** — Inter-módulos
- **SEFAZ (Integração completa):** [docs/sefaz/](sefaz/) — Documentação completa de integração SEFAZ
  - [README.md](sefaz/README.md) — Índice e guia de navegação
  - [SEFAZ_EMISSAO.md](sefaz/SEFAZ_EMISSAO.md) — Emissão de NF-e
  - [SEFAZ_NSU_SINCRONIZACAO.md](sefaz/SEFAZ_NSU_SINCRONIZACAO.md) — Download via NSU
  - [CERTIFICADO_A3_SETUP.md](sefaz/CERTIFICADO_A3_SETUP.md) — Certificados digitais
- **[09-Desenvolvimento.md](09-Desenvolvimento.md)** — Guias, refatoração, boas práticas
- **[10-Historico-e-Mudancas.md](10-Historico-e-Mudancas.md)** — Evolução, sprints, métricas

### Fiscal — Documentação
- **[FISCAL_TEMP/](FISCAL_TEMP/)** — Referência técnica consolidada ✅ (Fevereiro 2026)
  - [FISCAL_TEMP/README.md](FISCAL_TEMP/README.md) — Índice (comece aqui!)
  - [FISCAL_TEMP/REFERENCE.md](FISCAL_TEMP/REFERENCE.md) — Models e APIs
  - [FISCAL_TEMP/MANIFESTACAO.md](FISCAL_TEMP/MANIFESTACAO.md) — Manifestações de NF-e
  - [FISCAL_TEMP/RUNBOOK.md](FISCAL_TEMP/RUNBOOK.md) — Setup e operação

- [04-Modulos/Fiscal.md](04-Modulos/Fiscal.md) — Visão geral do módulo
- [FISCAL_OVERRIDE_CACHE_FIX.md](FISCAL_OVERRIDE_CACHE_FIX.md) — Correção de cache React Query (Fevereiro 2026)

### Arquivada
- **[docs/archived/](archived/)** — Histórico e backups (não para uso diário)
- **[docs/references/](references/)** — Arquivos antigos consolidados para consultas específicas

## 🎯 Para Desenvolvedores
- **Novo no Projeto:** Siga a ordem 01 → 02 → 03
- **APIs:** [05-APIs-e-Endpoints.md](05-APIs-e-Endpoints.md) (com endpoints de manifestações, forma_pagamento, A3)
- **Certificados A3:** [RUNBOOK_CERTIFICADOS_A3.md](RUNBOOK_CERTIFICADOS_A3.md)
- **Módulos Específicos:** [04-Modulos/](04-Modulos/)
- **Problemas:** [09-Desenvolvimento.md](09-Desenvolvimento.md)

## 📊 Status Atual
- **Fase:** Sistema Completo com Manifestações — Pronto para Próximas Fases
- **Escopo Manifestações:** ✅ 100% CONCLUÍDO (4 tarefas, 54 testes, 0 erros)
- **Cobertura:** 100% dos módulos implementados
- **RBAC:** Modelo documentado (pendente implementação de middleware e interface)
- **Navegabilidade:** <5 min para setup  
- **Próxima Fase:** User Management RBAC e Deploy em Produção

## 🔗 Links Importantes

- Repositório: https://github.com/tyrielbr/project-agro
- Backend: Django 4.2.16 + DRF (porta 8000)
- Frontend: React 18 + TypeScript + Vite (porta 5173)
- Branch de trabalho: `feat/fiscal-manifestacao` (pronto para merge)
- Changelog: [../../CHANGELOG.md](../../CHANGELOG.md) (Fevereiro 2026 atualizado)

## 📝 Convenções

### Commits
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `refactor:` - Refatoração de código
- `docs:` - Documentação
- `style:` - Formatação/estilo
- `test:` - Testes

### Estrutura de Pastas
```
project-agro/
├── docs/                    # Esta pasta - documentação
├── sistema-agropecuario/
│   ├── backend/            # Django + DRF
│   │   └── apps/
│   │       ├── agricultura/
│   │       ├── fazendas/
│   │       └── maquinas/
│   └── frontend/           # React + TypeScript
│       └── src/
│           ├── components/
│           ├── pages/
│           └── services/
```

---
**Última revisão:** 24/12/2025 - Conclusão da FASE 4
