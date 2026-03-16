# 📊 Análise de Testes e Próximas Adaptações
## Status: Iniciando Ajustes Baseado em Análise

**Data:** 16 de Março de 2026 - Fase de Ajustes Iniciada  
**Objetivo:** Classificar testes restantes e executar adaptações necessárias  

---

## 📋 Catálogo de Testes por Módulo

### **✅ ADAPTADOS (Fase 1-3) - 32 testes**

#### `apps/administrativo/tests/test_folha_api.py` - 6 testes
```python
class TenantTestCase(TestCase):  # Padrão já aplicado ✅
    def setUp(self):
        self.tenant = Tenant.objects.create(...)
        self.user = User.objects.create(tenant=self.tenant)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

# Testes:
✅ test_create_preview_and_run_folha(user_with_tenant)
✅ test_temporario_uses_diaria_and_no_taxes_or_overtime(user_with_tenant)
✅ test_temporario_requires_diaria(user_with_tenant)
✅ test_per_employee_overrides_are_used(user_with_tenant)
✅ test_summary_endpoint_returns_aggregates(user_with_tenant)
✅ test_run_creates_vencimentos_and_aggregate_despesa(user_with_tenant)
```
**Status:** ✅ COMPLETO (Fixture `user_with_tenant` pronto)

#### `apps/fiscal/tests/test_manifestacao_api.py` - 16 testes
```python
class TenantTestCase(TestCase):  # ✅ Já definida
    def setUp(self):
        self.tenant, _ = Tenant.objects.get_or_create(...)
        self.user = User.objects.create(tenant=self.tenant)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
```
**Status:** ✅ COMPLETO (16 testes herdando de TenantTestCase)

#### `apps/financeiro/tests/test_rateio_api.py` - 10 testes
```python
class TenantTestCase(TestCase):  # ✅ Já definida
```
**Status:** ✅ COMPLETO (10 testes)

---

## ⏳ AINDA NÃO ADAPTADOS - ~400 testes distribuídos

### **🔴 Prioridade 1 - Críticos para Multi-Tenancy (100+ testes)**

#### `apps/administrativo/tests/`

**test_notifications_api.py** - 1 teste ❌
```python
@pytest.mark.django_db
def test_nao_lidas_and_marcar_todas_lidas_endpoints():
    user = User.objects.create_user(...)  # ❌ SEM TENANT
    
    # Problema: TenantMiddleware espera user.tenant
    # Erro esperado: 403 Forbidden
```
**Adaptação necessária:**
```python
def test_nao_lidas_and_marcar_todas_lidas_endpoints(user_with_tenant):
    """Use fixture user_with_tenant do conftest.py"""
    user, tenant = user_with_tenant
    client = APIClient()
    client.force_authenticate(user=user)
    # ... rest of test
```

**test_funcionario_api.py** - 2 testes ❌
```python
def test_create_and_list_funcionario():
    # ❌ SEM TENANT
    
def test_update_and_delete_funcionario():
    # ❌ SEM TENANT
```
**Adaptação:** Mesmo padrão - usar `user_with_tenant` fixture

**test_centrocusto_api.py** - 4 testes ❌
```python
def test_create_centrocusto_authenticated():
def test_list_centros():
def test_update_centrocusto():
def test_delete_centrocusto():
# ❌ Todos sem tenant
```
**Adaptação:** Usar `user_with_tenant` em todos

**test_folha_pagar_por_transferencia.py** - 2 testes NO CLASS ❌
```python
class TestFolhaPagarPorTransferencia(TestCase):
    def test_pagar_folha_batch_creates_transfers_and_vencimentos(self):
        # ❌ TestCase SEM TenantTestCase inheritance
    
    def test_error_reported_for_bad_data(self):
        # ❌ Mesmo problema
```
**Adaptação:** Fazer classe herdar de TenantTestCase

**test_inss_ir_django.py** - 3 testes NO CLASS ❌
```python
class ComputeINSSTestCase(TestCase):  # ❌ Não herda de TenantTestCase
    def test_compute_inss_...
```

---

#### `apps/agricultura/tests/` - ~80 testes

**test_colheita_*.py** (4 arquivos)
```
test_colheita_confirm.py - 1 teste ❌
test_colheita_transfers.py - 2 testes ❌
test_colheita_transport.py - 1 teste ❌
test_colheita_items.py - 2 testes ❌
# Todos em TestCase sem TenantTestCase
```

