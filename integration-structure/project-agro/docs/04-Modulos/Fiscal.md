# Fiscal

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — revise `backend/apps/fiscal` para tenant-scoped queries e `views_overrides` aplicados.
- **Runbooks:** Runbook de certificados (A3/A1) e troubleshooting foram arquivados em `docs/archived/RUNBOOK_CERTIFICADOS_A3.md`.

**Última Revisão:** Março 2026  
**Links Relacionados:** 
- [05-APIs-e-Endpoints.md](../05-APIs-e-Endpoints.md)
- [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md)
- **[📋 Documentação Fiscal](../FISCAL_TEMP/README.md)** ← Referência técnica, manifestações, operação

## 📋 Visão Geral
O módulo Fiscal garante conformidade tributária, processando NFEs, gerenciando certificados digitais e validando operações com SEFAZ. Centraliza impostos e obrigações fiscais de todas as transações.

## 🎯 Objetivos
- Processar NFEs de entrada/saída.
- Gerenciar certificados digitais.
- Validar conformidade SEFAZ.
- Calcular impostos automáticos.
- Manter registros fiscais.

## 🔧 Funcionalidades
- **Processamento NFE:** Entrada/saída, validação XML.
- **Certificados Digitais:** Gestão de A1/A3.
- **Validações SEFAZ:** Consultas de status, contingências.
- **Cálculos de Impostos:** ICMS, PIS, COFINS automáticos.
- **Relatórios Fiscais:** SPED, obrigações acessórias.
- **Integração com Fornecedores:** Cadastro via CNPJ.
- **Reflexão no Estoque:** Ajustes de quantidade/valor via overrides, aplicação automática em movimentações de estoque.
- **Reflexão de Fornecedor (Comercial):** Permite criar/atualizar o `Fornecedor` no módulo Comercial a partir dos dados do emitente da NFe. Conflitos são detectados e o usuário pode confirmar aplicação (forçar). A UI (`NfeEditModal`) agora exibe o `Fornecedor (Comercial)` atual quando disponível.

## 📊 Classes/Modelos Principais
- **NFE:** Número, série, emitente/destinatário, itens, impostos.
- **ItemNFe:** Itens da NFe com quantidade, valor, impostos.
- **ItemNFeOverride:** Ajustes de quantidade/valor para reflexão no estoque.
- **Certificado:** Tipo (A1/A3), validade, senha.
- **Imposto:** Tipo, alíquota, base cálculo.
- **ValidacaoSEFAZ:** Status, código retorno, mensagem.
- **RegistroFiscal:** Período, totais impostos.

## 📝 Formulários
- **NFEForm:** Upload XML, validação.
- **CertificadoForm:** Upload arquivo, senha.
- **ImpostoForm:** Tipo, alíquota, produto.
- **ValidacaoForm:** Consulta SEFAZ.

## 💰 Despesas e Financeiro
- **Impostos:** Cálculos automáticos em NFEs, rateados por talhão.
- **Obrigações:** Custos de compliance fiscal.
- **Relatórios:** Impacto fiscal em lucros.

## 🔗 Relações Intra-modulares
- NFE ↔ ItemNFe (um-para-muitos).
- ItemNFe ↔ ItemNFeOverride (um-para-muitos).
- NFE ↔ Imposto (um-para-muitos).
- Certificado ↔ ValidacaoSEFAZ (um-para-muitos).
- RegistroFiscal agrega NFE e Imposto.

## 🔗 Relações com Outros Módulos
- **Estoque:** Entradas via NFE (confirmar_estoque), categorias NCM, reflexão via overrides em MovimentacaoEstoque.
- **Financeiro:** Custos de impostos rateados, vencimentos automáticos.
- **Administrativo:** Impostos sobre folha (INSS/IR).
- **Comercial:** Fornecedores vinculados a NFe, reflexão de fornecedor.
- **Fazendas:** Impostos por talhão/fazenda.
- **Intra-aplicações:** Todas transações passam por validação fiscal.

