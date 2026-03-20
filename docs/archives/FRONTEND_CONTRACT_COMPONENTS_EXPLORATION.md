# Frontend Contract Components & Structure Exploration

**Date:** March 14, 2026  
**Project:** sys-agropecuário - Frontend Contract Components Analysis  
**Base Path:** `/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/project-agro/sistema-agropecuario/frontend/src`

---

## Executive Summary

The frontend has a **well-structured contract module** with three main contract types:

1. **ContratoCompra** - Purchase contracts with supplier management and barter support
2. **ContratoVenda** - Sales contracts with installment management
3. **ContratoFinanceiro** - Financial products (consortium, insurance, applications)

All contract types are **implemented with React Hook Form + Yup validation** and use **TanStack React Query** for data management.

---

## 📁 Complete File Inventory

### 1. Type Definitions & Interfaces

| File Path | Purpose | Key Types | Lines |
|-----------|---------|-----------|-------|
| **types/contratosSplit.ts** | Core contract type definitions | `ContratoCompra`, `ContratoVenda`, `ContratoFinanceiro`, `ContratoQualquer` | ~450 |
| **types/comercial.ts** | Commercial module types | `ContratoComercial`, `ParteContrato`, `ItemContrato`, `CondicaoContrato` | ~500+ |
| **types/estoque_maquinas.ts** | Equipment/machinery sales contracts | `VendaContrato`, `ParcelaContrato`, `TipoContrato` | ~400+ |

#### Key Interfaces Found:

**contratosSplit.ts:**
- `ContratoCompra` - Purchase contract interface (line 80)
- `ContratoVenda` - Sales contract interface (line 193)
- `ContratoFinanceiro` - Financial contract interface (line 353)
- `ContratoQualquer` - Union type of all three (line 412)
- Supporting interfaces: `ItemCompra`, `ItemVenda`, `CondicaoCompra`, `CondicaoVenda`, etc.

**comercial.ts:**
- `ContratoComercial` - Generic commercial contract
- `ParteContrato` - Contract party/participant
- `ItemContrato` - Contract items
- `CondicaoContrato` - Contract conditions

**estoque_maquinas.ts:**
- `VendaContrato` - Sales contract (equipment/machinery)
- `ParcelaContrato` - Installment/payment part
- `TipoContrato` = `'A_VISTA' | 'PARCELADO' | 'ANTECIPADO' | 'FUTURO'`
- `StatusContrato` = `'RASCUNHO' | 'ATIVO' | 'ENCERRADO' | 'CANCELADO'`

---

### 2. Form Components & Modals

| File Path | Component Name | Type | Purpose | Status |
|-----------|---|---|---------|--------|
| **components/comercial/ContratoForm.tsx** | `ContratoForm` | Reusable Modal | Generic contract form | ✅ Implemented |
| **components/comercial/ContratoCompraForm.tsx** | `ContratoCompraForm` | Form Component | Purchase contract creation & editing | ✅ Implemented (999 lines) |
| **components/comercial/ContratoVendaForm.tsx** | `ContratoVendaForm` | Form Component | Sales contract with installments | ✅ Implemented (1,219 lines) |
| **components/comercial/ContratoFinanceiroForm.tsx** | `ContratoFinanceiroForm` | Form Component | Financial product contracts | ✅ Implemented (1,152 lines) |
| **components/comercial/ContratoTypeSelector.tsx** | `ContratoTypeSelector` | Dialog Selector | Contract type selection component | ✅ Implemented |
| **components/comercial/FornecedorForm.tsx** | `FornecedorForm` | Form Component | Supplier/vendor form | ✅ Implemented |
| **components/comercial/FornecedorList.tsx** | `FornecedorList` | List Component | Supplier list view | ✅ Implemented |

#### Component Details:

**ContratoCompraForm.tsx:**
- **Props:** `initialData?: ContratoCompra`, `onSubmit: (data: ContratoCompra) => Promise<void>`
- **Form Resolver:** `yupResolver(schemaContratoCompra)`
- **Features:** 4 main tabs for purchase contract management
- **Imports:** Uses `ContratoCompra`, `ItemCompra`, `CondicaoCompra` from types
- **Validation:** Built-in Yup validation schema integration

