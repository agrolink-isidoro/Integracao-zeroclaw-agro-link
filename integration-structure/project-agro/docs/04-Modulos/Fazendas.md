# Fazendas

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — dados geoespaciais e talhões isolados por tenant.
- **Observações:** Verificar permissões relacionadas a visualização de talhões em tenant diferentes.

**Última Revisão:** Março 2026  
**Links Relacionados:** [05-APIs-e-Endpoints.md](../05-APIs-e-Endpoints.md) | [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md)

## 📋 Visão Geral
O módulo Fazendas gerencia propriedades agrícolas, proprietários, fazendas, talhões e áreas geoespaciais. Centraliza informações territoriais para rateios e análises geoespaciais.

## 🎯 Objetivos
- Cadastrar proprietários e fazendas.
- Dividir fazendas em talhões.
- Gerenciar arrendamentos e coletas.
- Fornecer base geoespacial para rateios.
- Integrar com operações agrícolas.

## 🔧 Funcionalidades
- **CRUD de Proprietários:** Dados pessoais, propriedades.
- **Fazendas:** Cadastro com localização, área total.
- **Talhões:** Subdivisões com coordenadas GPS.
- **Arrendamentos:** Contratos de aluguel.
- **Coletas:** Amostras de solo/plantas.
- **Mapas:** Visualização geoespacial.

## 📊 Classes/Modelos Principais
- **Proprietario:** Nome, CPF/CNPJ, contato.
- **Fazenda:** Nome, proprietário, localização, área.
- **Talhao:** Fazenda, nome, coordenadas, área, cultura.
- **Arrendamento:** Fazenda, arrendatário, vigência, valor.
- **Coleta:** Talhão, tipo (solo/planta), data, resultados.

## 📝 Formulários
- **ProprietarioForm:** Nome, CPF/CNPJ, contato.
- **FazendaForm:** Nome, proprietário, localização, área.
- **TalhaoForm:** Fazenda, nome, coordenadas, área.
- **ArrendamentoForm:** Fazenda, arrendatário, vigência, valor.
- **ColetaForm:** Talhão, tipo, data, resultados.

## 💰 Despesas e Financeiro
- **Arrendamentos:** Custos de aluguel rateados por talhão.
- **Rateios:** Todos custos alocados por talhão/fazenda.
- **Relatórios:** Rentabilidade por área.

## 🔗 Relações Intra-modulares
- Proprietario ↔ Fazenda (um-para-muitos).
- Fazenda ↔ Talhao (um-para-muitos).
- Talhao ↔ Coleta (um-para-muitos).
- Arrendamento ↔ Fazenda (muitos-para-um).

## 🔗 Relações com Outros Módulos
- **Financeiro:** Rateios por talhão/fazenda.
- **Agrícola:** Operações vinculadas a talhões.
- **Estoque:** Movimentações por talhão.
- **Administrativo:** Centros de custo por talhão.
- **Intra-aplicações:** Base territorial para todos rateios.

## 🔗 Endpoints Principais
- `/api/fazendas/proprietarios/`
- `/api/fazendas/fazendas/`
- `/api/fazendas/talhoes/`

Ver [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md) para detalhes.</content>
<parameter name="filePath">/home/felip/projeto-agro/docs/04-Modulos/Fazendas.md