# 🏗️ Arquitetura - Sistema de Introspection de Schema

**Detalhamento técnico | Date: 17 de março de 2026 | Versão: 1.0**

---

## 📐 Diagrama Geral do Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CAMADA IA (LLM Client - Isidoro)                                           │
│                                                                             │
│  Agent/Assistant Thread                                                    │
│  ├─ Escuta: "User message"                                                │
│  ├─ Processa: com ISIDORO_SYSTEM_PROMPT (instruções genéricas)           │
│  ├─ Descobre: Ação necessária (ex: criar_equipamento)                    │
│  ├─ Chama TOOL: consultar_schema_acao(action_type="criar_equipamento")  │
│  ├─ Recebe: {required: [...], optional: [...]}                          │
│  ├─ Iterativamente: Pergunta campo → User responde → Confirma           │
│  └─ Chama TOOL FINAL: criar_equipamento(nome=..., ano=..., valor=...)   │
│                                                                             │
│     TOOLS DISPONÍVEIS (zeroclaw_tools/tools/agrolink_tools.py):           │
│     ├─ consultar_schema_acao ← NEW (THIS SYSTEM)                         │
│     ├─ criar_equipamento                                                  │
│     ├─ registrar_abastecimento                                            │
│     ├─ registrar_operacao_agricola                                        │
│     └─ ... (23 no total)                                                  │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    [HTTP Request: GET /api/actions/schema/...]
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CAMADA BACKEND (Django REST Framework)                                     │
│                                                                             │
│ URL ROUTING (apps/actions/urls.py):                                       │
│ ├─ path("schema/", ActionSchemaView.as_view(), name="schema-list")       │
│ └─ path("schema/<str:action_type>/", ActionSchemaView.as_view(), ...)    │
│                                                  │                         │
│                                                  ▼                         │
│ APIView CLASS (apps/actions/views.py):                                    │
│                                                                             │
│ class ActionSchemaView(APIView):                                          │
│     permission_classes = [permissions.IsAuthenticated]                    │
│                                                                             │
│     def get(self, request, action_type=None):                             │
│         if not action_type:  # GET /api/actions/schema/                   │
│             # Return list of all 23 action_types                          │
│             return Response({                                              │
│                 'action_types': ['criar_proprietario', ...],              │
│                 'count': 23,                                               │
│                 'modules': {                                               │
│                     'fazendas': [...],                                    │
│                     'agricultura': [...],                                 │
│                     ...                                                    │
│                 }                                                           │
│             })                                                              │
│                                                                             │
│         else:  # GET /api/actions/schema/criar_equipamento/               │
│             schema = ACTION_FIELDS_SCHEMA.get(action_type)                │
│             return Response(schema)  # Full schema with fields            │
│                                                                             │
│ DATA SOURCE (apps/actions/ACTION_FIELDS_SCHEMA.py):                       │
│                                                                             │
│ ACTION_FIELDS_SCHEMA = {                                                  │
│     "criar_equipamento": {                                                │
│         "action_type": "criar_equipamento",                               │
│         "module": "maquinas",                                             │
│         "model_target": "Equipamento",                                    │
│         "description": "...",                                             │
│         "fields": {                                                        │
│             "required": [                                                  │
│                 {                                                          │
│                     "name": "nome",                                        │
│                     "type": "str",                                         │
│                     "max_length": 200,                                     │
│                     "description": "Nome completo do equipamento",        │
│                     "example": "Trator John Deere 7200J"                  │
│                 },                                                         │
│                 {                                                          │
│                     "name": "ano_fabricacao",                             │
│                     "type": "int",                                         │
│                     "description": "Ano de fabricação...",                │
│                     "example": 2022                                        │
│                 },                                                         │
│                 {                                                          │
│                     "name": "valor_aquisicao",                            │
│                     "type": "Decimal",                                     │
│                     "description": "Valor de aquisição em reais...",     │
│                     "example": 850000.0                                    │
│                 }                                                          │
│             ],                                                             │
│             "optional": [                                                  │
│                 {                                                          │
│                     "name": "categoria",                                   │
│                     "type": "str",                                         │
│                     "description": "...",                                  │
│                     "default": "Outros"                                    │
│                 },                                                         │
│                 {                                                          │
│                     "name": "marca",                                       │
│                     "type": "str",                                         │
│                     "description": "...",                                  │
│                     "default": ""                                          │
│                 }                                                          │
│                 ...                                                        │
│             ]                                                              │
│         }                                                                   │
│     },                                                                     │
│     "entrada_estoque": { ... },                                           │
│     "operacao_agricola": { ... },                                         │
│     ...                                                                    │
│ }                                                                           │
│                                                                             │
│ HELPER FUNCTIONS:                                                          │
│ ├─ get_required_fields(action_type) → [field_names]                      │
│ ├─ get_optional_fields(action_type) → [field_names]                      │
│ └─ get_all_action_types() → [action_names]                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Dados Detalhado

