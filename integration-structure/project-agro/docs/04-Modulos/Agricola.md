# Agricola

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — dados de safra/colheita são isolados por tenant.
- **Testes:** E2E e unitários para operações e colheitas foram reforçados; veja `docs/archived/` para detalhes.

**Última Revisão:** Março 2026  
**Links Relacionados:** [05-APIs-e-Endpoints.md](../05-APIs-e-Endpoints.md) | [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md)

## 📋 Visão Geral
O módulo Agrícola gerencia culturas, safras, operações agrícolas e colheitas. Controla o ciclo produtivo, vinculando operações a talhões e integrando com estoque para reconciliação.

## 🎯 Objetivos
- Planejar e controlar culturas/safras.
- Registrar operações agrícolas.
- Gerenciar colheitas e movimentações.
- Vincular produção a talhões.
- Fornecer dados para análise de produtividade.

## 🔧 Funcionalidades
- **CRUD de Culturas:** Tipos, variedades, ciclos.
- **Safras:** Períodos, talhões, expectativas.
- **Operações:** Plantio, adubação, irrigação, colheita.
- **Movimentações de Carga:** Transporte interno.
- **Reconciliação:** Comparação produção vs. estoque.
- **Relatórios:** Produtividade por talhão/cultura.

## 📊 Classes/Modelos Principais
- **Cultura:** Nome, variedade, ciclo em dias.
- **Safra:** Ano, cultura, talhão, área, expectativa produção.
- **Operacao:** Tipo, data, talhão, insumos usados, custos.
- **Colheita:** Safra, quantidade, qualidade.
- **MovimentacaoCarga:** Origem, destino, produto, quantidade.

## 📝 Formulários
- **CulturaForm:** Nome, variedade, ciclo.
- **SafraForm:** Ano, cultura, talhão, área.
- **OperacaoForm:** Tipo, data, talhão, insumos.
- **ColheitaForm:** Safra, quantidade, qualidade.
- **MovimentacaoForm:** Origem, destino, produto, quantidade.

## 💰 Despesas e Financeiro
- **Operações:** Custos de insumos, mão de obra rateados por talhão.
- **Colheitas:** Receitas de vendas.
- **Relatórios:** Custos por hectare, margem por safra.

## 🔗 Relações Intra-modulares
- Cultura ↔ Safra (um-para-muitos).
- Safra ↔ Operacao (um-para-muitos).
- Safra ↔ Colheita (um-para-muitos).
- Operacao ↔ Talhao (muitos-para-um).

## 🔗 Relações com Outros Módulos
- **Financeiro:** Custos de operações rateados.
- **Estoque:** Saídas de insumos, entradas de colheita.
- **Fazendas:** Operações vinculadas a talhões.
- **Maquinas:** Uso de equipamentos em operações.
- **Intra-aplicações:** Produção afeta vendas e custos.

## 🔗 Endpoints Principais
- `/api/agricultura/culturas/`
- `/api/agricultura/operacoes/`
- `/api/agricultura/movimentacoes-carga/`

Ver [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md) para detalhes.</content>
<parameter name="filePath">/home/felip/projeto-agro/docs/04-Modulos/Agricola.md