**ContratoVendaForm.tsx:**
- **Props:** `initialData?: ContratoVenda`, `onSubmit: (data: ContratoVenda) => Promise<void>`
- **Form Resolver:** `yupResolver(schemaContratoVenda)`
- **Features:** 6 tabs including installment management
- **Imports:** Uses `ContratoVenda`, `ItemVenda`, `ParcelaVenda`, `CondicaoVenda` from types
- **Special Features:** Parcelation logic built-in

**ContratoFinanceiroForm.tsx:**
- **Props:** `initialData?: ContratoFinanceiro`, `onSubmit: (data: ContratoFinanceiro) => Promise<void>`
- **Form Resolver:** `yupResolver(schemaContratoFinanceiro)`
- **Features:** 5 tabs for financial product management
- **Imports:** Uses `ContratoFinanceiro`, `TipoProdutoFinanceiro` from types
- **Products Supported:** Consortium, Insurance, Financial Applications

**ContratoTypeSelector.tsx:**
- **Type:** Dialog-based component with grid layout
- **Features:** Visual card-based selection interface
- **Options:** CompilationRequest, Venda, Financeiro contract types
- **Navigation:** Routes to appropriate form based on selection

---

### 3. Validation Schemas

| File Path | Purpose | Lines | Validations |
|-----------|---------|-------|---|
| **validations/contratoCompra.ts** | Purchase contract validation schema | ~170 | 20+ validation rules |
| **validations/contratoVenda.ts** | Sales contract validation schema | ~240 | 25+ validation rules |
| **validations/contratoFinanceiro.ts** | Financial contract validation schema | ~340 | 30+ validation rules |

#### Validation Details:

**contratoCompra.ts (line 65):**
- Schema: `schemaContratoCompra` - Yup.object() with 20+ field validations
- Type Export: `ContratoCompraFormData` (line 170)
- Validates: Item descriptions, quantities, prices, supplier data, payment conditions, barter arrangements
- Special Rules: Validates barter-specific fields when `tipo_operacao` includes 'BARTER'

**contratoVenda.ts (line 130):**
- Schema: `schemaContratoVenda` - Yup.object() with 25+ field validations
- Type Export: `ContratoVendaFormData` (line 238)
- Validates: Sales items, pricing, customer data, delivery dates, installment configurations
- Special Rules: Conditional validation based on `tipo_operacao` (PARCELADA vs ANTECIPADA, etc.)

**contratoFinanceiro.ts (line 245):**
- Schema: `schemaContratoFinanceiro` - Yup.object() with 30+ field validations
- Type Export: `ContratoFinanceiroFormData` (line 339)
- Validates: Financial product specifics (consortium terms, insurance coverage, investment details)
- Special Rules: Product-specific validations based on `tipo_produto_financeiro`

---

### 4. Services & API Integration

| File Path | Service Name | Methods | Purpose |
|-----------|---|---|---|
| **services/contratos.ts** | `contratosService` | `listar()`, `buscar()`, `criarComParcelas()`, `atualizar()`, `cancelar()`, `deletar()`, `obterDashboard()` | API client for contract operations |
| **services/comercial.ts** | `comercialService` | CRUD + custom actions | Generic commercial service |
| **services/api.ts** | `api` (Axios instance) | HTTP configuration | Base API client setup |

#### Service Details:

**contratos.ts:**
```typescript
const contratosService = {
  listar: async (params?: {
    page?: number;
    status?: string;
    tipo?: string;
    cliente?: number;
    search?: string;
  }): Promise<PaginatedResponse<VendaContrato>>
  
  buscar: async (id: number): Promise<VendaContrato>
  
  criarComParcelas: async (dados: CriarContratoRequest): Promise<VendaContrato>
  
  atualizar: async (id: number, dados: Partial<VendaContrato>): Promise<VendaContrato>
  
  cancelar: async (id: number): Promise<VendaContrato>
  
  deletar: async (id: number): Promise<void>
  
  obterDashboard: async (): Promise<DashboardContratos>
}
```

