# ANÁLISE DETALHADA DOS 3 TIPOS PRINCIPAIS DE CONTRATO

**Data:** 2026-03-14  
**Foco:** Compra vs. Venda vs. Financeiro  
**Objetivo:** Diferenciar claramente quando usar cada tipo

---

## 🎯 VISÃO GERAL COMPARATIVA

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        3 TIPOS PRINCIPAIS DE CONTRATO                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. COMPRA (Aquisição)          2. VENDA (Comercialização)  3. FINANCEIRO   │
│  ├─ Modelo: Contrato/Compra     ├─ Modelo: VendaContrato    ├─ Integração  │
│  ├─ Tipo: 'compra'              ├─ Tipos: A_VISTA, PARCELA. ├─ ParcelaCtto │
│  ├─ Parceiro: Fornecedor        ├─ Parceiro: Cliente         ├─ Modelo: Vtd │
│  ├─ Direção: Entrada            ├─ Direção: Saída            ├─ Modelo: Var │
│  └─ Impacto: Estoque +          ├─ Impacto: Estoque -        └─ Impacto: $  │
│                                 └─ Impacto: Financeiro        ou Parcelas   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ TIPO: COMPRA

### 1.1 Identificação
| Propriedade | Valor |
|------------|-------|
| **Modelo Django** | `Contrato` ou `Compra` |
| **Campo tipo_contrato** | `'compra'` |
| **Localização** | `comercial/models.py:L410-L445`, `L447-L495` |
| **Parceiro Principal** | `Fornecedor` |
| **Direção de Fluxo** | ➡️ **ENTRADA** (Aquisição) |
| **Impacto Principal** | 📦 Estoque (entrada) + 💰 Caixa (saída) |

### 1.2 Campos ESPECÍFICOS da Compra

```python
# Modelo: Compra (comercial/models.py:L410)
class Compra(TenantModel):
    # CAMPOS ESPECÍFICOS PARA COMPRA:
    fornecedor = ForeignKey('Fornecedor', null=True)  # ← Único p/ Compra
    
    # FINANCEIRO:
    valor_icms = DecimalField(null=True)              # ← Imposto ICMS
    valor_pis = DecimalField(null=True)               # ← Imposto PIS
    valor_cofins = DecimalField(null=True)            # ← Imposto COFINS
    
    # FISCAL:
    xml_content = TextField(null=True)                # ← Arquivo NFe XML
    nfe = ForeignKey('fiscal.NFe', null=True)        # ← NFe associada
    numero_nfe = CharField(unique=True)               # ← Número da nota
    chave_nfe = CharField()                           # ← Chave fiscal
    
    # CAMPOS GENÉRICOS:
    data = DateField()
    valor_total = DecimalField()
    descricao = TextField()
```

### 1.3 Validações Específicas da Compra

```python
# Validações obrigatórias:
✅ fornecedor (obrigatório)       # Deve informar quem está vendendo
✅ valor_total > 0                 # Deve ter valor positivo
✅ data_compra <= hoje             # Não pode ser futura
✅ xml_content OU número_nfe       # Deve ter rastreabilidade fiscal

# Restrições:
❌ NÃO pode ter cliente            # Compra é de fornecedor, não para cliente
❌ NÃO pode gerar saída estoque    # Apenas entrada
❌ NÃO pode VendaContrato liga     # É origem diferente
```

### 1.4 Sub-modelos Relacionados

| Sub-modelo | Uso | Relacionamento |
|-----------|-----|-----------------|
| **Fornecedor** | Quem vende | `ForeignKey` obrigatória |
| **NFe** (fiscal) | Rastreabilidade | `ForeignKey` opcional |
| **ItemCompra** | Itens da compra | RelatedManager `itens` |
| **MovimentacaoEstoque** | Entrada no estoque | Auto-criada |
| **Vencimento** (financeiro) | Prazo de pagamento | Para compra a prazo |

### 1.5 Propósito e Caso de Uso

**O que é:**  
Contrato de **aquisição de insumos, materiais e produtos** junto a fornecedores externos. É o início do ciclo de entrada de estoque.

**Quando usar:**
- ✅ Comprar sementes de fornecedor
- ✅ Adquirir fertilizantes
- ✅ Comprar embalagens
- ✅ Adquirir maquinário (via leasing/compra)
- ✅ Contratar serviços de terceiros