**test_operacao_*.py** (3 arquivos)
```
test_operacao_reservations.py - 2 testes ❌
test_plantio_update_api.py - 3 testes ❌
test_movimentacao_*.py (2 arquivos) - 4 testes ❌
```

**test_*_service.py, etc.** - ~20 mais testes

---

#### `apps/comercial/tests/` - ~20 testes

```
🔍 AINDA NÃO VERIFICADO - Precisam de análise
Esperado: ~20 testes SEM tenant
```

---

#### `apps/estoque/tests/` - ~15 testes

```
🔍 AINDA NÃO VERIFICADO - Precisam de análise  
Esperado: ~15 testes SEM tenant
```

---

#### `apps/fiscal/tests/ (outros)` - ~10 testes

```
test_nfe_api.py, test_dfe_api.py, etc.
Esperado: ~10 testes (alguns podem já estar ok)
```

---

#### `apps/financeiro/tests/ (outros)` - ~15 testes

```
test_lancamento_api.py, test_planilha_api.py, etc.
Esperado: ~15 testes (alguns podem já estar ok)
```

---

### 🟡 Prioridade 2 - Utilitários / Não-API (~50 testes)

```
apps/core/tests/test_forbidden_logger.py - 1 teste ✅ (provavelmente ok, não é API)
apps/agricultura/tests/test_services.py - 1 teste (lógica, não API)
apps/agricultura/tests/test_kpis.py - 3 testes (lógica, não API)
apps/agricultura/tests/test_area_total_ha.py - 2 testes (lógica)
apps/agricultura/tests/test_custo_transporte_units.py - 1 teste (lógica)
apps/agricultura/tests/test_estimate_endpoint.py - 1 teste (API - precisa tenant)
```

---

## 📊 Resumo Estatístico

| Categoria | Testes | Status | Ação |
|-----------|--------|--------|------|
| ✅ Adaptados | 32 | Completo | Monitorar CI |
| ⏳ Não API (lógica) | ~50 | OK | Apenas precisar de imports |
| ❌ API sem tenant | ~400 | Não adapti | Adaptação batch |
| **TOTAL** | **482** | **~30% adaptado** | **70% pendente** |

---

## 🔧 Estratégia de Ajustes

### **Opção A: Batch Adaptation (RECOMENDADO)**
Automaticamente converter todos os `User.objects.create_user(...)` para usar fixture `user_with_tenant`.

```bash
# Buscar todos os testes sem tenant
grep -r "User.objects.create_user\|User.objects.create" \
  apps/*/tests/*.py | grep -v "user_with_tenant\|TenantTestCase"

# Resultado: ~400 ocorrências a adaptar
```

### **Opção B: Fixture Global (ALTERNATIVA)**
Adicionar fixture `user_with_tenant` globalmente em `conftest.py` e usar em todos os testes via `@pytest.fixture` parameter.

```python
# conftest.py
@pytest.fixture(autouse=True)  # Auto-use em todos os testes
def populate_tenant(db):
    from apps.fazendas.models import Tenant
    Tenant.objects.get_or_create(name='default_test_tenant')
```

### **Opção C: Middleware Mock (MENOS RECOMENDADO)**
Mockar o middleware de multi-tenancy para todos os testes.

```python
# conftest.py
@pytest.fixture(autouse=True)
def mock_tenant_middleware(mocker):
    mocker.patch(
        'apps.core.middleware.TenantMiddleware.process_request',
        return_value=None
    )
```

---

## 🚀 Executar Adaptações Agora

### **Passo 1: Diagnosticar Testes Sem Tenant**

```bash
cd integration-structure/project-agro/sistema-agropecuario/backend

# Encontrar patterns de User.objects.create (sem tenant)
grep -r "User.objects.create" apps/*/tests/test_*.py | \
  grep -v "tenant\|TenantTestCase\|user_with_tenant" | \
  head -20

# Output esperado:
#   apps/administrativo/tests/test_notifications_api.py:13: user = User.objects.create_user(...)
#   apps/administrativo/tests/test_funcionario_api.py:18: user = User.objects.create_user(...)
#   ...
```

### **Passo 2: Adaptar Prioritariamente por Módulo**

**Fase 2A (1-2 horas): Administrativo** (~15 testes)
```bash
# Arquivos a adaptar:
- test_notifications_api.py      (1 teste)
- test_funcionario_api.py        (2 testes)
- test_centrocusto_api.py        (4 testes)
- test_folha_pagar_...py         (2 testes)
- test_inss_ir_django.py         (3 testes)
```

