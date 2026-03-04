# Financeiro

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — ver `backend/apps/financeiro` e migrations recentes.
- **Implementação:** Endpoints de quitação e transferências implementados e testados; pipeline E2E reforçado.

**Última Revisão:** Março 2026  
**Links Relacionados:** [05-APIs-e-Endpoints.md](../05-APIs-e-Endpoints.md) | [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md)

## 📋 Visão Geral
O módulo Financeiro é o hub central para gestão de custos, rateios, vencimentos e financiamentos. Processa todos os custos gerados pelos outros módulos, aplicando rateios por talhões, fazendas e centros de custo, com sistema de aprovações para controle financeiro.

## 🎯 Objetivos
- Centralizar todos os custos do sistema.
- Aplicar rateios precisos por talhão/fazenda.
- Gerenciar vencimentos e financiamentos.
- Controlar aprovações de rateios.
- Fornecer relatórios financeiros consolidados.

## 🔧 Funcionalidades
- **Rateios de Custos:** Automáticos por talhão, fazenda, centro de custo.
- **Aprovações:** Workflow para validar rateios antes de aplicação.
- **Vencimentos:** Controle de datas de pagamento; suporta quitação individual e bulk (`POST /api/financeiro/vencimentos/{id}/quitar/`, `POST /api/financeiro/vencimentos/bulk_quitar/`).
- **Transferências entre contas:** Serviço atômico `transferir_entre_contas()` e endpoint `POST /api/financeiro/transferencias/` que gera lançamentos de origem e destino (saída/entrada).
- **Fluxo de Caixa (endpoint):** `GET /api/financeiro/lancamentos/fluxo_caixa/` para obter séries de entradas/saídas filtradas por período e conta.
- **Financiamentos / Empréstimos:** Gestão completa com parcelamento e integração com rateios.
- **Relatórios:** Dashboards financeiros, lucros/prejuízos por talhão e fluxo de caixa.
- **Integração com Comercial & Estoque:** Rateios e geração de vencimentos (`POST /api/financeiro/rateios/{id}/gerar_vencimento/`) usados por vendas/entradas do módulo Comercial; testes E2E e unitários adicionados para esses fluxos.

## 📊 Classes/Modelos Principais
- **Rateio:** Valor, origem (módulo), destino (talhão/fazenda), status aprovação.
- **Vencimento:** Data, valor, fornecedor, talhão.
- **Financiamento:** Valor total, parcelas, juros, talhão.
- **Aprovacao:** Rateio, aprovador, status, comentários.
- **RelatorioFinanceiro:** Período, totais por categoria.

## 📝 Formulários
- **RateioForm:** Seleção de origem/destino, valor, justificativa.
- **VencimentoForm:** Data, valor, fornecedor, talhão.
- **FinanciamentoForm:** Valor, parcelas, juros, talhão.
- **AprovacaoForm:** Rateio, decisão, comentários.

## 💰 Despesas e Financeiro
- **Rateios:** Custos de administrativo, estoque, operações agrícolas rateados por talhão/fazenda.
- **Vencimentos:** Pagamentos a fornecedores vinculados a talhões.
- **Financiamentos:** Empréstimos para investimentos em fazendas/talhões.
- **Relatórios:** Análise de rentabilidade por área.

## ✅ Status — Sprint 1: Bookkeeping (Concluído)
- Implementação concluída: **modelos** `ContaBancaria` e `Lancamento`, **service** `quitar_vencimento`, **endpoints** `POST /financeiro/vencimentos/{id}/quitar/` e `POST /financeiro/vencimentos/bulk_quitar/`, testes unitários e de integração, e E2E hardenizado localmente.
- Observações: ajustes de CI para instalar GDAL/GEOS e garantir PostGIS na pipeline foram aplicados; PR: https://github.com/tyrielbr/project-agro/pull/105 (mergeable).

## 🔗 Relações Intra-modulares
- Rateio ↔ Aprovacao (um-para-muitos).
- Vencimento ↔ Talhao (muitos-para-um).
- Financiamento ↔ Talhao (muitos-para-um).
- RelatorioFinanceiro agrega todos os modelos.

## 🔗 Relações com Outros Módulos
- **Administrativo:** Recebe custos de folha para rateios.
- **Estoque:** Custos de insumos rateados por talhão.
- **Operações Agrícolas:** Custos de operações (plantio, colheita) rateados.
- **Fazendas:** Rateios por fazenda/talhão para análise geoespacial.
- **Fiscal:** NFEs processadas para custos.
- **Intra-aplicações:** Aprovações controlam fluxos entre módulos.

## 🔗 Endpoints Principais
- `/api/financeiro/resumo/`
- `/api/financeiro/rateios-approvals/`

Ver [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md) para detalhes.</content>
<parameter name="filePath">/home/felip/projeto-agro/docs/04-Modulos/Financeiro.md