# Draft Data Flow for registrar_operacao_agricola Action

## Summary
This document maps the complete flow of how `draft_data` is created and populated when the AI responds with the `registrar_operacao_agricola` action. It traces the data from the AI response, through the tool extraction, API posting, and finally into the database.

---

## 1. AI Response Processing → Tool Call (ZeroClaw Agent)

**File:** [/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/zeroclaw/python/zeroclaw_tools/integrations/agrolink.py](zeroclaw/python/zeroclaw_tools/integrations/agrolink.py)

**Method:** `IsidoroAgent.chat()` - Lines 1285-1500

The Isidoro agent receives the user message and processes it. When it detects an agricultural operation:

```python
# Line 1331-1351: Pre-fetch safras ativas when agriculture operation detected
if _is_agriculture_operation(user_message):
    safras_text = await _fetch_safras_ativas(self.base_url, self.jwt_token, self.tenant_id)
    safra_injection = SystemMessage(content=(
        "═══════════════════════════════════════════════════\n"
        "DADOS DO SISTEMA — SAFRAS ATIVAS (consultado agora)\n"
        "═══════════════════════════════════════════════════\n"
        f"{safras_text}\n"
        "═══════════════════════════════════════════════════\n"
        "INSTRUÇÃO MANDATÓRIA: O usuário está iniciando um registro agrícola.\n"
        "Sua ÚNICA resposta agora é apresentar a lista de safras acima\n"
        "e perguntar qual delas está vinculada à operação.\n"
```

The LLM will then call the `registrar_operacao_agricola` tool with the user-confirmed parameters.

---

## 2. Tool Function: Extract & Create Draft Data

**File:** [/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/zeroclaw/python/zeroclaw_tools/tools/agrolink_tools.py](zeroclaw/python/zeroclaw_tools/tools/agrolink_tools.py)

**Function:** `registrar_operacao_agricola()` - Lines 882-1030

### 2.1 Function Signature (Lines 882-896)
```python
def registrar_operacao_agricola(
    safra: str,
    talhao: str,
    data_inicio: str,
    tipo_operacao: str,
    data_fim: str = "",
    trator: str = "",
    implemento: str = "",
    produto_insumo: str = "",
    quantidade_insumo: float = 0.0,
    custo_mao_obra: float = 0.0,
    custo_maquina: float = 0.0,
    custo_insumos: float = 0.0,
    observacoes: str = "",
) -> str:
```

### 2.2 Fuzzy Resolution of Field Names (Lines 961-1010)
Before assembling draft_data, the function resolves fuzzy matches for equipment names:

```python
# ── Fuzzy resolve talhão ──────────────────────────────────────────
talhao_resolvido = talhao
if talhao:
    nome_match, disponiveis = _fuzzy_resolve_talhao(
        base_url, jwt_token, tenant_id, talhao,
    )
    if nome_match is None and disponiveis:
        return json.dumps({
            "sucesso": False,
            "erro": f"Talhão '{talhao}' não encontrado. "
                    f"Talhões disponíveis: {', '.join(disponiveis)}. "
                    "Por favor, confirme o nome correto com o usuário.",
        })
    elif nome_match:
        talhao_resolvido = nome_match

# ── Fuzzy resolve trator ──────────────────────────────────────────
trator_resolvido = trator
if trator:
    nome_match, disponiveis = _fuzzy_resolve_maquina(
        base_url, jwt_token, tenant_id, trator,
    )
    # ... error handling ...
    elif nome_match:
        trator_resolvido = nome_match

# ── Fuzzy resolve implemento ──────────────────────────────────────
implemento_resolvido = implemento
if implemento:
    nome_match, disponiveis = _fuzzy_resolve_maquina(
        base_url, jwt_token, tenant_id, implemento,
    )
    # ... error handling ...
```

### 2.3 Draft Data Dictionary Assembly (Lines 1011-1026)
This is the **KEY MAPPING** - AI response keys → draft_data keys:

```python
draft = {
    "safra": safra,
    "talhao": talhao_resolvido,
    "data_inicio": data_inicio,
    "data_fim": data_fim,
    "tipo_operacao": tipo_operacao,
    "trator": trator_resolvido,
    "implemento": implemento_resolvido,
    "custo_mao_obra": custo_mao_obra,           # ← Direct field mapping
    "custo_maquina": custo_maquina,             # ← Direct field mapping
    "custo_insumos": custo_insumos,             # ← Direct field mapping
    "observacoes": observacoes,
}

if produto_insumo:
    draft["produto_insumo"] = produto_insumo
    draft["quantidade_insumo"] = quantidade_insumo

return _post_action(
    base_url, jwt_token, tenant_id,
    module="agricultura",
    action_type="operacao_agricola",
    draft_data=draft,        # ← Passes assembled dict to API
)
```

---

## 3. API Call: Post Draft Data

**File:** [/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/zeroclaw/python/zeroclaw_tools/tools/agrolink_tools.py](agrolink_tools.py)

**Function:** `_post_action()` - Lines 120-140

### 3.1 Payload Assembly (Lines 120-140)
```python
def _post_action(
    base_url: str,
    jwt_token: str,
    tenant_id: str,
    module: str,
    action_type: str,
    draft_data: dict,
    meta: dict | None = None,
) -> str:
    """Cria um draft de Action na fila de aprovação do Agrolink."""
    payload = {
        "module": module,                    # = "agricultura"
        "action_type": action_type,          # = "operacao_agricola"
        "draft_data": draft_data,            # ← Raw dict from tool function
        "validation": {},
        "meta": meta or {"origem": "isidoro", "canal": "whatsapp"},
    }
    try:
        with _client(base_url, jwt_token, tenant_id) as c:
            resp = c.post("/actions/", json=payload)  # ← Posts to backend API
            resp.raise_for_status()
            data = resp.json()
            return json.dumps({
                "sucesso": True,
                "action_id": data.get("id"),
                "status": data.get("status"),
                "mensagem": "Ação criada e aguardando aprovação humana.",
            })
```

---

## 4. Backend API: Create Action in Database

**File:** [/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/project-agro/sistema-agropecuario/backend/apps/actions/tasks.py](backend/apps/actions/tasks.py)

**Function:** `parse_upload_task()` - Lines 40-70

When data is posted to `/actions/`, an Action record is created with draft_data stored as JSONField:

```python
@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    name="apps.actions.tasks.parse_upload_task",
)
def parse_upload_task(self, upload_id: str) -> dict:
    """Processa um UploadedFile e gera Actions em draft."""
    from .models import UploadedFile, Action, UploadStatus, ActionStatus
    
    # ... fetch upload and parse ...
    
    for draft in drafts:
        try:
            action_type = draft.get("action_type") or _default_action_type(upload.module)
            draft_data = draft.get("draft_data") or draft
            
            Action.objects.create(
                tenant=upload.tenant,
                criado_por=upload.criado_por,
                module=upload.module,
                action_type=action_type,
                draft_data=draft_data,        # ← Stored in JSONField
                status=ActionStatus.PENDING_APPROVAL,
                upload=upload,
                meta={"origem": "upload_parse", "upload_id": str(upload.id)},
            )
            actions_criadas += 1
```

**Model:** [/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/project-agro/sistema-agropecuario/backend/apps/actions/models.py](backend/apps/actions/models.py) - Lines ~120-130

```python
class Action(models.Model):
    # ...
    draft_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Nome → Valor dos dados do formulário a serem executados"
    )
```

---

## 5. Executor: Extract Values from Draft Data

**File:** [/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/project-agro/sistema-agropecuario/backend/apps/actions/executors/agricultura.py](backend/apps/actions/executors/agricultura.py)

**Function:** `execute_operacao_agricola()` - Lines 440-600

### 5.1 Extract Draft Data (Lines 451-456)
```python
def execute_operacao_agricola(action) -> None:
    """
    Cria uma Operação agrícola a partir de registrar_operacao_agricola draft_data.
    Usa o modelo Operacao (sistema unificado).
    """
    import logging
    logger = logging.getLogger(__name__)
    
    from apps.agricultura.models import Operacao, OperacaoProduto
    from apps.maquinas.models import Equipamento

    data = action.draft_data  # ← Retrieve the stored JSONField
```

### 5.2 Key Field Extraction & Parsing (Lines 470-600)

The function extracts specific fields from the `data` dict (which is `draft_data`):

