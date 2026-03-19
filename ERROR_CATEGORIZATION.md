# Categorização de Erros - Test Suite Analysis

**Data:** 2024-12
**Status:** 140-145 testes falhando de ~525 total passando
**Progresso:** 55+ testes já corrigidos (is_staff=False pattern)

---

## 1. CATEGORIA A: Field Errors (Invalid model fields)

**Erro:** `django.core.exceptions.FieldError`: Invalid field name(s) for model

### Exemplos Encontrados:
- `administrativo/tests/test_folha_api.py` (6 ERROR tests)
  - Fixture tenta criar `Fazenda` com campos `area_total`, `localizacao` que não existem

### Impacto: ~6 testes ERROR (não rodam sequer)

### Root Cause:
- Fixture desatualizada - modelo foi refatorado
- Campos renomeados ou removidos do modelo `Fazenda`

### Solução Necessária:
- [ ] Verificar quais campos existem em `Fazenda` modelo
- [ ] Atualizar `user_with_tenant` fixture em `administrativo/tests/test_folha_api.py`
- [ ] Substituir `area_total`, `localizacao` pelos novos nomes

---

## 2. CATEGORIA B: Missing Data/KeyError

**Erro:** `KeyError: 'xyz'` - dados faltando na resposta da API

### Exemplos Encontrados:
- `comercial/tests/test_agregados.py::test_authenticated_can_access_empresa_agregados_and_csv`
  - Esperava chave `'E1'` que não existe na resposta
  - API retorna agregação sem todos os valores esperados

### Impacto: ~5-10 testes FAILED

### Root Cause:
- Dados de teste insuficientes para agregar
- Tenant não configurado corretamente no setup
- Query agregação retorna menos dados que esperado

### Solução Necessária:
- [ ] Revisar payload do setUp em `test_agregados.py`
- [ ] Garantir que dados exemplo tenham tenant_id associado
- [ ] Verificar filtro de tenant na aggregation view

---

## 3. CATEGORIA C: AssertionError (Logic/Calculation)

**Erro:** `AssertionError: X != Y` - valores calculados diferentes

### Exemplos Encontrados:
- `comercial/tests/test_agregados.py::test_empresa_agregados_json_and_csv`
  - `assert Decimal('175.75') < Decimal('0.01')` FALSO
  - Totalização de valores dando mais que esperado

### Impacto: ~10-20 testes FAILED

### Root Cause:
- Cálculo de agregação incorreto
- Múltiplas linhas de dados sendo somadas quando deveria haver apenas uma
- CSV export não aplicando filtros corretamente

### Solução Necessária:
- [ ] Revisar lógica de agregação em `views.py` (comercial app)
- [ ] Verificar se está filtrando por tenant corretamente
- [ ] Adicionar `is_staff=False` ao user de teste (pode estar vendo dados globais)

---

## 4. CATEGORIA D: URL 404 Not Found

**Erro:** `404 Not Found: /api/fiscal/nfes/1/confirmar_estoque/`

### Exemplos Encontrados:
- `fiscal/tests/test_override_apply.py::test_apply_override_records_audit_for_valor_change`
  - POST para endpoint que deveria ser encontrado
  - Rota registrada em urls.py mas 404

### Impacto: ~5-10 testes FAILED

### Root Cause:
- Viewset action "confirmar_estoque" pode ter uma restrição de permissão
- User não tem permission para chamar action
- Rota pode estar duplicada ou mal configurada

### Solução Necessária:
- [ ] Verificar permissões em NFeViewSet.confirmar_estoque()
- [ ] Adicionar @permission_classes([IsAuthenticated]) ou remover restrição
- [ ] Testar se superuser consegue acessar (test user é superuser)
- [ ] Validar routing de URL - pode haver conflito

---

## 5. CATEGORIA E: Tenant/Multi-Tenancy Issues

**Erro:** Dados não retornando ou permissão negada por tenant

### Impacto: ~15-25 testes FAILED (comercial, agricultura)

