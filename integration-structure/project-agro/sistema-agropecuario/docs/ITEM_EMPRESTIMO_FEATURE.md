# ItemEmprestimo - Product Integration in Loan System

## Overview

This feature adds the ability to link products (items from inventory) to loans (empréstimos), enabling automatic value calculation based on product quantity and unit price. This is particularly useful for agricultural operations where loans often finance specific products or inputs.

## Architecture

### Model Structure

#### ItemEmprestimo Model
- **Location**: `backend/apps/financeiro/models.py` (lines 1156-1223)
- **Purpose**: Intermediate model linking Emprestimo to Produto with quantity and value tracking
- **Key Fields**:
  - `emprestimo`: ForeignKey to Emprestimo (CASCADE) - When loan is deleted, items are deleted
  - `produto`: ForeignKey to Produto (PROTECT) - Cannot delete product if referenced in loan
  - `quantidade`: DecimalField - Quantity of product
  - `unidade`: CharField - Unit inherited from product (e.g., kg, liter)
  - `valor_unitario`: DecimalField - Unit price at time of loan
  - `valor_total`: DecimalField - Auto-calculated (quantidade × valor_unitario)
  - `observacoes`: TextField - Optional notes

**Database Constraints**:
```python
unique_together = ('emprestimo', 'produto')  # Only one item per product per loan
```

### Automatic Value Calculation

**Signals Implementation** (`backend/apps/financeiro/signals.py`):
- Listens to `post_save` and `post_delete` signals on ItemEmprestimo
- Automatically recalculates parent `Emprestimo.valor_emprestimo` as the sum of all item values
- Uses Django ORM aggregation for efficiency (no N+1 queries)
- Updates parent only if value changed (avoids unnecessary saves)

**Calculation Logic**:
```python
valor_emprestimo = Σ(ItemEmprestimo.quantidade × ItemEmprestimo.valor_unitario)
```

### Serializers

#### ItemEmprestimoSerializer
- Located in `backend/apps/financeiro/serializers.py`
- **Read-only Fields**: 
  - `valor_total` - Calculated from quantidade × valor_unitario
  - `produto_nome` - Product name (for frontend display)
  - `produto_unidade` - Unit from product
  - `criado_em`, `atualizado_em` - Timestamps
- **Validations**:
  - Quantity must be positive
  - Quantity cannot exceed available stock
  - Both emprestimo and produto must be provided

#### EmprestimoSerializer
- Updated to include `itens_produtos` field (nested ItemEmprestimoSerializer)
- Enables single API request to fetch loan with all associated products
- Read-only nested serializer (products are managed via separate endpoint)

### API Endpoints

#### ItemEmprestimo REST API
- **Base URL**: `/api/financeiro/itens-emprestimo/`
- **Methods**: GET (list, retrieve), POST (create), PUT (update), DELETE (destroy)
- **Filtering**: By emprestimo_id, produto_id
- **Search**: By produto.nome, emprestimo.titulo
- **Ordering**: By criado_em, quantidade, valor_total

**Example Requests**:
```bash
# Create new item
POST /api/financeiro/itens-emprestimo/
{
  "emprestimo": 123,
  "produto": 456,
  "quantidade": "50.00",
  "unidade": "kg",
  "valor_unitario": "150.00"
}

# List items for a specific loan
GET /api/financeiro/itens-emprestimo/?emprestimo=123

# Get emprestimo with all products
GET /api/financeiro/emprestimos/123/
# Response includes: itens_produtos: [...]
```

## Database Schema

### Migration
- **File**: `backend/apps/financeiro/migrations/0024_add_item_emprestimo.py`
- **Status**: Applied successfully
- **Tables Created**:
  - `financeiro_itememprestimo` - Main items table
  - Indexes on: (emprestimo_id, produto_id), emprestimo_id, produto_id

### Fields
```sql
CREATE TABLE financeiro_itememprestimo (
  id BIGINT PRIMARY KEY,
  emprestimo_id BIGINT NOT NULL,
  produto_id BIGINT NOT NULL,
  tenant_id BIGINT NOT NULL,
  quantidade DECIMAL(15,3),
  unidade VARCHAR(20),
  valor_unitario DECIMAL(15,2),
  valor_total DECIMAL(15,2),
  observacoes TEXT,
  criado_por_id BIGINT,
  criado_em TIMESTAMP,
  atualizado_em TIMESTAMP,
  UNIQUE (emprestimo_id, produto_id),
  FOREIGN KEY (emprestimo_id) REFERENCES financeiro_emprestimo(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES estoque_produto(id) ON DELETE PROTECT
);
```

## Validation Rules

### At Model Level (clean method)
1. **Stock Availability**: `quantidade <= produto.quantidade_estoque`
2. **Non-negative Values**: All decimal fields must be ≥ 0

### At Serializer Level
1. **Positive Quantity**: `quantidade > 0`
2. **Stock Availability**: Same as model
3. **Required Fields**: emprestimo, produto, quantidade, valor_unitario

### At Signal Level
1. **Automatic Recalculation**: Parent loan value updates automatically
2. **Data Consistency**: Uses atomic operations to prevent race conditions

## Backward Compatibility

✅ **No Breaking Changes**:
- Existing Emprestimos can be used without products
- `itens_produtos` field is read-only (cannot be created/updated via Emprestimo endpoint)
- All previous API endpoints and functionality remain unchanged
- Database migration uses CREATE TABLE (not modifying existing tables)

## Testing

