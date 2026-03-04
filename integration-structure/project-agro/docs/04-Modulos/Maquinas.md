# Maquinas

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — revisar isolamento de dados de máquinas por tenant onde aplicável.
- **Observações:** Abastecimentos e alertas validados; ver `docs/archived/` para runbooks detalhados.

**Última Revisão:** Março 2026  
**Links Relacionados:** [05-APIs-e-Endpoints.md](../05-APIs-e-Endpoints.md) | [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md)

## 📋 Visão Geral
O módulo Máquinas gerencia equipamentos agrícolas, abastecimentos, manutenções e alocações. Controla custos operacionais e disponibilidade de máquinas para operações.

## 🎯 Objetivos
- Cadastrar e controlar equipamentos.
- Registrar abastecimentos e manutenções.
- Alocar máquinas para talhões/operacões.
- Controlar custos de operação.
- Manter histórico de uso.

## 🔧 Funcionalidades
- **CRUD de Equipamentos:** Tipo, modelo, capacidade.
- **Abastecimentos:** Combustível, data, quantidade.
- **Manutenções:** Preventivas/corretivas, custos.
- **Alocações:** Atribuição a talhões/operacões.
- **Relatórios:** Custos por máquina, horas trabalhadas.
- **Integração com Operações:** Uso em agrícolas.

## 📊 Classes/Modelos Principais
- **Equipamento:** Tipo, modelo, placa, capacidade.
- **Abastecimento:** Equipamento, data, combustível, quantidade, custo.
- **Manutencao:** Equipamento, tipo, data, custo, descrição.
- **Alocacao:** Equipamento, talhão, operação, horas.
- **RelatorioMaquina:** Período, totais custos.

## 📝 Formulários
- **EquipamentoForm:** Tipo, modelo, placa, capacidade.
- **AbastecimentoForm:** Equipamento, data, combustível, quantidade.
- **ManutencaoForm:** Equipamento, tipo, data, custo.
- **AlocacaoForm:** Equipamento, talhão, operação, horas.

## 💰 Despesas e Financeiro
- **Abastecimentos:** Custos de combustível rateados por talhão.
- **Manutenções:** Custos de reparos rateados.
- **Relatórios:** Custos operacionais por hectare.

## 🔗 Relações Intra-modulares
- Equipamento ↔ Abastecimento (um-para-muitos).
- Equipamento ↔ Manutencao (um-para-muitos).
- Equipamento ↔ Alocacao (um-para-muitos).
- RelatorioMaquina agrega todos.

## 🔗 Relações com Outros Módulos
- **Financeiro:** Custos rateados por talhão.
- **Agrícola:** Alocações para operações.
- **Fazendas:** Vinculação a talhões.
- **Estoque:** Movimentações de combustível e peças via abastecimentos/manutenções.
- **Intra-aplicações:** Custos afetam rateios financeiros.

## 🔗 Endpoints Principais
- `/api/maquinas/equipamentos/`
- `/api/maquinas/abastecimentos/`

Ver [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md) para detalhes.</content>
<parameter name="filePath">/home/felip/projeto-agro/docs/04-Modulos/Maquinas.md