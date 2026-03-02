### **Resumo da Análise do Módulo "Agricultura"**

1.  **Visão Geral do Módulo**:
    *   É o módulo central para a gestão de todas as operações e atividades agrícolas.
    *   Permite o planejamento e controle de culturas, safras, plantios, colheitas, irrigações, aplicações e manutenções.
    *   Gerencia insumos, máquinas, talhões e outros recursos essenciais para a produção.
    *   Controla o ciclo produtivo, vinculando operações a talhões e integrando-se com o módulo de Estoque para reconciliação de produtos e insumos.
    *   Fornece dados cruciais para análise de produtividade e rentabilidade por talhão/cultura.
    *   Possui um layout específico (`AgriculturaLayout.tsx`) para navegação interna.

2.  **Componentes Chave (Funcionalidades, Modelos e Frontend)**:
    *   **Gestão de Culturas**: Cadastro de tipos, variedades e ciclos de culturas.
        *   *Modelos:* `Cultura`.
    *   **Gestão de Safras**: Definição de períodos, talhões, áreas e expectativas de produção.
        *   *Modelos:* `Safra`.
    *   **Gestão de Operações Agrícolas**: Registro de atividades como plantio, adubação, irrigação, colheita, com insumos usados e custos.
        *   *Modelos:* `Operacao`.
        *   *Frontend:* `OperacoesPage.tsx` (listagem, filtros, paginação), `OperacoesList.tsx` (renderização da tabela).
    *   **Gestão de Colheitas**: Registro de quantidades e qualidades da colheita.
        *   *Modelos:* `Colheita`.
    *   **Movimentações de Carga**: Controle de transporte interno de produtos.
        *   *Modelos:* `MovimentacaoCarga`.
    *   **Reconciliação de Produção**: Comparação entre a produção esperada e o estoque real.
    *   **Relatórios de Produtividade**: Geração de relatórios por talhão/cultura.
    *   **Outras Entidades Gerenciadas**: Insumos, Máquinas, Talhões, Plantios, Aplicações, Irrigações, Manutenções, Combustíveis, Equipamentos, Funcionários, Fornecedores, Clientes, Produtos, Serviços, Contas a Pagar/Receber (com rotas dedicadas).
    *   **Formulários**: `CulturaForm`, `SafraForm`, `OperacaoForm`, `ColheitaForm`, `MovimentacaoForm` e outros para as entidades relacionadas.

3.  **Fluxo de Dados e Estado**:
    *   Utiliza `React Query` para busca, cache e invalidação de dados (operações, insumos, etc.), otimizando requisições à API.
    *   Componentes como `OperacoesPage.tsx` gerenciam o estado local para filtros, paginação e ordenação usando `useState` e `useSearchParams`.
    *   `useDebounce()` é empregado para otimizar a aplicação de filtros de busca, evitando requisições excessivas.
    *   Após ações de criação, edição ou exclusão, o cache do React Query é invalidado (`queryClient.invalidateQueries()`) para garantir a atualização dos dados.
    *   `AuthContext` e `TenantContext` fornecem informações de autenticação e do tenant atual para todas as requisições.

4.  **Integração com a API (Endpoints)**:
    *   **`src/services/operacoesService.ts`**: Serviço principal para interagir com os *endpoints* de operações agrícolas.
        *   `GET /api/agricultura/operacoes/`: Lista operações (com filtros e paginação).
        *   `GET /api/agricultura/operacoes/{id}/`: Detalhes de uma operação.
        *   `POST /api/agricultura/operacoes/`: Cria uma nova operação.
        *   `PUT /api/agricultura/operacoes/{id}/`: Atualiza uma operação.
        *   `DELETE /api/agricultura/operacoes/{id}/`: Exclui uma operação.
    *   **`src/services/api.ts`**: Configuração global do Axios com interceptors para:
        *   **Autenticação**: Adiciona `Authorization: Bearer <token>` (com refresh automático para 401).
        *   **Multi-Tenancy**: Adiciona `X-Tenant-ID`.
        *   **Normalização de Respostas**: Extrai `results` de respostas paginadas do DRF.
        *   **Tratamento de Erros**: Converte `200 OK` com payload `403 Forbidden` em erro `403`.
    *   **Outros Endpoints Principais**:
        *   `/api/agricultura/culturas/`
        *   `/api/agricultura/movimentacoes-carga/`
        *   E endpoints CRUD para todas as outras entidades gerenciadas pelo módulo (insumos, máquinas, talhões, safras, etc.).

5.  **Vínculos e Interdependências com Outros Módulos**:
    *   **Estoque**:
        *   **Saídas**: Insumos utilizados em operações agrícolas geram **saídas** no Estoque.
        *   **Entradas**: Produtos colhidos (Colheitas) geram **entradas** no Estoque.
        *   **Reconciliação**: Comparação entre a produção agrícola e o estoque.
    *   **Financeiro**:
        *   **Custos**: Custos de insumos, mão de obra e operações são rateados por talhão e impactam o Financeiro.
        *   **Receitas**: Vendas de produtos colhidos geram receitas no Financeiro.
    *   **Fazendas**: Operações e safras são vinculadas a talhões e fazendas para gestão geoespacial e análise de produtividade.
    *   **Máquinas**: Uso de equipamentos em operações agrícolas (ex: plantadeiras, colheitadeiras). Manutenções e abastecimentos de máquinas podem ser gerenciados.
    *   **Administrativo**: Funcionários envolvidos em operações agrícolas podem ter seus dados gerenciados pelo Administrativo.
    *   **Comercial**: Produtos agrícolas podem ser vendidos através do módulo Comercial.
    *   **Fiscal**: Transações de compra/venda de insumos/produtos podem gerar documentos fiscais.