**Exemplos:**
```
Compra 1: Adquirir 1000 sacas de sementes de milho
├─ Fornecedor: Sementes Brasil Ltda
├─ Valor: R$ 50.000,00
├─ NFe: 123456789
├─ XML processado: ✅
└─ Estoque: +1000 unidades

Compra 2: Adquirir 500kg de fertilizante NPK
├─ Fornecedor: Agro Química S/A
├─ Valor: R$ 5.000,00
├─ NFe: 987654321
├─ Vencimento: 30 dias
└─ Estoque: +500 unidades
```

### 1.6 Fluxo Financeiro da Compra

```
Compra Registrada
    ↓
[À Vista]  ────→  Caixa Imediato (saída)
    ↓
[Prazo]    ────→  Vencimento criado → Aguarda 30 dias → Paga
    ↓
[Cheque]   ────→  Cheque a pagar criado
    ↓
Estoque aumenta (entrada)
```

---

## 2️⃣ TIPO: VENDA

### 2.1 Identificação

| Propriedade | Valor |
|------------|-------|
| **Modelo Django** | `Contrato` (tipo='venda') OU `VendaContrato` OU `VendaColheita` |
| **Campo tipo_contrato** | `'venda'`, `'venda_futura'`, `'venda_spot'` |
| **Localização** | `comercial/models.py:L447-L495`, `L858-L920`, `L676-L857` |
| **Parceiro Principal** | `Cliente` |
| **Direção de Fluxo** | ⬅️ **SAÍDA** (Comercialização) |
| **Impacto Principal** | 📦 Estoque (saída) + 💰 Caixa/Receita (entrada) |

### 2.2 Campos ESPECÍFICOS da Venda

#### 2.2.1 Modelo Contrato (tipo='venda')

```python
# Modelo: Contrato (comercial/models.py:L447)
class Contrato(TenantModel):
    # CAMPOS ESPECÍFICOS PARA VENDA:
    tipo_contrato = CharField(default='compra')  # ← 'venda', 'venda_futura', 'venda_spot'
    
    # DADOS COMERCIAIS:
    numero_contrato = CharField(unique=True)      # ← ID único
    titulo = CharField()                          # ← Descrição da venda
    valor_total = DecimalField()                  # ← Montante total
    prazo_execucao_dias = IntegerField()         # ← Dias para executar
    
    # CRONOGRAMA:
    data_inicio = DateField()                     # ← Quando começa
    data_fim = DateField(null=True)              # ← Quando termina/entrega
    
    # DOCUMENTAÇÃO:
    observacoes = TextField(blank=True)          # ← Notas da venda
    documento = FileField()                      # ← Anexar documento
    partes = JSONField()                         # ← Info das partes {comprador, vendedor}
    itens = JSONField()                          # ← Itens do contrato
    condicoes = JSONField()                      # ← Termos e condições
```

#### 2.2.2 Modelo VendaContrato (Venda com Parcelamento)

```python
# Modelo: VendaContrato (comercial/models.py:L858)
class VendaContrato(TenantModel):
    # CAMPOS ESPECÍFICOS PARA VENDA CONTRATO:
    cliente = ForeignKey('Cliente')              # ← Quem compra
    produto = ForeignKey('estoque.Produto')     # ← O que está vendendo
    
    # QUANTIDADE E PREÇO:
    quantidade_total = DecimalField()             # ← Quantidade total
    preco_unitario = DecimalField()              # ← Preço por unidade
    valor_total = DecimalField()                 # ← Calculado automaticamente
    
    # TIPO DE VENDA (CRÍTICO!):
    tipo = CharField(choices=[
        ('A_VISTA', 'À Vista'),                  # ← Pagamento imediato
        ('PARCELADO', 'Parcelado'),             # ← Múltiplas parcelas
        ('ANTECIPADO', 'Antecipado'),          # ← Pagamento antes da entrega
        ('FUTURO', 'Contrato Futuro'),         # ← Entrega futura
    ])
    
    # CRONOGRAMA:
    data_contrato = DateField()                  # ← Data de assinatura
    data_entrega_prevista = DateField(null=True) # ← Quando entregar
    
    # PARCELAMENTO:
    numero_parcelas = PositiveIntegerField()     # ← Quantas parcelas
    periodicidade_parcelas = CharField(          # ← Intervalo (MENSAL, BIMESTRAL, etc)
        choices=[
            ('MENSAL', 'Mensal'),
            ('BIMESTRAL', 'Bimestral'),
            ('TRIMESTRAL', 'Trimestral'),
        ]
    )
```