### Cenário: User diz "Registra um novo trator"

```
TIME 0s:
┌──────────────────────────────────────────────────┐
│ WebSocket Message (WhatsApp)                     │
│ {"message": "Registra um novo trator"}           │
└──────────────────────────────────────────────────┘
                    │
                    ▼
         [ISIDORO LLM Processing]
         • Analisa mensagem
         • Vê "novo" + "trator" + "registra"
         • Identifica ação: criar_equipamento
         • Lê ISIDORO_SYSTEM_PROMPT (5 passos genéricos)

TIME 1s:
┌──────────────────────────────────────────────────┐
│ ISIDORO chama TOOL 1: consultar_schema_acao()   │
│                                                  │
│ Parameters:                                      │
│ - action_type: "criar_equipamento"              │
│ - formato: "complete" (default)                 │
└──────────────────────────────────────────────────┘
                    │
                    ▼
         [HTTP Request]
         GET /api/actions/schema/criar_equipamento/
         Authorization: Bearer {jwt_token}
                    │
                    ▼
         [Django Backend]
         • ActionSchemaView.get(request, "criar_equipamento")
         • Busca ACTION_FIELDS_SCHEMA["criar_equipamento"]
         • Retorna JSON com campos completos

TIME 2s:
┌──────────────────────────────────────────────────┐
│ Response JSON (1.2KB)                            │
│                                                  │
│ {                                               │
│   "action_type": "criar_equipamento",           │
│   "fields": {                                    │
│     "required": [                                │
│       {"name": "nome", ...},                     │
│       {"name": "ano_fabricacao", ...},          │
│       {"name": "valor_aquisicao", ...}          │
│     ],                                           │
│     "optional": [...]                           │
│   }                                              │
│ }                                                │
└──────────────────────────────────────────────────┘
                    │
                    ▼
         [ISIDORO Processing]
         • Parse JSON
         • Extrai required: ["nome", "ano_fabricacao", "valor_aquisicao"]
         • Extrai optional: ["categoria", "marca", ...] 
         • Prepara para PASSO 2: Coletar obrigatórios

TIME 3s:
┌──────────────────────────────────────────────────┐
│ ISIDORO responde ao usuário:                     │
│                                                  │
│ ChatMessage (bot):                               │
│ "Ótimo! Vou te ajudar a registrar o trator.     │
│  Primeiro, qual é o nome do equipamento?"       │
│                                                  │
│ (Send via WebSocket)                            │
└──────────────────────────────────────────────────┘

TIME 5s:
┌──────────────────────────────────────────────────┐
│ User responde via WhatsApp:                      │
│ {"message": "John Deere 7200J"}                  │
└──────────────────────────────────────────────────┘
                    │
                    ▼
         [ISIDORO Processing]
         • Armazena: nome = "John Deere 7200J"
         • Próximo campo obrigatório: ano_fabricacao
         • Pergunta: "Em que ano foi fabricado?"

TIME 7s - (repetir para todos obrigatórios)...

TIME 15s:
┌──────────────────────────────────────────────────┐
│ ISIDORO: "Tenho todos os dados. Deixa eu       │
│ confirmar:                                       │
│ - Nome: John Deere 7200J                        │
│ - Ano: 2022                                      │
│ - Valor: R$ 850.000                             │
│                                                  │
│ Tá certo?"                                       │
└──────────────────────────────────────────────────┘

TIME 17s:
┌──────────────────────────────────────────────────┐
│ User: "Sim, cria aí"                             │
└──────────────────────────────────────────────────┘

TIME 18s:
┌──────────────────────────────────────────────────┐
│ ISIDORO: "Quer adicionar marca, modelo,         │
│ categoria ou deixa pra depois?"                  │
└──────────────────────────────────────────────────┘

TIME 19s:
┌──────────────────────────────────────────────────┐
│ User: "Deixa pra depois"                         │
└──────────────────────────────────────────────────┘

TIME 20s:
┌──────────────────────────────────────────────────┐
│ ISIDORO chama TOOL 2: criar_equipamento()       │
│                                                  │
│ Parameters:                                      │
│ - nome: "John Deere 7200J"                      │
│ - ano_fabricacao: 2022                          │
│ - valor_aquisicao: 850000.0                     │
│ - categoria: (não fornecido, backend usa default)│
│                                                  │
│ Result: Action ID: 456 registrado ✅            │
└──────────────────────────────────────────────────┘

TIME 21s:
┌──────────────────────────────────────────────────┐
│ ISIDORO ao user:                                 │
│ "✅ Equipamento registrado em rascunho!          │
│  ID: 456                                         │
│  Aguardando aprovação de um usuário..."         │
└──────────────────────────────────────────────────┘
```

