# 📁 Índice Visual - Caminhos Completos de Arquivos de Contratos

**Projeto:** project-agro (sistema-agropecuario)  
**Data:** 14/03/2026

---

## 🎨 FRONTEND - React/TypeScript

### Base
```
/home/agrolink/project-agro.bak-20260312043346/sistema-agropecuario/frontend/src/
```

### 📄 Páginas (Pages)

```
frontend/src/pages/comercial/
│
├── ✅ ContratoForm.tsx
│   └─ Página com abas (dados gerais, partes, itens, condições)
│   └─ Usa: React Hook Form + Yup
│   └─ Importa: contratosService, ContratoComercial (tipo)
│
├── ✅ ContratoCreate.tsx
│   └─ Página de criação de novo contrato
│   └─ Schema Yup com: numero_contrato, titulo, tipo_contrato, categoria, etc
│   └─ Submete para: contratosService.criarComParcelas()
│
├── ✅ ContratosList.tsx
│   └─ Listagem com paginação e filtros
│   └─ Filtros: status, tipo, search
│   └─ Busca: contratosService.listar(params)
│
├── ✅ ContratoDetalhes.tsx
│   └─ Visualização de detalhes do contrato
│   └─ Busca: contratosService.buscar(id)
│
├── ✅ Comercial.tsx
│   └─ Container principal do módulo
│
├── ✅ ComercialLayout.tsx
│   └─ Layout com sidebar
│
├── ClienteCreate.tsx
│   └─ Criação de cliente (relacionado)
│
├── CompraCreate.tsx
│   └─ Criação de compra (relacionado)
│
├── VendaCreate.tsx
│   └─ Criação de venda (relacionado)
│
├── EmpresaCreate.tsx
├── EmpresaDetail.tsx
├── EmpresasList.tsx
│
├── FornecedoresList.tsx
├── Documentos.tsx
├── DespesaPrestadoraCreate.tsx
│
└── __tests__/
   └─ (Testes - a criar)
```

### 🧩 Componentes Reutilizáveis (Components)

```
frontend/src/components/comercial/
│
├── ✅ ContratoForm.tsx
│   └─ Componente modal reutilizável
│   └─ Props: { isOpen, onClose, onSubmit, contrato?, loading? }
│   └─ Schema Yup implementado
│   └─ Abas: dados_gerais, partes, itens, condicoes, documento
│   └─ Usa: React Hook Form + Yup + TanStack Query
│
├── FornecedorForm.tsx
├── FornecedorList.tsx
│
└── __tests__/
   └─ (Testes unitários)
```

### 📦 Tipos/Interfaces (Types)

```
frontend/src/types/
│
├── ✅ comercial.ts
│   └─ Interface: Endereco
│   └─ Interface: Contato
│   └─ Interface: Documento
│   └─ Interface: DadosBancarios
│   └─ Interface: Fornecedor
│   └─ Interface: PrestadorServico
│   └─ Interface: InstituicaoFinanceira
│   ├─ Interface: ParteContrato
│   │  └─ Tipos: tipo_parte, papel_contrato
│   ├─ Interface: ItemContrato
│   │  └─ Tipos: tipo_item
│   ├─ Interface: CondicaoContrato
│   │  └─ Tipos: tipo_condicao
│   ├─ Interface: ContratoComercial ⭐
│   │  ├─ numero_contrato, titulo
│   │  ├─ tipo_contrato: 'compra'|'venda'|'venda_futura'|'venda_spot'|'bater'|'servico'|'fornecimento'|'parceria'|'outros'
│   │  ├─ status: 'rascunho'|'em_negociacao'|'assinado'|'em_execucao'|'concluido'|'cancelado'|'suspenso'
│   │  ├─ partes: ParteContrato[]
│   │  ├─ itens: ItemContrato[]
│   │  ├─ condicoes: CondicaoContrato[]
│   │  └─ valor_total, data_inicio, data_fim, prazo_execucao_dias
│   ├─ Interface: VendaCompra
│   ├─ Interface: FiltrosComerciais
│   ├─ Interface: StatusComercial
│   └─ Interface: RelatorioComercial
│
├── ✅ estoque_maquinas.ts
│   ├─ Interface: VendaContrato ⭐
│   │  ├─ numero_contrato (UNIQUE)
│   │  ├─ cliente (FK)
│   │  ├─ produto (FK)
│   │  ├─ quantidade_total, preco_unitario, valor_total
│   │  ├─ tipo: 'A_VISTA'|'PARCELADO'|'ANTECIPADO'|'FUTURO'
│   │  ├─ status: 'RASCUNHO'|'ATIVO'|'ENCERRADO'|'CANCELADO'
│   │  ├─ data_contrato, data_entrega_prevista
│   │  ├─ numero_parcelas, periodicidade_parcelas
│   │  └─ observacoes
│   ├─ Interface: ParcelaContrato
│   │  ├─ contrato (FK → VendaContrato)
│   │  ├─ numero_parcela
│   │  ├─ valor
│   │  ├─ data_vencimento
│   │  └─ vencimento (FK → Financeiro)
│   ├─ Interface: CriarContratoRequest
│   ├─ Interface: DashboardContratos
│   ├─ Type: TipoContrato = 'A_VISTA'|'PARCELADO'|'ANTECIPADO'|'FUTURO'
│   ├─ Type: PeriodicidadeParcela = 'MENSAL'|'BIMESTRAL'|'TRIMESTRAL'
│   └─ Type: StatusContrato = 'RASCUNHO'|'ATIVO'|'ENCERRADO'|'CANCELADO'
│
├── agricultura.ts
├── kpis.ts
├── rbac.ts
└── index.ts (exporta tudo)
```