### Root Cause:
- User não está associado ao tenant correto
- Payload POST não inclui `tenant_id` ou `empresa_id`
- Filter by tenant está muito restritivo
- Monkey-patch `is_staff=False` pode estar causando tenant isolation

### Solução Necessária:
- [ ] Revisar como tenants são criados em conftest.py
- [ ] Adicionar tenant association no setUp de testes que precisam
- [ ] Verificar se payload POST tem tenant_id/empresa_id
- [ ] Testar com user staff vs regular (permission differences)

---

## 6. CATEGORIA F: Complex E2E Test Logic

**Erro:** Múltiplos passos falhando, lógica complexa de negócio

### Impacto: ~80+ testes FAILED (diversos apps)

### Exemplos:
- `comercial/tests/test_compra_nfe_e2e.py` - integração completa
- `agricultura/tests/test_full_agri_finance_flow.py` - fluxo financeiro
- `fiscal/tests/test_nfe_edge_cases.py` - casos extremos

### Root Cause:
- Múltiplas causas raiz por teste
- Pode incluir: permissões, tenant, dados, lógica de negócio

### Solução Necessária:
- [ ] Rodar com `--tb=short` para ver traceback completo
- [ ] Identificar qual passo falha
- [ ] Pode ser combinação de categoria A + B + D

---

## Summary Matrix

| Categoria | Exemplos | Tipo | Testes Afetados | Prioridade | Esforço |
|-----------|----------|------|-----------------|-----------|---------|
| **A** | Field Errors | ERROR | 6 | 🔴 Alta | Baixo |
| **B** | KeyError | FAILED | 5-10 | 🔴 Alta | Médio |
| **C** | AssertionError | FAILED | 10-20 | 🟡 Média | Médio |
| **D** | 404 URL | FAILED | 5-10 | 🔴 Alta | Médio |
| **E** | Tenant Issues | FAILED | 15-25 | 🟡 Média | Alto |
| **F** | Complex E2E | FAILED | 80+ | 🟢 Bassa | Alto |
| | | | **~140-145** | | |

---

## Próximos Passos

### 🔴 PRIORIDADE ALTA (Resolve 26 testes rapidamente):
1. **Fixar Categoria A** (Field Errors em administrativo)
   - Comando: `grep -r "area_total" backend/apps/`
   - Substituir por campos corretos

2. **Fixar Categoria D** (404 URLs em fiscal)
   - Verificar permissões na action
   - Testar com client.force_login(self.user)

3. **Fixar Categoria B** (KeyError em comercial/agregados)
   - Adicionar `is_staff=False` ao user
   - Revisar dados setup

### 🟡 PRIORIDADE MÉDIA (Análise mais detalhada):
4. **Categoria C** - Revisar lógica de agregação
5. **Categoria E** - Tenant association nos payloads

### 🟢 PRIORIDADE BAIXA (Maior volume, análise caso-a-caso):
6. **Categoria F** - E2E tests (depois de resolver A-E)

---

## Instruções para Cada Categoria

### CATEGORIA A: Field Errors
```bash
# 1. Encontrar campos do modelo
grep -A 20 "class Fazenda" backend/apps/fazendas/models.py

# 2. Atualizar fixture com campos corretos
# em backend/apps/administrativo/tests/test_folha_api.py linha 31
```

### CATEGORIA D: URL 404
```bash
# 1. Verificar permissões
grep -B 5 -A 15 "def confirmar_estoque" backend/apps/fiscal/views.py

# 2. Teste direto
pytest backend/apps/fiscal/tests/test_override_apply.py::test_apply_override_creates_adjustment_when_nfe_confirmed -xvs

# 3. Ver se user é superuser/staff
# Deve retornar 200, não 404
```

### CATEGORIA B: KeyError
```bash
# 1. Debug: adicionar print na view
# backend/apps/comercial/views.py linha 672

# 2. Verificar dados de setup
grep -A 30 "def setUp" backend/apps/comercial/tests/test_agregados.py

# 3. Adicionar is_staff=False ao user de teste
```

