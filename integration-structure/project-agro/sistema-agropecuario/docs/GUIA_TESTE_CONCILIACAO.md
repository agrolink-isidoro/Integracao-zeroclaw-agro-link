# 🧪 GUIA DE TESTE: Conciliação Bancária

## 📝 Passo a Passo Completo

### ✅ **PASSO 1: Criar Conta Bancária de Teste**

1. Acesse: **http://localhost:5173/financeiro**
2. Clique na aba **"Contas Bancárias"** > sub-aba **"Contas Bancárias"**
3. Clique em **"Nova Conta"**
4. Preencha:
   ```
   Banco: Banco do Brasil
   Agência: 1234
   Conta: 12345-6
   Tipo: Corrente
   Saldo Inicial: 5000.00
   Data Saldo Inicial: 2026-01-01
   ```
5. Clique **"Salvar"**
6. **ANOTE O ID** da conta criada (aparece na listagem)

---

### ✅ **PASSO 2: Criar Vencimentos de Teste**

1. Vá na aba **"Vencimentos"** > sub-aba **"Lista da Semana"**
2. Crie **5 vencimentos** clicando em **"+ Novo Vencimento"**:

**Vencimento 1:**
```
Título: Venda Equipamento Usado
Descrição: (opcional)
Valor: 1500.00
Data Vencimento: 2026-01-29
Tipo: Receita
Status: Pendente
Conta Bancária: [selecione a conta criada no passo 1]
Talhão: (opcional)
```

**Vencimento 2:**
```
Título: Pagamento Funcionários
Descrição: (opcional)
Valor: 2200.00
Data Vencimento: 2026-01-30
Tipo: Despesa
Status: Pendente
Conta Bancária: [selecione a conta criada no passo 1]
Talhão: (opcional)
```

**Vencimento 3:**
```
Título: Pagamento Fornecedor ABC - Sementes
Descrição: (opcional)
Valor: 1250.00
Data Vencimento: 2026-01-31
Tipo: Despesa
Status: Pendente
Conta Bancária: [selecione a conta criada no passo 1]
Talhão: (opcional)
```

**Vencimento 4:**
```
Título: Venda de Grãos - Cliente XYZ
Descrição: (opcional)
Valor: 3500.00
Data Vencimento: 2026-02-01
Tipo: Receita
Status: Pendente
Conta Bancária: [selecione a conta criada no passo 1]
Talhão: (opcional)
```

**Vencimento 5:**
```
Título: Pagamento Aluguel Galpão
Descrição: (opcional)
Valor: 800.00
Data Vencimento: 2026-02-02
Tipo: Despesa
Status: Pendente
Conta Bancária: [selecione a conta criada no passo 1]
Talhão: (opcional)
```

> **📌 Nota**: O campo "Conta Bancária" é **obrigatório**. Selecione a mesma conta que você criou no Passo 1.
> 
> **📌 Talhões**: Se não houver talhões cadastrados, o campo aparecerá vazio. Isto é normal - deixe sem selecionar.
> 
> **✅ Confirmação**: Após clicar em "Criar", você verá uma notificação verde de sucesso no canto superior direito.

---

### ✅ **PASSO 3: Importar Extrato Bancário**

1. Vá na aba **"Contas Bancárias"** > sub-aba **"Extratos Bancários"**
2. Clique em **"Novo Extrato"**
3. No modal:
   - **Conta Bancária**: Selecione a conta criada
   - **Arquivo**: Faça upload do arquivo:
     ```
     /home/felip/projeto-agro/sistema-agropecuario/bank_statements/extrato_teste.csv
     ```

4. Clique em **"Preview"** (opcional) para ver as 5 transações
5. Clique em **"Importar"**
6. Aguarde o alert: *"Importação concluída com sucesso"*

---

### ✅ **PASSO 4: Conciliar Automaticamente**

1. **APÓS** a importação, aparecerá um **botão verde "🔗 Conciliar"**
2. Clique em **"🔗 Conciliar"**
3. O sistema irá:
   - ✅ Converter as 5 transações → ItemExtratoBancario
   - ✅ Executar algoritmo de matching
   - ✅ Conciliar automaticamente os itens com score ≥ 90%

4. Você verá um **Card de Resultado** com:
   ```
   Itens Criados:        5
   Conciliados Auto:     5 (esperado: 4-5)
   Sugestões:            0 (esperado: 0-1)
   Duplicados:           0
   ```

---

### ✅ **PASSO 5: Verificar Resultados**

#### 5.1 Verificar Vencimentos Conciliados

1. Volte para **"Vencimentos"** > **"Lista da Semana"**
2. Verifique que os 5 vencimentos agora estão com:
   - ✅ **Status**: `Pago`
   - ✅ **Data Pagamento**: Preenchida
   - ✅ **Badge**: "✓ Confirmado no Extrato"

