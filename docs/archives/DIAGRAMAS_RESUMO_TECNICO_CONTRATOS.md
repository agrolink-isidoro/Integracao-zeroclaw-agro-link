# 🗺️ Diagramas e Resumo Técnico - Contratos Project-Agro

**Data:** 14/03/2026  
**Documento Técnico:** Diagramas de banco de dados, fluxos e resumos executivos

---

## 📊 Diagrama de Entidades e Relacionamentos

### Modelo E-R Simplificado

```
┌──────────────────────────────────────────────────────────────────┐
│                        MODELOS DE CONTRATO                       │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│          VendaContrato (Fase 2)     │  ← PRINCIPAL
├─────────────────────────────────────┤
│ PK: id                              │
│    numero_contrato (UNIQUE)         │
│    cliente_id (FK → Cliente)        │
│    produto_id (FK → Produto)        │
│                                     │
│    quantidade_total: DECIMAL        │
│    preco_unitario: DECIMAL          │
│    valor_total: DECIMAL             │
│                                     │
│    tipo: VARCHAR (A_VISTA|...)      │
│    status: VARCHAR (RASCUNHO|...)   │
│    data_contrato: DATE              │
│    data_entrega_prevista: DATE      │
│    numero_parcelas: INT             │
│    periodicidade_parcelas: VARCHAR  │
│    observacoes: TEXT                │
│    criado_por_id: INT (FK → User)   │
│    criado_em: TIMESTAMP             │
│    atualizado_em: TIMESTAMP         │
└─────────────────────────────────────┘
          1️⃣ │
             │ (1:N)
             │
             ↓ N
┌─────────────────────────────────────┐
│        ParcelaContrato (Fase 2)     │  ← PARCELAS
├─────────────────────────────────────┤
│ PK: id                              │
│ FK: contrato_id                     │
│     numero_parcela: INT             │
│     valor: DECIMAL                  │
│     data_vencimento: DATE           │
│     vencimento_id (FK → Vencimento) │
│     criado_em: TIMESTAMP            │
└─────────────────────────────────────┘
             │
             └─→ (FK) FINANCEIRO.Vencimento


┌─────────────────────────────────────┐
│     Contrato (Genérico/Fase 1)      │
├─────────────────────────────────────┤
│ PK: id                              │
│    numero_contrato (UNIQUE)         │
│    titulo: VARCHAR(200)             │
│    tipo_contrato: VARCHAR           │
│      (compra|venda|venda_futura|    │
│       venda_spot|bater|servico|     │
│       fornecimento|parceria|outros) │
│    categoria: VARCHAR(50)           │
│    status: VARCHAR(50)              │
│    valor_total: DECIMAL             │
│    data_inicio: DATE                │
│    data_fim: DATE                   │
│    prazo_execucao_dias: INT         │
│    observacoes: TEXT                │
│                                     │
│ JSON FIELDS:                        │
│    partes: JSON (ParteContrato[])   │
│    itens: JSON (ItemContrato[])     │
│    condicoes: JSON (CondicaoContrato[])
│                                     │
│    documento: FileField             │
│    criado_por_id: INT               │
│    criado_em: TIMESTAMP             │
│    atualizado_em: TIMESTAMP         │
└─────────────────────────────────────┘


┌─────────────────────────────────────┐     ┌──────────────────────────┐
│           Cliente                   │     │    Produto               │
├─────────────────────────────────────┤     ├──────────────────────────┤
│ PK: id                              │     │ PK: id                   │
│    nome: VARCHAR(200)               │     │    nome: VARCHAR         │
│    tipo_pessoa: VARCHAR (pf|pj)     │     │    preco_unitario: DEC   │
│    cpf_cnpj: VARCHAR(18)            │     │    quantidade_estoque    │
│    email: VARCHAR                   │     │    ... (mais campos)      │
│    telefone: VARCHAR                │     └──────────────────────────┘
│    endereco: VARCHAR                │              ↑
│    numero: VARCHAR                  │              │ (1:N)
│    bairro: VARCHAR                  │       VendaContrato.produto_id
│    cidade: VARCHAR                  │              │
│    estado: VARCHAR(2)               │              │
│    cep: VARCHAR(9)                  │              ↓
│    status: VARCHAR                  │
│    criado_por_id: INT               │
│    criado_em: TIMESTAMP             │
│    atualizado_em: TIMESTAMP         │
└─────────────────────────────────────┘
          ↑
          │ (N:1)
          │
   VendaContrato.cliente_id
```

### Diagrama de Composição (JSON Fields)

