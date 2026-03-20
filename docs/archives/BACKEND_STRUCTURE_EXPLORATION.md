# Backend Structure Exploration - Isidoro Action System

**Date:** March 17, 2026  
**Purpose:** Understand form definitions, serializers, models, and introspection endpoints

---

## 1. AUTHORITATIVE SCHEMA LOCATION

### [ACTION_FIELDS_SCHEMA.py](backend/apps/actions/ACTION_FIELDS_SCHEMA.py)
**~1,950 lines of comprehensive field metadata**

This is the **single source of truth** for all Isidoro action definitions. Contains:
- Complete field specifications (required/optional) for every action_type
- Field types (str, Decimal, date, datetime, list, int, bool, etc.)
- Validation rules (max_length, min_value, max_value, choices, patterns)
- Example values for each field
- Related lookups (how to resolve FK relationships)
- Field aliases (mapping between tool parameter names and executor parameter names)
- Friendly names (human-readable field descriptions)

**Helper Functions at Bottom:**
```python
get_required_fields(action_type: str) → list[str]
get_optional_fields(action_type: str) → list[str]
get_all_action_types() → list[str]

ACTION_TYPES_BY_MODULE = {
    "fazendas": [...],
    "agricultura": [...],
    "estoque": [...],
    "maquinas": [...]
}

TOOL_TO_ACTION_TYPE = {
    "criar_equipamento": "criar_equipamento",
    "registrar_abastecimento": "abastecimento",
    "registrar_operacao_agricola": "operacao_agricola",
    "registrar_movimentacao_carga": "movimentacao_carga",
    ...
}
```

---

## 2. KEY ACTION FILES BY MODULE

### EQUIPMENT (Maquinas)

| File | Purpose | Key Classes |
|------|---------|------------|
| [backend/apps/maquinas/models.py](backend/apps/maquinas/models.py) | Equipment model definitions | `Equipamento`, `Abastecimento`, `OrdemServico`, `CategoriaEquipamento`, `ConfiguracaoAlerta`, `ManutencaoPreventiva` |
| [backend/apps/maquinas/serializers.py](backend/apps/maquinas/serializers.py) | DRF serializers for equipment | `EquipamentoSerializer`, `AbastecimentoSerializer`, `OrdemServicoSerializer`, `CategoriaEquipamentoSerializer` |
| [backend/apps/actions/executors/maquinas.py](backend/apps/actions/executors/maquinas.py) | Executor functions | `execute_criar_equipamento()`, `execute_abastecimento()`, `execute_manutencao_maquina()`, `execute_parada_maquina()` |

**Equipamento Model Key Fields:**
```python
Equipamento:
  - categoria: FK → CategoriaEquipamento (flexible, not hardcoded)
  - nome: CharField(max_length=200)
  - marca: CharField(max_length=100, blank=True)
  - modelo: CharField(max_length=100, blank=True)
  - numero_serie: CharField(max_length=100, null=True)
  - ano_fabricacao: IntegerField (validators: ≥1900, ≤current_year)
  - data_aquisicao: DateField (nullable)
  - valor_aquisicao: DecimalField (≥0)
  - status: CharField choices=[ativo, inativo, manutencao, vendido]
  - potencia_cv: DecimalField (CV units, nullable)
  - potencia_kw: DecimalField (nullable)
  - horimetro_atual: DecimalField (hours worked, nullable)
  - capacidade_tanque: DecimalField (fuel capacity, nullable)
  - local_instalacao: CharField(max_length=200, blank=True)
  - observacoes: TextField(blank=True)
```

**Abastecimento Model Key Fields:**
```python
Abastecimento:
  - equipamento: FK → Equipamento
  - quantidade_litros: DecimalField (>0)
  - valor_unitario: DecimalField (price per liter, >0)
  - valor_total: DecimalField (auto-calculated)
  - data: DateTimeField
  - horimetro: DecimalField (equipment hours at fueling, nullable)
  - local_abastecimento: CharField(blank=True)
  - responsavel: CharField(blank=True)
  - observacoes: TextField(blank=True)
```