#### 2.2.3 Modelo VendaColheita (Venda de Colheita)

```python
# Modelo: VendaColheita (comercial/models.py:L676)
class VendaColheita(TenantModel):
    # CAMPOS ESPECÍFICOS PARA VENDA COLHEITA:
    origem_tipo = CharField(choices=[
        ('carga_viagem', 'Carga de Viagem'),    # ← De onde vem
        ('silo_bolsa', 'Silo Bolsa'),
    ])
    origem_id = PositiveIntegerField()          # ← ID da origem
    
    # DADOS DA VENDA:
    cliente = ForeignKey('Cliente')              # ← Quem compra
    produto = ForeignKey('estoque.Produto')     # ← O que está vendendo
    quantidade = DecimalField()                  # ← Quanto (kg, sacas, etc)
    preco_unitario = DecimalField()              # ← Preço remunerado
    valor_total = DecimalField()                # ← Calculado
    
    # DADOS DE ARMAZENAMENTO:
    local_armazenamento = ForeignKey('estoque.LocalArmazenamento', null=True)
    
    # FISCAL:
    numero_nota_fiscal = CharField()             # ← NFe gerada
    data_emissao_nota = DateTimeField()         # ← Quando foi emitida
    valor_tributos = DecimalField()             # ← Impostos incidentes
    status_emissao = CharField(choices=[
        ('pendente', 'Pendente'),
        ('emitida', 'Emitida'),
        ('rejeitada', 'Rejeitada'),
    ])
```

### 2.3 Diferenças Entre Tipos de Venda

| Aspecto | A_VISTA | PARCELADO | ANTECIPADO | FUTURO |
|--------|---------|-----------|-----------|--------|
| **Pagamento** | Imediato | Múltiplas datas | Antes entrega | Data futura |
| **numero_parcelas** | = 1 | > 1 | ≥ 1 | ≥ 1 |
| **data_entrega_prevista** | Ignorada | Obrigatória | Obrigatória | Obrigatória |
| **Estoque** | Deve existir | Deve existir | Pode não existir | Pode não existir |
| **Risco Vendedor** | Baixo | Alto | Médio | Alto |
| **Caso de Uso** | Vendas rápidas | Clientes regulares | Desconto para adiantado | Vendas futuras |

### 2.4 Validações Específicas da Venda

```python
# VALIDAÇÕES PARA VENDACONTRATO:

# A_VISTA:
if tipo == 'A_VISTA':
    ✅ numero_parcelas = 1 (forçado)
    ✅ data_entrega_prevista pode ser None
    ✅ Must have estoque disponível
    ❌ data_entrega_prevista ignorada
    ❌ NÃO precisa periodicidade_parcelas

# PARCELADO:
if tipo == 'PARCELADO':
    ✅ numero_parcelas > 1 (obrigatório)
    ✅ data_entrega_prevista obrigatória
    ✅ periodicidade_parcelas obrigatória
    ✅ Cria ParcelaContrato automática
    ❌ Must have estoque disponível

# ANTECIPADO:
if tipo == 'ANTECIPADO':
    ✅ data_entrega_prevista obrigatória
    ✅ Pagamento imediato
    ✅ Pode não ter estoque (reserva)
    ❌ Baixa flexibilidade em prazos

# FUTURO:
if tipo == 'FUTURO':
    ✅ data_entrega_prevista obrigatória
    ✅ Contrato pré-fixado
    ✅ Sem estoque atual
    ✅ Atrelado a safra futura
    ❌ Alto risco até entrega
```

### 2.5 Sub-modelos Relacionados

| Sub-modelo | Uso | Relacionamento |
|-----------|-----|-----------------|
| **Cliente** | Quem compra | `ForeignKey` obrigatória |
| **Produto** | O que vender | `ForeignKey` obrigatória |
| **ParcelaContrato** | Parcelas de pagamento | RelatedManager (auto-criadas) |
| **Vencimento** | Contas a receber | Auto-criado para cada parcela |
| **MovimentacaoEstoque** | Saída do estoque | Auto-criada |
| **CargaViagem** (opcional) | Origem da colheita | Referência externa |
| **SiloBolsa** (opcional) | Armazenamento intermediário | Referência externa |

