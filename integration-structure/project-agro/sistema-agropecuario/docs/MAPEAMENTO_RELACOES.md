# 🔗 MAPEAMENTO DE RELAÇÕES INTRA-APLICATIVO

## 📊 VISÃO GERAL DAS INTEGRAÇÕES

Este documento detalha todas as conexões entre módulos do sistema agropecuário, incluindo alimentação de dados, conciliação e somatização.

---

## 🔄 FLUXO PRINCIPAL DE DADOS

```
FAZENDAS → AGRICULTURA → ESTOQUE → COMERCIAL → FINANCEIRO
    ↓         ↓            ↓         ↓           ↓
 MÁQUINAS  MÁQUINAS     MÁQUINAS  FISCAL     FISCAL
    ↓         ↓            ↓         ↓           ↓
ADMINIST. ADMINIST.   ADMINIST.  ADMINIST.  ADMINIST.
```

---

## 📋 RELAÇÕES DETALHADAS POR MÓDULO

### **1. FAZENDAS (Base Fundacional)**

#### **Entidades Principais**
- `Fazenda` - Propriedade rural
- `Talhao` - Divisão da propriedade
- `Proprietario` - Dono da propriedade
- `Arrendamento` - Contrato de locação

#### **Relações de Saída**
- **Agricultura**: `Talhao` alimenta `Plantio`, `Manejo`, `OrdemServico`
- **Estoque**: `Fazenda` determina `LocalArmazenamento`
- **Financeiro**: `Talhao` recebe `RateioCusto`
- **Máquinas**: `Fazenda` determina localização equipamentos

#### **Cálculos Automáticos**
```python
# Área total da fazenda
fazenda.area_total = sum(talhao.area_size for talhao in fazenda.talhoes.all())

# Área produtiva vs improdutiva
fazenda.area_produtiva = sum(talhao.area_size for talhao in fazenda.talhoes.filter(status='ativo'))
```

---

### **2. AGRICULTURA (Produção)**

#### **Entidades Principais**
- `Cultura` - Tipo de plantio
- `Plantio` - Safra específica
- `Manejo` - Operações agrícolas
- `Colheita` - Resultado da produção
- `OrdemServico` - Planejamento operações

#### **Relações de Entrada**
- **Fazendas**: `Talhao` (M2M), `Fazenda` (FK)
- **Estoque**: `Produto` (sementes, insumos)
- **Máquinas**: `Equipamento` (operações)

#### **Relações de Saída**
- **Estoque**: `Colheita` → `MovimentacaoEstoque` (automático)
- **Comercial**: `Colheita` → `CargaViagem` (opcional)
- **Financeiro**: `Manejo` → `RateioCusto` (custos operações)

#### **Integrações Críticas**
```python
# Colheita → Estoque (automático)
def armazenar_em_estoque(self):
    MovimentacaoEstoque.objects.create(
        produto=produto_correspondente,
        tipo='entrada',
        origem='colheita',
        quantidade=self.quantidade_colhida,
        documento_referencia=f"Colheita #{self.id}"
    )

# Plantio → Área total
@property
def area_total_ha(self):
    return sum(talhao.area_hectares for talhao in self.talhoes.all())
```

---

### **3. ESTOQUE (Armazenamento)**

#### **Entidades Principais**
- `LocalArmazenamento` - Depósitos/silos
- `Produto` - Itens armazenados
- `Lote` - Controle por lote
- `MovimentacaoEstoque` - Entradas/saídas

#### **Relações de Entrada**
- **Fazendas**: `Fazenda` determina localização
- **Agricultura**: `Colheita` gera entrada automática
- **Comercial**: `PedidoCompra` gera entrada, `PedidoVenda` gera saída

#### **Relações de Saída**
- **Comercial**: `Produto` alimenta `PedidoVenda`, `ContratoVenda`
- **Financeiro**: `MovimentacaoEstoque` gera custos armazenagem
- **Fiscal**: `MovimentacaoEstoque` alimenta inventário SPED

#### **Regras de Negócio**
```python
# Atualização automática de saldo
def save(self, *args, **kwargs):
    super().save(*args, **kwargs)
    if self.tipo == 'entrada':
        self.produto.quantidade_estoque += self.quantidade
    elif self.tipo == 'saida':
        self.produto.quantidade_estoque -= self.quantidade
    self.produto.save()

# Alertas automáticos
@property
def alerta_baixo(self):
    return self.quantidade_estoque < self.estoque_minimo
```

---

### **4. COMERCIAL (Vendas/Compras)**

#### **Entidades Principais**
- `Fornecedor` / `Cliente` - Parceiros comerciais
- `PedidoCompra` / `PedidoVenda` - Ordens comerciais
- `ContratoCompra` / `ContratoVenda` - Acordos formais
- `CargaViagem` - Transporte produção
- `VendaColheita` - Comercialização

#### **Relações de Entrada**
- **Estoque**: `Produto` determina itens comercializáveis
- **Agricultura**: `Colheita` pode gerar `CargaViagem`
- **Fazendas**: `Fazenda` determina origem produtos

#### **Relações de Saída**
- **Financeiro**: `PedidoCompra` → `Vencimento` (despesas)
- **Financeiro**: `PedidoVenda` → `Vencimento` (receitas)
- **Fiscal**: Todas operações → `NFe`, `Imposto`
- **Estoque**: `PedidoCompra` → `MovimentacaoEstoque` (entrada)

