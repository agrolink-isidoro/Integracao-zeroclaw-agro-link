### **Resumo da Análise do Módulo "Fazendas"**

1.  **Visão Geral do Módulo**:
    *   Gerencia todas as informações territoriais e de propriedade do sistema agropecuário.
    *   Permite o cadastro e controle de proprietários, fazendas, talhões e áreas geoespaciais.
    *   Centraliza dados para a base geoespacial, essencial para rateios de custos e análises de produtividade.
    *   Gerencia arrendamentos e coletas de amostras (solo/plantas).
    *   Integra-se fortemente com as operações agrícolas e outros módulos que dependem de localização.

2.  **Componentes Chave (Funcionalidades e Modelos)**:
    *   **Gestão de Proprietários**: Cadastro de dados pessoais e propriedades.
        *   *Modelos:* `Proprietario`.
        *   *Formulários:* `ProprietarioForm`.
    *   **Gestão de Fazendas**: Cadastro com localização, área total e proprietário.
        *   *Modelos:* `Fazenda`.
        *   *Formulários:* `FazendaForm`.
    *   **Gestão de Talhões**: Subdivisões das fazendas com coordenadas GPS, área e cultura associada.
        *   *Modelos:* `Talhao`.
        *   *Formulários:* `TalhaoForm`.
    *   **Gestão de Arrendamentos**: Controle de contratos de aluguel de terras.
        *   *Modelos:* `Arrendamento`.
        *   *Formulários:* `ArrendamentoForm`.
    *   **Gestão de Coletas**: Registro de amostras de solo/plantas, datas e resultados.
        *   *Modelos:* `Coleta`.
        *   *Formulários:* `ColetaForm`.
    *   **Visualização de Mapas**: Funcionalidade para visualização geoespacial das propriedades e talhões.

3.  **Fluxo de Dados e Estado**:
    *   Proprietários são cadastrados e vinculados a uma ou mais fazendas.
    *   Fazendas são divididas em talhões, que possuem suas próprias coordenadas e áreas.
    *   Arrendamentos são registrados para fazendas, controlando a vigência e valores.
    *   Coletas de amostras são realizadas em talhões específicos, com seus resultados armazenados.
    *   Os dados geoespaciais são a base para a alocação de custos e o planejamento de operações agrícolas.
    *   O estado das propriedades (ocupação, cultura atual) é dinâmico e reflete as operações.

4.  **Integração com a API (Endpoints)**:
    *   **`/api/fazendas/proprietarios/`**: Gerencia proprietários (CRUD).
    *   **`/api/fazendas/fazendas/`**: Gerencia fazendas (CRUD).
    *   **`/api/fazendas/talhoes/`**: Gerencia talhões (CRUD).
    *   Endpoints para arrendamentos e coletas (implícitos).

5.  **Vínculos e Interdependências com Outros Módulos**:
    *   **Financeiro**:
        *   **Rateios**: Custos de arrendamentos e todos os outros custos são rateados por talhão/fazenda para análise de rentabilidade por área.
    *   **Agricultura**:
        *   **Operações**: Operações agrícolas (plantio, colheita, etc.) são diretamente vinculadas a talhões e fazendas.
        *   **Safras**: Safras são definidas para talhões específicos.
    *   **Estoque**:
        *   **Movimentações**: Movimentações de insumos e produtos podem ser rastreadas por talhão.
    *   **Administrativo**:
        *   **Centros de Custo**: Centros de custo podem ser associados a talhões para rateios administrativos.
    *   **Comercial**:
        *   **Contratos/Vendas**: Contratos de fornecimento e vendas de produtos podem ser vinculados a talhões/fazendas.
    *   **Intra-aplicações**: O módulo Fazendas fornece a base territorial para a maioria dos rateios e análises em todo o sistema.