---

## 🔀 Comparação: Antes vs Depois

### ANTES (Problema)

```
User: "Grade intermediária, marca Tatu, ano 2010, valor 150.000"
                    │
                    ▼
          [ISIDORO sem schema]
          • Não sabe quais campos são obrigatórios
          • Assume que "marca Tatu" já é validação de marca
          • Não pergunta por "modelo" (campo obrigatório!)
          • Template-based responses
                    │
                    ▼
        criar_equipamento(
          nome="grade intermediária",
          marca="Tatu",
          ano=2010,
          valor=150000
          # FALTA: modelo, categoria
        )
                    │
                    ▼
          ❌ ValidationError: 
             {'modelo': ['This field cannot be blank.']}
             {'categoria': ['This field cannot be blank.']}
                    │
                    ▼
          User vê erro, fica confuso
          ISIDORO tenta recuperar, mas sem contexto de fields
```

### DEPOIS (Solução)

```
User: "Grade intermediária, marca Tatu, ano 2010, valor 150.000"
                    │
                    ▼
    [ISIDORO com schema introspection]
    1. GET /api/actions/schema/criar_equipamento/
    2. Descobre: required=[nome, categoria, ano, valor]
    3. optional=[marca, modelo, ...]
                    │
                    ▼
    "Qual é a categoria? (Grade, Arado, Trator, ...)"
    User: "Grade"
                    │
                    ▼
    "Qual o nome?" User: "Grade Intermediária"
                    │
                    ▼
    "Qual a marca?" User: "Tatu"
                    │
                    ▼
    "Qual o modelo?" User: "HS 2500"  ← PERGUNTADO EXPLICITAMENTE
                    │
                    ▼
    "Qual o ano?" User: "2010"
                    │
                    ▼
    "Qual o valor?" User: "150000"
                    │
                    ▼
    "Confirma os dados?"
    User: "Sim"
                    │
                    ▼
    criar_equipamento(
      nome="Grade Intermediária",
      categoria="Grade",
      marca="Tatu",
      modelo="HS 2500",
      ano_fabricacao=2010,
      valor_aquisicao=150000
      # TODOS os obrigatórios presentes ✅
    )
                    │
                    ▼
    ✅ Action criada com sucesso
       ID: 789 registrado
```

---

## 📦 Estrutura de Dados: ACTION_FIELDS_SCHEMA

### Localização
```
/backend/apps/actions/ACTION_FIELDS_SCHEMA.py
└─ Arquivo: 1.950 linhas
   ├─ 23 ações documentadas
   ├─ 100+ campos descritos
   └─ Helper functions
```

### Estrutura JSON de Uma Ação

```json
{
  "action_type": "registrar_movimentacao_carga",
  "module": "agricultura",
  "model_target": "MovimentacaoCarga",
  "description": "Registra movimento de carga (pesagem de caminhão na colheita)",
  "fields": {
    "required": [
      {
        "name": "peso_bruto",
        "type": "Decimal",
        "description": "Peso bruto do caminhão em kg (inclui tara)",
        "example": 28500.0,
        "validation": "peso_bruto > 0"
      },
      {
        "name": "tara",
        "type": "Decimal",
        "description": "Peso do caminhão vazio em kg",
        "example": 13200.0,
        "validation": "tara > 0 && tara < peso_bruto"
      }
    ],
    "optional": [
      {
        "name": "placa",
        "type": "str",
        "max_length": 8,
        "description": "Placa do caminhão (formato AA-0000)",
        "example": "OLV-9987",
        "default": ""
      },
      {
        "name": "descontos",
        "type": "Decimal",
        "description": "Descontos por umidade/qualidade em kg",
        "example": 285.0,
        "default": 0.0
      }
    ]
  },
  "related_lookups": [
    {
      "field": "safra",
      "tool": "consultar_sessoes_colheita_ativas",
      "description": "Buscar safra ativa para contexto de colheita"
    }
  ]
}
```

