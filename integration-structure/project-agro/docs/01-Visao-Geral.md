
# 01 - Visão Geral

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — ver `sistema-agropecuario/backend/apps/core` e `TenantContext` no frontend.
- **Principais pendências:** Formularios de contratos (campo `documento` vs `documento_contrato`) e padronização entre frontend/backend.
- **Testes:** E2E hardening realizado (timeouts aumentados, helpers padronizados). Consulte `docs/archived/E2E_TEST_STATUS_FINAL.md`.
- **Observações de operação:** Evitar rodar servidores como `root` em dev; use Docker ou usuário não-root.

**Última Revisão:** Março 2026
**Links Relacionados:** [02-Setup-e-Instalacao.md](02-Setup-e-Instalacao.md) | [03-Arquitetura.md](03-Arquitetura.md) | [README.md](../README.md)

## 📋 Resumo Executivo

O **Agrolink** é uma aplicação full-stack para gestão otimizada via inteligência artificial, desenvolvida com backend em Django (Python) e frontend em React (TypeScript). Suporta módulos modulares para fazendas, agricultura, máquinas, estoque, comercial, financeiro e fiscal, com APIs RESTful, autenticação JWT e banco PostgreSQL/PostGIS para dados geoespaciais. Focado em escalabilidade, segurança e praticidade para produtores rurais.

## 🎯 Objetivos e Escopo

### Objetivos Principais
- **Unificação de Gestão:** Centralizar operações agrícolas dispersas (manejo, colheita, comercialização) em um sistema integrado.
- **Eficiência Operacional:** Automatizar processos como rateios financeiros, validações fiscais via NFE e controle de estoque.
- **Escalabilidade:** Suporte a múltiplas fazendas, talhões e culturas com dados geoespaciais.
- **Conformidade:** Integração com SEFAZ para NFEs e relatórios tributários.
- **Controle de Acesso:** Sistema RBAC (Role-Based Access Control) para gestão granular de permissões por módulo e usuário.

### Escopo do Sistema
- **Módulos Core:** Fazendas (propriedades/talhões), Agricultura (culturas/operações), Máquinas (equipamentos), Estoque (produtos/movimentações), Comercial (fornecedores/vendas), Financeiro (rateios/vencimentos/transferências), Fiscal (NFEs, Manifestações, impostos), Administrativo (funcionários/folha/permissões).
- **Integrações:** APIs cross-module (e.g., financeiro como hub para rateios), WebSockets para real-time (planejado), IA para automações futuras.
- **Usuários:** Produtores rurais, gestores agrícolas, contadores; suporte a RBAC com 7 perfis hierárquicos (Funcionário Temporário até Proprietário).

## 🏗️ Arquitetura High-Level

### Stack Tecnológico
- **Backend:** Django 4.2.16 + DRF, PostgreSQL/PostGIS, Redis (cache/sessões), Celery (planejado para tasks).
- **Frontend:** React 18 + TypeScript, Vite, Bootstrap/Tailwind, Axios/React Query.
- **DevOps:** Docker Compose, health checks, pytest/Jest para testes.
- **Segurança:** JWT, rate limiting, validações server-side, RBAC implementado.

### Fluxo de Dados
1. **Entrada:** Usuário autentica via JWT e permissões são verificadas por módulo.
2. **Operação:** Frontend consome APIs (/api/), backend processa (ORM PostGIS) com enforcement de permissões.
3. **Integração:** Módulos interagem via financeiro (rateios) e fiscal (NFEs).
4. **Saída:** Dados exibidos em UI responsiva, com caching para performance.

## 📊 Benefícios e Valor

- **Produtividade:** Redução de tempo em 50% para relatórios manuais via automação.
- **Precisão:** Validações automáticas evitam erros em NFEs/estoque.
- **Escalabilidade:** Suporte a milhares de talhões via PostGIS.
- **Confiabilidade:** Testes >80% cobertura, CI/CD para deploys seguros.
- **Segurança:** Controle granular de acesso por perfil e módulo.

## 🚀 Próximos Passos
Consulte [02-Setup-e-Instalacao.md](02-Setup-e-Instalacao.md) para iniciar rapidamente.

## 🔔 Atualizações Recentes (Março 2026)
- **Sistema RBAC:** Documentação completa criada (docs/USER_MANAGEMENT/) para implementação de controle de acesso por módulo.
- **Financeiro Avançado:** Transferências entre contas (DOC/TED/PIX), fluxo de caixa com filtros, vencimentos com ordenação e badges.
- **Correção NFE:** Sistema emite apenas NFEs de vendas (saída); valida NFEs de compras (entrada).
- **Documentação Atualizada:** Revisão completa de todos os documentos conforme progresso dos últimos 20 dias.</content>
<parameter name="filePath">/home/felip/projeto-agro/docs/01-Visao-Geral.md