### 2.6 Propósito e Caso de Uso

**O que é:**  
Contrato de **venda/comercialização de produtos** aos clientes. É o final do ciclo de saída de estoque e geração de receita.

**Quando usar:**
- ✅ Vender milho a cliente direto (à vista)
- ✅ Vender soja em 3 parcelas mensais
- ✅ Vender colheita futura (após safra)
- ✅ Vender com antecipação (desconto de 10%)
- ✅ Vender colheita que está em silo

**Exemplos:**

```
Venda 1: À Vista - 500 sacas de milho
├─ Tipo: A_VISTA
├─ Cliente: Moinho Brasileiro S/A
├─ Quantidade: 500 sacas (30.000 kg)
├─ Preço: R$ 45/saca
├─ Valor Total: R$ 22.500,00
├─ Parcelas: 1
├─ Entrega: Imediata
├─ Estoque: -30.000 kg (imediato)
└─ Vencimento: Imediato (à vista)

Venda 2: Parcelada - 1000 sacas de soja
├─ Tipo: PARCELADO
├─ Cliente: Indústria de Óleos Ltda
├─ Quantidade: 1000 sacas (60.000 kg)
├─ Preço: R$ 80/saca
├─ Valor Total: R$ 80.000,00
├─ Parcelas: 3 mensais
├─ Entrega: 30 dias
├─ Estoque: -60.000 kg (reservado)
└─ Vencimentos: 30, 60, 90 dias (R$ 26.666,67 cada)

Venda 3: Colheita Futura - Contrato Spot
├─ Tipo: FUTURO (da colheita)
├─ Cliente: Trader Agrícola
├─ Quantidade: Estimado 200 sacas (na colheita)
├─ Preço: Pré-fixado R$ 90/saca
├─ Valor Total: Estimado R$ 18.000,00
├─ Data Entrega: Após colheita (Maio 2026)
├─ Estoque: Não existe (será colhido)
└─ Vencimento: Criado na data da entrega
```

### 2.7 Fluxo Financeiro da Venda

```
Venda Registrada
    ↓
[À VISTA]     ────→  Vencimento imediato → Recebe dinheiro hoje
    ↓
[PARCELADO]   ────→  3 Vencimentos criados → Recebe em 30, 60, 90 dias
    ↓
[ANTECIPADO]  ────→  Vencimento antecipado com desconto → Recebe hoje
    ↓
[FUTURO]      ────→  Vencimento criado → Entrega futura → Depois recebe
    ↓
Estoque diminui (saída)
```

---

## 3️⃣ TIPO: FINANCEIRO

> **⚠️ NOTA:** Não existe modelo explicitamente chamado `ContratoFinanceiro` no código. "Financeiro" é uma **integração** que ocorre em TODOS os contratos que envolvem parcelamento ou prazo de pagamento.

### 3.1 Identificação

| Propriedade | Valor |
|------------|-------|
| **Modelo Django** | `ParcelaContrato`, `Vencimento`, `VendaContrato` |
| **Campo tipo** | Não existe; é um **ASPECTO** de Venda/Compra |
| **Localização** | `comercial/models.py:L*` (ParcelaContrato), `financeiro/models.py` (Vencimento) |
| **Parceiro Principal** | Múltiplos (Clientes + Fornecedores) |
| **Direção de Fluxo** | 🔄 **BIDIRECIONAL** (Contas a Pagar ↔ Contas a Receber) |
| **Impacto Principal** | 💰 Fluxo de Caixa + 📋 Prazos de Pagamento |

### 3.2 Campos ESPECÍFICOS do Financeiro

#### 3.2.1 Modelo ParcelaContrato (Parcelas de Venda)

```python
# Modelo: ParcelaContrato (comercial/models.py)
class ParcelaContrato(models.Model):
    # CAMPOS ESPECÍFICOS PARA PARCELAS:
    contrato = ForeignKey('VendaContrato', related_name='parcelas')  # ← Venda associada
    numero_parcela = PositiveIntegerField()       # ← Número desta parcela (1 of 3)
    
    # VALORES:
    valor = DecimalField()                        # ← Quanto deve pagar
    
    # CRONOGRAMA FINANCEIRO:
    data_vencimento = DateField()                # ← Quando paga
    
    # INTEGRAÇÃO FINANCEIRA:
    vencimento = ForeignKey(
        'financeiro.Vencimento',                 # ← Conexão ao fluxo financeiro
        null=True, blank=True,
        related_name='parcelas_contrato'
    )
    
    @property
    def status_pagamento(self):
        """Retorna status do pagamento da parcela"""
        if self.vencimento:
            return self.vencimento.status
        return 'não_vinculado'
```

