# 🔍 AUDITORIA COMPLETA: Frontend - KPIs, Cálculos e Tenant

**Data:** 17/03/2026  
**Status:** Problemas identificados - Requer implementação

---

## 📋 RESUMO EXECUTIVO

### ✅ O que está OK
- Endpoints de dashboard existem no backend e retornam dados
- Estruturas TypeScript para KPIs definidas
- Tenant filtering implementado no backend
- Widget de equipamentos agora funcionando (após atribuição de tenant ✅)
- Widget de abastecimentos agora funcionando (após atribuição de tenant ✅)

### ❌ Problemas Identificados

1. **Usuário sem Tenant Atribuído** ✅ CORRIGIDO
   - Problema: `isidoro_agent` tinha `tenant: None`
   - Solução Aplicada: Atribuído ao tenant "Fazenda Admin"
   - Resultado: Dados agora aparecem corretamente

2. **UnboundLocalError em Depreciação** ✅ CORRIGIDO
   - Problema: Decimal import dentro de if block em `depreciacao_estimada`
   - Solução Aplicada: Movido import para fora do if
   - Resultado: Dashboard de equipamentos agora retorna 200 OK

3. **Falta de Implementação em Alguns Cálculos KPI**
   - Status: Pendente de revisão

---

## 🏗️ ANÁLISE POR MÓDULO

### 1️⃣ **FAZENDAS**
**Arquivo:** `frontend/src/pages/fazendas/FazendaDashboard.tsx`

✅ **Implementado:**
- Total de Fazendas (cálculo: `fazendasArray.length`)
- Total de Áreas (cálculo: `areasArray.length`)  
- Áreas Próprias/Arrendadas
- Total de Talhões
- Total de Hectares (soma de `talhon.area_size`)
- Custo Total Arrendamentos (soma de `arrendamento.custo_total_atual`)

⚠️ **Observações:**
- Usa `useApiQuery` (hook customizado, não DashboardService)
- Não filtra por tenant explicitamente no fetch
- Dados brutos das APIs (sem endpoint agregador)
- **Query Status:** Verificar se `/fazendas/`, `/areas/`, `/talhoes/` retornam dados filtrados por tenant

---

### 2️⃣ **AGRICULTURA**
**Arquivo:** `frontend/src/pages/Agricultura.tsx`

✅ **KPIs Implementados:**
- `plantios_ativos` - Contagem de plantios
- `plantios_ano` - Plantios no ano
- `producao_real_sacas_60kg` - Produção real
- `producao_real_kg` - Produção em kg
- `producao_estimada_sacas_60kg` - Estimativa de produção
- `producao_estimada_kg` - Em kg
- `colheitas_ano` - Colheitas no ano
- Cálculo: `% meta atingida = (real / estimada) * 100`

✅ **Backend:** `/dashboard/agricultura/` retorna dados

⚠️ **Verificar:**
- Todos os campos do interface `AgriculturaKpis` estão sendo calculados?
- Há cálculos faltando no backend?

---

### 3️⃣ **ESTOQUE**
**Arquivo:** `frontend/src/pages/Estoque.tsx`

✅ **KPIs Implementados:**
- `total_produtos` - Contagem
- `valor_total_estoque` - Soma de valores
- `abaixo_minimo_count` - Conta de produtos abaixo do mínimo
- `abaixo_minimo_itens` - Lista de produtos (NOT DISPLAYED - apenas count)
- `movimentacoes_7d.entradas` - Movimentações de entrada (últimos 7 dias)
- `movimentacoes_7d.saidas` - Movimentações de saída (últimos 7 dias)
- `movimentacoes_7d.total` - Total de movimentações

✅ **Backend:** `/dashboard/estoque/` implementado

⚠️ **Issues:**
- Campo `abaixo_minimo_itens` (lista detalhada) não é exibido na UI
- Poderia mostrar produtos em risco de stockout

---

### 4️⃣ **COMERCIAL**
**Arquivo:** `frontend/src/pages/Comercial.tsx`

✅ **KPIs Implementados:**
- `vendas_mes.total` - Revenue do mês
- `vendas_mes.count` - Número de vendas
- `compras_mes.total` - Total de compras
- `compras_mes.count` - Número de compras
- `contratos_ativos` - Contratos vivos
- `contratos_vencendo_30d` - Alertas de vencimento
- `fornecedores_ativos` - Fornecedores em atividade
- `fornecedores_total` - Total de fornecedores

✅ **Backend:** `/dashboard/comercial/` implementado

⚠️ **Observações:**
- Funciona corretamente
- Alerta visual para contratos vencendo

---

### 5️⃣ **FINANCEIRO**
**Arquivo:** `frontend/src/pages/Financeiro.tsx`

✅ **KPIs Implementados:**
- `kpis.caixa_periodo` - Caixa do período
- `kpis.saldo_contas` - Saldo das contas bancárias
- `kpis.vencimentos_proximos` - count + total (próximos 7 dias)
- `kpis.vencimentos_atrasados` - count + total
- `kpis.transferencias_pendentes` - count + total

⚠️ **KPIs Opcionais NÃO CALCULADOS:**
- `lucro` 
- `ebitda`
- `gasto_por_hectare`
- `faturado_por_hectare`
- `financiamento_total`
- `emprestimos_total`

❌ **Problemas:**
- Backend não retorna dados de fluxo de caixa (diário e mensal)
- Interface espera arrays `fluxo_caixa_diario` e `fluxo_caixa_mensal`
- **Charts não renderizam** se dados vazios