```python
# Resolve tipos/categorias (Lines 492-513)
tipo_raw = (
    data.get("tipo_operacao")        # ← Extract from draft_data
    or data.get("atividade")
    or data.get("tipo")
    or "prep_limpeza"
).lower().strip()

# Parse dates (Lines 517-529)
data_inicio_input = data.get("data_inicio") or data.get("data_operacao") or data.get("data", "")
data_fim_input = data.get("data_fim", "")

data_inicio = _parse_date(data_inicio_input)
data_fim = None
if data_fim_input:
    data_fim = _parse_date(data_fim_input)

# Resolve equipamentos with fuzzy matching (Lines 531-580)
# ── Resolve trator (equipamento autopropelido) ────────────────────
trator_obj = None
trator_nome = (data.get("trator") or "").strip()  # ← Extract from draft_data
if trator_nome:
    trator_obj = (
        Equipamento.objects.filter(tenant=tenant, nome__iexact=trator_nome).first()
        or Equipamento.objects.filter(tenant=tenant, nome__icontains=trator_nome).first()
    )
    if not trator_obj:
        logger.warning("execute_operacao_agricola: trator '%s' não encontrado", trator_nome)

# ── Resolve implemento (equipamento rebocado) ─────────────────────
implemento_obj = None
implemento_nome = (data.get("implemento") or "").strip()  # ← Extract from draft_data
if implemento_nome:
    implemento_obj = (
        Equipamento.objects.filter(tenant=tenant, nome__iexact=implemento_nome).first()
        or Equipamento.objects.filter(tenant=tenant, nome__icontains=implemento_nome).first()
    )
    if not implemento_obj:
        logger.warning("execute_operacao_agricola: implemento '%s' não encontrado", implemento_nome)

# Parse costs (Lines 581-583) ← KEY COST FIELD EXTRACTION
operacao = Operacao(
    # ...
    custo_mao_obra=_parse_decimal(data.get("custo_mao_obra"), "0"),         # ← From draft
    custo_maquina=_parse_decimal(data.get("custo_maquina"), "0"),           # ← From draft
    custo_insumos=_parse_decimal(data.get("custo_insumos"), "0"),           # ← From draft
    # ...
)
```

### 5.3 Operacao Model Creation (Lines 571-587)
```python
operacao = Operacao(
    tenant=tenant,
    categoria=categoria,
    tipo=tipo,
    plantio=plantio,
    fazenda=fazenda,
    data_operacao=data_inicio_date,
    data_inicio=data_inicio_dt,
    data_fim=data_fim_dt,
    trator=trator_obj,                                    # ← From resolved draft trator
    implemento=implemento_obj,                            # ← From resolved draft implemento
    custo_mao_obra=_parse_decimal(data.get("custo_mao_obra"), "0"),   # ← Direct extract
    custo_maquina=_parse_decimal(data.get("custo_maquina"), "0"),     # ← Direct extract
    custo_insumos=_parse_decimal(data.get("custo_insumos"), "0"),     # ← Direct extract
    status=status_final,
    observacoes=data.get("observacoes", ""),
    criado_por=criado_por,
)
operacao.save()
```

---

## Field Mapping Summary

