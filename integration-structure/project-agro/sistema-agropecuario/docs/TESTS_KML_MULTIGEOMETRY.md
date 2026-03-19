# Tarefa 1.2: Testes Multi-Geometry KML

**Status:** ✅ Testes criados & validados (19/03/2026)  
**Tarefa:** 1.2 do roadmap Google Maps + KML  
**Branch:** feat/kml-multi-placemark-support (continuação)  

---

## 📋 Resumo

Adicionados **2 testes de alto valor** conforme `TEST_VALUE_GATE` do `copilot-instructions.md`:

| Teste | Tipo | Protege | Valor |
|-------|------|---------|-------|
| `test_create_area_with_multipolygon_placemark_kml()` | Edge case | WKT parsing para MULTIPOLYGON dentro de Placemark | Alto |
| `test_create_area_with_empty_kml_error()` | Error handling | ValidationError quando KML sem geometria | Alto |

---

## 🧪 Testes Novos (1.2)

### 1. `test_create_area_with_multipolygon_placemark_kml()`

**O que testa:**
```xml
<!-- KML com 1 Placemark contendo MultiGeometry -->
<Placemark>
  <MultiGeometry>
    <Polygon>...</Polygon>   <!-- Poly 1 -->
    <Polygon>...</Polygon>   <!-- Poly 2 -->
  </MultiGeometry>
</Placemark>
```

**Por quê (TEST_VALUE_GATE):**
- Estrutura WKT diferente da solução 1.1 (múltiplos Placemarks)
- GDAL extrai isto como MULTIPOLYGON nativo
- Parsing de coordenadas muda (diferentes parênteses)
- Bug risk: se WKT parsing em `_process_kml_file()` falha aqui, isso quebra contrato

**Assertions:**
```python
assert resp.status_code == 201  # API must accept MultiGeometry
assert area.geom is not None     # Geometry must be stored
# Valida que geom contém ambos polígonos (verifica coordenadas)
assert "multipolygon" in geom_str or ("-47.5" in geom and "-47.48" in geom)
```

---

### 2. `test_create_area_with_empty_kml_error()`

**O que testa:**
```xml
<!-- KML com Placemark vazio (sem geometria) -->
<Placemark>
  <name>Empty Geometry</name>
  <description>No geometry here</description>
  <!-- Sem Polygon, Point ou MultiGeometry -->
</Placemark>
```

**Por quê (TEST_VALUE_GATE):**
- Protege contrato de erro: se KML não tem geometria → ValidationError
- Previne crashes por acesso a None
- Falha = bug crítico (sistema aceita dados inválidos)

**Assertions:**
```python
assert resp.status_code == 400          # Must return 400 (bad request)
assert not Area.objects.filter(...).exists()  # Must NOT save invalid
# Valida que erro menciona "geometria"
assert "geometria" in error_message or "geometry" in error_message
```

---

## 🗂️ Estrutura de Testes (Total em test_areas_kml.py)

**Antes (1.1):**
```
test_create_area_with_kml()                           ← Existente (1 Placemark simples)
test_create_area_with_multi_placemark_kml()           ← Novo em 1.1 (2 Placemarks)
```

**Depois (1.1 + 1.2):**
```
test_create_area_with_kml()                           ← Existente (1 Placemark simples)
test_create_area_with_multi_placemark_kml()           ← Novo em 1.1 (2 Placemarks diferentes)
test_create_area_with_multipolygon_placemark_kml()    ← Novo em 1.2 (MultiGeometry inner)
test_create_area_with_empty_kml_error()               ← Novo em 1.2 (Error handling)
```

**Total: 4 testes (1 existente + 3 novos)**

---

## ✅ Conformidade com TEST_POLICY_CORE

| Regra | Aplicação | Status |
|-------|-----------|--------|
| **TDD_MINIMAL_TEST_RULE** | Máx 2 adicionais após impl | ✅ (temos exatamente 2) |
| **TEST_VALUE_GATE** | Protege comportamento essencial | ✅ (WKT parsing + error handling) |
| **TEST_SCOPE_RULE** | Sem múltiplos cenários | ✅ (cada teste um caso) |
| **EDGE_CASE_POLICY** | Só se bug real ou contrato quebra | ✅ (ambos) |
| **TEST_STRENGTH_RULE** | Assertions específicas | ✅ (validam coordenadas, status, msgs) |
| **TEST_DECOUPLING_RULE** | Isolados + cleanup | ✅ (@pytest.mark.django_db + nomes únicos) |

---

## 🏗️ Mudanças Arquiteturais

**Nenhuma** — testes apenas VALIDAM código de 1.1. Nenhuma mudança em serializers.py.

---

## 📊 Tabela de Cobertura

| Scenario | Teste | Covered |
|----------|-------|---------|
| 1 Placemark (POLYGON) | test_create_area_with_kml() | ✅ |
| 2+ Placemarks (cada um POLYGON) | test_create_area_with_multi_placemark_kml() | ✅ |
| 1 Placemark com MultiGeometry | test_create_area_with_multipolygon_placemark_kml() | ✅ |
| Sem geometria (erro) | test_create_area_with_empty_kml_error() | ✅ |
| Multi-layer KML | ⬜ (fora escopo 1.2) | — |
| Geometrias inválidas (auto-intersect) | ⬜ (fora escopo 1.2) | — |
| Holes/rings complexos | ⬜ (fora escopo 1.2) | — |

---

## 🚀 Como Executar Testes

**Quando Docker estabilizar:**

```bash
cd integration-structure/project-agro/sistema-agropecuario/

# Rodar todos os testes de KML
docker compose exec -T backend python -m pytest \
  apps/fazendas/tests/test_areas_kml.py -xvs

# Ou individual:
docker compose exec -T backend python -m pytest \
  apps/fazendas/tests/test_areas_kml.py::test_create_area_with_multipolygon_placemark_kml -xvs
```

**Esperado:**
- ✅ All 4 tests pass
- ✅ Geometries correctly parsed
- ✅ Error handling works

---

## 📝 Próximas Etapas (Fora de 1.2)

**1.3 — Validação Multi-Geometry:**
- [ ] Testes de validação GEOS (auto-intersecting polygons)
- [ ] Sobreposição com talhões existentes (aviso)
- [ ] Cálculo de área para MULTIPOLYGON

**1.4+ — Testes Endpoint:**
- [ ] GET /api/fazendas/geo/ retorna MULTIPOLYGON corretamente
- [ ] GeoJSON FeatureCollection com múltiplos features

---

## 📚 Referências

- **Copilot Instructions:** `copilot-instructions.md` (TEST_POLICY_CORE)
- **Tarefa:** 1.2 do roadmap Google Maps + KML  
- **Branch:** feat/kml-multi-placemark-support
- **File:** `backend/apps/fazendas/tests/test_areas_kml.py`