---

### AGRICULTURAL OPERATIONS (Agricultura)

| File | Purpose | Key Classes |
|------|---------|------------|
| [backend/apps/agricultura/models.py](backend/apps/agricultura/models.py) | Agricultural operation models | `Cultura`, `Plantio`, `Operacao`, `Colheita`, `ColheitaItem`, `Manejo`, `OrdemServico` |
| [backend/apps/agricultura/serializers.py](backend/apps/agricultura/serializers.py) | DRF serializers | `CulturaSerializer`, `PlantioSerializer`, `OperacaoSerializer`, `ColheitaSerializer`, `ManejoSerializer` |
| [backend/apps/actions/executors/agricultura.py](backend/apps/actions/executors/agricultura.py) | Executor functions | `execute_criar_safra()`, `execute_operacao_agricola()`, `execute_colheita()`, `execute_movimentacao_carga()`, `execute_registrar_manejo()` |

**Plantio (Safra/Crop) Model Key Fields:**
```python
Plantio:
  - cultura: FK → Cultura
  - fazenda: FK → Fazenda (nullable)
  - talhoes: M2M → Talhao (through PlantioTalhao)
  - data_plantio: DateField
  - status: CharField choices=[planejado, em_andamento, colhido, perdido]
  - quantidade_sementes: DecimalField(nullable)
  - produto_semente: FK → Produto(nullable)
  - custo_mao_obra: DecimalField(default=0)
  - custo_maquinas: DecimalField(default=0)
  - custo_insumos: DecimalField(default=0)
  - custo_total: DecimalField(auto-calculated on save)
```

**Operacao (Agricultural Operation) Model Key Fields:**
```python
Operacao:
  - plantio: FK → Plantio
  - talhao: FK → Talhao (nullable)
  - data: DateField
  - tipo: CharField choices=[prep_*, adub_*, plant_*, trato_*, pulv_*, mec_*]
  - categoria: CharField (derived from tipo prefix: preparacao, adubacao, etc.)
  - status: CharField choices=[planejada, em_andamento, concluida, cancelada]
  - custo_mao_obra: DecimalField(default=0)
  - custo_maquina: DecimalField(default=0)
  - custo_insumos: DecimalField(default=0)
  - custo_total: DecimalField(auto-calculated)
```

**Colheita (Harvest) Model Key Fields:**
```python
Colheita:
  - plantio: FK → Plantio
  - data_colheita: DateField
  - producao_total: DecimalField
  - unidade: CharField choices=[sc, kg, t]
  - qualidade: CharField(blank=True)
  - is_estimada: BooleanField(default=True)
  - status: CharField choices=[planejada, em_andamento, concluida]
  - custo_mao_obra: DecimalField(default=0)
  - custo_maquina: DecimalField(default=0)
  - custo_combustivel: DecimalField(default=0)
  - custo_total: DecimalField(auto-calculated)
```

---

### INVENTORY/CARGO MOVEMENT (Estoque)

| File | Purpose | Key Classes |
|------|---------|------------|
| [backend/apps/estoque/models.py](backend/apps/estoque/models.py) | Inventory models | `Produto`, `MovimentacaoEstoque`, `LocalArmazenamento`, `Lote` |
| [backend/apps/estoque/serializers.py](backend/apps/estoque/serializers.py) | DRF serializers | `ProdutoSerializer`, `MovimentacaoEstoqueSerializer`, `LocalArmazenamentoSerializer` |
| [backend/apps/actions/executors/estoque.py](backend/apps/actions/executors/estoque.py) | Executor functions | `execute_criar_produto()`, `execute_entrada_estoque()`, `execute_saida_estoque()`, `execute_movimentacao_interna()`, `execute_ajuste_estoque()` |