#### 5.2 Ver Sugestões Manuais (se houver)

1. Se houver sugestões (score 60-89%), você verá uma **tabela**:
   ```
   | Data       | Extrato              | Vencimento          | Similaridade |
   |------------|----------------------|---------------------|--------------|
   | 2026-02-01 | DEP VENDA GRAOS...   | Venda de Grãos...   | 85%          |
   |            | R$ 3500.00           | R$ 3500.00          |              |
   ```

2. Para conciliar manualmente (se necessário):
   - Anote o `item_id` e `vencimento_id`
   - Use a API:
     ```bash
     curl -X POST http://localhost:8000/api/financeiro/itens-extrato/{item_id}/conciliar_manual/ \
       -H "Authorization: Bearer YOUR_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"vencimento_id": 123}'
     ```

---

## 🎯 **Resultado Esperado**

### Antes da Conciliação:
- ✅ 5 vencimentos pendentes
- ✅ 0 itens de extrato

### Depois da Conciliação:
- ✅ 5 vencimentos **pagos** e **confirmados no extrato**
- ✅ 5 itens de extrato **conciliados**
- ✅ Matching automático funcionando (score ≥ 90%)

---

## 🔍 **Verificar Dados via API (Opcional)**

```bash
# 1. Listar itens de extrato conciliados
curl http://localhost:8000/api/financeiro/itens-extrato/?conciliado=true

# 2. Listar itens pendentes (não conciliados)
curl http://localhost:8000/api/financeiro/itens-extrato/pendentes/

# 3. Ver vencimentos confirmados
curl http://localhost:8000/api/financeiro/vencimentos/?confirmado_extrato=true

# 4. Ver detalhes de uma importação
curl http://localhost:8000/api/financeiro/bank-statements/{import_id}/
```

---

## 🐛 **Troubleshooting**

### Problema: Score baixo (< 90%)
**Causa**: Descrições muito diferentes entre extrato e vencimento  
**Solução**: Use conciliação manual ou ajuste as descrições

### Problema: Nenhum match encontrado
**Causa**: Datas muito distantes (> 3 dias) ou valores diferentes  
**Solução**: Verifique se vencimento.data_vencimento ≈ item.data (±3 dias)

### Problema: Duplicados detectados
**Causa**: Mesmo extrato importado 2x  
**Solução**: Normal! O sistema detecta e pula automaticamente

---

## 📊 **Entendendo o Score**

### Score de Similaridade (0-100%):

- **≥ 90%** 🟢 = Conciliação automática
  - Data: mesma ou ±1 dia
  - Valor: exato (diferença < R$ 0.01)
  - Descrição: muito similar

- **60-89%** 🟡 = Sugestão para revisão manual
  - Data: ±2-3 dias
  - Valor: exato
  - Descrição: parcialmente similar

- **< 60%** 🔴 = Ignorado (não sugere)
  - Muitas diferenças

---

## ✨ **Próximos Testes**

Após dominar o fluxo básico, teste:

1. **Extrato com formato específico de banco:**
   - Use parsers BB, Itaú, Bradesco (FASE 5)
   - Crie CSV com formato real do banco

2. **Conciliação manual:**
   - Crie vencimento com descrição diferente
   - Revise sugestões e concilie via UI

3. **Desconciliar item:**
   - Corrija erro de conciliação
   - Use botão "Desconciliar"

4. **Transferências entre contas:**
   - Crie 2 contas
   - Faça transferência
   - Concilie em ambas as contas

---

## 📝 **Arquivo de Teste Criado**

**Localização:**
```
/home/felip/projeto-agro/sistema-agropecuario/bank_statements/extrato_teste.csv
```

**Conteúdo:**
```csv
date,amount,description,external_id,balance
2026-01-29,1500.00,DEP VENDA EQUIPAMENTO,TRX001,6500.00
2026-01-30,-2200.00,PIX PAGTO FUNCIONARIOS,TRX002,4300.00
2026-01-31,-1250.00,TED FORNEC ABC SEMENTES,TRX003,3050.00
2026-02-01,3500.00,DEP VENDA GRAOS XYZ,TRX004,6550.00
2026-02-02,-800.00,DEB AUTO ALUGUEL GALPAO,TRX005,5750.00
```

**Formato:** Generic CSV (compatível com sistema antigo)  
**Encoding:** UTF-8  
**Transações:** 5 (3 débitos, 2 créditos)

---

## 🎉 **Sucesso!**

Se tudo funcionou:
- ✅ 5 vencimentos conciliados automaticamente
- ✅ Score ≥ 90% em todos os matches
- ✅ Vencimentos marcados como "pago" e "confirmado no extrato"
- ✅ Sistema de conciliação 100% funcional!

**Parabéns! 🚀 A FASE 5 está completa e testada!**