#### 3.2.2 Modelo Vencimento (Fluxo de Caixa)

```python
# Modelo: Vencimento (financeiro/models.py)
class Vencimento(TenantModel):
    # CAMPOS ESPECÍFICOS PARA VENCIMENTO:
    tipo = CharField(choices=[
        ('receber', 'Contas a Receber'),       # ← Venda com prazo
        ('pagar', 'Contas a Pagar'),           # ← Compra com prazo
    ])
    
    # DADOS FINANCEIROS:
    descricao = CharField()                    # ← Descrição (ex: "Parcela 1/3 Venda #123")
    valor = DecimalField()                     # ← Montante
    data_vencimento = DateField()              # ← Quando deve pagar/receber
    
    # RELACIONAMENTOS COM CONTRATOS:
    venda_contrato = ForeignKey(               # ← Qual venda originou
        'comercial.VendaContrato',
        null=True, blank=True
    )
    compra = ForeignKey(                       # ← Qual compra originou
        'comercial.Compra',
        null=True, blank=True
    )
    
    # STATUS E PAGAMENTO:
    status = CharField(choices=[
        ('aberto', 'Aberto'),                  # ← Aguardando pagamento
        ('pago', 'Pago'),                      # ← Paço realizado
        ('parcialmente_pago', 'Parcialmente Pago'),  # ← Pagamento parcial
        ('vencido', 'Vencido'),                # ← Passou da data
        ('cancelado', 'Cancelado'),            # ← Não vai pagar/receber
    ])
    
    data_pagamento = DateTimeField(null=True) # ← Quando foi pago
    valor_pago = DecimalField(null=True)      # ← Quanto foi pago (se parcial)
    
    # INTEGRAÇÃO COM CONTAS:
    conta_origem = ForeignKey(                 # ← Conta que paga
        'financeiro.ContaBancaria',
        null=True, blank=True
    )
    conta_destino = ForeignKey(                # ← Conta que recebe
        'financeiro.ContaBancaria',
        null=True, blank=True
    )
```

### 3.3 Tipos de Operações Financeiras

| Operação | Origem | Tipo Vencimento | Exemplo |
|----------|--------|-----------------|---------|
| **Venda Parcelada** | `VendaContrato` | `receber` | Cliente deve R$ 10k em 3x |
| **Venda Antecipada** | `VendaContrato` | `receber` | Desconto de 5% por antecipação |
| **Compra a Prazo** | `Compra` | `pagar` | Fornecedor cobra em 30 dias |
| **Compra à Vista** | `Compra` | `receber` | Paga hoje, dinheiro em banco |
| **Financiamento** | Integração externa | `pagar` | Empréstimo para máquina |

### 3.4 Validações Específicas do Financeiro

```python
# VALIDAÇÕES PARA VENCIMENTO/PARCELA:

✅ valor > 0                           # Montante deve ser positivo
✅ data_vencimento >= data_hoje       # Não pode ser passado (ao criar)
✅ numero_parcela >= 1                 # Parcela começa em 1
✅ soma(parcelas) == valor_total      # Total das parcelas = Valor contrato

# PARCELACONTRATO:
if numero_parcelas = 3:
    ✅ Gera 3 ParcelaContrato automaticamente
    ✅ Math: valor_parcela = valor_total / numero_parcelas
    ✅ Datas: 1ª em hoje+30, 2ª em hoje+60, 3ª em hoje+90
    ❌ NÃO pode ter parcelamento incompleto

# VENCIMENTO:
if status = 'pago':
    ✅ data_pagamento é preenchida
    ✅ valor_pago registrado
    ✅ conta_origem creditada
    ✅ conta_destino debitada
    ❌ NÃO pode estar 'aberto'
```

### 3.5 Sub-modelos Relacionados