### 🔌 Serviços (Services)

```
frontend/src/services/
│
├── ✅ contratos.ts ⭐
│   └─ const contratosService = {
│      ├─ listar(params?: {page?, status?, tipo?, cliente?, search?}): Promise<PaginatedResponse<VendaContrato>>
│      ├─ buscar(id): Promise<VendaContrato>
│      ├─ criarComParcelas(dados: CriarContratoRequest): Promise<VendaContrato>
│      ├─ atualizar(id, dados: Partial<VendaContrato>): Promise<VendaContrato>
│      ├─ cancelar(id): Promise<VendaContrato>
│      ├─ deletar(id): Promise<void>
│      └─ obterDashboard(): Promise<DashboardContratos>
│   }
│
├── ✅ comercial.ts
│   └─ funções para ContratoComercial genérico
│
├── api.ts (Instância Axios configurada)
├── auth.ts
├── dashboard.ts
├── cargas.ts
├── operacoes.ts
├── produtos.ts
└── (outros)
```

### 🧪 Validações (Validation Schemas)

**Localização 1: ContratoForm.tsx (página)**
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

**Localização 2: ContratoCreate.tsx (página)**
```typescript
const schema = yup.object().shape({
  numero_contrato: yup.string().required('...'),
  titulo: yup.string().required('...'),
  tipo_contrato: yup.string().required('...'),
  categoria: yup.string().required('...'),
  status: yup.string().required('...'),
  valor_total: yup.number().required('...'),
  data_inicio: yup.string().required('...'),
  condicoes: yup.array().of(yup.object().shape({...})).default([]),
});
```

### 📍 Roteamento (App.tsx)

```typescript
<Route path="comercial" element={<RBACGuard module="comercial"><ComercialLayout /></RBACGuard>}>
  <Route path="contratos" element={<ContratosList />} />
  <Route path="contratos/novo" element={<ContratoCreate />} />
  <Route path="contratos/:id" element={<ContratoDetalhes />} />
  <Route path="contratos/:id/editar" element={<ContratoForm />} />
</Route>
```

---

## 🔧 BACKEND - Django/DRF

### Base
```
/home/agrolink/project-agro.bak-20260312043346/sistema-agropecuario/backend/apps/comercial/
```

### 🗄️ Modelos (models.py)