#### **Fluxo de Vendas**
```python
# Colheita → Carga → Venda
colheita = Colheita.objects.get(id=1)
carga = CargaViagem.objects.create(
    colheita_agricola=colheita,
    tipo_colheita='colheita_completa',
    # ... outros campos
)
venda = VendaColheita.objects.create(
    origem_tipo='carga_viagem',
    origem_id=carga.id,
    # ... dados venda
)
```

---

### **5. FINANCEIRO (Custos/Receitas)**

#### **Entidades Principais**
- `Vencimento` - Contas a pagar/receber
- `RateioCusto` - Distribuição custos
- `Financiamento` - Empréstimos agrícolas
- `Emprestimo` - Créditos diversos

#### **Relações de Entrada**
- **Agricultura**: `Manejo` fornece custos operações
- **Estoque**: `MovimentacaoEstoque` custos armazenagem
- **Comercial**: `PedidoCompra`/`PedidoVenda` geram vencimentos
- **Máquinas**: Manutenção, combustível
- **Fazendas**: `Talhao` recebe rateios

#### **Relações de Saída**
- **Relatórios**: Consolidação todos custos/receitas
- **Fiscal**: Base cálculo impostos

#### **Rateio de Custos**
```python
# Distribuição proporcional por área
def salvar_rateios_talhao(self):
    area_total = sum(t.area_size for t in self.talhoes.all())
    for talhao in self.talhoes.all():
        proporcao = talhao.area_size / area_total
        valor_rateado = self.valor_total * proporcao
        RateioTalhao.objects.create(
            rateio=self,
            talhao=talhao,
            proporcao_area=proporcao,
            valor_rateado=valor_rateado
        )
```

---

### **6. FISCAL (Conformidade)**

#### **Entidades Principais**
- `NFe` - Notas fiscais
- `Imposto` - Cálculos tributários
- `ObrigacaoFiscal` - Impostos devidos

#### **Relações de Entrada**
- **Comercial**: Todas operações comerciais
- **Financeiro**: Receitas/despesas tributáveis
- **Estoque**: Movimentações para SPED

#### **Relações de Saída**
- **Financeiro**: `Imposto` atualiza `Vencimento`
- **Relatórios**: Obrigações fiscais

---

### **7. MÁQUINAS (Equipamentos)**

#### **Entidades Principais**
- `Equipamento` - Máquinas agrícolas
- `Manutencao` - Ordens manutenção
- `Abastecimento` - Controle combustível

#### **Relações de Entrada**
- **Fazendas**: Localização equipamentos
- **Agricultura**: `OrdemServico` utiliza equipamentos

#### **Relações de Saída**
- **Financeiro**: Custos manutenção, combustível
- **Agricultura**: Eficiência operações

---

### **8. ADMINISTRATIVO (Gestão)**

#### **Entidades Principais**
- `Funcionario` - Equipe
- `Departamento` - Estrutura organizacional
- `ConfiguracaoSistema` - Parâmetros globais

#### **Relações de Entrada**
- Todos módulos: Logs auditoria, notificações

#### **Relações de Saída**
- Todos módulos: Configurações, permissões

---

## 🔄 CICLOS DE CONCILIAÇÃO

### **Ciclo Produção → Vendas**
1. `Plantio` (Agricultura)
2. `Manejo` → `RateioCusto` (Financeiro)
3. `Colheita` → `MovimentacaoEstoque` (Estoque)
4. `CargaViagem` → `VendaColheita` (Comercial)
5. `VendaColheita` → `Vencimento` (Financeiro)

### **Ciclo Compras → Consumo**
1. `PedidoCompra` (Comercial)
2. `PedidoCompra` → `Vencimento` (Financeiro)
3. `MovimentacaoEstoque` (Estoque)
4. `Manejo` consome `Produto` (Agricultura)

### **Ciclo Financeiro**
1. `RateioCusto` distribuído por `Talhao`
2. `Vencimento` consolidado por período
3. `Financiamento`/`Emprestimo` parcelados
4. Relatórios consolidados

---

## ⚠️ PONTOS DE ATENÇÃO

### **Dependências Críticas**
- **Fazendas primeiro**: Base para todos os cálculos de área
- **Estoque integrado**: Ponto central entre produção e comercialização
- **Financeiro atrelado**: Custos devem acompanhar todas operações

### **Validações Automáticas Necessárias**
- Saldo estoque não negativo
- Área talhão ≤ área fazenda
- Vencimentos não duplicados
- Impostos calculados corretamente

### **Performance**
- Queries com `select_related`/`prefetch_related`
- Índices em campos de relacionamento
- Caches para cálculos frequentes
- Paginação em listas grandes

---

## 🎯 IMPLEMENTAÇÃO PRIORITÁRIA

### **Sequência Recomendada**
1. **Fazendas** → Cadastros básicos
2. **Estoque** → Gestão produtos
3. **Agricultura** → Produção integrada
4. **Comercial** → Vendas/compras
5. **Financeiro** → Custos/receitas
6. **Fiscal** → Conformidade
7. **Máquinas** → Equipamentos
8. **Administrativo** → Gestão geral

### **Testes de Integração**
- Criar fazenda → talhão → plantio → colheita → venda
- Validar cálculos automáticos
- Verificar consistência dados
- Testar regras negócio</content>
<parameter name="filePath">/home/felip/projeto-agro/project-agro/sistema-agropecuario/docs/MAPEAMENTO_RELACOES.md