# Administrativo

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — ver `sistema-agropecuario/backend/apps/core` e `frontend` TenantContext.
- **Integração Fiscal:** Fluxo de impostos trabalhistas mapeado; revisar `apps/administrativo` signals e testes relacionados.

**Última Revisão:** Março 2026  
**Links Relacionados:** [05-APIs-e-Endpoints.md](../05-APIs-e-Endpoints.md) | [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md)

## 📋 Visão Geral
O módulo Administrativo gerencia recursos humanos, custos administrativos e configurações do sistema. Centraliza informações sobre funcionários, centros de custo, folha de pagamento e despesas administrativas, integrando-se com financeiro para rateios de custos trabalhistas.

## 🎯 Objetivos
- Gerenciar cadastro e controle de funcionários.
- Processar folha de pagamento com cálculos de INSS/IR.
- Controlar centros de custo para rateios.
- Registrar despesas administrativas.
- Manter configurações e auditoria do sistema.

## 🔧 Funcionalidades
- **CRUD de Funcionários:** Cadastro com dados pessoais, salários, benefícios.
- **Centros de Custo:** Hierarquia para alocação de custos.
- **Folha de Pagamento:** Cálculos automáticos, itens de folha (horas extras, diárias), geração de impostos trabalhistas.
- **Despesas Administrativas:** Registro de custos operacionais.
- **Configurações do Sistema:** Parâmetros globais.
- **Auditoria:** Logs de mudanças e notificações.

## 📊 Classes/Modelos Principais
- **Funcionario:** Dados pessoais, salário, centro de custo, benefícios.
- **CentroCusto:** Nome, código, hierarquia.
- **FolhaPagamento:** Período, itens (FolhaItem), totais, impostos calculados.
- **FolhaItem:** Funcionário, salário base, horas extras, INSS, IR, outros descontos.
- **ImpostoTrabalhista:** Vinculado à folha, tipo (federal), valor, período.
- **DespesaAdministrativa:** Valor, data, centro de custo.
- **ConfiguracaoSistema:** Chaves/valores para configurações.
- **LogAuditoria:** Rastreamento de operações.

## 📝 Formulários
- **FuncionarioForm:** Campos para dados pessoais, salário, centro.
- **CentroCustoForm:** Nome, código, pai (hierarquia).
- **FolhaPagamento:** Seleção de funcionários, cálculos automáticos, preview de impostos.
- **DespesaForm:** Valor, data, centro, descrição.

## 💰 Despesas e Financeiro
- **Rateios de Custos:** Folhas de pagamento geram custos rateados por centro/talhão via financeiro.
- **Integração:** Despesas administrativas são rateadas automaticamente.
- **Relatórios:** Totais por centro de custo para análise financeira.

## 🧾 Integração com Fiscal - Impostos Trabalhistas

### Visão Geral
Os impostos trabalhistas calculados e executados na folha de pagamento devem ser automaticamente lançados no módulo Fiscal como impostos federais. Isso garante conformidade fiscal, rastreabilidade e integração com obrigações tributárias.

### Funcionalidades
- **Cálculo Automático:** INSS, IRRF, FGTS e outros impostos calculados na folha.
- **Lançamento Fiscal:** Criação automática de registros para recolhimento federal.
- **Rastreabilidade:** Vinculação direta entre folha e obrigações fiscais federais.
- **Relatórios:** Consolidação de impostos por período/competência.

### Fluxo de Integração
1. **Processamento da Folha:** Cálculos de salários, benefícios, descontos.
2. **Geração de Impostos:** INSS (empresa/empregado), IRRF, FGTS.
3. **Lançamento Fiscal:** Criação de `ImpostoFederal` no Fiscal com:
   - Tipo: "Trabalhista"
   - Origem: "FolhaPagamento-{id}"
   - Valor: Somatório dos impostos
   - Competência: Período da folha
   - Status: "Calculado" → "Lançado"
4. **Auditoria:** Logs de criação e vinculação.

### Classes Relacionadas
- **ImpostoTrabalhista (Administrativo):** Detalhes dos impostos por folha.
- **ImpostoFederal (Fiscal):** Registro consolidado para obrigações fiscais.

### Desenvolvimento Planejado
- **Backend:** Signal ou método em FolhaPagamento.save() para criar ImpostoFederal.
- **API:** Endpoint para sincronização manual se necessário.
- **Frontend:** Indicador visual de status fiscal na folha.
- **Testes:** Validações de cálculos e lançamentos automáticos.
- **Documentação:** Guias de conformidade e relatórios fiscais.

**Nota:** Esta integração será implementada na Sprint 5 (Fevereiro 2026), após estabilização dos módulos core.

## 🔗 Relações Intra-modulares
- Funcionario ↔ CentroCusto (muitos-para-um).
- FolhaPagamento ↔ Funcionario (um-para-muitos via FolhaItem).
- DespesaAdministrativa ↔ CentroCusto (muitos-para-um).
- LogAuditoria rastreia mudanças em todos os modelos.

## 🔗 Relações com Outros Módulos
- **Financeiro:** Rateios de custos trabalhistas e administrativos por talhão/fazenda.
- **Fazendas:** Centros de custo associados a talhões para rateios geoespaciais.
- **Fiscal:** Recolhimento de impostos federais trabalhistas (INSS/IR/FGTS) calculados na folha de pagamento.
- **Estoque:** Movimentações de suprimentos administrativos (ex.: materiais de escritório).
- **Intra-aplicações:** Dados de funcionários usados em operações agrícolas (responsáveis).

## 🔗 Endpoints Principais
- `/api/administrativo/funcionarios/`
- `/api/administrativo/centros-custo/`
- `/api/administrativo/folha-pagamento/`
- `/api/administrativo/backfill-rateios/`

Ver [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md) para detalhes.</content>
<parameter name="filePath">/home/felip/projeto-agro/docs/04-Modulos/Administrativo.md