## 🔄 Reflexão no Estoque
Funcionalidade para ajustar valores de itens NFe e refletir automaticamente no módulo Estoque.

### Como Funciona
- **Overrides:** Permite criar ajustes em quantidade e valor unitário de itens NFe.
- **Aplicação:** Overrides podem ser aplicados antes (afetam confirmação) ou após (criam ajustes) a confirmação do estoque.
- **Integração:** Cria MovimentacaoEstoque de ajuste, atualiza custo médio ponderado, gera auditoria.

### Fluxo
1. Importar NFe e editar valores via modal (NfeEditModal).
2. Salvar overrides (aplicados=true para efeito imediato).
3. Confirmar estoque: usa valores efetivos.
4. Pós-confirmação: "Refletir no Estoque" aplica ajustes via apply_item_override.
5. Reflexão de fornecedor: a partir da modal do detalhe NFe é possível refletir o emitente para o cadastro de `Fornecedor` no módulo `Comercial` via o endpoint `POST /api/fiscal/nfes/{id}/reflect_fornecedor/`. O endpoint retorna o fornecedor criado/atualizado e um diff quando há conflito (requere confirmação do usuário antes de aplicar mudanças).

### Documentação Detalhada
Ver [NOTA_FISCAL_OVERRIDES.md](Fiscal/NOTA_FISCAL_OVERRIDES.md) para implementação completa.

## � Dashboard Fiscal

A aba **Dashboard** do módulo Fiscal consolida informações em tempo real:

### Componentes

**FiscalDashboard.tsx** — Componente responsável por:
- Carregar dados reais da API (`listNfes`)
- Calcular valores consolidados (impostos, conformidade)
- Exibir placeholders inteligentes quando sem dados
- Tratamento de erros com feedback ao usuário

### Dados Consolidados

O Dashboard calcula e exibe:

```
┌─────────────────────────┬──────────────────────┐
│ Impostos Totais         │ Notas Emitidas       │
│ R$ (ICMS+PIS+COFINS)    │ Quantidade total     │
│ Alíquota efetiva: X.XX% │ Valor total: R$ X    │
├─────────────────────────┼──────────────────────┤
│ Conformidade            │ Pendências           │
│ X% (processadas/total)  │ Aguardando processo. │
│ N de M notas            │ Total pendente       │
└─────────────────────────┴──────────────────────┘
```

### Cálculos

```
totalValue = soma(nfe.valor)
totalICMS = soma(nfe.icms_total)
totalPIS = soma(nfe.pis_total)
totalCOFINS = soma(nfe.cofins_total)

processedNfes = count(estoque_confirmado === true)
pendingNfes = count(estoque_confirmado === false)
complianceRate = (processedNfes / totalNfes) * 100
effectiveTaxRate = (totalICMS + totalPIS + totalCOFINS) / totalValue * 100
```

### Obrigações Fiscais

Exibe tabela com ICMS, PIS/COFINS por período com:
- Valor consolidado
- Status (Pendente/Pago)
- Data de vencimento

### Progress Bars Dinâmicos

- **Notas Processadas:** % de notas com estoque confirmado
- **Impostos Calculados:** 0% se sem dados, 100% se tem
- **Índice Geral:** Média ponderada

### Smart Alerts

```
Se pendingNfes > 0:      "{X} nota(s) aguardando processamento"
Se complianceRate < 100: "Taxas de conformidade em {X}%"
Se totalNfes === 0:      "Nenhuma nota fiscal registrada"
Se complianceRate = 100: "Todas as notas processadas ✓"
```

### Exemplo com Dados

Com 2 notas importadas (Agropecuária + Fertilizantes):
```
Impostos Totais: R$ 183,97 (14.71% de alíquota efetiva)
Notas Emitidas: 2 notas, R$ 1.251,00 total
Conformidade: 50% (1 de 2 processadas)
Pendências: 1 nota aguardando
```