---

### 5. Page Components

| File Path | Component | Purpose | Features |
|-----------|---|---|---|
| **pages/comercial/ContratoCreate.tsx** | Contract creation page | Create new contracts with type selector | Modal integration |
| **pages/comercial/ContratoForm.tsx** | Contract editing page | Edit existing contracts | Form management |
| **pages/comercial/ContratosList.tsx** | Contracts list page | Display all contracts with filters | Pagination, search, filters |
| **pages/comercial/ContratoDetalhes.tsx** | Contract details view | View contract details and linked data | Read-only view with actions |
| **pages/comercial/ClienteCreate.tsx** | Customer creation | Create customers for contracts | Related entity |
| **pages/comercial/CompraCreate.tsx** | Purchase creation | Create purchase orders | Related to contracts |
| **pages/comercial/VendaCreate.tsx** | Sale creation | Create sales/quotations | Related to contracts |
| **pages/comercial/EmpresaCreate.tsx** | Company creation | Create companies | Related to contracts |
| **pages/comercial/EmpresaDetail.tsx** | Company details | View company details | Related entity |
| **pages/comercial/EmpresasList.tsx** | Companies list | List all companies | Related entity |
| **pages/comercial/FornecedoresList.tsx** | Suppliers list | List all suppliers | Related entity |
| **pages/comercial/Documentos.tsx** | Documents management | Upload/manage contract documents | File handling |

---

### 6. Module Pages

