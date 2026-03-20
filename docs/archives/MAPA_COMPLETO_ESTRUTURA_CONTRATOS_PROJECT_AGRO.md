# 📋 Mapa Completo de Estrutura de Contratos - Project-Agro

**Data:** 14 de Março de 2026  
**Projeto:** project-agro (sistema-agropecuario)  
**Escopo:** Mapeamento COMPLETO de arquivos, componentes, tipos, serviços e dependências relacionados a contratos

---

## 📑 Índice
1. [Localização de Arquivos](#localização-de-arquivos)
2. [Estrutura Frontend](#estrutura-frontend)
3. [Estrutura Backend](#estrutura-backend)
4. [Dependências e Bibliotecas](#dependências-e-bibliotecas)
5. [Configuração e Roteamento](#configuração-e-roteamento)
6. [Padrões de Nomenclatura](#padrões-de-nomenclatura)

---

## 🗂️ Localização de Arquivos

### Raiz do Projeto
```
/home/agrolink/project-agro.bak-20260312043346/sistema-agropecuario/
├── frontend/     (React + TypeScript)
├── backend/      (Django)
└── ...
```

---

## 🎨 Estrutura Frontend

### 📍 Localização Base
```
/home/agrolink/project-agro.bak-20260312043346/sistema-agropecuario/frontend/src/
```

### 1. **Páginas de Contratos** (`/pages/comercial/`)

| Arquivo | Localização | Descrição | Status |
|---------|-------------|-----------|--------|
| **ContratoForm.tsx** | `/pages/comercial/ContratoForm.tsx` | Formulário completo para criação/edição de contratos com múltiplas abas (dados gerais, partes, itens, condições) | ✅ Implementado |
| **ContratoCreate.tsx** | `/pages/comercial/ContratoCreate.tsx` | Página de criação de novo contrato com validação Yup | ✅ Implementado |
| **ContratosList.tsx** | `/pages/comercial/ContratosList.tsx` | Listagem de contratos com filtros (status, tipo, busca) e paginação | ✅ Implementado |
| **ContratoDetalhes.tsx** | `/pages/comercial/ContratoDetalhes.tsx` | Visualização de detalhes de um contrato específico | ✅ Implementado |
| **Comercial.tsx** | `/pages/Comercial.tsx` | Página principal do módulo comercial (container) | ✅ Implementado |
| **ComercialLayout.tsx** | `/pages/ComercialLayout.tsx` | Layout para o módulo comercial | ✅ Implementado |

### 2. **Componentes Reutilizáveis** (`/components/comercial/`)

| Arquivo | Localização | Descrição | Status |
|---------|-------------|-----------|--------|
| **ContratoForm.tsx** | `/components/comercial/ContratoForm.tsx` | Componente de formulário modal reutilizável para contratos comerciais | ✅ Implementado |
| **FornecedorForm.tsx** | `/components/comercial/FornecedorForm.tsx` | Formulário para gerenciar fornecedores | ✅ Implementado |
| **FornecedorList.tsx** | `/components/comercial/FornecedorList.tsx` | Listagem de fornecedores | ✅ Implementado |

### 3. **Tipos/Interfaces** (`/types/`)

| Arquivo | Localização | Descrição | Tipos Principais |
|---------|-------------|-----------|-----------------|
| **comercial.ts** | `/types/comercial.ts` | Tipos do módulo comercial, incluindo contratos | `ContratoComercial`, `ParteContrato`, `ItemContrato`, `CondicaoContrato`, `VendaCompra`, `FiltrosComerciais`, `RelatorioComercial` |
| **estoque_maquinas.ts** | `/types/estoque_maquinas.ts` | Tipos de contratos de venda e parcelas | `VendaContrato`, `ParcelaContrato`, `CriarContratoRequest`, `TipoContrato`, `PeriodicidadeParcela`, `StatusContrato` |
| **index.ts** | `/types/index.ts` | Index que exporta tipos das páginas | Reexporta tipos de outros arquivos |

#### Tipos Detalhados em `comercial.ts`:

```typescript
// Partes do contrato
export interface ParteContrato {
  id?: number;
  tipo_parte: 'fornecedor' | 'prestador' | 'instituicao' | 'proprietario' | 'outros';
  papel_contrato: 'contratante' | 'contratado' | 'fiador' | 'avalista' | 'interveniente';
  entidade_id: number;
  entidade_cpf_cnpj: string;
  // ... mais campos
}

// Itens do contrato
export interface ItemContrato {
  id?: number;
  tipo_item: 'produto' | 'servico' | 'financiamento' | 'outros';
  quantidade?: number;
  valor_unitario?: number;
  valor_total: number;
  // ... mais campos
}

// Condições do contrato
export interface CondicaoContrato {
  id?: number;
  tipo_condicao: 'pagamento' | 'entrega' | 'garantia' | 'multa' | 'rescisao' | 'outras';
  obrigatoria: boolean;
  // ... mais campos
}

// Contrato comercial completo
export interface ContratoComercial {
  id?: number;
  numero_contrato: string;
  titulo: string;
  tipo_contrato: 'compra' | 'venda' | 'venda_futura' | 'venda_spot' | 'bater' | 'servico' | 'fornecimento' | 'parceria' | 'outros';
  status: 'rascunho' | 'em_negociacao' | 'assinado' | 'em_execucao' | 'concluido' | 'cancelado' | 'suspenso';
  partes: ParteContrato[];
  itens: ItemContrato[];
  condicoes: CondicaoContrato[];
  valor_total: number;
  // ... mais campos
}
```

#### Tipos em `estoque_maquinas.ts`:

```typescript
export interface VendaContrato {
  id?: number;
  numero_contrato: string;
  cliente: number;
  produto: number;
  quantidade_total: number;
  preco_unitario: number;
  valor_total: number;
  tipo: 'A_VISTA' | 'PARCELADO' | 'ANTECIPADO' | 'FUTURO';
  status: 'RASCUNHO' | 'ATIVO' | 'ENCERRADO' | 'CANCELADO';
  // ... parcelas, datas, etc
}

export interface ParcelaContrato {
  id?: number;
  contrato: number;
  numero_parcela: number;
  valor: number;
  data_vencimento: string;
}

export type TipoContrato = 'A_VISTA' | 'PARCELADO' | 'ANTECIPADO' | 'FUTURO';
export type PeriodicidadeParcela = 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL';
export type StatusContrato = 'RASCUNHO' | 'ATIVO' | 'ENCERRADO' | 'CANCELADO';
```

### 4. **Serviços/APIs** (`/services/`)

| Arquivo | Localização | Descrição | Principais Funções |
|---------|-------------|-----------|-------------------|
| **contratos.ts** | `/services/contratos.ts` | Serviço especializado para VendaContrato | `listar()`, `buscar()`, `criarComParcelas()`, `atualizar()`, `cancelar()`, `deletar()`, `obterDashboard()` |
| **comercial.ts** | `/services/comercial.ts` | Serviço para Contrato genérico | Funções CRUD para contratos comerciais |
| **api.ts** | `/services/api.ts` | Instância Axios configurada | Base para todas as chamadas API |

#### Interface `contratos.ts`:

```typescript
const contratosService = {
  // Lista com paginação e filtros
  listar: async (params?: {
    page?: number;
    status?: string;
    tipo?: string;
    cliente?: number;
    search?: string;
  }): Promise<PaginatedResponse<VendaContrato>>,

  // Busca específica
  buscar: async (id: number): Promise<VendaContrato>,

  // Cria contrato com geração automática de parcelas
  criarComParcelas: async (dados: CriarContratoRequest): Promise<VendaContrato>,

  // Atualiza (apenas rascunhos)
  atualizar: async (id: number, dados: Partial<VendaContrato>): Promise<VendaContrato>,

  // Cancela contrato
  cancelar: async (id: number): Promise<VendaContrato>,

  // Remove (apenas rascunhos)
  deletar: async (id: number): Promise<void>,

  // Dashboard com estatísticas
  obterDashboard: async (): Promise<DashboardContratos>
};
```

### 5. **Validações**

#### Schemas Yup em `ContratoForm.tsx` (página):

```typescript
const schema = yup.object().shape({
  numero_contrato: yup.string().required('Número do contrato é obrigatório'),
  titulo: yup.string().required('Título é obrigatório'),
  tipo_contrato: yup.string().required('Tipo de contrato é obrigatório'),
  categoria: yup.string().required('Categoria é obrigatória'),
  status: yup.string().required('Status é obrigatório'),
  valor_total: yup.number().required('Valor total é obrigatório'),
  data_inicio: yup.string().required('Data de início é obrigatória'),
  data_fim: yup.string(),
  prazo_execucao_dias: yup.number().min(0, 'Prazo deve ser positivo'),
  observacoes: yup.string(),
  condicoes: yup.array().of(yup.object().shape({
    tipo_condicao: yup.string().required(),
    descricao: yup.string().required(),
    obrigatoria: yup.boolean(),
  })).default([]),
});
```

#### Schemas em `ContratoCreate.tsx`:

```typescript
const schema = yup.object().shape({
  numero_contrato: yup.string().required('Número do contrato é obrigatório'),
  titulo: yup.string().required('Título é obrigatório'),
  tipo_contrato: yup.string().required('Tipo de contrato é obrigatório'),
  categoria: yup.string().required('Categoria é obrigatória'),
  status: yup.string().required('Status é obrigatório'),
  valor_total: yup.number().required('Valor total é obrigatório'),
  data_inicio: yup.string().required('Data de início é obrigatória'),
  // ... mais campos e validações
});
```

### 6. **Testes** (`/__tests__/`)

Localização esperada: `/pages/comercial/__tests__/`
- Testes não encontrados ainda (podem ser criados)

### 7. **Rotas Frontend**

Roteamento em `App.tsx`:

```typescript
// Rota para o module comercial
<Route path="/comercial" element={<ComercialLayout />}>
  {/* Subrotas para contratos */}
  <Route path="contratos" element={<ContratosList />} />
  <Route path="contratos/novo" element={<ContratoCreate />} />
  <Route path="contratos/:id" element={<ContratoDetalhes />} />
  <Route path="contratos/:id/editar" element={<ContratoForm />} />
</Route>
```

---

## 🔧 Estrutura Backend

### 📍 Localização Base
```
/home/agrolink/project-agro.bak-20260312043346/sistema-agropecuario/backend/apps/comercial/
```

### 1. **Modelos Django** (`models.py`)

| Modelo | Localização | Campos Principais | Choices |
|--------|-------------|------------------|---------|
| **Contrato** | `models.py:L1460` | `numero_contrato`, `titulo`, `tipo_contrato`, `status`, `valor_total`, `data_inicio`, `data_fim`, `prazo_execucao_dias`, `partes` (JSON), `itens` (JSON), `condicoes` (JSON), `documento` | TIPO_CONTRATO_CHOICES: compra, venda, venda_futura, venda_spot, bater, servico, fornecimento, parceria, outros |
| **VendaContrato** | `models.py:L2230` | `numero_contrato`, `cliente`, `produto`, `quantidade_total`, `preco_unitario`, `valor_total`, `tipo`, `status`, `data_contrato`, `data_entrega_prevista`, `numero_parcelas`, `periodicidade_parcelas`, `observacoes` | TIPO_CHOICES: A_VISTA, PARCELADO, ANTECIPADO, FUTURO / STATUS_CHOICES: RASCUNHO, ATIVO, ENCERRADO, CANCELADO |
| **ParcelaContrato** | `models.py:L2270` | `contrato` (FK), `numero_parcela`, `valor`, `data_vencimento`, `vencimento` (FK para Financeiro) | - |
| **CargaViagem** | `models.py:L1740` | Tipo de colheita, peso, custos, armazenamento | TIPO_COLHEITA_CHOICES: colheita_completa, silo_bolsa, contrato_industria |

#### Modelo: Contrato (Genérico)

```python
class Contrato(TenantModel):
    TIPO_CONTRATO_CHOICES = [
        ('compra', 'Compra'),
        ('venda', 'Venda'),
        ('venda_futura', 'Venda Futura'),
        ('venda_spot', 'Venda Spot'),
        ('bater', 'Barter'),
        ('servico', 'Serviço'),
        ('fornecimento', 'Fornecimento'),
        ('parceria', 'Parceria'),
        ('outros', 'Outros'),
    ]
    
    numero_contrato: CharField(unique=True)
    titulo: CharField(max_length=200)
    tipo_contrato: CharField(choices=TIPO_CONTRATO_CHOICES)
    categoria: CharField(blank=True, null=True)
    status: CharField(default='rascunho')
    valor_total: DecimalField(max_digits=14, decimal_places=2)
    data_inicio: DateField()
    data_fim: DateField(blank=True, null=True)
    prazo_execucao_dias: IntegerField(blank=True, null=True)
    observacoes: TextField(blank=True, null=True)
    
    # JSON fields
    partes: JSONField(blank=True, null=True)
    itens: JSONField(blank=True, null=True)
    condicoes: JSONField(blank=True, null=True)
    
    documento: FileField(upload_to='contratos/', blank=True, null=True)
    criado_por: ForeignKey(User)
    criado_em: DateTimeField(auto_now_add=True)
    atualizado_em: DateTimeField(auto_now=True)
```

#### Modelo: VendaContrato

```python
class VendaContrato(TenantModel):
    TIPO_CHOICES = [
        ('A_VISTA', 'À Vista'),
        ('PARCELADO', 'Parcelado'),
        ('ANTECIPADO', 'Antecipado'),
        ('FUTURO', 'Contrato Futuro'),
    ]
    
    STATUS_CHOICES = [
        ('RASCUNHO', 'Rascunho'),
        ('ATIVO', 'Ativo'),
        ('ENCERRADO', 'Encerrado'),
        ('CANCELADO', 'Cancelado'),
    ]
    
    numero_contrato: CharField(unique=True)
    cliente: ForeignKey(Cliente, on_delete=PROTECT)
    produto: ForeignKey(Produto, on_delete=PROTECT)
    quantidade_total: DecimalField(max_digits=15, decimal_places=2)
    preco_unitario: DecimalField(max_digits=10, decimal_places=2)
    valor_total: DecimalField(max_digits=15, decimal_places=2)
    tipo: CharField(choices=TIPO_CHOICES)
    status: CharField(choices=STATUS_CHOICES, default='RASCUNHO')
    data_contrato: DateField()
    data_entrega_prevista: DateField(null=True, blank=True)
    numero_parcelas: PositiveIntegerField(default=1)
    periodicidade_parcelas: CharField(default='MENSAL')
    observacoes: TextField(blank=True, null=True)
```

#### Modelo: ParcelaContrato

```python
class ParcelaContrato(models.Model):
    contrato: ForeignKey(VendaContrato, related_name='parcelas', on_delete=CASCADE)
    numero_parcela: PositiveIntegerField()
    valor: DecimalField(max_digits=12, decimal_places=2)
    data_vencimento: DateField()
    vencimento: ForeignKey(Vencimento, null=True, blank=True, related_name='parcelas_contrato')
    criado_em: DateTimeField(auto_now_add=True)
    
    # unique_together: ['contrato', 'numero_parcela']
```

### 2. **Serializers** (`serializers.py`)

| Serializer | Status | Campos | Validações |
|-----------|--------|--------|-----------|
| **ContratoSerializer** | ✅ Implementado | numero_contrato, titulo, tipo_contrato, status, valor_total, data_inicio, data_fim, partes, itens, condicoes, documento | Campos básicos |
| **VendaContratoSerializer** | ✅ Implementado | numero_contrato, cliente, produto, quantidade_total, preco_unitario, valor_total, tipo, status, parcelas, datas | Parcelas aninhadas |
| **ParcelaContratoSerializer** | ✅ Implementado | numero_parcela, valor, data_vencimento, vencimento | - |
| **CriarContratoSerializer** | ✅ Implementado | Todos os campos de criação | Valida valor_total = quantidade * preco; valida para A_VISTA ter 1 parcela |

#### Validações no CriarContratoSerializer:

```python
def validate(self, attrs):
    # Valida valor_total = quantidade * preco
    valor_calculado = attrs['quantidade_total'] * attrs['preco_unitario']
    if abs(valor_calculado - attrs['valor_total']) > 0.01:
        raise ValidationError({'valor_total': 'Deve ser igual a quantidade × preço'})
    
    # Tipo A_VISTA deve ter 1 parcela
    if attrs['tipo'] == 'A_VISTA' and attrs.get('numero_parcelas', 1) > 1:
        raise ValidationError({'numero_parcelas': 'À Vista deve ter 1 parcela'})
    
    return attrs
```

### 3. **ViewSets** (`views.py`)

| ViewSet | Localização | Métodos | Actions Customizados |
|---------|-------------|---------|----------------------|
| **VendaContratoViewSet** | `views.py` | CRUD padrão | `criar_com_parcelas()`, `cancelar()` |
| **ParcelaContratoViewSet** | `views.py` | CRUD padrão | - |
| **ContratoViewSet** | `views.py` | CRUD padrão | - |
| **VendasComprasViewSet** | `views.py` | CRUD padrão | Gerencia vendas e compras |

**Filtros disponíveis:**
- `filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]`
- `search_fields` para busca por número, cliente, etc.
- `ordering_fields` para ordenação por data, status, valor

### 4. **URLs/Roteamento** (`urls.py`)

```python
router = DefaultRouter()
router.register(r'vendas-contrato', VendaContratoViewSet)
router.register(r'parcelas-contrato', ParcelaContratoViewSet)
router.register(r'contratos', ContratoViewSet, basename='contrato')
router.register(r'vendas-compras', VendasComprasViewSet, basename='vendas-compras')
```

**Endpoints disponíveis:**
- `GET/POST /api/comercial/vendas-contrato/` - Listar/Criar contratos
- `GET/PATCH/DELETE /api/comercial/vendas-contrato/{id}/` - Detalhe/Atualizar/Deletar
- `POST /api/comercial/vendas-contrato/{id}/cancelar/` - Ação customizada
- `POST /api/comercial/vendas-contrato/criar_com_parcelas/` - Ação customizada
- `GET/POST /api/comercial/parcelas-contrato/` - Parcelas
- `GET/POST /api/comercial/contratos/` - Contratos genéricos
- `GET/POST /api/comercial/vendas-compras/` - Vendas e Compras

### 5. **Testes** (`tests/`)

| Arquivo | Descrição | Cobertura |
|---------|-----------|-----------|
| `test_api_contratos_vendas.py` | Testes de API para VendaContrato | Criação, listagem, validações |
| `test_contrato_types.py` | Testes para tipos de contrato | TIPO_CONTRATO_CHOICES |
| `test_models.py` | Testes gerais de modelos comerciais | - |

---

## 📦 Dependências e Bibliotecas

### Frontend (`package.json`)

**Versões instaladas:**

```json
{
  "dependencies": {
    "react": "^19.2.0",              // React
    "react-dom": "^19.2.0",          // React DOM
    "react-router-dom": "^7.11.0",   // Roteamento
    "react-hook-form": "^7.69.0",    // 🔑 Gerenciamento de formulários
    "yup": "^1.7.1",                 // 🔑 Validação de schemas
    "@hookform/resolvers": "^3.0.1", // Integração Yup + React Hook Form
    "axios": "^1.13.2",              // 🔑 Cliente HTTP
    "@tanstack/react-query": "^5.90.12", // Cache/Gerenciamento de estado
    "tailwindcss": "^4.1.18",        // 🔑 Styling (Tailwind CSS)
    "@mui/material": "^7.3.7",       // Componentes Material UI
    "@mui/icons-material": "^7.3.7", // Ícones MUI
    "lucide-react": "^0.561.0",      // Ícones adicionais
    "react-hot-toast": "^2.6.0",     // Notificações
    "framer-motion": "^12.23.26",    // Animações
    "date-fns": "^3.6.0",            // Manipulação de datas
    "chart.js": "^4.5.1",            // Gráficos
    "react-chartjs-2": "^5.3.1"      // Integração Chart.js
  },
  "devDependencies": {
    "typescript": "~5.9.3",
    "@testing-library/react": "^16.3.1",
    "@types/node": "^24.10.12",
    "vite": "^7.2.4",
    "jest": "^30.x",
    "@types/jest": "^30.0.0",
    "jest-environment-jsdom": "^30.2.0",
    "ts-jest": "^29.4.6",
    "eslint": "^9.39.1"
  }
}
```

**Bibliotecas-chave para contratos:**
- ✅ **react-hook-form** - Gerenciamento de formulários
- ✅ **yup** - Validação de dados
- ✅ **axios** - Requisições HTTP
- ✅ **@tanstack/react-query** - Cache e sincronização de dados
- ✅ **tailwindcss** - Estilização CSS
- ✅ **@mui/material** - Componentes reutilizáveis

### Backend (`requirements.txt`)

**Principais:**
- Django (4.2+)
- djangorestframework
- django-filter
- django-cors-headers
- psycopg2 (PostgreSQL)
- python-json-logger
- celery
- redis
- whitenoise

---

## ⚙️ Configuração e Roteamento

### Frontend - Rotas Comercial

Arquivo: `App.tsx`

```typescript
<Route path="comercial" element={<RBACGuard module="comercial"><ComercialLayout /></RBACGuard>}>
  // Contratos
  <Route path="contratos" element={<ContratosList />} />
  <Route path="contratos/novo" element={<ContratoCreate />} />
  <Route path="contratos/:id" element={<ContratoDetalhes />} />
  <Route path="contratos/:id/editar" element={<ContratoForm />} />
  
  // Outras entidades comerciais
  <Route path="clientes" element={<...ClientesList />} />
  <Route path="fornecedores" element={<...FornecedoresList />} />
  <Route path="empresas" element={<EmpresasList />} />
</Route>
```

### Backend - Endpoints da API

**Padrão REST:**
```
BASE_URL: /api/comercial/

GET    /vendas-contrato/                           # Lista com filtros
POST   /vendas-contrato/                           # Cria
GET    /vendas-contrato/{id}/                      # Detalhe
PATCH  /vendas-contrato/{id}/                      # Atualiza
DELETE /vendas-contrato/{id}/                      # Deleta
POST   /vendas-contrato/{id}/cancelar/             # Ação customizada
POST   /vendas-contrato/criar_com_parcelas/        # Ação customizada

GET    /parcelas-contrato/                         # Lista parcelas
POST   /parcelas-contrato/                         # Cria
GET    /parcelas-contrato/{id}/                    # Detalhe

GET    /contratos/                                 # Lista genérica
POST   /contratos/                                 # Cria genérica
```

### Integração RBAC (Role-Based Access Control)

Arquivo: `permissions.py` (backend)

- Módulo: `'comercial'`
- Ações: `'view'`, `'add'`, `'change'`, `'delete'`
- Guard no frontend: `<RBACGuard module="comercial">`

---

## 📝 Padrões de Nomenclatura

### Convenção de Nomes

| Elemento | Padrão | Exemplo |
|----------|--------|---------|
| **Modelos Django** | PascalCase | `Contrato`, `VendaContrato`, `ParcelaContrato` |
| **Campos** | snake_case | `numero_contrato`, `data_entrega_prevista` |
| **Componentes React** | PascalCase | `ContratoForm`, `ContratosList` |
| **Páginas** | PascalCase | `ContratoCreate`, `ContratoDetalhes` |
| **Serviços** | camelCase + Service | `contratosService`, `comercialService` |
| **Tipos/Interfaces** | PascalCase | `ContratoComercial`, `VendaContrato` |
| **Validações (Yup)** | camelCase | `numero_contrato`, `tipo_contrato` |
| **Endpoints** | kebab-case | `/vendas-contrato/`, `/parcelas-contrato/` |
| **URLs do Django** | kebab-case | `vendas-contrato`, `parcelas-contrato` |
| **Testes** | test_{entidade}_{funcionalidade} | `test_contrato_types.py`, `test_api_contratos_vendas.py` |

### Padrão de Tipo de Contrato

**Backend (choices):**
```python
TIPO_CONTRATO_CHOICES = [
    ('compra', 'Compra'),
    ('venda', 'Venda'),
    ('venda_futura', 'Venda Futura'),
    ('venda_spot', 'Venda Spot'),
    ('bater', 'Barter'),
    ('servico', 'Serviço'),
    ('fornecimento', 'Fornecimento'),
    ('parceria', 'Parceria'),
    ('outros', 'Outros'),
]
```

**VendaContrato (tipos):**
```python
TIPO_CHOICES = [
    ('A_VISTA', 'À Vista'),
    ('PARCELADO', 'Parcelado'),
    ('ANTECIPADO', 'Antecipado'),
    ('FUTURO', 'Contrato Futuro'),
]
```

### Padrão de Status

**Contrato genérico:**
```
'rascunho' → 'em_negociacao' → 'assinado' → 'em_execucao' → 'concluido'
                    ↓ (opcional)    ↓ (opcional)              ↓ (opcional)
                    └────→ 'cancelado'  ← 'suspenso'
```

**VendaContrato:**
```
'RASCUNHO' → 'ATIVO' → 'ENCERRADO'
    ↘_______________↙
         'CANCELADO'
```

---

## 📊 Diagrama de Relações

```
┌─────────────────┐
│   VendaContrato │
├─────────────────┤
├─ id (PK)
├─ numero_contrato (UNIQUE)
├─ cliente (FK → Cliente)
├─ produto (FK → Produto)
├─ quantidade_total
├─ preco_unitario
├─ valor_total
├─ tipo (A_VISTA|PARCELADO|ANTECIPADO|FUTURO)
├─ status
├─ data_contrato
├─ data_entrega_prevista
├─ numero_parcelas
└─ periodicidade_parcelas
    │
    └───1:N──→ ┌─────────────────┐
               │ ParcelaContrato │
               ├─────────────────┤
               ├─ id (PK)
               ├─ contrato (FK)
               ├─ numero_parcela
               ├─ valor
               ├─ data_vencimento
               └─ vencimento (FK → Financeiro.Vencimento)

┌──────────────┐
│  Contrato    │ (Genérico)
├──────────────┤
├─ id (PK)
├─ numero_contrato
├─ tipo_contrato
├─ categoria
├─ status
├─ valor_total
├─ data_inicio
├─ data_fim
├─ partes (JSON)
├─ itens (JSON)
└─ condicoes (JSON)
```

---

## 🎯 Summary Executivo

### Arquivos Principais

**Frontend (React/TypeScript):**
- 4 páginas principais
- 1 componente reutilizável
- 2 serviços API
- 2 arquivos de tipos
- Schema Yup para validações

**Backend (Django/DRF):**
- 3 modelos (Contrato, VendaContrato, ParcelaContrato)
- 3 serializers principais
- ViewSets com CRUD + ações customizadas
- Testes unitários e de integração
- Endpoints REST bem definidos

### Padrões Utilizados

✅ **Frontend:**
- React Hook Form + Yup para formulários
- TanStack React Query para cache
- Tailwind CSS para estilização
- TypeScript para type safety

✅ **Backend:**
- Django REST Framework
- ViewSets com TenantQuerySetMixin
- Serializers com validações customizadas
- Django Filters para busca/filtros
- JSON fields para estruturas complexas

### Pontos de Integração

1. **Frontend → Backend:** Axios + React Query
2. **Validação:** Yup (Frontend) + DRF Validators (Backend)
3. **Autenticação:** JWT + RBAC
4. **Estado:** React Hook Form + React Query
5. **Roteamento:** React Router (Frontend) + DRF URLs (Backend)

---

**Gerado em:** 14/03/2026  
**Versão:** 1.0  
**Autor:** AI Assistant  
**Status:** ✅ Mapeamento Completo
