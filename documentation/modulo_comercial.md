### **Resumo da Análise do Módulo "Comercial"**

1.  **Visão Geral do Módulo**:
    *   Gerencia todas as atividades comerciais, incluindo fornecedores, empresas parceiras, contratos de fornecimento e vendas de produtos agrícolas.
    *   Centraliza negociações e aprovações de contratos.
    *   Controla o fluxo de vendas de colheita, com integração para gerenciamento de estoque.
    *   Garante a conformidade fiscal através da integração com o módulo Fiscal.
    *   Essencial para a gestão da cadeia de suprimentos e do processo de vendas da produção.

2.  **Componentes Chave (Funcionalidades e Modelos)**:
    *   **Gestão de Fornecedores**: Cadastro completo com CNPJ, produtos fornecidos, contato e, agora, `dados_bancarios` (banco, agência, conta, tipo e formatação automática de chave PIX).
        *   *Modelos:* `Fornecedor`.
        *   *Formulários:* `FornecedorForm`.
    *   **Gestão de Empresas Parceiras**: Registro de alianças estratégicas.
        *   *Modelos:* `Empresa`.
        *   *Formulários:* `EmpresaForm`.
    *   **Gestão de Contratos**: Negociação, aprovação, controle de vigência e status de contratos de fornecimento.
        *   *Modelos:* `Contrato`, `AprovacaoContrato`.
        *   *Formulários:* `ContratoForm`, `AprovacaoForm`.
    *   **Gestão de Vendas**: Controle de vendas de produtos de colheita, com a opção de indicar `local de armazenamento` (integração com `ProdutoArmazenado`).
        *   *Modelos:* `Venda`.
        *   *Formulários:* `VendaForm`.
    *   **Aprovações**: Workflow para validação de contratos e outras negociações.
    *   **Relatórios**: Desempenho de fornecedores e impacto nas movimentações de estoque e custos.

3.  **Fluxo de Dados e Estado**:
    *   Dados de fornecedores e empresas parceiras são cadastrados e mantidos.
    *   Contratos são criados, negociados e passam por um fluxo de aprovação.
    *   Vendas de produtos são registradas, podendo indicar o local de armazenamento.
    *   A confirmação de NFEs (do módulo Fiscal) pode gerar movimentações de estoque.
    *   Vendas e compras podem gerar movimentos automáticos no Estoque, indicando localização/lote.
    *   O estado dos contratos e vendas é dinâmico, refletindo as negociações e aprovações.

4.  **Integração com a API (Endpoints)**:
    *   **`/api/comercial/fornecedores/`**: Gerencia fornecedores (CRUD).
    *   **`/api/comercial/empresas/`**: Gerencia empresas parceiras (CRUD).
    *   **`/api/comercial/contratos/`**: Gerencia contratos (CRUD).
    *   Endpoints para vendas e aprovações (implícitos).

5.  **Vínculos e Interdependências com Outros Módulos**:
    *   **Fiscal**:
        *   **Validação**: Validação de CNPJ de fornecedores.
        *   **NFEs**: Processamento de NFEs de fornecedores.
        *   **Reflexão de Fornecedor**: O módulo Fiscal pode criar/atualizar `Fornecedor` no Comercial a partir de dados do emitente da NFe.
    *   **Financeiro**:
        *   **Custos**: Custos de contratos de fornecimento são rateados e impactam o Financeiro.
        *   **Receitas**: Receitas de vendas de colheita são registradas no Financeiro.
    *   **Estoque**:
        *   **Entradas**: Compras via fornecedores geram entradas no Estoque.
        *   **Saídas**: Vendas de produtos geram saídas no Estoque.
        *   **Integração**: Confirmação de NFEs cria `MovimentacoesEstoque`; vendas e compras podem indicar `localizacao`/`lote` e gerar movimentos automáticos.
    *   **Fazendas**: Contratos e vendas podem ser vinculados a talhões para análises específicas.
    *   **Agricultura**: Produtos agrícolas (colheitas) são vendidos através do Comercial.
    *   **Intra-aplicações**: Aprovações de contratos podem afetar o planejamento de estoque e custos.