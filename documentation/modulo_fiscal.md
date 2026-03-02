### **Resumo da Análise do Módulo "Fiscal"**

1.  **Visão Geral do Módulo**:
    *   Garante a conformidade tributária e fiscal do sistema agropecuário.
    *   Processa Notas Fiscais Eletrônicas (NFEs) de entrada e saída, incluindo validação XML.
    *   Gerencia certificados digitais (A1/A3) para comunicação segura com a SEFAZ.
    *   Realiza validações e consultas de status junto à SEFAZ.
    *   Calcula impostos automaticamente (ICMS, PIS, COFINS) e mantém registros fiscais.
    *   Centraliza obrigações fiscais e fornece relatórios para SPED e outras obrigações acessórias.

2.  **Componentes Chave (Funcionalidades e Modelos)**:
    *   **Processamento de NFE**: Funcionalidade para importação, validação e gestão de NFEs.
        *   *Modelos:* `NFE`, `ItemNFe`, `ItemNfeOverride`.
    *   **Gestão de Certificados Digitais**: Armazenamento e uso de certificados A1/A3.
        *   *Modelos:* `Certificado`.
    *   **Validações SEFAZ**: Consultas de status, contingências e comunicação com órgãos fiscais.
        *   *Modelos:* `ValidacaoSEFAZ`.
    *   **Cálculo de Impostos**: Determinação automática de ICMS, PIS, COFINS.
        *   *Modelos:* `Imposto`.
    *   **Relatórios e Registros Fiscais**: Geração de documentos e manutenção de históricos.
        *   *Modelos:* `RegistroFiscal`.
    *   **Integração com Fornecedores**: Cadastro e atualização de fornecedores via CNPJ da NFE.
    *   **Reflexão no Estoque**: Ajuste de quantidade/valor de itens NFE no módulo Estoque.
    *   **Dashboard Fiscal**: Componente (`FiscalDashboard.tsx`) que consolida informações em tempo real (impostos totais, notas emitidas, conformidade, pendências).
    *   **Aba Impostos**: Visualização especializada (`NfeListImpostos.tsx`, `NfeImpostosDetail.tsx`) para análise detalhada de impostos por nota fiscal e por item.
    *   **Formulários**: `NFEForm`, `CertificadoForm`, `ImpostoForm`, `ValidacaoForm`.

3.  **Fluxo de Dados e Estado**:
    *   NFEs são importadas (via XML) e seus dados são processados, gerando `NFE`s e `ItemNFe`s.
    *   Certificados digitais são usados para assinar e transmitir documentos fiscais à SEFAZ.
    *   Impostos são calculados automaticamente com base nos itens da NFE.
    *   `ItemNfeOverride`s permitem ajustes manuais que afetam a reflexão no Estoque.
    *   O status de conformidade e as pendências são atualizados dinamicamente no Dashboard Fiscal.
    *   A reflexão de fornecedor cria ou atualiza registros no módulo Comercial.
    *   Impostos trabalhistas do Administrativo são lançados como `ImpostoFederal` no Fiscal.

4.  **Integração com a API (Endpoints)**:
    *   **`/api/fiscal/nfes/`**: Gerencia NFEs (CRUD, upload XML, validação).
    *   **`/api/fiscal/certificados/`**: Gerencia certificados digitais (CRUD, upload).
    *   **`POST /api/fiscal/nfes/{id}/reflect_fornecedor/`**: Reflete dados do emitente da NFE para o cadastro de `Fornecedor` no módulo Comercial.
    *   Endpoints para consultas SEFAZ e cálculos de impostos (implícitos).

5.  **Vínculos e Interdependências com Outros Módulos**:
    *   **Estoque**: Recebe entradas de itens via NFE (confirmar_estoque), com categorias NCM e reflexão de ajustes via `ItemNfeOverride`s em `MovimentacaoEstoque`.
    *   **Financeiro**: Custos de impostos são rateados e podem gerar vencimentos automáticos.
    *   **Administrativo**: Recebe impostos sobre folha de pagamento (INSS/IR) para registro como `ImpostoFederal`.
    *   **Comercial**: Vincula fornecedores a NFEs e permite a reflexão de dados do emitente para o cadastro de `Fornecedor`.
    *   **Fazendas**: Impostos podem ser associados a talhões/fazendas para análises específicas.
    *   **Intra-aplicações**: Todas as transações que envolvem movimentação de produtos ou serviços podem passar por validação fiscal.