| AI Tool Parameter | draft_data Key | Executors Extract | Target Model Field | Type | Example |
|---|---|---|---|---|---|
| `safra` | `safra` | ✓ | `plantio` (FK) | str | "Soja 2026" |
| `talhao` | `talhao` | ✓ | (context only) | str | "A1" |
| `data_inicio` | `data_inicio` | ✓ | `data_inicio` | datetime | "01/04/2026" |
| `data_fim` | `data_fim` | ✓ | `data_fim` | datetime | "02/04/2026" |
| `tipo_operacao` | `tipo_operacao` | ✓ | `tipo` | str enum | "pulv_herbicida" |
| `trator` | `trator` | ✓ | `trator` (FK) | str | "Trator John Deere" |
| `implemento` | `implemento` | ✓ | `implemento` (FK) | str | "Pulverizador 400L" |
| `custo_mao_obra` | `custo_mao_obra` | ✓ | `custo_mao_obra` | Decimal | 150.50 |
| `custo_maquina` | `custo_maquina` | ✓ | `custo_maquina` | Decimal | 250.00 |
| `custo_insumos` | `custo_insumos` | ✓ | `custo_insumos` | Decimal | 100.00 |
| `observacoes` | `observacoes` | ✓ | `observacoes` | str | "Clima nublado" |
| `produto_insumo` | `produto_insumo` | ✓ (via OperacaoProduto) | FK | str | "Roundup" |
| `quantidade_insumo` | `quantidade_insumo` | ✓ (via OperacaoProduto) | qty | float | 3.5 |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Message via WebSocket/WhatsApp                           │
│    "Pulverizei o talhão A1 com Roundup 3L/ha"                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. IsidoroAgent.chat() (agrolink.py:1285)                       │
│    - Detects agriculture operation                              │
│    - Pre-fetches safras ativas                                  │
│    - Injects context into LLM                                   │
│    - LLM calls registrar_operacao_agricola tool                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Tool: registrar_operacao_agricola (agrolink_tools.py:882)    │
│    Parameters from LLM:                                          │
│    - safra="Soja 2026"                                          │
│    - talhao="A1"                                                │
│    - tipo_operacao="pulv_herbicida"                             │
│    - custo_mao_obra=150.50                                      │
│    - custo_maquina=250.00                                       │
│    - custo_insumos=100.00                                       │
│    - implemento="Pulverizador 400L"                             │
│                                                                 │
│    Fuzzy resolve equipment names                                │
│    Assemble draft dict (lines 1011-1026)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. draft_data Dictionary (agrolink_tools.py:1011-1026)          │
│    {                                                             │
│      "safra": "Soja 2026",                                      │
│      "talhao": "A1",                                            │
│      "tipo_operacao": "pulv_herbicida",                         │
│      "data_inicio": "01/04/2026 10:00",                        │
│      "data_fim": "",                                            │
│      "trator": "Trator JD 5075",                               │
│      "implemento": "Pulvz 400L",                               │
│      "custo_mao_obra": 150.50,    ← COST FIELD 1              │
│      "custo_maquina": 250.00,     ← COST FIELD 2              │
│      "custo_insumos": 100.00,     ← COST FIELD 3              │
│      "observacoes": "..."                                       │
│    }                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. _post_action() (agrolink_tools.py:120)                       │
│    POST /actions/ with:                                         │
│    {                                                             │
│      "module": "agricultura",                                   │
│      "action_type": "operacao_agricola",                        │
│      "draft_data": { ... },     ← Full dict from step 4         │
│      "meta": {"origem": "isidoro"}                              │
│    }                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Backend API: Action.objects.create() (tasks.py:56)           │
│    Django ORM creates Action record:                            │
│    Action(                                                       │
│      module="agricultura",                                      │
│      action_type="operacao_agricola",                           │
│      draft_data={ ... },        ← Stored as JSONField          │
│      status="pending_approval",                                 │
│    )                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
        (Human approval required)                                 │
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Executor: execute_operacao_agricola() (agricultura.py:440)   │
│    Retrieve: data = action.draft_data                           │
│                                                                 │
│    Extract fields:                                              │
│    - tipo = data.get("tipo_operacao")                           │
│    - trator_obj = resolve(data.get("trator"))                  │
│    - implemento_obj = resolve(data.get("implemento"))          │
│    - custo_mao_obra = _parse_decimal(                           │
│        data.get("custo_mao_obra"), "0")  ← EXTRACT COST 1      │
│    - custo_maquina = _parse_decimal(                            │
│        data.get("custo_maquina"), "0")   ← EXTRACT COST 2      │
│    - custo_insumos = _parse_decimal(                            │
│        data.get("custo_insumos"), "0")   ← EXTRACT COST 3      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Create Operacao Model (agricultura.py:571)                   │
│    operacao = Operacao(                                         │
│      tenant=...,                                                │
│      categoria=...,                                             │
│      tipo=tipo,                                                 │
│      trator=trator_obj,      ← From draft (resolved)            │
│      implemento=implemento_obj, ← From draft (resolved)         │
│      custo_mao_obra=150.50,  ← From draft_data                  │
│      custo_maquina=250.00,   ← From draft_data                  │
│      custo_insumos=100.00,   ← From draft_data                  │
│    )                                                             │
│    operacao.save()                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Code Locations