---
## 🔍 Aba Impostos

Visualização especializada para análise de impostos por nota fiscal.

### Componentes

**NfeListImpostos.tsx** — Lista de notas com focus em impostos  
**NfeImpostosDetail.tsx** — Detalhes de impostos com breakdown

### Layout

Layout 2-painéis (desktop responsivo):

```
┌──────────────────────────────────┬──────────────────────────┐
│  LISTA DE NOTAS FISCAIS          │  DETALHES DE IMPOSTOS    │
│                                  │                          │
│  Status │ Chave │ Valor │ Emit.  │  Referência:             │
│  ✓      │ 3519… │ R$ …  │ Fert…  │  Chave: 3519…           │
│  ⚠      │ 3519… │ R$ …  │ Agro…  │  Emitente: Fertiliz...  │
│         │       │       │        │  Valor: R$ 651,00       │
│                                  │  Itens: 2                │
│                                  │                          │
│                                  │  RESUMO DE IMPOSTOS:     │
│                                  │  ┌────────────────────┐  │
│                                  │  │ ICMS: R$ 69,57 🔴 │  │
│                                  │  │ PIS:  R$ 8,12  🟠 │  │
│                                  │  │ COFINS: R$ 37,48 🔵│  │
│                                  │  │ ──────────────────  │  │
│                                  │  │ TOTAL: R$ 115,17   │  │
│                                  │  │ Alíquota: 17.69%   │  │
│                                  │  └────────────────────┘  │
│                                  │                          │
│                                  │ DETALHAMENTO POR ITEM:  │
│                                  │ Produto│ Qtd │ICMS│    │
│                                  │ Calc.. │ 2t  │ 0  │    │
│                                  │ Fosf.. │ 1.5 │ 0  │    │
│                                  │                          │
│                                  │ ⚠️ Imposto item=0*       │
│                                  │ *Será mapeado em breve  │
└──────────────────────────────────┴──────────────────────────┘
```

### Componentes

**NfeListImpostos.tsx** (182 linhas)
- Carrega NF-es do backend
- Exibe lista com status visual (CheckCircle/Warning)
- Seleção com clique simples
- SEM upload (apenas visualização)

**NfeImpostosDetail.tsx** (340+ linhas)
- Cards coloridos para ICMS (vermelho), PIS (laranja), COFINS (azul)
- Tabela de itens com impostos por linha
- Cálculo automático de alíquota efetiva
- Alert sobre limitação de imposto por item (0.00 temporariamente)

### Diferenças da Aba "Notas Fiscais"

```
Notas Fiscais:  Lista genérica + NfeDetail + Upload form
Impostos:       Lista especializada + NfeImpostosDetail, SEM upload
```

A aba Impostos remove o formulário de upload e oferece visualização de impostos consolidada e detalhada.

### Dados Exibidos

```
Resumo:
- ICMS Total: Soma de todos os icms_total
- PIS Total: Soma de todos os pis_total
- COFINS Total: Soma de todos os cofins_total
- Total Impostos: ICMS + PIS + COFINS
- Alíquota Efetiva: Total Impostos / Valor Nota * 100

Por Item:
- Produto, quantidade, unidade, impostos por item
- Nota: Item-level taxes = 0.00 (será mapeado em breve)
```

---
## �🔗 Endpoints Principais
- `/api/fiscal/nfes/`
- `/api/fiscal/certificados/`

Ver [08-Integracoes-e-Relacionamentos.md](../08-Integracoes-e-Relacionamentos.md) para detalhes.</content>
<parameter name="filePath">/home/felip/projeto-agro/docs/04-Modulos/Fiscal.md

- Arquivado: consulte [docs/archived/RUNBOOK_CERTIFICADOS_A3.md](docs/archived/RUNBOOK_CERTIFICADOS_A3.md) para detalhes do módulo Fiscal.