```python
│
├── ✅ class Contrato(TenantModel) ⭐ (Genérico)
│   │
│   ├─ Campos:
│   │  ├─ numero_contrato: CharField(max_length=100, unique=True)
│   │  ├─ titulo: CharField(max_length=200)
│   │  ├─ tipo_contrato: CharField(choices=TIPO_CONTRATO_CHOICES, default='compra')
│   │  │  └─ CHOICES: 'compra', 'venda', 'venda_futura', 'venda_spot', 'bater', 'servico', 'fornecimento', 'parceria', 'outros'
│   │  ├─ categoria: CharField(max_length=50, blank=True, null=True)
│   │  ├─ status: CharField(max_length=50, default='rascunho')
│   │  ├─ valor_total: DecimalField(max_digits=14, decimal_places=2, default=0)
│   │  ├─ data_inicio: DateField()
│   │  ├─ data_fim: DateField(blank=True, null=True)
│   │  ├─ prazo_execucao_dias: IntegerField(blank=True, null=True)
│   │  ├─ observacoes: TextField(blank=True, null=True)
│   │  ├─ partes: JSONField(blank=True, null=True)
│   │  ├─ itens: JSONField(blank=True, null=True)
│   │  ├─ condicoes: JSONField(blank=True, null=True)
│   │  ├─ documento: FileField(upload_to='contratos/', blank=True, null=True)
│   │  ├─ criado_por: ForeignKey(User, on_delete=SET_NULL, null=True)
│   │  ├─ criado_em: DateTimeField(auto_now_add=True)
│   │  └─ atualizado_em: DateTimeField(auto_now=True)
│   │
│   └─ Meta:
│      └─ TenantModel (multi-tenant support)
│
├── ✅ class VendaContrato(TenantModel) ⭐ (Fase 2)
│   │
│   ├─ TIPO_CHOICES = [('A_VISTA', 'À Vista'), ('PARCELADO', 'Parcelado'), ('ANTECIPADO', 'Antecipado'), ('FUTURO', 'Contrato Futuro')]
│   ├─ STATUS_CHOICES = [('RASCUNHO', 'Rascunho'), ('ATIVO', 'Ativo'), ('ENCERRADO', 'Encerrado'), ('CANCELADO', 'Cancelado')]
│   │
│   ├─ Campos:
│   │  ├─ numero_contrato: CharField(max_length=50, unique=True)
│   │  ├─ cliente: ForeignKey(Cliente, on_delete=PROTECT)
│   │  ├─ produto: ForeignKey(Produto, on_delete=PROTECT)
│   │  ├─ quantidade_total: DecimalField(max_digits=15, decimal_places=2)
│   │  ├─ preco_unitario: DecimalField(max_digits=10, decimal_places=2)
│   │  ├─ valor_total: DecimalField(max_digits=15, decimal_places=2)
│   │  ├─ tipo: CharField(max_length=20, choices=TIPO_CHOICES)
│   │  ├─ status: CharField(max_length=20, choices=STATUS_CHOICES, default='RASCUNHO')
│   │  ├─ data_contrato: DateField()
│   │  ├─ data_entrega_prevista: DateField(null=True, blank=True)
│   │  ├─ numero_parcelas: PositiveIntegerField(default=1)
│   │  ├─ periodicidade_parcelas: CharField(choices=PERIODICIDADE, default='MENSAL')
│   │  │  └─ CHOICES: 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL'
│   │  ├─ observacoes: TextField(blank=True, null=True)
│   │  ├─ criado_por: ForeignKey(User, on_delete=SET_NULL, null=True)
│   │  ├─ criado_em: DateTimeField(auto_now_add=True)
│   │  └─ atualizado_em: DateTimeField(auto_now=True)
│   │
│   ├─ Relações:
│   │  └─ parcelas (Reverse FK de ParcelaContrato)
│   │
│   └─ Meta:
│      └─ ordering = ['-data_contrato']
│
├── ✅ class ParcelaContrato(models.Model) ⭐ (Fase 2)
│   │
│   ├─ Campos:
│   │  ├─ contrato: ForeignKey(VendaContrato, on_delete=CASCADE, related_name='parcelas')
│   │  ├─ numero_parcela: PositiveIntegerField()
│   │  ├─ valor: DecimalField(max_digits=12, decimal_places=2)
│   │  ├─ data_vencimento: DateField()
│   │  ├─ vencimento: ForeignKey(Vencimento, null=True, blank=True, related_name='parcelas_contrato')
│   │  └─ criado_em: DateTimeField(auto_now_add=True)
│   │
│   ├─ Meta:
│   │  ├─ unique_together = ['contrato', 'numero_parcela']
│   │  └─ ordering = ['numero_parcela']
│   │
│   └─ __str__: f"Parcela {numero_parcela}/{contrato.numero_parcelas} - {contrato.numero_contrato}"
│
├── class Fornecedor(TenantModel) (Relacionado)
├── class Cliente(TenantModel) (Relacionado)
├── class CargaViagem(TenantModel) (Relacionado)
├── class DespesaPrestadora(TenantModel)
├── class Compra(TenantModel)
└── ... (outros)
```

### 📊 Serializers (serializers.py)