```
┌──────────────────────────────────────────────────────────────────┐
│                    CONTRATO (JSON FIELDS)                        │
└──────────────────────────────────────────────────────────────────┘

partes: JSON[
  {
    id?: number,
    tipo_parte: 'fornecedor'|'prestador'|'instituicao'|'proprietario'|'outros',
    entidade_id: number,
    entidade_nome: string,
    entidade_tipo_pessoa: 'pf'|'pj',
    entidade_cpf_cnpj: string,
    papel_contrato: 'contratante'|'contratado'|'fiador'|'avalista'|'interveniente',
    representante_nome?: string,
    representante_cpf?: string,
    representante_cargo?: string
  },
  ...
]

itens: JSON[
  {
    id?: number,
    tipo_item: 'produto'|'servico'|'financiamento'|'outros',
    descricao: string,
    quantidade?: number,
    unidade?: string,
    valor_unitario?: number,
    valor_total: number,
    especificacoes?: string,
    prazo_entrega?: string,
    condicoes_pagamento?: string
  },
  ...
]

condicoes: JSON[
  {
    id?: number,
    tipo_condicao: 'pagamento'|'entrega'|'garantia'|'multa'|'rescisao'|'outras',
    descricao: string,
    valor_referencia?: number,
    percentual_referencia?: number,
    prazo_dias?: number,
    obrigatoria: boolean
  },
  ...
]
```

---

## 🔄 Fluxo de Estados - Transições Permitidas

### VendaContrato (4 tipos)

#### 1️⃣ A_VISTA (À Vista)
```
RASCUNHO → ATIVO → ENCERRADO
    ↓              ↓
 CANCELADO ←──────┘
    
Restrições:
- numero_parcelas = 1 (validado no serializer)
- Sem data_entrega_prevista necessária
- Pagamento imediato
```

#### 2️⃣ PARCELADO (Parcelado)
```
RASCUNHO → ATIVO → ENCERRADO
    ↓              ↓
 CANCELADO ←──────┘

Restrições:
- numero_parcelas > 1
- periodicidade_parcelas obrigatória (MENSAL|BIMESTRAL|TRIMESTRAL)
- ParcelaContrato criadas automaticamente
- data_entrega_prevista obrigatória
```

#### 3️⃣ ANTECIPADO (Antecipado)
```
RASCUNHO → ATIVO → ENCERRADO
    ↓              ↓
 CANCELADO ←──────┘

Restrições:
- Pagamento antes da entrega
- data_entrega_prevista obrigatória
```

#### 4️⃣ FUTURO (Contrato Futuro)
```
RASCUNHO → ATIVO → ENCERRADO
    ↓              ↓
 CANCELADO ←──────┘

Restrições:
- Colheita futura (safra futura)
- data_entrega_prevista obrigatória
- Preço fixo pré-acordado
```

### Contrato Genérico (9 tipos)

```
        ┌────────────────┐
        │   RASCUNHO     │
        └────────────────┘
         ↓     ↓     ↓
    ┌────┴──┬───┴────┬────────────────────┐
    ↓       ↓        ↓                    ↓
  COMPRA  VENDA  VENDA_FUTURO    (3 outros tipos)
  │       │       │
  └───┬───┴────┬──┘
      ↓        ↓
  EM_NEGOCIACAO
      ↓
   ASSINADO
      ↓
  EM_EXECUCAO
      ↓
   CONCLUIDO
      
  (Qualquer estado pode ir para CANCELADO ou SUSPENSO)
```

---

## 🔐 Validações implementadas

### Frontend (Yup)

```javascript
// ✅ CAMPO: numero_contrato
✓ Tipo: string
✓ Obrigatório: SIM
✓ Único: SIM (verificado via API)
✓ Padrão: PLT-YYYYMMDD-### (não obrigatório)

// ✅ CAMPO: titulo
✓ Tipo: string
✓ Obrigatório: SIM
✓ Comprimento: 1-500 caracteres

// ✅ CAMPO: tipo_contrato
✓ Tipo: enum string
✓ Obrigatório: SIM
✓ Valores: compra|venda|venda_futura|venda_spot|bater|servico|fornecimento|parceria|outros

// ✅ CAMPO: valor_total
✓ Tipo: number
✓ Obrigatório: SIM
✓ Mínimo: 0.01
✓ Máximo: 999,999,999.99
✓ Precisão: 2 casas decimais

// ✅ CAMPO: data_inicio
✓ Tipo: date
✓ Obrigatório: SIM
✓ Formato: YYYY-MM-DD

// ✅ CAMPO: condicoes (array)
✓ Tipo: array de objetos
✓ Obrigatório: NÃO
✓ Cada elemento:
  - tipo_condicao: string (obrigatório)
  - descricao: string (obrigatório)
  - obrigatoria: boolean
```