| Sub-modelo | Uso | Relacionamento |
|-----------|-----|-----------------|
| **ParcelaContrato** | Parcelas automáticas | RelatedManager de VendaContrato |
| **Vencimento** | Fluxo de caixa | `ForeignKey` de ParcelaContrato |
| **ContaBancaria** | Origem/Destino dinheiro | `ForeignKey` de Vencimento |
| **FormaPagamento** | Como pagar (PIX, boleto, etc) | `CharField` em Vencimento |
| **Juros** (opcional) | Taxa adicional | Campo em VendaContrato |

### 3.6 Propósito e Caso de Uso

**O que é:**  
Integração entre módulo comercial (Vendas/Compras) e módulo financeiro (Fluxo de Caixa). Gerencia **prazos, parcelas e fluxo de dinheiro**.

**Quando usar:**
- ✅ Cliente paga em 3 parcelas (venda parcelada)
- ✅ Fornecedor cobra em 30 dias de prazo (compra a prazo)
- ✅ Cliente paga adiantado e ganha desconto (venda antecipada)
- ✅ Simular fluxo de caixa (quantdo receberei?)
- ✅ Controlar atraso de pagamentos (contas vencidas)

**Exemplos:**

```
Venda 1: Parcelada - 3 parcelas de R$ 10.000,00 cada
├─ Total da Venda: R$ 30.000,00
├─ Tipo: PARCELADO
├─ numero_parcelas: 3
├─ periodicidade: MENSAL
│
├─ PARCELA 1:
│  ├─ numero_parcela: 1
│  ├─ valor: R$ 10.000,00
│  ├─ data_vencimento: 2026-04-14
│  └─ vencimento → Vencimento(tipo='receber', status='aberto')
│
├─ PARCELA 2:
│  ├─ numero_parcela: 2
│  ├─ valor: R$ 10.000,00
│  ├─ data_vencimento: 2026-05-14
│  └─ vencimento → Vencimento(tipo='receber', status='aberto')
│
└─ PARCELA 3:
   ├─ numero_parcela: 3
   ├─ valor: R$ 10.000,00
   ├─ data_vencimento: 2026-06-14
   └─ vencimento → Vencimento(tipo='receber', status='aberto')

Compra 1: A Prazo - 30 dias
├─ Total da Compra: R$ 5.000,00
├─ Fornecedor: Sementes Brasil
├─ data_compra: 2026-03-14
│
└─ VENCIMENTO:
   ├─ tipo: 'pagar'
   ├─ valor: R$ 5.000,00
   ├─ data_vencimento: 2026-04-13
   ├─ status: 'aberto' (ainda não pagou)
   ├─ conta_origem: Conta Banco (crédito quando pagar)
   └─ forma_pagamento: 'transferencia'
```

### 3.7 Fluxo Financeiro Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRAÇÃO FINANCEIRA COMPLETA                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VENDA PARCELADA                    COMPRA A PRAZO              │
│                                                                 │
│  1. Registrar VendaContrato         1. Registrar Compra        │
│     tipo = 'PARCELADO'                 data = 2026-03-14       │
│     numero_parcelas = 3              fornecedor = Fornecedor X │
│                            ↓                                    │
│  2. Sistema cria ParcelaContrato    2. Sistema cria Vencimento │
│     ├─ Parcela 1/3 (30 dias)           tipo = 'pagar'         │
│     ├─ Parcela 2/3 (60 dias)           data_vencimento = +30d │
│     └─ Parcela 3/3 (90 dias)           status = 'aberto'      │
│                            ↓                                    │
│  3. Sistema cria Vencimento         3. Aguarda prazo            │
│     tipo = 'receber'                                            │
│     status = 'aberto'                                           │
│     data_vencimento = +30d (1ª), etc                           │
│                            ↓                                    │
│  4. Cliente paga                    4. Empresa paga             │
│     data_pagamento: 2026-04-14         data_pagamento: 2026... │
│     Vencimento: status = 'pago'        Vencimento: status='pago'
│     Caixa: +R$ 10k                     Caixa: -R$ 5k           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 COMPARAÇÃO FINAL: COMPRA vs. VENDA vs. FINANCEIRO