```python
│
├── ✅ class ContratoSerializer(serializers.ModelSerializer) ⭐
│   ├─ Fields: numero_contrato, titulo, tipo_contrato, categoria, status, valor_total, data_inicio, data_fim, prazo_execucao_dias, observacoes, partes, itens, condicoes, documento, documento_url, criado_por, criado_em
│   ├─ get_documento_url(obj): Retorna URL do arquivo
│   └─ create(validated_data): Define criado_por automaticamente
│
├── ✅ class VendaContratoSerializer(serializers.ModelSerializer) ⭐
│   ├─ Fields: numero_contrato, cliente, cliente_nome, produto, produto_nome, quantidade_total, preco_unitario, valor_total, tipo, status, data_contrato, data_entrega_prevista, numero_parcelas, periodicidade_parcelas, observacoes, parcelas (nested), criado_por, criado_por_nome, criado_em, atualizado_em
│   ├─ parcelas: ParcelaContratoSerializer(many=True, read_only=True)
│   └─ read_only_fields: criado_por, criado_em, atualizado_em
│
├── ✅ class ParcelaContratoSerializer(serializers.ModelSerializer)
│   ├─ Fields: id, contrato, numero_parcela, valor, data_vencimento, vencimento, vencimento_titulo, vencimento_status, criado_em
│   ├─ vencimento_titulo = CharField(source='vencimento.titulo', read_only=True)
│   ├─ vencimento_status = CharField(source='vencimento.status', read_only=True)
│   └─ read_only_fields: criado_em
│
├── ✅ class CriarContratoSerializer(serializers.Serializer) ⭐
│   ├─ Fields: numero_contrato, cliente, produto, quantidade_total, preco_unitario, valor_total, tipo, data_contrato, data_entrega_prevista, numero_parcelas, periodicidade_parcelas, observacoes
│   └─ validate(attrs):
│      ├─ Valida: valor_total = quantidade_total × preco_unitario (tolerância 0.01)
│      └─ Valida: tipo A_VISTA num_parcelas == 1
│
├── class FornecedorSerializer
├── class ClienteSerializer
├── class VendaColheitaSerializer
└── ... (outros)
```

### 🎮 ViewSets (views.py)

```python
│
├── ✅ class ContratoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet) ⭐
│   ├─ queryset = Contrato.objects.all()
│   ├─ serializer_class = ContratoSerializer
│   ├─ Métodos: list(), create(), retrieve(), update(), destroy()
│   └─ Filtros: DjangoFilterBackend, SearchFilter, OrderingFilter
│
├── ✅ class VendaContratoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet) ⭐
│   ├─ queryset = VendaContrato.objects.all()
│   ├─ serializer_class = VendaContratoSerializer
│   ├─ Métodos CRUD padrão
│   └─ @action(methods=['POST']) criar_com_parcelas(request) → Cria contrato + parcelas automáticas
│   └─ @action(methods=['POST']) cancelar(request, pk) → Cancela contrato e vencimentos
│
├── ✅ class ParcelaContratoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet) ⭐
│   ├─ queryset = ParcelaContrato.objects.all()
│   ├─ serializer_class = ParcelaContratoSerializer
│   └─ Métodos CRUD padrão
│
├── class VendasComprasViewSet
│   └─ Gerencia vendas e compras unificadas
│
├── class FornecedorViewSet
├── class ClienteViewSet
├── class CargaViagemViewSet
└── ... (outros)
```

### 🔗 URLs (urls.py)

```python
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'fornecedores', FornecedorViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'cargas-viagem', CargaViagemViewSet)
router.register(r'silos-bolsa', SiloBolsaViewSet)
router.register(r'vendas-colheita', VendaColheitaViewSet)
router.register(r'despesas-prestadoras', DespesaPrestadoraViewSet)
router.register(r'compras', CompraViewSet)
router.register(r'documentos-fornecedor', DocumentoFornecedorViewSet)
router.register(r'historico-alteracao', HistoricoAlteracaoViewSet)
│
├─── ✅ FASE 2 - CONTRATOS
router.register(r'vendas-contrato', VendaContratoViewSet)
router.register(r'parcelas-contrato', ParcelaContratoViewSet)
│
├─── CONTRATOS GENÉRICOS
router.register(r'contratos', ContratoViewSet, basename='contrato')
router.register(r'vendas-compras', VendasComprasViewSet, basename='vendas-compras')

urlpatterns = router.urls + [
    # Agregados
    path('empresas/<int:pk>/agregados/', EmpresaAgregadosView.as_view()),
    ...
]
```

### 🧪 Testes (tests/)

```
backend/apps/comercial/tests/
│
├── ✅ test_api_contratos_vendas.py
│   ├─ test_create_and_list_contrato()
│   ├─ test_vendas_compras_list_and_create_compra()
│   └─ test_create_venda_via_unified_endpoint()
│
├── ✅ test_contrato_types.py
│   └─ test_create_contrato_with_new_types()
│      └─ Testa tipos: 'venda_futura', 'venda_spot', 'bater'
│
├── ✅ test_models.py
├── ✅ test_api_clientes.py
├── ✅ test_compra.py
├── test_fornecedor_api.py
├── test_cargaviagem_weighing.py
└── ... (outros)
```