**Produto (Product) Model Key Fields:**
```python
Produto:
  - nome: CharField(max_length=200, unique_together with tenant)
  - codigo: CharField(max_length=50, auto-generated if not provided)
  - categoria: CharField choices=[semente, fertilizante, herbicida, fungicida, etc.]
  - unidade: CharField(max_length=20, default='un')
  - descricao: TextField(blank=True)
  - principio_ativo: CharField(max_length=200, blank=True)
  - quantidade_estoque: DecimalField(calculated from movimentacoes)
  - estoque_minimo: DecimalField(default=0)
  - custo_unitario: DecimalField(nullable)
  - preco_venda: DecimalField(nullable)
  - local_armazenamento: CharField(blank=True)
```

**MovimentacaoEstoque (Inventory Movement) Model:**
```python
MovimentacaoEstoque:
  - produto: FK → Produto
  - tipo: CharField choices=[entrada, saida]
  - quantidade: DecimalField(>0)
  - valor_unitario: DecimalField(nullable)
  - valor_total: DecimalField(auto-calculated)
  - data: DateField
  - origem: CharField choices=[acao_isidoro, transferencia_interna, ajuste_inventario, ...]
  - documento_referencia: CharField(blank=True)
  - motivo: TextField(blank=True)
```

---

### PROPERTY & LAND MANAGEMENT (Fazendas)

| File | Purpose | Key Classes |
|------|---------|------------|
| [backend/apps/fazendas/models.py](backend/apps/fazendas/models.py) | Land models | `Proprietario`, `Fazenda`, `Area`, `Talhao`, `Arrendamento` |
| [backend/apps/actions/executors/fazendas.py](backend/apps/actions/executors/fazendas.py) | Executor functions | `execute_criar_proprietario()`, `execute_criar_fazenda()`, `execute_criar_area()`, `execute_criar_talhao()`, `execute_registrar_arrendamento()` |

---

## 3. CORE ACTION SYSTEM

### [backend/apps/actions/models.py](backend/apps/actions/models.py) - Action Queue Model

```python
class Action(TenantModel):
    """Action Queue - Stores proposed actions awaiting approval."""
    
    id: UUIDField
    module: CharField choices=[agricultura, maquinas, estoque, fazendas, ...]
    action_type: CharField choices=[criar_equipamento, registrar_abastecimento, ...]
    status: CharField choices=[pending_approval, approved, executed, rejected, failed, archived]
    
    draft_data: JSONField  # {campo: valor} to be executed
    resultado: JSONField   # Result after execution (if successful)
    
    criado_por: FK → CustomUser
    aprovado_por: FK → CustomUser(nullable)
    executado_em: DateTimeField(nullable)
    
    upload: FK → UploadedFile(nullable)  # If created from file parse
    meta: JSONField  # Audit metadata
```

### [backend/apps/actions/serializers.py](backend/apps/actions/serializers.py)

```python
ActionSerializer              # List/retrieve actions
ActionCreateSerializer        # Create new action
ActionApproveSerializer       # Approve action (requires motivo)
ActionRejectSerializer        # Reject action
BulkApproveSerializer         # Approve multiple actions
UploadedFileSerializer        # File upload tracking
```

### [backend/apps/actions/views.py](backend/apps/actions/views.py)

**ActionViewSet** methods:
- `list()` - List all actions (filtered by tenant, module, status)
- `create()` - Create new action (status=pending_approval)
- `retrieve()` - Get action details
- `update()` - Edit action (only if pending_approval)
- `approve()` - Custom action (POST) - transitions to approved→executed
- `reject()` - Custom action (POST) - transitions to rejected
- `bulk_approve()` - Custom action (POST) - approve multiple at once
- `pendentes()` - Custom action (GET) - list only pending_approval

**NO existing introspection endpoint** ⚠️

### [backend/apps/actions/urls.py](backend/apps/actions/urls.py)