```
┌─────────────┬──────────────────────────────────────────────────┐
│   ASPECTO   │      COMPRA   │   VENDA    │    FINANCEIRO       │
├─────────────┼───────────────┼────────────┼─────────────────────┤
│ Modelo      │ Compra        │ VendaCtto  │ ParcelaContrato     │
│             │ Contrato      │ VendaColh. │ Vencimento          │
├─────────────┼───────────────┼────────────┼─────────────────────┤
│ Parceiro    │ Fornecedor    │ Cliente    │ Múltiplos (ambos)   │
├─────────────┼───────────────┼────────────┼─────────────────────┤
│ Direção     │ ➡️ ENTRADA    │ ⬅️ SAÍDA   │ 🔄 BIDIRECIONAL     │
├─────────────┼───────────────┼────────────┼─────────────────────┤
│ Estoque     │ +Volume       │ -Volume    │ Não impacta         │
├─────────────┼───────────────┼────────────┼─────────────────────┤
│ Caixa       │ - Saída       │ + Entrada  │ Controla fluxo      │
├─────────────┼───────────────┼────────────┼─────────────────────┤
│ NFe         │ Obrigatória   │ Sim        │ Não gera            │
├─────────────┼───────────────┼────────────┼─────────────────────┤
│ Impostos    │ ICMS, PIS,    │ ICMS,      │ Não calcula         │
│             │ COFINS        │ IPI, etc   │                     │
├─────────────┼───────────────┼────────────┼─────────────────────┤
│ Parcelamento│ À vista ou    │ À vista ou │ Define parcelas     │
│             │ prazo         │ 3/6/12x    │ (automático)         │
├─────────────┼───────────────┼────────────┼─────────────────────┤
│ Validações  │ Fornecedor OK │ Cliente OK │ Datas OK + Valores  │
├─────────────┼───────────────┼────────────┼─────────────────────┤
│ Status      │ Rascunho →    │ Rascunho → │ Aberto → Pago →     │
│             │ Ativo →       │ Ativo →    │ Vencido/Canc        │
│             │ Encerrado     │ Encerrado  │                     │
├─────────────┼───────────────┼────────────┼─────────────────────┤
│ Quando usar │ Adquirir      │ Comercial. │ Gerenciar prazo     │
│             │ insumos       │ produtos   │ & fluxo de caixa    │
│             │ de terceiros  │ a clientes │                     │
└─────────────┴───────────────┴────────────┴─────────────────────┘
```

---

## 🎓 QUADRO DE DECISÃO: QUAL TIPO USAR?

```
┌──────────────────────────────────────────────────────────────┐
│                  ÁRVORE DE DECISÃO                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  É uma AQUISIÇÃO de insumos/materiais de um FORNECEDOR?     │
│  ├─ SIM  → USE: COMPRA  (modelo: Compra ou Contrato)       │
│  │        Campos: fornecedor, nfe, impostos                │
│  │                                                          │
│  └─ NÃO                                                     │
│     │                                                       │
│     É uma COMERCIALIZAÇÃO/VENDA de produtos a CLIENTE?     │
│     ├─ SIM  → USE: VENDA (modelo: VendaContrato)          │
│     │        Campos: cliente, produto, quantidade          │
│     │        Sub-decisão: Qual tipo de venda?              │
│     │        ├─ Pagamento hoje → A_VISTA                   │
│     │        ├─ Pagamento em 3x → PARCELADO                │
│     │        ├─ Desconto para pagar agora → ANTECIPADO     │
│     │        └─ Entrega futura → FUTURO                    │
│     │                                                       │
│     └─ NÃO                                                  │
│        │                                                    │
│        É para GERENCIAR PRAZO/PAGAMENTO de vendas parceladas
│        ou compras a prazo?                                  │
│        ├─ SIM  → USE: FINANCEIRO                           │
│        │        (ParcelaContrato, Vencimento)              │
│        │        → Criado automaticamente por VENDA/COMPRA   │
│        │                                                    │
│        └─ NÃO → Caso especial (consulte documentação)      │
│                                                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 EXEMPLO PRÁTICO COMPLETO

### Cenário: Compra + Venda Parcelada

```
DIA 1 (2026-03-14): COMPRA DE INSUMOS
═══════════════════════════════════

1. Empresa compra 1000 sacas de sementes
   └─ TIPO: COMPRA
      ├─ Fornecedor: Sementes Brasil
      ├─ Quantidade: 1000 sacas
      ├─ Valor Total: R$ 50.000,00
      ├─ Prazo: 30 dias
      ├─ NFe: 123456789
      │
      └─ IMPACTO:
         ├─ Estoque: +1000 sacas
         ├─ Caixa: -R$ 50k (no vencimento = 2026-04-13)
         └─ Vencimento: criar (tipo='pagar', data=2026-04-13)