---

## 💾 Arquivo de Configuração

### package.json (Frontend)

```json
{
  "name": "frontend",
  "version": "0.0.0",
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.11.0",
    "react-hook-form": "^7.69.0",           ← ⭐ IMPORTANTE
    "yup": "^1.7.1",                        ← ⭐ IMPORTANTE
    "@hookform/resolvers": "^3.0.1",       ← ⭐ IMPORTANTE
    "axios": "^1.13.2",                     ← ⭐ IMPORTANTE
    "@tanstack/react-query": "^5.90.12",   ← ⭐ IMPORTANTE
    "tailwindcss": "^4.1.18",               ← ⭐ IMPORTANTE
    "@mui/material": "^7.3.7",
    "lucide-react": "^0.561.0",
    "react-hot-toast": "^2.6.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "jest --config jest.config.cjs",
    "test:e2e": "playwright test"
  }
}
```

### requirements.txt (Backend)

```
Django==4.2.x
djangorestframework==3.14.x
django-filter==23.x
django-cors-headers==4.x
psycopg2==2.9.x
celery==5.x
redis==5.x
whitenoise==6.x
python-json-logger==x.x
```

---

## 🔐 Configurações de Ambiente

### Autenticação
- JWT (Token-based)
- AuthContext (Frontend)
- DRF Token Authentication (Backend)

### Multi-tenant
- TenantModel (Backend)
- TenantContext (Frontend)
- TenantQuerySetMixin (Backend QuerySet)

### RBAC (Role-Based Access Control)
- Module: 'comercial'
- Ações: 'view', 'add', 'change', 'delete'
- Frontend Guard: `<RBACGuard module="comercial">`
- Backend Permission: `RBACViewPermission`

---

## 📈 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│ FRONTEND                                                │
├─────────────────────────────────────────────────────────┤
│ ContratoForm.tsx (page)                                 │
│ ↓                                                        │
│ React Hook Form + Yup Validation                        │
│ ↓                                                        │
│ contratosService.criarComParcelas(dados)               │
│ ↓                                                        │
│ axios.post('/api/comercial/vendas-contrato/...')       │
└─────────────────→ HTTP Request ───────────────────────┐
                                                        │
                    ┌─────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ BACKEND                                                 │
├─────────────────────────────────────────────────────────┤
│ POST /api/comercial/vendas-contrato/criar_com_parcelas/
│ ↓                                                        │
│ VendaContratoViewSet.criar_com_parcelas()              │
│ ↓                                                        │
│ CriarContratoSerializer.validate() [Validações]        │
│ ↓                                                        │
│ VendaContrato.objects.create()                         │
│ ↓                                                        │
│ ParcelaContrato.objects.create() × numero_parcelas    │
│ ↓                                                        │
│ VendaContratoSerializer (response)                      │
└─────────────────→ JSON Response ─────────────────────┐
                                                      │
                    ┌─────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ FRONTEND                                                │
├─────────────────────────────────────────────────────────┤
│ React Query caches response                             │
│ ↓                                                        │
│ Component re-renders with new data                      │
│ ↓                                                        │
│ Navigate to ContratoDetalhes / ContratosList           │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Checklist de Cobertura

### Frontend ✅
- [x] Páginas: ContratoForm, ContratoCreate, ContratosList, ContratoDetalhes
- [x] Componente modal: ContratoForm
- [x] Tipos/Interfaces: ContratoComercial, VendaContrato, ParcelaContrato
- [x] Serviços: contratosService, comercialService
- [x] Validações: Yup schemas
- [x] Roteamento: React Router
- [ ] Testes unitários: Pendentes

### Backend ✅
- [x] Modelos: Contrato, VendaContrato, ParcelaContrato
- [x] Serializers: ContratoSerializer, VendaContratoSerializer, ParcelaContratoSerializer, CriarContratoSerializer
- [x] ViewSets: ContratoViewSet, VendaContratoViewSet, ParcelaContratoViewSet
- [x] URLs/Endpoints: Registrados no router
- [x] Testes: test_api_contratos_vendas.py, test_contrato_types.py
- [x] Validações: CriarContratoSerializer.validate()
- [x] Filtros: DjangoFilterBackend, SearchFilter, OrderingFilter
- [x] Ações customizadas: criar_com_parcelas, cancelar

### Integração ✅
- [x] Autenticação JWT
- [x] Multi-tenant
- [x] RBAC
- [x] React Query (caching)
- [x] Error handling
- [x] Paginação

---

**Gerado em:** 14/03/2026  
**Versão:** 1.0  
**Status:** ✅ COMPLETO