### Test Coverage
- **Location**: `backend/tests/test_item_emprestimo.py`
- **Test Classes**: 4 (Model, Serializer, EmprestimoWithItems, APIViewSet)
- **Test Count**: 20+ test cases

### Test Categories
1. **Model Tests**: Creation, auto-calculation, validation, signals
2. **Serializer Tests**: Validation, read-only fields, creation
3. **API Tests**: CRUD operations, filtering, authentication

### Running Tests
```bash
# Run all ItemEmprestimo tests
pytest tests/test_item_emprestimo.py -v

# Run specific test class
pytest tests/test_item_emprestimo.py::ItemEmprestimoModelTests -v

# Run with coverage
pytest tests/test_item_emprestimo.py --cov=apps.financeiro
```

## Frontend Integration

### Components Needed
1. **Product Selector**: Dropdown with auto-complete (fetch from `/api/estoque/produtos/`)
2. **Item List**: Display added products with quantity, unit price, and total
3. **Auto-fill Fields**: Unit and price auto-populate from selected product
4. **Remove Action**: Delete individual items from the list

### Example Component Structure
```typescript
// ProductSelector.tsx
- Auto-complete search for products
- Display product name and available quantity
- Return: (produto_id, unidade, preco_venda)

// ItemEmprestimoList.tsx
- Table showing all items:
  - Product name, quantity, unit, unit price, total price
  - Remove button for each item

// OperacaoForm.tsx updates
- Add ProductSelector component
- Add ItemEmprestimoList component
- Display running total (sum of all item values)
- Auto-calculate valor_emprestimo from items
```

### API Integration
```typescript
// Fetch available products
const { data: products } = useQuery({
  queryKey: ['estoque/produtos/'],
  queryFn: () => api.get('/estoque/produtos/?tenant=current')
});

// Add item to loan
const addItem = useMutation({
  mutationFn: (item: ItemEmprestimo) => 
    api.post('/financeiro/itens-emprestimo/', item)
});

// Remove item from loan
const removeItem = useMutation({
  mutationFn: (itemId: number) =>
    api.delete(`/financeiro/itens-emprestimo/${itemId}/`)
});
```

## Usage Example

### Step 1: Create Loan
```python
emprestimo = Emprestimo.objects.create(
    tenant=tenant,
    titulo='Safra 2024 - Insumos',
    valor_emprestimo=0,  # Will be auto-calculated
    numero_parcelas=12,
    tipo_emprestimo='rural',
    criado_por=user
)
```

### Step 2: Add Products
```python
item1 = ItemEmprestimo.objects.create(
    tenant=tenant,
    emprestimo=emprestimo,
    produto=fertilizante,
    quantidade=Decimal('50.00'),
    unidade='kg',
    valor_unitario=Decimal('150.00'),
    criado_por=user
)
# emprestimo.valor_emprestimo automatically updated to 7500.00

item2 = ItemEmprestimo.objects.create(
    tenant=tenant,
    emprestimo=emprestimo,
    produto=sementes,
    quantidade=Decimal('100.00'),
    unidade='kg',
    valor_unitario=Decimal('50.00'),
    criado_por=user
)
# emprestimo.valor_emprestimo automatically updated to 12500.00
```

### Step 3: Update/Delete
```python
# Delete an item - valor_emprestimo recalculated automatically
item1.delete()
# emprestimo.valor_emprestimo automatically updates to 5000.00

# Update quantity in an item
item2.quantidade = Decimal('50.00')
item2.save()
# valor_total auto-calculated: 50 * 50 = 2500.00
# emprestimo.valor_emprestimo automatically updated to 2500.00
```

## Performance Considerations

### Query Optimization
- Use `.select_related('emprestimo', 'produto')` when querying ItemEmprestimo
- Use `.prefetch_related('itens_produtos')` when querying Emprestimo
- Signals use aggregation (efficient) instead of looping through items

### Potential Bottlenecks
- Signal recalculation on each item change (mitigated by signal optimization)
- Product lookup in serializer validation (mitigated by queryset optimization)

## Future Enhancements

1. **Batch Operations**: Add bulk upload of items (CSV import)
2. **Product Reserves**: Automatically reserve stock when item is added
3. **Price History**: Track price changes over time
4. **Multi-currency Support**: Handle items in different currencies
5. **Item Status**: Add status tracking (pending, approved, fulfilled)
6. **Invoicing Integration**: Link to fiscal system (NF-e) generation

## Files Modified

| File | Lines | Change |
|------|-------|--------|
| `models.py` | 1156-1223 | Added ItemEmprestimo model |
| `models.py` | Signals | Updated signals to handle ItemEmprestimo |
| `serializers.py` | 342-374 | Added ItemEmprestimoSerializer |
| `serializers.py` | 376-408 | Updated EmprestimoSerializer with itens_produtos |
| `views.py` | 743-754 | Added ItemEmprestimoViewSet |
| `urls.py` | 1-7, 17-18 | Added ItemEmprestimoViewSet import and router |
| `migrations/0024_...` | Auto-generated | Database schema migration |
| `tests/test_item_emprestimo.py` | New file | Comprehensive test suite |

## Known Issues & Limitations

1. **Stock Not Reserved**: Adding items doesn't automatically reserve stock (future enhancement)
2. **Price Locking**: Price can be manually changed (consider audit trail)
3. **No Partial Returns**: No built-in support for partial returns (future enhancement)
4. **Limited History**: No version control for item changes (future enhancement)

## Questions & Support

For questions or issues related to this feature:
1. Check test cases for usage examples
2. Review serializer validation for allowed values
3. Check database migration for schema details
4. Reference model docstrings for field descriptions