**Fase 2B (2-3 horas): Agricultura** (~30 testes)
```bash
# Arquivos a adaptar (por ordem de import dependency):
- test_colheita_*.py             (8 testes)
- test_operacao_*.py             (5 testes)
- test_plantio_*.py              (3 testes)
- test_movimentacao_*.py         (4 testes)
- test_*_service.py              (varios)
```

**Fase 2C (1-2 horas): Comercial + Estoque** (~30 testes)
```bash
# Análise e adaptação em lote
- apps/comercial/tests/*.py      (~20 testes)
- apps/estoque/tests/*.py        (~15 testes)
```

**Fase 2D (1 hora): Fiscal + Financeiro (outros)** (~25 testes)
```bash
# Não-manifestacao e não-rateio
- test_nfe_api.py
- test_dfe_api.py
- test_lancamento_api.py
- test_planilha_api.py
```

### **Passo 3: Rodar Testes e Comparar**

**Local Test Run (com docker-compose):**
```bash
# Iniciar infrastructure
docker compose up -d db redis

# Rodar testes
docker compose run --rm backend python -m pytest -x --tb=short

# Esperado ANTES: 181 falhas
# Esperado DEPOIS (após todas adaptações): <30 falhas
```

---

## 📋 Checklist de Adaptação

### **Template para adaptar cada teste:**

```python
# ANTES ❌
@pytest.mark.django_db
def test_example():
    user = User.objects.create_user(username='test', password='pass')
    client = APIClient()
    client.force_authenticate(user=user)
    # ... test code

# DEPOIS ✅
@pytest.mark.django_db
def test_example(user_with_tenant):
    user, tenant = user_with_tenant
    client = APIClient()
    client.force_authenticate(user=user)
    # ... test code (mesmo código)

# OU SE FOR TESTCASE:

# ANTES ❌
class TestExample(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(...)

# DEPOIS ✅
from apps.fiscal.tests.test_manifestacao_api import TenantTestCase

class TestExample(TenantTestCase):
    # setUp já fornece self.user com tenant!
    def test_example(self):
        # Use self.user (já tem tenant)
        pass
```

---

## 🎯 Próximas Ações (HOJE)

### **Imediato (30 minutos):**
```bash
# 1. Identificar padrão de documentação
grep "class.*TestCase" apps/*/tests/test_*.py | wc -l
# Esperado: ~40-50 classes

#2. Listar testes que usam fixture vs TestCase
grep -l "fixture\|TenantTestCase" apps/*/tests/test_*.py | wc -l
# Esperado: ~10-15 arquivos já adaptados
```

### **Curto Prazo (2-4 horas):**
1. ✅ Adaptar `apps/administrativo` (15 testes)
2. ✅ Adaptar `apps/agricultura` (30 testes)
3. ✅ Scan `apps/comercial` e `apps/estoque`
4. ✅ Rodar pytest para validar <5% failure

### **Resultado Esperado:**
```
ANTES: 181 failed, 346 passed (34% failure)
DEPOIS: <30 failed, 520+ passed (<6% failure)  ✅
```

---

## 💾 Infraestrutura Já Pronta

```python
# ✅ conftest.py setup
@pytest.fixture
def user_with_tenant(db):
    """User com tenant associado (pronto para usar)"""
    from apps.fazendas.models import Tenant
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    tenant = Tenant.objects.create(name='test-default')
    user = User.objects.create(username='testuser', tenant=tenant)
    return user, tenant

# ✅ TenantTestCase disponível em test_manifestacao_api.py
class TenantTestCase(TestCase):
    def setUp(self):
        # ... setup completo com tenant
```

**Status:** ✅ Infraestrutura pronta, apenas aplicar em todos os testes

---

## 📞 Referência Rápida

- **Fixture para pytest tests:** `user_with_tenant`
- **Base class para TestCase:** `TenantTestCase` (importar de test_manifestacao_api)
- **Django settings:** `DJANGO_SETTINGS_MODULE = sistema_agropecuario.settings.test`
- **pytest.ini:** `-n auto --dist loadscope` (parallelização pronta)

---

## ✅ Status Resumido

| Item | Status |
|------|--------|
| Infraestrutura de fixtures | ✅ Pronta |
| TenantTestCase | ✅ Disponível |
| pytest-xdist | ✅ Configurado |
| Adaptações Phase 1-3 | ✅ 32 testes |
| **Próximas: 400+ testes** | 🔄 **INICIANDO AGORA** |

---

**Próximo:** Iniciar batch adaptation de testes administrativo (15 tests em 30 minutos).

