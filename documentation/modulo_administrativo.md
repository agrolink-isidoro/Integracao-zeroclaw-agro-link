### **Resumo da Análise do Módulo "Administrativo"**

1.  **Visão Geral do Módulo**:
    *   Gerencia recursos humanos, custos administrativos e configurações gerais do sistema.
    *   Centraliza informações sobre funcionários, centros de custo, folha de pagamento e despesas administrativas.
    *   Essencial para a gestão interna da empresa e para a conformidade trabalhista e fiscal.
    *   Integra-se com o módulo Financeiro para rateios de custos trabalhistas e administrativos.

2.  **Componentes Chave (Funcionalidades e Modelos)**:
    *   **Gestão de Funcionários**: CRUD completo para cadastro e controle de dados pessoais, salários e benefícios.
        *   *Modelos:* `Funcionario`.
    *   **Centros de Custo**: Criação e gestão de hierarquias para alocação de custos.
        *   *Modelos:* `CentroCusto`.
    *   **Folha de Pagamento**: Processamento automático de salários, horas extras, diárias e cálculos de impostos trabalhistas (INSS, IRRF, FGTS).
        *   *Modelos:* `FolhaPagamento`, `FolhaItem`, `ImpostoTrabalhista`.
    *   **Despesas Administrativas**: Registro e controle de custos operacionais.
        *   *Modelos:* `DespesaAdministrativa`.
    *   **Configurações do Sistema**: Gerenciamento de parâmetros globais.
        *   *Modelos:* `ConfiguracaoSistema`.
    *   **Auditoria**: Logs de mudanças e notificações para rastreamento de operações.
        *   *Modelos:* `LogAuditoria`.
    *   **Formulários**: `FuncionarioForm`, `CentroCustoForm`, `FolhaPagamento`, `DespesaForm`.

3.  **Fluxo de Dados e Estado**:
    *   Dados de funcionários são inseridos e mantidos, impactando a folha de pagamento.
    *   Centros de custo são definidos para categorizar e alocar despesas.
    *   A folha de pagamento processa salários e gera impostos trabalhistas, que são lançados no módulo Fiscal.
    *   Despesas administrativas são registradas e podem ser rateadas via Financeiro.
    *   Configurações do sistema afetam o comportamento global da aplicação.
    *   Logs de auditoria registram todas as operações importantes para rastreabilidade e segurança.

4.  **Integração com a API (Endpoints)**:
    *   **`/api/administrativo/funcionarios/`**: Gerencia funcionários (CRUD).
    *   **`/api/administrativo/centros-custo/`**: Gerencia centros de custo (CRUD).
    *   **`/api/administrativo/folha-pagamento/`**: Gerencia o processamento da folha de pagamento.
    *   **`/api/administrativo/backfill-rateios/`**: Endpoint para preenchimento retroativo de rateios (provável).

5.  **Vínculos e Interdependências com Outros Módulos**:
    *   **Financeiro**: Envia custos de folha de pagamento e despesas administrativas para rateios por centro de custo, talhão e fazenda.
    *   **Fiscal**: Lançamento automático de impostos trabalhistas (INSS, IRRF, FGTS) calculados na folha de pagamento como `ImpostoFederal`.
    *   **Fazendas**: Centros de custo podem ser associados a talhões para análises de rateios geoespaciais.
    *   **Estoque**: Pode haver movimentações de suprimentos administrativos (ex: materiais de escritório) que impactam o estoque.
    *   **Outros Módulos (Intra-aplicações)**: Dados de funcionários podem ser usados em outros módulos (ex: responsáveis por operações agrícolas).