---

## 🎯 Padrão de Nomeclatura

```
action_type          Backend tool name       Frontend concept
─────────────────────────────────────────────────────────────
criar_equipamento    criar_equipamento()     Register Equipment
registrar_            register_               Register Operation
operacao_agricola    operacao_agricola()     Agricultural Op
entrada_estoque      entrada_estoque()       Stock Entry
movimentacao_carga   movimentacao_carga()    Load Movement
```

---

## 🔐 Segurança & Autenticação

### Autenticação

```python
# ActionSchemaView
class ActionSchemaView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    # ✅ Requer token JWT válido
```

### Autorização

```python
# Endpoint é read-only (GET apenas)
# ✅ Nenhuma escrita de dados
# ✅ Expõe apenas metadata (não dados sensíveis)
```

### Proteção

```python
# Schema é idêntico para todos usuários (não varia por tenant)
# ✅ Isidoro lê schema, nada específico de um usuário
# ✅ Dados sensíveis protegidos por executor (criar_equipamento, etc)
```

---

## 🚨 Troubleshooting

### Problema: "GET /api/actions/schema/criar_equipamento/ retorna 404"

**Solução:**
```bash
1. Verificar URL pattern em urls.py
   ✓ path("schema/<str:action_type>/", ActionSchemaView.as_view())
   
2. Verificar que ActionSchemaView está importado
   ✓ from .views import ActionSchemaView
   
3. Verificar que action_type existe em ACTION_FIELDS_SCHEMA
   ✓ "criar_equipamento" in ACTION_FIELDS_SCHEMA
```

### Problema: "Erro 401 Unauthorized"

**Solução:**
```python
# Adicionar header de autenticação
curl -H "Authorization: Bearer {valid_jwt_token}" \
     http://localhost:8000/api/actions/schema/criar_equipamento/
```

### Problema: "Schema retorna lista vazia de optional"

**Solução:**
```python
# Verificar se action_type tem optional fields definidos
# Se for realmente vazio, é normal (ex: criar_fazenda sem opcionais)

# Verificar estrutura em ACTION_FIELDS_SCHEMA.py:
{
  "fields": {
    "required": [...],     # ← sempre presente
    "optional": []         # ← pode ser []
  }
}
```

---

## 📈 Performance

### Latência de Resposta

```
GET /api/actions/schema/{action_type}/
├─ Query DB: 0ms (não faz query)
├─ Busca Python dict: ~1-2ms
├─ JSON serialization: ~2-3ms
├─ Network round-trip: 50-200ms (depende de latência)
└─ TOTAL: 50-205ms ✅ (muito rápido)
```

### Caching Futuro

```python
# Possível otimização (não implementado ainda):
from django.views.decorators.cache import cache_page

@cache_page(60 * 60)  # 1 hora
def schema_list(request):
    # Schema não muda frequentemente
    # Cache safe
```

---

## 🔄 Evolução Futura

### Fase 2.1: Pre-Requisites no Schema

```json
{
  "action_type": "movimentacao_carga",
  "pre_requisites": [
    {
      "tool": "consultar_sessoes_colheita_ativas",
      "description": "Verificar se há sessão de colheita ativa",
      "required": true
    }
  ]
}
```

### Fase 2.2: Conditional Fields

```json
{
  "fields": {
    "required": [
      {"name": "safra", "conditional": true },
      {"name": "peso", "conditional_on": "safra != null"}
    ]
  }
}
```

---

## 📚 Referências

- [Django REST Framework - APIView](https://www.django-rest-framework.org/api-guide/views/#apiview)
- [ACTION_FIELDS_SCHEMA.py](../../../backend/apps/actions/ACTION_FIELDS_SCHEMA.py)
- [ActionSchemaView source](../../../backend/apps/actions/views.py)
- [consultar_schema_acao tool](../../../zeroclaw_tools/tools/agrolink_tools.py)