```python
# Current routes:
POST   /api/actions/                    # Create action
GET    /api/actions/                    # List actions
GET    /api/actions/{id}/               # Retrieve action
PATCH  /api/actions/{id}/               # Update action (pending_approval only)
POST   /api/actions/{id}/approve/       # Approve action
POST   /api/actions/{id}/reject/        # Reject action
POST   /api/actions/bulk-approve/       # Bulk approve
GET    /api/actions/pendentes/          # List pending

POST   /api/actions/uploads/            # Upload file
GET    /api/actions/uploads/            # List uploads
GET    /api/actions/uploads/{id}/status/# Check upload parse status

GET    /api/actions/isidoro-search/     # Google CSE search (assistant feature)
POST   /api/actions/chat-pdf-export/    # PDF export helper

# MISSING: No schema/introspection endpoint!
```

---

## 4. EXECUTOR SYSTEM ARCHITECTURE

### [backend/apps/actions/executors/_base.py](backend/apps/actions/executors/_base.py)

**Core utilities for validating and saving:**

```python
class _FakeRequest:
    """Minimal request object for serializer context."""
    def __init__(self, user=None, tenant=None):
        self.user = user
        self.tenant = tenant
        self.auth = None

def validate_via_serializer(serializer_class, data: dict, user=None, tenant=None):
    """Run serializer validation only, return bound serializer."""
    # Returns serializer with .validated_data populated
    # Raises ValueError if validation fails

def save_via_serializer(serializer_class, data: dict, user=None, tenant=None, **save_kwargs):
    """Validate and call serializer.save(**save_kwargs)."""
    # Returns saved instance
    # Merges save_kwargs into validated_data before create()
```

**Pattern in executors:**
1. Resolve foreign keys (name → instance)
2. Normalize data (dates, decimals, enums)
3. Call `save_via_serializer()` with DRF serializer
4. Serializer's `create()` method runs full validation + saves to DB

Examples:
```python
# In execute_abastecimento():
equipamento = _resolve_equipamento(tenant, data.get("maquina_nome"))
quantidade_litros = _parse_decimal(data.get("quantidade_litros"))
valor_unitario = _parse_decimal(data.get("valor_unitario"))

abastecimento = save_via_serializer(
    AbastecimentoSerializer,
    {
        "equipamento": equipamento.id,
        "quantidade_litros": quantidade_litros,
        "valor_unitario": valor_unitario,
        ...
    },
    user=criado_por,
    tenant=tenant,
    criado_por=criado_por
)
```

### [backend/apps/actions/executors/maquinas.py](backend/apps/actions/executors/maquinas.py)

**Helper Functions:**
```python
_parse_date(value: str) → datetime  # Supports multiple formats
_parse_decimal(value) → Decimal     # Handles currency symbols, commas
_resolve_equipamento(tenant, maquina_nome)  # 5-level fuzzy matching
_extract_litros_from_descricao(descricao)   # Regex parsing "305 litros"
```

**Executors:**
```python
execute_criar_equipamento(action)  # → Equipamento (maquinas.models)
execute_abastecimento(action)      # → Abastecimento
execute_manutencao_maquina(action) # → OrdemServico (maquinas)
execute_ordem_servico_maquina(action) # → OrdemServico (same as above)
execute_parada_maquina(action)     # Updates Equipamento.status → manutencao
```

---

## 5. FIELD METADATA AVAILABILITY

### From Django Models:
```python
Field attributes available:
  - blank: bool (form validation)
  - null: bool (DB constraint)
  - default: any (default value)
  - choices: list (enumerated options)
  - help_text: str (documentation)
  - verbose_name: str (human name)
  - max_length: int (CharField constraint)
  - validators: list (custom validators)
```

### From DRF Serializers:
```python
Serializer field attributes:
  - required: bool
  - read_only: bool
  - write_only: bool
  - allow_null: bool
  - max_length/min_length: int
  - max_value/min_value: numeric
  - choices: dict
  - default: any
  - source: str (model field name)
  - help_text: str
```

### From ACTION_FIELDS_SCHEMA:
Already includes:
✅ Type information
✅ Required/optional status
✅ Max/min values
✅ Choices with descriptions
✅ Example values
✅ Field aliases
✅ Related lookup patterns
✅ Validation notes

---

## 6. IMPORTANT FIELD RESOLUTION PATTERNS