| File Path | Component | Purpose |
|-----------|---|---|
| **pages/Comercial.tsx** | Module container | Main commercial module page |
| **pages/ComercialLayout.tsx** | Module layout wrapper | Navigation and layout |
| **pages/comercial/** | Submodule folder | All comercial-related pages |

#### Comercial.tsx Features:
- Contract modal state management: `showContratoModal`
- Uses `ModalForm` component with `ContratoCreate` inside
- Displays contracts dashboard/table
- Integration with `useQuery` for fetching `contratos` data
- Links to `/comercial/contratos/{id}` for details

---

### 7. Hooks (Custom React Hooks)

| File Path | Hook Name | Purpose |
|-----------|---|---|
| **hooks/useApi.ts** | `useApi` | Generic API hook wrapper |
| **hooks/useAuth.ts** | `useAuth` | Authentication management |
| **hooks/useFormValidation.ts** | `useFormValidation` | Form validation helper |
| **hooks/useRBAC.ts** | `useRBAC` | Role-based access control |
| **hooks/useTenant.ts** | `useTenant` | Multi-tenant context |

---

### 8. Utilities & Constants

| File Path | Purpose | Content |
|-----------|---------|---------|
| **utils/constants.ts** | App-wide constants | Form choices, status options |
| **utils/formatters.ts** | Data formatting utilities | Currency, date, number formatting |
| **utils/validators.ts** | Validation utilities | Custom validators for forms |
| **utils/units.ts** | Unit conversion utilities | Weight, volume, distance conversions |

---

## 🏗️ Architecture Overview

### Component Hierarchy

```
App.tsx
├── Routes/
│   └── /comercial
│       ├── Comercial.tsx (Page Container)
│       │   ├── ContratosList.tsx
│       │   ├── Modal: ContratoCreate
│       │   │   └── ContratoTypeSelector
│       │   │       ├── Route → ContratoCompraForm.tsx
│       │   │       ├── Route → ContratoVendaForm.tsx
│       │   │       └── Route → ContratoFinanceiroForm.tsx
│       │   └── Other modals (Cliente, Venda, etc.)
│       │
│       ├── ContratoDetalhes.tsx
│       │   └── (Read-only contract details)
│       │
│       ├── ClienteCreate.tsx
│       ├── VendaCreate.tsx
│       ├── CompraCreate.tsx
│       └── ... (other CRUD pages)
│
├── Shared Components
│   └── comercial/
│       ├── ContratoForm.tsx (Generic modal)
│       ├── ContratoCompraForm.tsx
│       ├── ContratoVendaForm.tsx
│       ├── ContratoFinanceiroForm.tsx
│       ├── ContratoTypeSelector.tsx
│       ├── FornecedorForm.tsx
│       └── FornecedorList.tsx
│
└── Common
    ├── Layout.tsx
    ├── Sidebar.tsx
    └── RBACGuard.tsx
```

### Data Flow

```
User fills ContratoCompraForm
    ↓
React Hook Form captures data
    ↓
Yup schema validates (schemaContratoCompra)
    ↓
handleFormSubmit → contratosService.criarComParcelas()
    ↓
API POST /api/comercial/vendas-contrato/criar_com_parcelas/
    ↓
Backend creates VendaContrato + ParcelaContrato instances
    ↓
Response → React Query cache update
    ↓
Navigate to ContratoDetalhes or ContratosList
    ↓
UI re-renders with new data
```

---

## 📊 Current Implementation Status

### ✅ Fully Implemented

| Component | Status | Lines | Features |
|-----------|--------|-------|----------|
| **ContratoCompraForm.tsx** | ✅ Complete | 999 | 4 tabs, full validation |
| **ContratoVendaForm.tsx** | ✅ Complete | 1,219 | 6 tabs, installment calc |
| **ContratoFinanceiroForm.tsx** | ✅ Complete | 1,152 | 5 tabs, 3 product types |
| **ContratoTypeSelector.tsx** | ✅ Complete | 220+ | Visual type selection |
| **schemaContratoCompra.ts** | ✅ Complete | 170 | 20+ validations |
| **schemaContratoVenda.ts** | ✅ Complete | 240 | 25+ validations |
| **schemaContratoFinanceiro.ts** | ✅ Complete | 340 | 30+ validations |
| **contratosService.ts** | ✅ Complete | 116 | All CRUD + dashboard |

### ⏳ Pending/Partial

| Component | Status | Notes |
|-----------|--------|-------|
| Unit tests | ⏳ Pending | No Jest tests found in components |
| E2E tests | ⏳ Pending | No Playwright tests found |
| StoryBook stories | ⏳ Pending | No component stories |

---

## 🔗 Contract Type Specifications

### ContratoCompra (Purchase Contract)

**Type Operations:**
- `COMPRA_DINHEIRO` - Cash/immediate payment
- `COMPRA_ANTECIPADO` - Prepayment purchase
- `COMPRA_BARTER` - Barter/exchange purchase

**Categories:**
- `insumos` - Inputs/supplies
- `maquinas` - Machinery
- `sementes` - Seeds
- `defensivos` - Pesticides
- `servicos_agricolas` - Agricultural services
- `outros` - Other

**Key Fields:**
- Multiple items with descriptions, quantities, pricing
- Supplier with legal representative
- Payment conditions
- Product guarantees
- Barter arrangements with financial adjustments
- Freight inclusion/separation

---

### ContratoVenda (Sales Contract)

**Type Operations:**
- `VENDA_DINHEIRO` - Cash sale
- `VENDA_PARCELADA` - Installment sale
- `VENDA_ANTECIPADA` - Prepaid delivery
- `VENDA_FUTURA` - Future contract
- `VENDA_SPOT` - Spot market sale
- `VENDA_BARTER` - Barter/exchange sale

**Key Features:**
- Sales items with customer information
- Multiple pricing/discount options
- Automatic installment generation (ParcelaVenda)
- Delivery date planning
- Parcelation configuration (monthly, bimonthly, quarterly)
- Payment term tracking

**Installment Fields (ParcelaVenda):**
- `numero_parcela` - Installment number
- `valor` - Installment amount
- `data_vencimento` - Due date
- Linked to financial module for tracking

---

### ContratoFinanceiro (Financial Product Contracts)

**Product Types (TipoProdutoFinanceiro):**
- `consorcio` - Consortium/vehicle purchase group
- `seguro` - Insurance policies
- `aplicacao_financeira` - Financial investments/applications

**Key Fields:**
- Product-specific parameters
- Financial institution details
- Terms and conditions
- Risk assessments
- Coverage/benefit details

**Coverage by Product:**
- **Consortium:** Quotas, payment schedule, waiting time
- **Insurance:** Coverage limits, deductibles, validity period
- **Investment:** Initial amount, maturity date, return rates

---

## 📋 Form Structure Comparison

### ContratoCompraForm Tabs (4 tabs)

1. **Dados Gerais** - General information
2. **Itens de Compra** - Purchase items
3. **Fornecedor** - Supplier information
4. **Condições** - Payment and delivery conditions

### ContratoVendaForm Tabs (6 tabs)

1. **Dados Gerais** - General information
2. **Cliente** - Customer details
3. **Itens de Venda** - Sales items
4. **Parcelamento** - Installment configuration
5. **Condições** - Terms and conditions
6. **Documentos** - Document management

### ContratoFinanceiroForm Tabs (5 tabs)

1. **Dados Gerais** - General information
2. **Beneficiário** - Beneficiary
3. **Produto Financeiro** - Product-specific details
4. **Condições** - Terms (policy/contract terms)
5. **Documentos** - Documentation

---

## 🔐 Security Features

### RBAC Integration
- Module: `'comercial'`
- Actions: `'view'`, `'add'`, `'change'`, `'delete'`
- Guard: `<RBACGuard module="comercial">`

### Authentication
- JWT token-based
- AuthContext provider
- useAuth hook integration

### Multi-tenant Support
- TenantContext provider
- useTenant hook
- Tenant-aware API calls

---

## 🎯 Form Validation Rules Examples

### ContratoCompraForm Validations

```typescript
- numero_contrato: Required, unique format
- titulo: Required
- fornecedor_id: Required
- valor_total: Required, positive number
- items: At least 1 item required
  - descricao_item: Required
  - quantidade: Required, positive
  - valor_unitario: Required, positive
  - valor_total_item: Auto-calculated (quantidade × valor_unitario)
- Barter fields: Conditionally required if tipo_operacao = COMPRA_BARTER
```

### ContratoVendaForm Validations

```typescript
- numero_contrato: Required, unique format
- cliente_id: Required
- valor_total: Required, positive
- data_entrega_prevista: Required
- numero_parcelas: Min 1
- items: At least 1 item required
- Installment auto-generation based on:
  - numero_parcelas
  - periodicidade_parcelas
  - valor_total ÷ numero_parcelas
```

### ContratoFinanceiroForm Validations

```typescript
- numero_contrato: Required
- tipo_produto_financeiro: Required (consorcio|seguro|aplicacao)
- beneficiario: Required
- valor_total: Required, positive
- Product-specific validations:
  - Consortium: quota parameters required
  - Insurance: coverage limits required
  - Investment: maturity date required
```

---

## 🚀 Integration Points

### Backend API Endpoints

```
POST   /api/comercial/vendas-contrato/
GET    /api/comercial/vendas-contrato/
GET    /api/comercial/vendas-contrato/{id}/
PATCH  /api/comercial/vendas-contrato/{id}/
DELETE /api/comercial/vendas-contrato/{id}/
POST   /api/comercial/vendas-contrato/{id}/cancelar/
POST   /api/comercial/vendas-contrato/criar_com_parcelas/

GET    /api/comercial/parcelas-contrato/
POST   /api/comercial/parcelas-contrato/
GET    /api/comercial/parcelas-contrato/{id}/

GET    /api/comercial/contratos/
POST   /api/comercial/contratos/
...
```

### Financial Module Integration

- `ParcelaVenda` links to `Vencimento` (financial due date)
- Automatic financial tracking for installment contracts
- Dashboard statistics integration

### Inventory/Stock Module Integration

- Products availability tracking
- Stock impact calculation
- Reservation management for advance contracts

---

## 📦 Dependencies Used

**Key Libraries:**
- `react` - UI framework
- `react-hook-form` - Form state management
- `yup` - Schema validation
- `@hookform/resolvers` - Form validation integration
- `axios` - HTTP client
- `@tanstack/react-query` - Data caching & synchronization
- `tailwindcss` - Styling
- `@mui/material` - UI components
- `react-router-dom` - Routing

---

## 📝 Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Contract-Related Files** | 10+ |
| **Form Components** | 7 |
| **Type Definition Files** | 3 |
| **Validation Schema Files** | 3 |
| **Service Files** | 3 |
| **Page Components** | 12+ |
| **Total Lines (Forms)** | ~3,400+ |
| **Total Lines (Validations)** | ~750+ |
| **Validation Rules** | 75+ |

---

## 🎯 Recommended Next Steps

1. **Add Unit Tests** - Create Jest test suites for validation schemas and components
2. **Add E2E Tests** - Create Playwright tests for user workflows
3. **Component Stories** - Create Storybook stories for documentation
4. **API Integration Tests** - Test service methods with mock API
5. **Form State Management** - Add Redux/Zustand for complex forms if needed
6. **Performance Optimization** - Memoize callbacks and derived state
7. **Documentation** - Add JSDoc comments to components
8. **Accessibility** - Add ARIA labels and keyboard navigation

---

## 📄 Files Location Quick Reference

```
Frontend Structure:
├── src/
│   ├── types/
│   │   ├── contratosSplit.ts         ← Contract type definitions
│   │   ├── comercial.ts              ← Commercial types
│   │   └── estoque_maquinas.ts       ← Equipment contract types
│   │
│   ├── validations/
│   │   ├── contratoCompra.ts         ← Compra validation schema
│   │   ├── contratoVenda.ts          ← Venda validation schema
│   │   └── contratoFinanceiro.ts     ← Financeiro validation schema
│   │
│   ├── components/comercial/
│   │   ├── ContratoCompraForm.tsx    ← Purchase form (999 lines)
│   │   ├── ContratoVendaForm.tsx     ← Sales form (1,219 lines)
│   │   ├── ContratoFinanceiroForm.tsx ← Financial form (1,152 lines)
│   │   ├── ContratoForm.tsx          ← Generic form
│   │   ├── ContratoTypeSelector.tsx  ← Type selector dialog
│   │   ├── FornecedorForm.tsx        ← Supplier form
│   │   └── FornecedorList.tsx        ← Supplier list
│   │
│   ├── pages/comercial/
│   │   ├── ContratoCreate.tsx        ← Create contract page
│   │   ├── ContratoForm.tsx          ← Edit contract page
│   │   ├── ContratosList.tsx         ← List contracts page
│   │   ├── ContratoDetalhes.tsx      ← Contract details page
│   │   ├── ClienteCreate.tsx         ← Create customer
│   │   ├── CompraCreate.tsx          ← Create purchase
│   │   ├── VendaCreate.tsx           ← Create sale
│   │   ├── EmpresaCreate.tsx         ← Create company
│   │   ├── EmpresaDetail.tsx         ← Company details
│   │   ├── EmpresasList.tsx          ← Companies list
│   │   ├── FornecedoresList.tsx      ← Suppliers list
│   │   ├── Documentos.tsx            ← Document management
│   │   └── __tests__/                ← Component tests (pending)
│   │
│   ├── services/
│   │   ├── contratos.ts             ← Contract service
│   │   ├── comercial.ts             ← Commercial service
│   │   └── api.ts                   ← API base setup
│   │
│   ├── hooks/
│   │   ├── useApi.ts                ← API hook
│   │   ├── useAuth.ts               ← Auth hook
│   │   ├── useFormValidation.ts     ← Form validation hook
│   │   ├── useRBAC.ts               ← RBAC hook
│   │   └── useTenant.ts             ← Tenant hook
│   │
│   └── utils/
│       ├── constants.ts              ← App constants
│       ├── formatters.ts             ← Data formatters
│       ├── validators.ts             ← Custom validators
│       └── units.ts                  ← Unit conversions
```

---

**Document Generated:** 2026-03-14  
**Status:** Complete  
**Last Updated:** 2026-03-14
