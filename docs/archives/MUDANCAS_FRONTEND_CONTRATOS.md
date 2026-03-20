# 🎯 Mudanças Frontend - Modal de Contratos

## Resumo das Alterações

O modal de contratos (`ContratoForm.tsx`) foi atualizado para incluir **abas específicas** para cada tipo de contrato cadastrado no backend:

### ✅ Novos Tipos de Contratos Suportados

1. **Compra** 🛒
   - Fornecedor (seleção)
   - Condição de Pagamento (dinheiro, crédito 30/60/90 dias, parcelado)
   - Prazo de Entrega (dias)
   - Desconto Global (%)

2. **Venda** 📊
   - Cliente (seleção)
   - Número de Parcelas
   - Periodicidade da Parcela (semanal, quinzenal, mensal, bimestral, trimestral)
   - Percentual de Comissão (%)
   - Rastrear Comissão (checkbox)

3. **Financeiro** 💰
   - Tipo de Produto Financeiro (empréstimo, consórcio, seguro, aplicação)
   - Instituição Financeira (seleção)
   - Valor de Entrada
   - Taxa de Juros (%)
   - Prazo (meses)
   - Número de Parcelas

### 📋 Estrutura do Modal Atualizada

**Abas Dinâmicas:**
- ✅ Dados Gerais (sempre presente)
- ✅ Aba Específica (compra/venda/financeiro - aparece conforme o tipo selecionado)
- ✅ Partes (sempre presente)
- ✅ Itens (sempre presente)
- ✅ Condições (sempre presente)
- ✅ Documento (sempre presente)

### 🔄 Fluxo de Funcionamento

1. Usuário seleciona tipo de contrato na aba "Dados Gerais"
2. O modal **exibe automaticamente** a aba específica para esse tipo
3. Usuário preenche os campos específicos
4. Ao submeter, os dados específicos são agrupados e enviados ao backend

### 💾 Integração com Backend

Os dados específicos são enviados estruturados:
```javascript
{
  tipo_contrato: 'compra',
  // ... dados gerais ...
  compra_especifico: {
    fornecedor_id: 1,
    condicao_pagamento: 'dinheiro',
    prazo_entrega_dias: 5,
    desconto_global_percentual: 0
  },
  // ... partes, itens, condicoes ...
}
```

### 🎨 Estados Gerenciados

Cada tipo de contrato tem seu próprio estado:
- `compraData` - Dados específicos de compra
- `vendaData` - Dados específicos de venda
- `financeiroData` - Dados específicos de financeiro

### 📝 Arquivo Modificado

- `/frontend/src/components/comercial/ContratoForm.tsx`
  - Adicionados 3 novos tipos de abas
  - Lógica de exibição condicional de abas baseada em tipo_contrato
  - Estados específicos para cada tipo
  - Renderização de formulários específicos
  - Tratamento de dados na submissão

### ✨ Próximas Etapas Sugeridas

- [ ] Integrar com API de clientes para aba Venda
- [ ] Integrar com API de fornecedores para aba Compra (já implementado)
- [ ] Validação de campos específicos com Yup
- [ ] Testes unitários para cada tipo de contrato
- [ ] Documentação de tipos TypeScript para dados específicos