### Backend (DRF/Serializers)

```python
# ✅ CriarContratoSerializer.validate()

def validate(attrs):
    # VALIDAÇÃO 1: valor_total = quantidade_total × preco_unitario
    valor_calculado = attrs['quantidade_total'] * attrs['preco_unitario']
    if abs(valor_calculado - attrs['valor_total']) > 0.01:
        raise ValidationError({
            'valor_total': 'O valor total deve ser igual a quantidade_total × preco_unitario'
        })
    
    # VALIDAÇÃO 2: A_VISTA deve ter apenas 1 parcela
    if attrs['tipo'] == 'A_VISTA' and attrs.get('numero_parcelas', 1) > 1:
        raise ValidationError({
            'numero_parcelas': 'Contratos à vista devem ter apenas 1 parcela'
        })
    
    return attrs

# ✅ VendaColheitaSerializer.validate()
# Para CargaViagem:
if tipo_entrega == 'contrato_pre_fixado':
    if custo_armazenagem > 0 or custo_recepcao > 0:
        raise ValidationError({
            'custo_armazenagem': 'Não pode haver custos para contrato pré-fixado'
        })

# ✅ Unique Constraints
# - VendaContrato.numero_contrato (unique=True)
# - Contrato.numero_contrato (unique=True)
```

---

## 📈 Estatísticas de Cobertura

### Arquivos Frontend
```
Páginas:           4 arquivos
├── ContratoForm.tsx         [~200 LOC]
├── ContratoCreate.tsx       [~150 LOC]
├── ContratosList.tsx        [~180 LOC]
└── ContratoDetalhes.tsx     [~120 LOC]
                            ─────────
                              650 LOC

Componentes:       1 arquivo
└── ContratoForm.tsx         [~300 LOC]
                            ─────────
                              300 LOC

Tipos:             2 arquivos
├── comercial.ts             [~400 LOC]
└── estoque_maquinas.ts      [~200 LOC]
                            ─────────
                              600 LOC

Serviços:          2 arquivos
├── contratos.ts             [~150 LOC]
└── comercial.ts             [~50 LOC]
                            ─────────
                              200 LOC

TOTAL FRONTEND: ~1,750 LOC
```

### Arquivos Backend
```
Modelos:           3 classes
├── Contrato        [~100 LOC]
├── VendaContrato   [~80 LOC]
└── ParcelaContrato [~40 LOC]
                   ────────
                     220 LOC

Serializers:       4 classes
├── ContratoSerializer         [~30 LOC]
├── VendaContratoSerializer    [~40 LOC]
├── ParcelaContratoSerializer  [~20 LOC]
└── CriarContratoSerializer    [~50 LOC]
                             ────────
                              140 LOC

ViewSets:         3 classes
├── ContratoViewSet            [~50 LOC]
├── VendaContratoViewSet       [~80 LOC]
└── ParcelaContratoViewSet     [~40 LOC]
                             ────────
                              170 LOC

Testes:           2+ arquivos
├── test_api_contratos_vendas.py    [~100 LOC]
└── test_contrato_types.py          [~30 LOC]
                                   ────────
                                    130 LOC

TOTAL BACKEND: ~660 LOC
```

---

## 🔀 Matriz de Compatibilidade

| Frontend | Backend | Status | Notas |
|----------|---------|--------|-------|
| ContratoForm (page) | ContratoSerializer/ContratoViewSet | ✅ | Contrato genérico |
| ContratoCreate (page) | CriarContratoSerializer/create_com_parcelas | ✅ | VendaContrato |
| ContratosList (page) | VendaContratoViewSet.list() | ✅ | Listar com filtros |
| ContratoDetalhes (page) | VendaContratoSerializer.retrieve() | ✅ | Detalhe único |
| ContratoForm (component) | Múltiplos ViewSets | ✅ | Modal reutilizável |
| contratos.ts service | /api/comercial/vendas-contrato/ | ✅ | Todas as operações |
| comercial.ts service | /api/comercial/contratos/ | ✅ | Genérico |

---

## 🎯 Checklist de Implementação

### Frontend Completo ✅
- [x] 4 páginas principais
- [x] 1 componente reutilizável
- [x] 2 arquivos de tipos
- [x] 2 serviços API
- [x] Validação com Yup
- [x] React Hook Form
- [x] React Query (caching)
- [x] Roteamento React Router
- [x] RBAC Guard
- [x] Error handling
- [x] Loading states
- [x] Toast notifications
- [ ] Testes unitários (E2E com Playwright)