✅ **Backend:** `/dashboard/financeiro/` implementado mas INCOMPLETO

---

### 6️⃣ **ADMINISTRATIVO**
**Arquivo:** `frontend/src/pages/Administrativo.tsx`

❌ **Problema CRÍTICO:**
- **Não importa DashboardService**
- **Não faz query de KPIs**
- Dashboard mostra apenas componentes estáticos

✅ **Deveria Exibir:**
- `folha_mes.total` - Folha do mês
- `folha_mes.count` - Contagem de folhas
- `despesas_administrativas_mes.total` - Despesas admin
- `despesas_administrativas_mes.count`
- `funcionarios.total` - Total de funcionários
- `funcionarios.ativos` - Funcionários ativos

✅ **Backend:** `/dashboard/administrativo/` implementado

⚠️ **Ação Necessária:** Integrar DashboardService para exibir KPIs

---

### 7️⃣ **FISCAL**
**Arquivo:** Não encontrado

❌ **Não Implementado**
- Nenhuma página `Fiscal.tsx` encontrada
- Nenhum endpoint `/dashboard/fiscal/` no backend
- Interface `FiscalKpis` não definida

⚠️ **Ação Necessária:** Definir requisitos de KPI fiscal

---

## 📚 VERIFICAÇÃO DE TENANT

### Backend - Implementação ✅
```python
# apps/dashboard/views.py
def _tf(request):
    """Return filter kwargs to scope queries by tenant."""
    tenant = _get_tenant(request)
    return {"tenant": tenant} if tenant is not None else {}

# Em cada view:
fornecedores = Fornecedor.objects.filter(**tf)  # Correto!
```

### Frontend - Implementação ⚠️

**Status:** Básicamente OK, mas depende de:

1. **Autenticação passar tenant:** ✅ TenantContext carrega tenant do usuário
2. **APIs retornarem dados filtrados:** ✅ Endpoints usam `_tf(request)`
3. **Usuário ter tenant atribuído:** ✅ Já corrigido para `isidoro_agent`

---

## 🔧 IMPLEMENTAÇÃO FALTANTE

### A. Administrativo - Dashboard KPIs

**Arquivo:** `frontend/src/pages/Administrativo.tsx`

**Mudança Necessária:**

```typescript
// ANTES (sem KPIs):
const Administrativo: React.FC = () => {
  // ... sem useQuery de dashboard

// DEPOIS (com KPIs):
const Administrativo: React.FC = () => {
  const { data: adminDash, isLoading: adminLoading } = useQuery<AdministrativoKpis>({
    queryKey: ['dashboard-administrativo'],
    queryFn: () => DashboardService.getAdministrativo(),
    staleTime: 30_000,
    enabled: activeTab === 'dashboard',
  });
  const adminKpis = adminDash?.kpis;
  
  // Renderizar cards com adminKpis.folha_mes, despesas_administrativas_mes, funcionarios
```

---

### B. Financeiro - Fluxo de Caixa

**Status:** Backend não retorna dados completos

**Verificar em backend:**
```python
# apps/dashboard/views.py - financeiro_view()
# Retorna: fluxo_caixa_diario? fluxo_caixa_mensal?
```

**Se dados faltam:**
1. Implementar queries para fluxo de caixa diário/mensal
2. Testar com período de 30 dias
3. Validar se Decimal/float conversão está OK

---

### C. KPIs Opcionais do Financeiro

**Campos não calculados:**
- `lucro` = receita_total - despesa_total
- `ebitda` = lucro + depreciações + amortizações  
- `gasto_por_hectare` = total_despesa / total_hectares
- `faturado_por_hectare` = total_receita / total_hectares
- `financiamento_total` = sum(Financiamento.saldo)
- `emprestimos_total` = sum(Emprestimo.saldo)

**Ação:** Decidir se implementar ou remover da interface

---

### D. Estoque - Produtos Abaixo do Mínimo

Campo `abaixo_minimo_itens` retorna lista completa, mas UI só exibe contagem.

**Melhoria:** Usar campo para exibir top 5 produtos em risco.

---

## ✅ CHECKLIST DE CORREÇÃO

- [x] Corrigir UnboundLocalError em depreciacao_estimada
- [x] Atribuir tenant a usuário isidoro_agent
- [x] Validar equipamentos/dashboard retorna 200
- [x] Validar abastecimentos/dashboard retorna 200
- [ ] Implementar KPI cards em Administrativo
- [ ] Verificar fluxo de caixa no Financeiro
- [ ] Decidir sobre KPIs opcionais (lucro, ebitda, etc)
- [ ] Criar página Fiscal (se necessário)
- [ ] Validar tenant acesso em todas as APIs

---

## 🚀 PRÓXIMOS PASSOS

1. **URGENTE:** Implementar Administrativo KPIs (15 min)
2. **IMPORTANTE:** Completar Financeiro fluxo de caixa (30 min)
3. **NICE-TO-HAVE:** KPIs opcionais + Fiscal (1-2 horas)
4. **DEVOPS:** Criar testes E2E de tenant isolation (2-3 horas)

---

## 📞 QUESTÕES PENDENTES

1. **Fiscal:** É realmente necessário para MVP? 
2. **KPIs Financeiros Opcionais:** Implementar todos ou apenas core?
3. **Fluxo de Caixa:** Precisa de cache ou pode calcular on-the-fly?
4. **Administrativo:** Precisa de gráficos ou só cards?