### Equipment Lookup (_resolve_equipamento)
User provides: `"CR5.85"` or `"Colheitadeira"` or just partial name  
System searches with fallback strategies:
1. Exact match: `nome__iexact=<name>`
2. Substring: `nome__icontains` OR `modelo__icontains`
3. All tokens: `(nome__icontains=token1 AND nome__icontains=token2 ...)`
4. Any token: `(nome__icontains=token1 OR modelo__icontains=token1 OR ...)`
5. Fuzzy matching with difflib (similarity ratio threshold: 0.45)

### Category Lookup (CategoriaEquipamento)
- NOT hardcoded choices
- Dynamically created/searched by name
- If not found, auto-creates (defaults to 'autopropelido' mobility type)
- Supports hierarchy (parent-child categories, not currently used)

### Product Lookup
- Exact match first: `nome__iexact=<name>`
- Fallback substring: `nome__icontains=<name>`
- If not found in `create_produto`, creates new product automatically

### Safra (Plantio) Lookup
- Search by `cultura.nome` (the culture name)
- Prioritizes `status='em_andamento'` (active crops)
- User says "Soja" → finds any Plantio where Cultura.nome≈"Soja"

---

## 7. CURRENT NULLABLE/BLANK STATUS

### In ACTION_FIELDS_SCHEMA
```python
"required": [...]   # Must provide (NOT nullable in ACTION_FIELDS_SCHEMA definition)
"optional": [...]   # May provide or use default
```

### In Model Fields
```python
Equipamento:
  null=True/False → DB constraint
  blank=True/False → Form validation
  
Examples:
  - numero_serie: CharField(max_length=100, null=True)        # Can be NULL
  - data_aquisicao: DateField(null=True)                      # Can be NULL
  - horimetro_atual: DecimalField(null=True)                  # Can be NULL
  - local_instalacao: CharField(max_length=200, blank=True)   # Empty string allowed
```

### Calculated During Executor
Many fields have `default=0` in ACTION_FIELDS_SCHEMA but can be `null` in model:
```python
Plantio.custo_total       # Calculated on save(): sum of sub-costs
Operacao.custo_total      # Calculated on save()
Colheita.custo_total      # Calculated on save()
MovimentacaoEstoque.valor_total  # Calculated on save()
```

---

## 8. BEST LOCATION FOR NEW INTROSPECTION ENDPOINT

### Recommended: In `apps/actions/views.py`

**Add new ViewSet or APIView:**
```python
class ActionSchemaViewSet(viewsets.ViewSet):
    """
    Read-only endpoint for exposing field schemas and metadata.
    
    GET /api/actions/schema/
      → List all action_types with full schemas
    
    GET /api/actions/schema/{action_type}/
      → Get schema for specific action (with enriched metadata)
    
    GET /api/actions/schema/modules/
      → Group action_types by module
    
    GET /api/actions/schema/fields/
      → Cross-cutting field reference (all unique fields across actions)
    """
```

**Why this location:**
- Consistent with `/api/actions/` namespace
- Direct access to ACTION_FIELDS_SCHEMA
- Can reuse ActionViewSet's permissions/authentication
- Easy for Isidoro to discover

**Register in urls.py:**
```python
schema_router = SimpleRouter()
schema_router.register(r"schema", ActionSchemaViewSet, basename="action-schema")

urlpatterns = [
    ...,
    path("", include(schema_router.urls)),
]
```

---

## 9. ENRICHMENT OPPORTUNITIES FOR INTROSPECTION

**Combine data from multiple sources:**

1. **ACTION_FIELDS_SCHEMA** (primary):
   - Field names, types, examples
   - Validation rules (max_length, choices)
   - Required/optional status
   - Related lookups

2. **DRF Serializers** (validation + relationships):
   - Extract field definitions with `serializer._declared_fields`
   - Get field constraints (max_length, validators, choices)
   - Identify read_only vs write-only
   - Access nested serializer relationships

3. **Django Models** (database constraints):
   - Extract field validators
   - Get blank/null constraints
   - Access default values
   - Field documentation (help_text, verbose_name)