| Component | File | Lines | Purpose |
|---|---|---|---|
| AI Agent Chat | `agrolink.py` | 1285-1500 | Process user message, trigger tool calls |
| Tool Definition | `agrolink_tools.py` | 882-1030 | Extract params, assemble draft_data |
| Draft Assembly | `agrolink_tools.py` | 1011-1026 | Map AI response to draft dict keys |
| API Post | `agrolink_tools.py` | 120-140 | Send draft to backend via POST |
| Action Creation | `tasks.py` | 40-70 | Store draft_data in Action JSONField |
| Executor | `agricultura.py` | 440-600 | Extract values, create Operacao record |
| Field Extraction | `agricultura.py` | 559-588 | Parse costs, resolve equipment names |

---

## Cost Fields Deep Dive

The three cost fields are extracted identically in the executor:

**File:** [agricultura.py](agricultura.py) - Lines 581-583

```python
custo_mao_obra=_parse_decimal(data.get("custo_mao_obra"), "0"),
custo_maquina=_parse_decimal(data.get("custo_maquina"), "0"),
custo_insumos=_parse_decimal(data.get("custo_insumos"), "0"),
```

Where `_parse_decimal()` safely converts string/float to Decimal:
- If value is None/empty → uses default "0"
- Returns Decimal type for DB storage

These fields are:
- ✅ Sent by AI tool with numeric values
- ✅ Stored in draft_data as numbers
- ✅ Retrieved unchanged from draft_data
- ✅ Converted to Decimal for model
- ✅ Persisted in Operacao table

---

## Example: Complete Data Journey

**User says:** "Pulverizei o talhão A1 com Roundup, 150 reais de mão de obra, 250 de máquina e 100 de insumo"

**Step 1 - Tool Call (from LLM):**
```python
registrar_operacao_agricola(
    safra="Soja 2026",
    talhao="A1",
    data_inicio="01/04/2026",
    tipo_operacao="pulv_herbicida",
    trator="",
    implemento="",
    custo_mao_obra=150.0,        # ← Numeric from LLM
    custo_maquina=250.0,         # ← Numeric from LLM
    custo_insumos=100.0,         # ← Numeric from LLM
    observacoes="Roundup"
)
```

**Step 2 - Draft Assembly:**
```python
draft = {
    "safra": "Soja 2026",
    "talhao": "A1",
    "data_inicio": "01/04/2026",
    "tipo_operacao": "pulv_herbicida",
    "trator": "",
    "implemento": "",
    "custo_mao_obra": 150.0,      # ← Still numeric
    "custo_maquina": 250.0,       # ← Still numeric
    "custo_insumos": 100.0,       # ← Still numeric
    "observacoes": "Roundup"
}
```

**Step 3 - API Post:**
```json
{
  "module": "agricultura",
  "action_type": "operacao_agricola",
  "draft_data": {
    "safra": "Soja 2026",
    "talhao": "A1",
    "data_inicio": "01/04/2026",
    "tipo_operacao": "pulv_herbicida",
    "custo_mao_obra": 150.0,
    "custo_maquina": 250.0,
    "custo_insumos": 100.0
  }
}
```

**Step 4 - Database Storage (actions_action table):**
```
id        | draft_data (JSONField)
----------|----------------------
12345     | {"safra": "Soja 2026", "talhao": "A1", "custo_mao_obra": 150.0, ...}
```

**Step 5 - Executor Retrieval & Parsing:**
```python
data = action.draft_data  # Gets the full JSON dict

custo_mao_obra = _parse_decimal(data.get("custo_mao_obra"), "0")
# data.get("custo_mao_obra") → 150.0
# _parse_decimal(150.0, "0") → Decimal('150.00')
```

**Step 6 - Final Model Creation:**
```python
Operacao(
    ...
    custo_mao_obra=Decimal('150.00'),
    custo_maquina=Decimal('250.00'),
    custo_insumos=Decimal('100.00'),
    ...
).save()
```

---

## Related Documentation

- **Action Schema:** `/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/project-agro/sistema-agropecuario/backend/apps/actions/ACTION_FIELDS_SCHEMA.py` (Line 619 for registrar_operacao_agricola)
- **Action Model:** `/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/project-agro/sistema-agropecuario/backend/apps/actions/models.py`
- **Operacao Model:** `/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/project-agro/sistema-agropecuario/backend/apps/agricultura/models.py`
- **Executor Base:** `/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/project-agro/sistema-agropecuario/backend/apps/actions/executors/_base.py`