### Backend Completo ✅
- [x] 3 modelos Django
- [x] 4 serializers
- [x] 3 ViewSets
- [x] Endpoints REST
- [x] Validações customizadas
- [x] Filtros e busca
- [x] Paginação
- [x] Multi-tenant support
- [x] RBAC permissions
- [x] Testes unitários
- [x] Ações customizadas (criar_com_parcelas, cancelar)
- [ ] Documentação OpenAPI/Swagger

### Integração Completa ✅
- [x] JWT authentication
- [x] Axios interceptors
- [x] React Query integration
- [x] Error handling
- [x] Loading states
- [x] Pagination
- [x] Filtering
- [x] Sorting
- [x] Caching strategy
- [ ] Real-time updates (WebSocket)

---

## 🚀 Performance Esperada

### Queries Otimizadas (Backend)
```python
# ✅ Select_related para evitar N+1
kontrato.objects.select_related('criado_por', 'cliente', 'produto').all()

# ✅ Prefetch_related para relações reversas
contrato.prefetch_related('parcelas').all()

# ✅ Batching com bulk_create
ParcelaContrato.objects.bulk_create(parcelas_list)
```

### Caching (Frontend)
```javascript
// ✅ React Query cache
useQuery(['contratos'], () => contratosService.listar())
  .with staleTime: 1000 * 60 * 5  // 5 minutos

// ✅ Axios cache com interceptor
// Implementado em api.ts
```

### Paginação
```
- Page size: 10-50 itens por página
- Default: 10
- Max: 100
- Offset-based ou cursor-based
```

---

## 📱 Responsividade

| Device | Status | Notas |
|--------|--------|-------|
| Desktop (1920px) | ✅ Full | Tailwind grid layout |
| Tablet (1024px) | ✅ Full | Responsive components |
| Mobile (768px) | ✅ Full | Mobile-first design |
| Mobile (425px) | ✅ Full | Touch-friendly buttons |

---

## 🔒 Segurança

| Aspecto | Status | Implementação |
|--------|--------|---------------|
| CSRF | ✅ | Django CSRF middleware |
| CORS | ✅ | django-cors-headers |
| Auth | ✅ | JWT + Django User model |
| RBAC | ✅ | RBACViewPermission |
| Input Validation | ✅ | Yup + DRF validators |
| SQL Injection | ✅ | ORM Django |
| XSS | ✅ | React escaping + CSP |
| Rate Limiting | ⏳ | Pendente (Django Ratelimit) |
| Audit Logging | ⏳ | Pendente (HistoricoAlteracao model existe) |

---

## 🎓 Padrões de Design Utilizados

### Frontend
```
1. Container/Presentational Components
   └─ ContratoList (container) → ContratoForm (presentational)

2. Custom Hooks
   └─ useForm (React Hook Form)
   └─ useQuery (TanStack React Query)

3. Service Pattern
   └─ contratosService (CRUD operations)

4. Composition Pattern
   └─ ContratoForm component reutilizável

5. Guards Pattern
   └─ RBACGuard, ProtectedRoute
```

### Backend
```
1. ViewSet Pattern (DRF)
   └─ CRUD operations + custom actions

2. Serializer Pattern
   └─ Data validation + transformation

3. Mixin Pattern
   └─ TenantQuerySetMixin para multi-tenant

4. Factory Pattern
   └─ Criação automática de ParcelaContrato

5. Repository Pattern
   └─ QuerySet methods (filters, search)
```

---

## 📚 Documentação Recomendada

### Para Desenvolvedores Frontend
1. [MAPA_COMPLETO_ESTRUTURA_CONTRATOS_PROJECT_AGRO.md] - Overview completo
2. [INDICE_VISUAL_CAMINHOS_ARQUIVOS_CONTRATOS.md] - Estrutura de arquivos
3. Este arquivo - Diagramas técnicos

### Para Desenvolvedores Backend
1. Mesmos documentos acima
2. [backend/apps/comercial/models.py] - Definição de modelos
3. [backend/apps/comercial/serializers.py] - Validações
4. [backend/apps/comercial/urls.py] - Endpoints
5. [backend/apps/comercial/tests/] - Exemplos de testes

### Para Arquitetos
1. Todos os documentos anteriores
2. DEPLOYMENT_GUIDE.md (a criar)
3. SCALING_STRATEGY.md (a criar)

---

**Gerado em:** 14/03/2026  
**Versão:** 1.0  
**Status:** ✅ COMPLETO  
**Próximos passos:** Criar testes E2E, documentação OpenAPI, guias de deployment