4. **Custom enrichment**:
   - Mark which fields require lookups (FK resolution)
   - Provide lookup strategy (exact, icontains, fuzzy, etc.)
   - List supported choice values
   - Add friendly error messages for invalid inputs

---

## 10. FILE SUMMARY TABLE

| File Path | Type | Purpose | Key Content |
|-----------|------|---------|------------|
| [ACTION_FIELDS_SCHEMA.py](backend/apps/actions/ACTION_FIELDS_SCHEMA.py) | Python | Schema definition | 1,950 lines - authoritative field definitions |
| [views.py](backend/apps/actions/views.py) | ViewSet | REST endpoints | ActionViewSet, UploadedFileViewSet, GoogleSearchAPIView |
| [models.py](backend/apps/actions/models.py) | Model | Action queue | Action, UploadedFile, ActionStatus, ActionModule, ActionType |
| [serializers.py](backend/apps/actions/serializers.py) | Serializer | Validation | ActionSerializer, ActionCreateSerializer, ActionApproveSerializer |
| [urls.py](backend/apps/actions/urls.py) | Routing | URL config | SimpleRouter for actions, uploads |
| [executors/_base.py](backend/apps/actions/executors/_base.py) | Helper | Executor utilities | save_via_serializer, validate_via_serializer, _FakeRequest |
| [executors/maquinas.py](backend/apps/actions/executors/maquinas.py) | Executor | Equipment actions | All equipment-related action executors |
| [executors/agricultura.py](backend/apps/actions/executors/agricultura.py) | Executor | Ag operations | All agricultural action executors |
| [executors/estoque.py](backend/apps/actions/executors/estoque.py) | Executor | Inventory | All inventory action executors |
| [maquinas/models.py](backend/apps/maquinas/models.py) | Model | Equipment | Equipamento, Abastecimento, OrdemServico, CategoriaEquipamento |
| [maquinas/serializers.py](backend/apps/maquinas/serializers.py) | Serializer | Equipment validation | EquipamentoSerializer, AbastecimentoSerializer |
| [agricultura/models.py](backend/apps/agricultura/models.py) | Model | Ag operations | Plantio, Operacao, Colheita, Manejo |
| [agricultura/serializers.py](backend/apps/agricultura/serializers.py) | Serializer | Ag validation | PlantioSerializer, OperacaoSerializer |
| [estoque/models.py](backend/apps/estoque/models.py) | Model | Inventory | Produto, MovimentacaoEstoque, LocalArmazenamento |
| [estoque/serializers.py](backend/apps/estoque/serializers.py) | Serializer | Inventory validation | ProdutoSerializer, MovimentacaoEstoqueSerializer |
| [core/models.py](backend/apps/core/models.py) | Model | Core | Tenant, TenantModel, CustomUser, MODULE_CHOICES |

---

## 11. NEXT STEPS

### Immediate:
1. ✅ Review ACTION_FIELDS_SCHEMA.py for complete action list
2. ✅ Study executor patterns in _base.py, maquinas.py
3. ✅ Map field definitions to serializers and models
4. ⏭️ Create introspection endpoint in actions/views.py

### Implementation:
1. Create `ActionFieldsSchemaSerializer` to represent schema response
2. Create `ActionFieldsSchemaViewSet` with:
   - `list()` - all schemas
   - `retrieve()` - single schema with enriched metadata
   - Custom action `modules()` - group by module
   - Custom action `fields()` - cross-cutting field reference
3. Register in urls.py with proper routing
4. Enrich response with serializer + model field metadata
5. Add comprehensive docstrings and examples
6. Test with various action_types

### Advanced (Phase 2):
1. Add dynamic schema generation from serializers (DRF introspection)
2. Expose validation error messages for better UX
3. Create action templates/suggestions for common workflows
4. Add field dependency logic (conditional required fields)
5. Support schema versioning (for API versioning)

---

**Generated:** 2026-03-17  
**Backend Base Path:** `/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/project-agro/sistema-agropecuario/backend/`
