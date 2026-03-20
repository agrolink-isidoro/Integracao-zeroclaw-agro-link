# Mapa Completo de Tipos de Contrato e Venda

**Projeto:** Integracao-zeroclaw-agro-link  
**Data:** 2026-03-14  
**Escopo:** Mapeamento de TODOS os tipos de contrato/venda implementados e documentados

---

## 📋 SUMÁRIO EXECUTIVO

O projeto implementa **3 modelos principais** com tipos diferenciados:

| Modelo | Localização | Tipos Implementados |
|--------|------------|-------------------|
| **Contrato** | `comercial/models.py:L447` | 9 tipos |
| **CargaViagem** | `comercial/models.py:L500` | 3 tipos de colheita + 2 tipos de entrega |
| **VendaContrato** | `comercial/models.py:L858` | 4 tipos de venda |

---

## 1. MODELO: CONTRATO (Contratos Genéricos)

**Localização:** [`comercial/models.py:L447-L495`](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/models.py#L447)

**Frontend:** [`frontend/src/types/comercial.ts:L160`](integration-structure/project-agro/sistema-agropecuario/frontend/src/types/comercial.ts#L160)

### 1.1 Tipos Implementados (TIPO_CONTRATO_CHOICES)

```python
TIPO_CONTRATO_CHOICES = [
    ('compra', 'Compra'),                        # 1
    ('venda', 'Venda'),                          # 2
    ('venda_futura', 'Venda Futura'),            # 3
    ('venda_spot', 'Venda Spot'),                # 4
    ('bater', 'Barter'),                         # 5 (Troca)
    ('servico', 'Serviço'),                      # 6
    ('fornecimento', 'Fornecimento'),            # 7
    ('parceria', 'Parceria'),                    # 8
    ('outros', 'Outros'),                        # 9
]
```

**Dropdown Frontend:** [`ContratoForm.tsx:L320-L332`](integration-structure/project-agro/sistema-agropecuario/frontend/src/components/comercial/ContratoForm.tsx#L320-L332)

### 1.2 Características e Diferenças por Tipo

| # | Tipo | Descrição | Uso Principal | Características |
|---|------|-----------|--------------|-------------------|
| **1** | **COMPRA** | Aquisição de insumos/materiais | Fornecedores | - Valor total obrigatório<br/>- Vinculado a `Fornecedor`<br/>- Pode gerar NFe automática<br/>- Impacta Estoque (entrada) |
| **2** | **VENDA** | Venda simples de produtos | Clientes diretos | - À vista ou prazo<br/>- Impacta Estoque (saída)<br/>- Gera NFe<br/>- Sem data de entrega fixa |
| **3** | **VENDA_FUTURA** | Venda com entrega futura | Vendas pré-acordadas | - Data de entrega no futuro<br/>- Pode ter prazo de pagamento diferenciado<br/>- Reserva de estoque<br/>- Usada para colheitas futuras |
| **4** | **VENDA_SPOT** | Venda imediata/à vista | Vendas rápidas | - Entrega imediata<br/>- Pagamento à vista (geralmente)<br/>- Sem prazo de validade<br/>- Venda instantânea |
| **5** | **BATER** | Troca/Barter | Trocas comerciais | - Sem valor monetário direto<br/>- Contrapartida é outro bem/serviço<br/>- Ambos os lados ganham valor<br/>- Não gera movimento de caixa |
| **6** | **SERVICO** | Prestação de serviços | Terceirizados | - Valida horas/dias<br/>- Vinculado a `PrestadorServico`<br/>- Não gera saída de estoque<br />- Pode ter cronograma |
| **7** | **FORNECIMENTO** | Contrato de fornecimento | Suprimentos contínuos | - Duração prolongada<br/>- Quantidade total com entregas parceladas<br/>- Custos rateados por talhão (opcional)<br/>- Renovação periódica |
| **8** | **PARCERIA** | Acordo estratégico | Alianças comerciais | - Sem dados financeiros fixos<br/>- Pode incluir cooperação<br/>- Validade longa<br/>- Sem impacto direto no estoque |
| **9** | **OUTROS** | Tipos customizados | Casos especiais | - Descrição livre<br/>- Sem validações específicas<br/>- Uso flexível |

### 1.3 Estrutura de Dados

```python
class Contrato(TenantModel):
    numero_contrato = CharField(unique=True)      # Identificador único
    titulo = CharField()                           # Descrição do contrato
    tipo_contrato = CharField(choices=TIPO_CONTRATO_CHOICES, default='compra')
    categoria = CharField(blank=True, null=True)  # Ex: 'insumos', 'sementes'
    status = CharField(default='rascunho')         # rascunho, ativo, encerrado, etc.
    valor_total = DecimalField()                   # Montante total
    data_inicio = DateField()                      # Data de início
    data_fim = DateField(blank=True, null=True)   # Data de fim
    
    # Campos adicionais (após v2)
    prazo_execucao_dias = IntegerField(blank=True, null=True)
    observacoes = TextField(blank=True, null=True)
    
    # Dados estruturados em JSON
    partes = JSONField(blank=True, null=True)       # Informações das partes envolvidas
    itens = JSONField(blank=True, null=True)        # Itens do contrato
    condicoes = JSONField(blank=True, null=True)    # Termos e condições
    
    documento = FileField(upload_to='contratos/', blank=True, null=True)
```

### 1.4 Validações por Tipo

```typescript
// Frontend: ContratoForm.tsx
const validationSchema = yup.object().shape({
    tipo_contrato: yup.string().required('Tipo de contrato é obrigatório'),
    // Validações adicionais...
});
```

**Testes de Tipos:** [`test_contrato_types.py:L15`](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/tests/test_contrato_types.py#L15)

```python
for t in ['venda_futura', 'venda_spot', 'bater']:
    # Cada tipo é testado para garantir integridade
```

---

## 2. MODELO: CARGAVIAGEM (Colheita e Tipos de Entrega)

**Localização:** [`comercial/models.py:L500-L675`](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/models.py#L500)

### 2.1 Tipos de Colheita (TIPO_COLHEITA_CHOICES)

Define a modalidade de processamento da colheita:

```python
TIPO_COLHEITA_CHOICES = [
    ('colheita_completa', 'Colheita Completa com Pesagem e Classificação'),
    ('silo_bolsa', 'Armazenamento em Silo Bolsa com Vendas Parceladas'),
    ('contrato_industria', 'Colheita por Contrato com Indústria'),
]
```

| Tipo | Descrição | Fluxo | Características |
|------|-----------|-------|-----------------|
| **COLHEITA_COMPLETA** | Colheita com processamento completo | Tare → Gross → Unload | - Pesagem em entrada<br/>- Classificação de qualidade<br/>- Umidade/impurezas analisadas<br/>- Entrega direta ao cliente ou armazém |
| **SILO_BOLSA** | Armazenamento intermediário | Carregamento → Silo → Vendas parceladas | - Estoque temporário<br/>- Vendas múltiplas do mesmo lote<br/>- Controle de deterioração<br/>- Vinculado ao modelo `SiloBolsa` |
| **CONTRATO_INDUSTRIA** | Venda direta para indústria | Colheita → Entrega industrial | - Destino pré-definido<br/>- Contrato pré-fixado<br/>- Sem intermediário<br/>- Entrega na indústria |

**Frontend Mapping:** [`SessaoMovimentacoesModal.tsx:L56`](integration-structure/project-agro/sistema-agropecuario/frontend/src/pages/agricultura/SessaoMovimentacoesModal.tsx#L56)

```typescript
const destinoLabels = {
  armazenagem_interna: 'Armazenagem Interna',
  contrato_industria: 'Contrato c/ Indústria',  // ← Mapeamento
  armazenagem_geral: 'Armazém Geral'
};
```

### 2.2 Tipos de Entrega (TIPO_ENTREGA_CHOICES)

Define o destino final da carga:

```python
TIPO_ENTREGA_CHOICES = [
    ('contrato_pre_fixado', 'Entrega sob contrato de venda pré-fixado'),
    ('armazem_geral', 'Entrega para armazém geral'),
]
```

| Tipo | Destino | Fluxo de Custos | Características |
|------|---------|-----------------|-----------------|
| **CONTRATO_PRE_FIXADO** | Cliente/Indústria | Vendedor absorve custos | - Venda confirmada<br/>- Entrega direta<br/>- Sem custos adicionais de armazenagem<br/>- Vinculado a VendaContrato |
| **ARMAZEM_GERAL** | Terceira parte (armazém) | Custos rateados | - Custos de armazenagem<br/>- Custos de recepção<br/>- Custos de limpeza<br/>- Pode ter múltiplas vendas |

**Campos de Custos Associados:**

```python
# Aplicável quando tipo_entrega == 'armazem_geral'
custo_armazenagem = DecimalField()
custo_recepcao = DecimalField()
custo_limpeza = DecimalField()

# Controle de frete (novo)
comprador_responsavel_frete = BooleanField()  # Comprador paga frete?
valor_frete_unitario = DecimalField()
unidade_frete = CharField(choices=[
    ('saca', 'Por Saca (60kg)'),
    ('kg', 'Por Kg'),
    ('tonelada', 'Por Tonelada (1000kg)')
])
```

### 2.3 Estrutura Completa de CargaViagem

```python
class CargaViagem(TenantModel):
    # Identificação
    tipo_colheita = CharField(choices=TIPO_COLHEITA_CHOICES)
    tipo_entrega = CharField(choices=TIPO_ENTREGA_CHOICES, null=True)
    
    # Dados básicos
    data_colheita = DateField()
    peso_total = DecimalField()
    classificacao = CharField()
    
    # Relacionamentos
    fazenda = ForeignKey('fazendas.Fazenda')
    cultura = ForeignKey('agricultura.Cultura')
    colheita_agricola = OneToOneField('agricultura.Colheita', null=True)
    
    # Qualidade
    umidade = DecimalField(blank=True, null=True)
    impurezas = DecimalField(blank=True, null=True)
    
    # Pesagens (fluxo)
    truck_plate = CharField()
    driver_name = CharField()
    tare_weight = DecimalField(null=True)        # Peso vazio
    gross_weight = DecimalField(null=True)       # Peso cheio
    unload_local = ForeignKey('estoque.LocalArmazenamento', null=True)
    
    @property
    def net_weight(self):
        """Peso líquido = Peso bruto - Peso tare"""
        return self.gross_weight - self.tare_weight if both else None
    
    # Custos de armazém
    custo_armazenagem = DecimalField()
    custo_recepcao = DecimalField()
    custo_limpeza = DecimalField()
    
    # Frete
    comprador_responsavel_frete = BooleanField()
    valor_frete_unitario = DecimalField(null=True)
    unidade_frete = CharField()
```

### 2.4 Regras de Negócio para CargaViagem

**Regra 1: Cálculo de Custos Totais**
```python
@property
def custo_total_armazem(self):
    if self.tipo_entrega == 'armazem_geral':
        return self.custo_armazenagem + self.custo_recepcao + self.custo_limpeza
    return 0

@property
def valor_frete_total(self):
    if not self.frete_responsabilidade_fazenda or not self.valor_frete_unitario:
        return 0
    # Converte peso para unidade do frete
    if self.unidade_frete == 'saca':
        unidades = self.peso_total / 60  # 1 saca = 60 kg
    elif self.unidade_frete == 'kg':
        unidades = self.peso_total
    elif self.unidade_frete == 'tonelada':
        unidades = self.peso_total / 1000  # 1 ton = 1000 kg
    return unidades * self.valor_frete_unitario

@property
def custo_total_com_frete(self):
    total = self.custo_total_armazem
    if self.frete_responsabilidade_fazenda:
        total += self.valor_frete_total
    return total
```

**Regra 2: Responsabilidade de Frete**
```python
@property
def frete_responsabilidade_fazenda(self):
    return not self.comprador_responsavel_frete
```

**Regra 3: Conexão com Colheita Agrícola**
```python
def conectar_colheita(self, colheita):
    """Conecta carga com colheita e atualiza status"""
    if isinstance(colheita, Colheita) and colheita.pode_enviar_comercial:
        self.colheita_agricola = colheita
        colheita.status = 'comercializada'  # Marca colheita como comercializada
        return True
    return False
```

---

## 3. MODELO: VENDACONTRATO (Contratos de Venda)

**Localização:** [`comercial/models.py:L858-L920`](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/models.py#L858)

### 3.1 Tipos de Venda (TIPO_CHOICES)

```python
TIPO_CHOICES = [
    ('A_VISTA', 'À Vista'),
    ('PARCELADO', 'Parcelado'),
    ('ANTECIPADO', 'Antecipado'),
    ('FUTURO', 'Contrato Futuro'),
]
```

| Tipo | Pagamento | Entrega | Características | Validações |
|------|-----------|---------|-----------------|------------|
| **A_VISTA** | Imediato | Imediata | - Sem juros<br/>- Sem parcelamento<br/>- Menor risco<br/>- Sem prazos adicionais | - `numero_parcelas` = 1 (obrigatório)<br/>- `data_entrega_prevista` ignorada<br/>- Disponível imediatamente |
| **PARCELADO** | Múltiplas datas | Parcial/Total | - Múltiplas parcelas<br/>- Com ou sem juros<br/>- Cada parcela = Vencimento<br/>- Período definido | - `numero_parcelas` > 1<br/>- `periodicidade_parcelas` define intervalo<br/>- `data_entrega_prevista` obrigatória<br/>- Cria `ParcelaContrato` automática |
| **ANTECIPADO** | Antes da entrega | Futura | - Pagamento adiantado<br/>- Desconto em geral<br/>- Baixo risco para vendedor<br/>- Entrega posterior | - `data_entrega_prevista` obrigatória<br/>- Pode ter 1+ parcelas<br/>- Estoque é reservado<br/>- Prioridade na entrega |
| **FUTURO** | Prazo longo | Data futura | - Contrato pré-fixado<br/>- Colheita futura<br/>- Preço fixo<br/>- Segurança para ambos | - `data_entrega_prevista` obrigatória<br/>- Pode ter múltiplas parcelas<br/>- Sem estoque atual<br/>- Atrelado a safra |

### 3.2 Validações por Tipo

**Frontend:** [`ContratoForm.tsx:L80, L298, L300, L314`](integration-structure/project-agro/sistema-agropecuario/frontend/src/pages/comercial/ContratoForm.tsx)

```typescript
// Lógica de validação para A_VISTA
if (formData.tipo === 'A_VISTA') {
    // data_entrega_prevista é desabilitada
    // numero_parcelas forced = 1
    // dias_para_entrega desabilitado também
}

// Lógica para PARCELADO, ANTECIPADO, FUTURO
if (formData.tipo !== 'A_VISTA') {
    // data_entrega_prevista é OBRIGATÓRIA
    // numero_parcelas pode ser > 1
    // periodicidade_parcelas define distribuição temporal
}
```

**Backend:** [`serializers.py:L597`](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/serializers.py#L597)

```python
if attrs['tipo'] == 'A_VISTA' and attrs.get('numero_parcelas', 1) > 1:
    raise ValidationError('Contrato À Vista deve ter apenas 1 parcela')
```

### 3.3 Estrutura Completa de VendaContrato

```python
class VendaContrato(TenantModel):
    numero_contrato = CharField(unique=True)
    cliente = ForeignKey('comercial.Cliente')
    produto = ForeignKey('estoque.Produto')
    
    quantidade_total = DecimalField()
    preco_unitario = DecimalField()
    valor_total = DecimalField()
    
    # Tipo e status
    tipo = CharField(choices=TIPO_CHOICES)  # A_VISTA, PARCELADO, etc.
    status = CharField(choices=STATUS_CHOICES, default='RASCUNHO')
    
    # Datas importantes
    data_contrato = DateField()
    data_entrega_prevista = DateField(null=True)
    
    # Parcelamento
    numero_parcelas = PositiveIntegerField(default=1)
    periodicidade_parcelas = CharField(
        choices=[('MENSAL','Mensal'), ('BIMESTRAL','Bimestral'), ('TRIMESTRAL','Trimestral')],
        default='MENSAL'
    )
```

### 3.4 Modelo de Parcelas

```python
class ParcelaContrato(models.Model):
    """Parcelas automáticas criadas para cada VendaContrato"""
    
    contrato = ForeignKey(VendaContrato, related_name='parcelas')
    numero_parcela = PositiveIntegerField()
    valor = DecimalField()
    data_vencimento = DateField()
    
    # Integração financeira
    vencimento = ForeignKey(
        'financeiro.Vencimento',
        null=True, blank=True,
        related_name='parcelas_contrato'
    )
```

### 3.5 Workflow de Parcelamento

**Exemplo: PARCELADO com 3 parcelas mensais**

```
tipo = 'PARCELADO'
numero_parcelas = 3
periodicidade_parcelas = 'MENSAL'
valor_total = 300.00
data_contrato = 2026-03-14

Parcelas criadas automaticamente:
┌─────────────────────────────────────┐
│ Parcela 1/3 - R$ 100.00            │
│ Data Vencimento: 2026-04-14        │
│ Vencimento linkedado                │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Parcela 2/3 - R$ 100.00            │
│ Data Vencimento: 2026-05-14        │
│ Vencimento linkedado                │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Parcela 3/3 - R$ 100.00            │
│ Data Vencimento: 2026-06-14        │
│ Vencimento linkedado                │
└─────────────────────────────────────┘
```

---

## 4. MODELO: VENDACOLHEITA (Vendas de Colheita)

**Localização:** [`comercial/models.py:L676-L857`](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/models.py#L676)

### 4.1 Características

```python
class VendaColheita(TenantModel):
    # Origem da venda
    origem_tipo = CharField(choices=[
        ('carga_viagem', 'Carga de Viagem'),
        ('silo_bolsa', 'Silo Bolsa'),
    ])
    origem_id = PositiveIntegerField()
    
    # Dados da venda
    data_venda = DateField()
    quantidade = DecimalField()
    preco_unitario = DecimalField()
    valor_total = DecimalField()  # Auto-calculado
    
    # Relacionamentos
    cliente = ForeignKey(Cliente)
    local_armazenamento = ForeignKey('estoque.LocalArmazenamento', null=True)
    produto = ForeignKey('estoque.Produto', null=True)
    
    # Integração fiscal
    regime_tributario = CharField(default='atual', choices=[('atual', 'Atual'), ('ibs', 'IBS')])
    numero_nota_fiscal = CharField()
    data_emissao_nota = DateTimeField(null=True)
    valor_tributos = DecimalField()
    status_emissao = CharField(default='pendente', choices=[
        ('pendente', 'Pendente'),
        ('emitida', 'Emitida'),
        ('rejeitada', 'Rejeitada')
    ])
```

### 4.2 Regra de Cálculo

```python
def save(self):
    self.valor_total = self.quantidade * self.preco_unitario
    super().save()

@property
def origem(self):
    """Retorna objeto de origem (CargaViagem ou SiloBolsa)"""
    if self.origem_tipo == 'carga_viagem':
        return CargaViagem.objects.get(id=self.origem_id)
    elif self.origem_tipo == 'silo_bolsa':
        return SiloBolsa.objects.get(id=self.origem_id)
```

---

## 5. MODELO: SILOBILSA (Armazenamento em Silo)

**Localização:** [`comercial/models.py:L581-L650`](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/models.py#L581)

```python
class SiloBolsa(TenantModel):
    carga_viagem = OneToOneField(CargaViagem)
    
    capacidade_total = DecimalField()
    estoque_atual = DecimalField()
    data_armazenamento = DateField()
    
    @property
    def estoque_disponivel(self):
        """Retorna estoque para venda"""
        return self.estoque_atual
```

---

## 6. OUTROS MODELOS RELACIONADOS

### 6.1 Compra (Modelo de Compra)

**Localização:** [`comercial/models.py:L410-L445`](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/models.py#L410)

```python
class Compra(TenantModel):
    fornecedor = ForeignKey(Fornecedor, null=True)
    data = DateField()
    valor_total = DecimalField()
    descricao = TextField()
    
    # Integração fiscal
    xml_content = TextField(null=True)
    nfe = ForeignKey('fiscal.NFe', null=True)
    
    # Impostos agregados
    valor_icms = DecimalField(null=True)
    valor_pis = DecimalField(null=True)
    valor_cofins = DecimalField(null=True)
```

### 6.2 Cliente

**Localização:** [`comercial/models.py:L298-L350`](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/models.py#L298)

```python
class Cliente(TenantModel):
    TIPO_PESSOA_CHOICES = [('pf', 'Pessoa Física'), ('pj', 'Pessoa Jurídica')]
    
    nome = CharField()
    tipo_pessoa = CharField(choices=TIPO_PESSOA_CHOICES)
    cpf_cnpj = CharField(unique=True)
    email = EmailField()
    # ... outros campos
```

### 6.3 Fornecedor

**Localização:** [`comercial/models.py:L7-L122`](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/models.py#L7)

```python
class Fornecedor(TenantModel):
    TIPO_PESSOA_CHOICES = [('pf', 'PF'), ('pj', 'PJ')]
    CATEGORIA_CHOICES = [
        ('insumos', 'Fornecedor de Insumos'),
        ('servicos', 'Fornecedor de Serviços'),
        # ... 9 categorias
    ]
    
    nome = CharField()
    tipo_pessoa = CharField()
    cpf_cnpj = CharField(unique=True)
    categoria = CharField(choices=CATEGORIA_CHOICES)
    status = CharField(choices=[('ativo', 'Ativo'), ('inativo', 'Inativo'), ('bloqueado', 'Bloqueado')])
    
    # Dados bancários
    banco = CharField()
    agencia_bancaria = CharField()
    conta_bancaria = CharField()
    chave_pix = CharField()
```

---

## 7. INTEGRAÇÃO COM OUTROS MÓDULOS

### 7.1 Integração com Agricultura

A colheita agrícola (`agricultura.Colheita`) pode ser vinculada a:

- **CargaViagem** (para comercialização)
- **destino_tipo**: `'contrato_industria' | 'armazenagem_interna' | 'armazenagem_geral'`

**Frontend:** [`agricultura.ts:L66`](integration-structure/project-agro/sistema-agropecuario/frontend/src/types/agricultura.ts#L66)

```typescript
destino_tipo?: 'armazenagem_interna' | 'contrato_industria' | 'armazenagem_geral';
```

**Validações:** [`ColheitaForm.tsx:L140-L143`](integration-structure/project-agro/sistema-agropecuario/frontend/src/pages/agricultura/ColheitaForm.tsx)

```typescript
if ((destino_tipo === 'contrato_industria' || destino_tipo === 'armazenagem_geral') 
    && !empresa_destino) {
    throw new Error('Empresa destino obrigatória');
}
```

### 7.2 Integração com Estoque

- **Cargas** → Geram `MovimentacaoEstoque` (não vinculadas a NFe)
- **Vendas** → Impactam `LocalArmazenamento`
- **Compras** → Quando confirmadas, geram entradas

### 7.3 Integração com Financeiro

- **VendaContrato** → Cria `Vencimento` para cada parcela
- **ParcelaContrato** → Vinculada a `Vencimento`
- **forma_pagamento**: `'avista' | 'prazo' | 'cartao' | 'boleto' | 'cheque' | 'financiamento'`

### 7.4 Integração com Fiscal

- **Compra** → Pode gerar `NFe` automaticamente (se XML fornecido)
- **VendaColheita** → Integração futura com NFe
- **status_emissao**: `'pendente' | 'emitida' | 'rejeitada'`

---

## 8. ENUM/CHOICE FIELDS UNIFICADA

### 8.1 Forma de Pagamento (Todos os módulos)

**Localização:** [`frontend/src/types/comercial.ts:L225`](integration-structure/project-agro/sistema-agropecuario/frontend/src/types/comercial.ts#L225)

```typescript
forma_pagamento: 'avista' | 'prazo' | 'cartao' | 'boleto' | 'cheque' | 'financiamento'
```

**Backend Constants:** [`financeiro/serializers.py:L340`](integration-structure/project-agro/sistema-agropecuario/backend/apps/financeiro/serializers.py#L340)

```python
# conta_destino é obrigatória por regra de negócio para certos tipos
```

### 8.2 TipoContrato em Máquinas (Módulo Separado)

**Localização:** [`estoque_maquinas.ts:L353`](integration-structure/project-agro/sistema-agropecuario/frontend/src/types/estoque_maquinas.ts#L353)

```typescript
export type TipoContrato = 'A_VISTA' | 'PARCELADO' | 'ANTECIPADO' | 'FUTURO'
```

---

## 9. REGRAS DE NEGÓCIO CONSOLIDADAS

### 9.1 Regra: Venda Spot vs Venda Futura

| Aspecto | Venda Spot | Venda Futura |
|--------|-----------|-------------|
| **Estoque** | Deve existir | Pode não existir (futuro) |
| **Data Entrega** | Imediata (ou não especificada) | Futura (data_fim = data de entrega) |
| **Pagamento** | Geralmente à vista | Pode ser parcelado |
| **Preço** | Preço spot (mercado atual) | Preço pré-fixado em contrato |
| **NFe** | Pode ser emitida imediatamente | Emitida apenas na entrega |
| **Cancelamento** | Baixo risco (já entregue) | Alto risco (antes de entregar) |

### 9.2 Regra: À Vista vs Parcelada (VendaContrato)

| Aspecto | À Vista | Parcelada |
|--------|---------|-----------|
| **numero_parcelas** | = 1 (forçado) | > 1 |
| **data_entrega_prevista** | Ignorada | Obrigatória |
| **Vencimentos** | 1 vencimento | N vencimentos (automaticamente criados) |
| **Juros** | Sem taxa adicional | Pode ter (depende de contrato) |
| **Risco** | Vendedor: Baixo | Vendedor: Alto |

### 9.3 Regra: Contrato Industrial vs Armazém Geral

| Aspecto | Contrato Indústria | Armazém Geral |
|--------|------------------|--------------|
| **tipo_entrega** | `'contrato_pre_fixado'` | `'armazem_geral'` |
| **Destino** | Indústria comprador | Terceirista (armazém) |
| **Custos Adicionais** | Nenhum (pré-fixado) | Armazenagem + Recepção + Limpeza |
| **Frete** | Pode variar | Calculado com peso = unidade frete |
| **Venda Posterior** | 1 comprador | Múltiplos compradores (SiloBolsa) |

### 9.4 Regra: Responsabilidade de Frete

```
comprador_responsavel_frete = TRUE  →  Comprador paga frete
comprador_responsavel_frete = FALSE →  Fazenda paga frete

Se fazenda paga:
    frete_total = (peso_total / unidade_conversao) * valor_frete_unitario
    Exemplo: 6000kg @ R$5/saca(60kg) = 100 sacas * R$5 = R$500
```

### 9.5 Regra: Validação de Campos Obrigatórios

**Por Type de VendaContrato:**

```python
# À Vista: Simples
tipo = 'A_VISTA'
numero_parcelas = 1
data_entrega_prevista = None ou ignorada

# Parcelado/Antecipado/Futuro: Complexo
if tipo != 'A_VISTA':
    data_entrega_prevista = DateField(required=True)
    numero_parcelas >= 1
    periodicidade_parcelas = required
    # ParcelaContrato auto-criados
```

---

## 10. RESUMO EXECUTIVO - TABELA COMPARATIVA

| Modelo | Tipo | Usuário | Pagamento | Entrega | Estoque | NFe | Risco Vend. |
|--------|------|---------|-----------|---------|---------|-----|------------|
| **Contrato** | compra | Fornecedor | Negociado | Negociada | Entrada | Auto | Baixo |
| **Contrato** | venda | Cliente | Flex (spot) | Flex | Saída | Sim | Médio |
| **Contrato** | venda_futura | Cliente | Parcelado | Futura | Reserva | Entrega | Alto |
| **Contrato** | venda_spot | Cliente | À vista | Imediata | Saída | Sim | Baixo |
| **Contrato** | bater | Parceiro | Troca | Troca | Ambos | Não | Médio |
| **Contrato** | servico | Prestador | Negociado | Execução | Nenhum | Não | Médio |
| **Contrato** | fornecimento | Fornecedor | Negociado | Parcelada | Entrada | Sim | Médio |
| **Contrato** | parceria | Parceiro | N/A | Cooperação | Variável | Não | Baixo |
| **CargaViagem** | colheita_completa | Comerciante | À vista pós | Imediata | Saída | Sim | Baixo |
| **CargaViagem** | silo_bolsa | Comerciante | Parcelado | Vendas múltiplas | Intermediário | Múltiplas | Médio |
| **CargaViagem** | contrato_industria | Indústria | Pré-fixado | Contrato | Saída | Sim | Baixo |
| **VendaContrato** | A_VISTA | Cliente | Imediato | Imediata | Saída | Sim | Baixo |
| **VendaContrato** | PARCELADO | Cliente | N parcelas | Parcial/Total | Saída | Sim | Alto |
| **VendaContrato** | ANTECIPADO | Cliente | Adiantado | Futura | Reserva | Futura | Baixo |
| **VendaContrato** | FUTURO | Cliente | Futuro | Futura | Não | Futura | Alto |

---

## 11. LOCALIZAÇÃO DE ARQUIVOS-CHAVE

### Backend
- [models.py - Definição de Modelos](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/models.py)
- [serializers.py - Serialização e Validações](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/serializers.py)
- [views.py - Endpoints API](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/views.py)
- [tests/test_contrato_types.py - Testes de Tipos](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/tests/test_contrato_types.py)
- [migrations/0026_alter_contrato_tipo_contrato.py - Latest Migration](integration-structure/project-agro/sistema-agropecuario/backend/apps/comercial/migrations/0026_alter_contrato_tipo_contrato.py)

### Frontend
- [types/comercial.ts - Type Definitions](integration-structure/project-agro/sistema-agropecuario/frontend/src/types/comercial.ts)
- [components/comercial/ContratoForm.tsx - Form Component](integration-structure/project-agro/sistema-agropecuario/frontend/src/components/comercial/ContratoForm.tsx)
- [pages/comercial/ContratoCreate.tsx - Creation Page](integration-structure/project-agro/sistema-agropecuario/frontend/src/pages/comercial/ContratoCreate.tsx)
- [constants.ts - FORMA_PAGAMENTO_CHOICES](integration-structure/project-agro/sistema-agropecuario/frontend/src/utils/constants.ts)

### Documentação
- [modulo_comercial.md - Documentação do Módulo](documentation/modulo_comercial.md)
- [modulo_fazendas.md - Integração com Fazendas](documentation/modulo_fazendas.md)

---

## 12. PRÓXIMAS MELHORIAS SUGERIDAS

1. **Unificação de Tipos**: Considerar unificar `tipo_contrato` do modelo `Contrato` com `TIPO_CHOICES` de `VendaContrato`
2. **Workflow de Status**: Implementar máquina de estados para acompanhar ciclo de vida
3. **Auditoria**: Adicionar log de todas as mudanças de tipo/status
4. **Relatórios**: Dashboard com análise de tipos (volume, valor, margem)
5. **Validações Cruzadas**: Validar compatibilidade de tipo + forma_pagamento + destino

---

**Documento Compilado:** 2026-03-14  
**Versão:** 1.0  
**Status:** Completo
