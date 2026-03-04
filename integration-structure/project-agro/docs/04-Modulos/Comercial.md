# Comercial

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — contratos e fornecedores são tenant-aware.
- **Atenção (ContratoForm):** Há inconsistências entre o frontend (algumas instâncias usam `documento_contrato` e `FormData`) e o backend (prefere `documento` em `JSONField`). Recomenda-se padronizar para `documento` via `JSON.stringify` no frontend ou adaptar o serializer para compatibilidade.

**Última Revisão:** Março 2026  
**Links Relacionados:** [05-APIs-e-Endpoints.md](../05-APIs-e-Endpoints.md) | [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md)

## 📋 Visão Geral
O módulo Comercial gerencia fornecedores, empresas parceiras, contratos de fornecimento e vendas de colheita. Centraliza negociações, aprovações e integra com fiscal para validações.

## 🎯 Objetivos
- Gerenciar cadastro de fornecedores/fabricantes.
- Negociar e aprovar contratos.
- Controlar vendas de produtos agrícolas.
- Manter empresas parceiras.
- Integrar com fiscal para compliance.

## 🔧 Funcionalidades
- **CRUD de Fornecedores:** Cadastro com CNPJ, produtos fornecidos. Formulário de fornecedor agora inclui `dados_bancarios` (banco/agência/conta, tipo de chave PIX e formatação automática da chave conforme tipo).
- **Empresas Parceiras:** Alianças estratégicas.
- **Contratos:** Negociações, aprovações, vigência.
- **Vendas:** Controle de vendas de colheita — agora com opção de `local de armazenamento` (integração com `ProdutoArmazenado`).
- **Integração Estoque ⇄ Comercial:** Confirmação de NFEs cria Movimentações de Estoque; vendas e compras podem indicar `localizacao`/`lote` e gerar movimentos automáticos.
- **Aprovações:** Workflow para contratos.
- **Relatórios:** Desempenho de fornecedores e impacto no estoque/custos.

## 📊 Classes/Modelos Principais
- **Fornecedor:** CNPJ, nome, produtos, contato.
- **Empresa:** Nome, CNPJ, tipo parceria.
- **Contrato:** Fornecedor, produtos, preços, vigência, status.
- **Venda:** Produto, quantidade, preço, cliente.
- **AprovacaoContrato:** Contrato, aprovador, status.

## 📝 Formulários
- **FornecedorForm:** CNPJ, nome, produtos, contato.
- **EmpresaForm:** Nome, CNPJ, tipo.
- **ContratoForm:** Fornecedor, produtos, preços, vigência.
- **VendaForm:** Produto, quantidade, preço, cliente.
- **AprovacaoForm:** Contrato, decisão, comentários.

## 💰 Despesas e Financeiro
- **Contratos:** Custos de fornecimento rateados por talhão.
- **Vendas:** Receitas de colheita.
- **Relatórios:** Lucros por fornecedor/produto.

## 🔗 Relações Intra-modulares
- Fornecedor ↔ Contrato (um-para-muitos).
- Contrato ↔ AprovacaoContrato (um-para-muitos).
- Empresa ↔ Fornecedor (muitos-para-muitos via parcerias).
- Venda ↔ Produto (muitos-para-um).

## 🔗 Relações com Outros Módulos
- **Fiscal:** Validação de CNPJ, NFEs de fornecedores.
- **Financeiro:** Custos de contratos rateados, receitas de vendas.
- **Estoque:** Entradas de produtos via fornecedores, saídas para vendas.
- **Fazendas:** Contratos vinculados a talhões.
- **Intra-aplicações:** Aprovações afetam estoques e custos.

## 🔗 Endpoints Principais
- `/api/comercial/fornecedores/`
- `/api/comercial/empresas/`
- `/api/comercial/contratos/`

Ver [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md) para detalhes.</content>
<parameter name="filePath">/home/felip/projeto-agro/docs/04-Modulos/Comercial.md