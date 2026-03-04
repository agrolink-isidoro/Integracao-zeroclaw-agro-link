# Estoque

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — confirme isolamento por tenant em queries e `create_movimentacao`.
- **Notas:** Overrides de NFe e reflexões no estoque foram validadas; runbooks técnicos foram arquivados em `docs/archived/`.

**Última Revisão:** Março 2026  
**Links Relacionados:** [05-APIs-e-Endpoints.md](../05-APIs-e-Endpoints.md) | [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md)

## 📋 Visão Geral
O módulo Estoque gerencia inventário de produtos agrícolas, movimentações de entrada/saída, lotes e categorias NCM. Integra com fiscal para entradas via NFEs e com financeiro para custos de insumos.

## 🎯 Objetivos
- Controlar estoque de insumos e produtos.
- Rastrear movimentações por lote e talhão.
- Categorizar produtos com NCM.
- Integrar com compras e vendas.
- Fornecer relatórios de inventário.

## 🔧 Funcionalidades
- **CRUD de Produtos:** Cadastro com NCM, unidade, preço.
- **Lotes:** Controle de validade, origem, quantidade.
- **Movimentações:** Entrada/saída com justificativas.
- **Localizações & Saldo por Local:** `Localizacao` e `ProdutoArmazenado` permitem rastrear saldos por local de armazenamento (interno/externo) e por lote — útil para Transferências internas e operações de colheita.
- **Movimentações por Origem:** Movimentações são criadas automaticamente a partir de NFEs confirmadas (`confirmar_estoque`) e de eventos operacionais (colheita, entrada/saída manual).
- **Categorias NCM:** Hierarquia para classificação fiscal.
- **Relatórios:** Estoque mínimo, saldos por local, vencimentos próximos.
- **Integração NFE & Overrides:** `ItemNFeOverride` permite ajustar quantidades/valores por item; quando aplicado em NFe confirmada gera ajustes de estoque (origem=`ajuste`) e auditoria de produto.
- **Integração com Financeiro:** Movimentações de estoque influenciam custo unitário (cálculo de custo médio ao entrar NFEs).

## 📊 Classes/Modelos Principais
- **Produto:** Nome, NCM, unidade, preço médio.
- **Lote:** Produto, quantidade, validade, origem.
- **Movimentacao:** Tipo (entrada/saída), quantidade, lote, talhão.
- **CategoriaNCM:** Código, descrição, hierarquia.
- **Inventario:** Snapshot de estoques por data.

## 📝 Formulários
- **ProdutoForm:** Nome, NCM, unidade, preço.
- **LoteForm:** Produto, quantidade, validade, origem.
- **MovimentacaoForm:** Tipo, quantidade, lote, talhão, justificativa.
- **CategoriaForm:** Código, descrição, pai.

## 💰 Despesas e Financeiro
- **Custos de Insumos:** Movimentações de saída geram custos rateados por talhão.
- **Preços:** Atualização automática via NFEs.
- **Relatórios:** Custos por produto/talhão.

## 🔗 Relações Intra-modulares
- Produto ↔ Lote (um-para-muitos).
- Movimentacao ↔ Lote (muitos-para-um).
- Produto ↔ CategoriaNCM (muitos-para-um).
- Inventario agrega Movimentacao.

## 🔗 Relações com Outros Módulos
- **Fiscal:** Entradas via NFE, categorias NCM para impostos.
- **Financeiro:** Custos de movimentações rateados.
- **Agrícola:** Saídas de insumos para operações (plantio, adubação), entradas de colheita.
- **Máquinas:** Consumo de combustível e peças via abastecimentos/manutenções.
- **Administrativo:** Saídas de suprimentos administrativos (ex.: materiais de escritório).
- **Comercial:** Entradas de produtos via fornecedores, saídas para vendas.
- **Fazendas:** Estoques por talhão/fazenda.
- **Intra-aplicações:** Movimentações afetam custos em financeiro.

## 🔗 Endpoints Principais
- `/api/estoque/produtos/`
- `/api/estoque/movimentacoes/`
- `/api/estoque/categorias/`

Ver [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md) para detalhes.</content>
<parameter name="filePath">/home/felip/projeto-agro/docs/04-Modulos/Estoque.md