DIA 15 (2026-03-29): VENDA PARCELADA
═════════════════════════════════════

2. Empresa vende 500 sacas a cliente
   └─ TIPO: VENDA → VendaContrato
      ├─ Cliente: Moinho XYZ
      ├─ Quantidade: 500 sacas
      ├─ Preço Unitário: R$ 110/saca
      ├─ Valor Total: R$ 55.000,00
      ├─ Tipo de Pagamento: PARCELADO
      ├─ Núm. Parcelas: 3
      ├─ Periodicidade: MENSAL
      ├─ Data Entrega: 2026-04-29
      │
      └─ SISTEMA CRIA AUTOMATICAMENTE:
         ├─ ParcelaContrato 1:
         │  ├─ numero_parcela: 1
         │  ├─ valor: R$ 18.333,33
         │  ├─ data_vencimento: 2026-04-29
         │  └─ vencimento: Vencimento(tipo='receber', status='aberto')
         │
         ├─ ParcelaContrato 2:
         │  ├─ numero_parcela: 2
         │  ├─ valor: R$ 18.333,33
         │  ├─ data_vencimento: 2026-05-29
         │  └─ vencimento: Vencimento(tipo='receber', status='aberto')
         │
         └─ ParcelaContrato 3:
            ├─ numero_parcela: 3
            ├─ valor: R$ 18.333,34
            ├─ data_vencimento: 2026-06-29
            └─ vencimento: Vencimento(tipo='receber', status='aberto')
      │
      └─ IMPACTO:
         ├─ Estoque: -500 sacas (saída)
         ├─ Caixa: +R$ 18.333,33 (2026-04-29), +R$ 18.333,33 (2026-05-29), +R$ 18.333,34 (2026-06-29)
         └─ A Receber: 3 vencimentos em aberto

CRONOGRAMA FINANCEIRO FINAL (Mai 2026)
═══════════════════════════════════════

Data      │ Descrição                 │ Tipo        │ Caixa
──────────┼──────────────────────────┼─────────────┼─────────────
2026-04-13│ Paga F. Sementes Brasil  │ Compra      │ -R$ 50.000
2026-04-29│ Recebe 1ª parcela Moinho │ Venda 1/3   │ +R$ 18.333
2026-05-13│ Paga F. Sementes (2ª vez)│ Outra compra│ -R$ 30.000
2026-05-29│ Recebe 2ª parcela Moinho │ Venda 2/3   │ +R$ 18.333
2026-06-29│ Recebe 3ª parcela Moinho │ Venda 3/3   │ +R$ 18.333

SALDO FINAL:
Caixa: -R$ 50.000 - R$ 30.000 + R$ 18.333 + R$ 18.333 + R$ 18.333 = -R$ 45.001
(Negativo porque comprou mais do que vendeu)
```

---

## ✅ CHECKLIST: COMO IDENTIFICAR QUAL TIPO

### Para COMPRA:
- [ ] É uma aquisição de TERCEIROS (fornecedor externo)?
- [ ] Há documentação fiscal (NFe, recibo)?
- [ ] Impacta ENTRADA de estoque?
- [ ] Há FORNECEDOR envolvido?
- [ ] Usar modelo: **Compra** ou **Contrato(tipo='compra')**

### Para VENDA:
- [ ] É uma comercialização para CLIENTE?
- [ ] Há CLIENTE e PRODUTO envolvidos?
- [ ] Impacta SAÍDA de estoque?
- [ ] Há QUANTIDADE e PREÇO UNITÁRIO?
- [ ] Qual tipo? **A_VISTA / PARCELADO / ANTECIPADO / FUTURO**
- [ ] Usar modelo: **VendaContrato** ou **VendaColheita**

### Para FINANCEIRO:
- [ ] É uma PARCELA ou VENCIMENTO de contrato?
- [ ] Há PRAZO de pagamento envolvido?
- [ ] Precisa gerenciar FLUXO DE CAIXA?
- [ ] É criado AUTOMATICAMENTE por VENDA/COMPRA?
- [ ] Usar modelo: **ParcelaContrato** + **Vencimento**

---

**Documento Compilado:** 2026-03-14  
**Status:** Concluído e Validado  
**Próximos Passos:** Usar este documento como referência para implementações
