### **Resumo da Análise do Módulo "Estoque"**

1.  **Visão Geral do Módulo**:
    *   Gerencia todos os itens em estoque: produtos agrícolas, insumos, peças de máquinas, combustíveis, etc.
    *   Controla entradas (compras, produção), saídas (vendas, consumo), transferências e inventário.
    *   Essencial para a gestão de recursos e custos.
    *   Layout específico (`EstoqueLayout`).

2.  **Componentes Chave**:
    *   **`EstoqueLayout.tsx`**: Layout principal do módulo, com navegação interna para Itens, Entradas, Saídas, Transferências, Inventário.
    *   **`ItensPage.tsx`**: Página de listagem e gerenciamento dos itens cadastrados no estoque (produtos, insumos, peças).
    *   **`EntradasPage.tsx`**: Página para registrar a entrada de itens no estoque (ex: compra de insumos, colheita de produtos).
    *   **`SaidasPage.tsx`**: Página para registrar a saída de itens do estoque (ex: venda de produtos, consumo de insumos por máquinas).
    *   **`TransferenciasPage.tsx`**: Página para gerenciar a movimentação de itens entre diferentes locais de estoque (se aplicável).
    *   **`InventarioPage.tsx`**: Página para realizar e ajustar inventários físicos.
    *   Componentes de formulário e detalhe para criação/edição/visualização de cada entidade.

3.  **Fluxo de Dados e Estado**:
    *   Utiliza `React Query` para buscar, cachear e invalidar dados de itens, entradas, saídas, transferências e inventários.
    *   Provavelmente usa *hooks* personalizados (ex: `useItensEstoqueQuery`, `useEntradasEstoqueQuery`).
    *   A quantidade e o status dos itens são atualizados dinamicamente com base nas operações de entrada e saída.

4.  **Integração com a API (Endpoints)**:
    *   **`src/services/estoqueService.ts`**: Serviço principal para interagir com os *endpoints* de estoque.
    *   *Endpoints* RESTful para:
        *   Listar, criar, buscar por ID, atualizar e deletar Itens de Estoque (`/api/v1/estoque/itens/`).
        *   Listar, criar, buscar por ID, atualizar e deletar Entradas de Estoque (`/api/v1/estoque/entradas/`).
        *   Listar, criar, buscar por ID, atualizar e deletar Saídas de Estoque (`/api/v1/estoque/saidas/`).
        *   Listar, criar, buscar por ID, atualizar e deletar Transferências de Estoque (`/api/v1/estoque/transferencias/`).
        *   Listar, criar, buscar por ID, atualizar e deletar Inventários (`/api/v1/estoque/inventarios/`).
        *   *Exemplo de Payload para Entrada:* `POST /api/v1/estoque/entradas/` com `{ "item_id": "uuid", "quantidade": 100, "data_entrada": "YYYY-MM-DD", "origem": "compra" }`
        *   *Exemplo de Payload para Saída:* `POST /api/v1/estoque/saidas/` com `{ "item_id": "uuid", "quantidade": 50, "data_saida": "YYYY-MM-DD", "destino": "venda" }`

5.  **Vínculos e Interdependências com Outros Módulos**:
    *   **Comercial (Vínculo Forte)**:
        *   **Vendas**: Itens vendidos no módulo Comercial geram **saídas** no Estoque. (Ex: `POST /api/v1/estoque/saidas/` referenciando `item_id` e `quantidade` da venda).
        *   **Compras**: Itens comprados no módulo Comercial geram **entradas** no Estoque. (Ex: `POST /api/v1/estoque/entradas/` referenciando `item_id` e `quantidade` da compra).
        *   **Produtos**: O cadastro de produtos no Comercial é o mesmo cadastro de itens no Estoque (vínculo via `item_id`/`produto_id`).
    *   **Agricultura**:
        *   **Colheitas**: Produtos colhidos no módulo Agricultura geram **entradas** no Estoque. (Ex: `POST /api/v1/estoque/entradas/` com `origem: "colheita"`).
        *   **Insumos**: Insumos utilizados em operações agrícolas geram **saídas** no Estoque. (Ex: `POST /api/v1/estoque/saidas/` com `destino: "operacao_agricola"`).
    *   **Máquinas**:
        *   **Manutenções**: Peças de reposição para máquinas geram **saídas** no Estoque. (Ex: `POST /api/v1/estoque/saidas/` com `destino: "manutencao_maquina"`).
        *   **Abastecimentos**: Combustíveis para máquinas geram **saídas** no Estoque. (Ex: `POST /api/v1/estoque/saidas/` com `destino: "abastecimento_maquina"`).
    *   **Financeiro (Implícito)**: O valor dos itens em estoque, o custo das entradas e o valor das saídas impactam diretamente o balanço e a contabilidade do módulo Financeiro.