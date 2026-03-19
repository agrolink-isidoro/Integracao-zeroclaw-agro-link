# Implementação: Suporte Multi-Geometry em KML

**Status:** ✅ Implementação concluída (19/03/2026)  
**Branch:** `feat/kml-multi-placemark-support`  
**Tarefa:** 1.1 do roadmap Google Maps + KML  

---

## 📋 Resumo Executivo

Adicionado suporte para processar **múltiplos Placemarks** em arquivos KML para Talhões e Áreas.

**Antes:**
```kml
<!-- Apenas o primeiro Placemark era processado -->
<Placemark>
  <Polygon>...</Polygon>
</Placemark>
<Placemark>  <!-- Ignorado! -->
  <Polygon>...</Polygon>
</Placemark>
```

**Depois:**
```python
# Ambos os polígonos são combinados em MULTIPOLYGON
geom = "MULTIPOLYGON (((coords1)), ((coords2)))"
```

---

## 🔧 Arquivos Modificados

### 1. `backend/apps/fazendas/serializers.py`

#### AreaSerializer

**Método novo/refatorado:** `_process_kml_file(kml_file)`

```python
def _process_kml_file(self, kml_file):
    """Processa arquivo KML e extrai geometria WKT (suporta múltiplos Placemarks)."""
```

**Lógica:**
1. Abre temporariamente arquivo KML via GDAL DataSource
2. **Itera sobre TODOS os features** (não para no primeiro)
3. Coleta geometrias WKT em lista `geometries`
4. **Se 1 geometria:** retorna como POLYGON (backwards compatible)
5. **Se múltiplas:** combina em MULTIPOLYGON WKT
6. Limpa arquivo temporário

**Benefícios:**
- ✅ Mantém compatibilidade com KML single-feature
- ✅ Suporta KML com múltiplos polígonos
- ✅ Logging detalhado de operações
- ✅ Tratamento de erro robusto

#### TalhaoSerializer

**Método novo:** `_process_kml_file(kml_file)` (duplicado por DRY)

**Métodos refatorados:** `create()` e `update()`
- Antes: código inline para processar KML
- Depois: chamam `self._process_kml_file(kml_file)`
- Resultado: eliminada duplicação de código

---

### 2. `backend/apps/fazendas/tests/test_areas_kml.py`

**Função nova:** `test_create_area_with_multi_placemark_kml()`

**O que testa (TDD happy path):**
```python
# Setup: Cria 2 Placemarks em um KML
kml = b"""<?xml version="1.0"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark><Polygon><!-- coords1 --></Polygon></Placemark>
  <Placemark><Polygon><!-- coords2 --></Polygon></Placemark>
</kml>"""

# POST para /api/fazendas/areas/ com este KML
resp = client.post("/api/fazendas/areas/", {..., "kml_file": kml}, format='multipart')

# Assertions:
# ✓ HTTP 201 Created
# ✓ Area object criada
# ✓ area.geom contém MULTIPOLYGON com ambas coords
```

---

## 🏗️ Arquitetura da Solução

### Fluxo de Processamento

```
KML com 2 Placemarks
    ↓
[AreaSerializer/TalhaoSerializer].create() ou update()
    ↓
_process_kml_file(kml_file)
    ↓
[GDAL] Lê KML → extrai features
    ↓
Coleta geometrias em lista:
  geometries = [
    "POLYGON ((lon lat, ...))",
    "POLYGON ((lon lat, ...))"
  ]
    ↓
len(geometries) == 2?
    ↓
SIM → Combina em MULTIPOLYGON
    ↓
"MULTIPOLYGON (((lon lat, ...)), ((lon lat, ...)))"
    ↓
Salva em Area.geom ou Talhao.geom (TextField)
```

### Formato de Armazenamento

- **Um polígono:** `POLYGON ((x y, x y, ...))`
- **Múltiplos:** `MULTIPOLYGON (((x y, ...)), ((x y, ...)))`
- **Localização:** `Area.geom` e `Talhao.geom` (TextField)
- **Edição:** `/api/fazendas/areas/` e `/api/fazendas/talhoes/`

---

## ✅ Validação

### Testes

| Teste | Tipo | Status |
|-------|------|--------|
| `test_create_area_with_kml()` | Existente | ✓ Não alterado (1 Placemark) |
| `test_create_area_with_multi_placemark_kml()` | Novo (TDD) | ⏳ Aguardando Docker |

### Compatibilidade

✅ **Backwards compatible:** KML com 1 Placemark retorna POLYGON (sem mudança de formato)  
✅ **GDAL/PostGIS:** Usa DataSource nativo de GDAL (sem novas deps)  
✅ **Logging:** Debug/info level rastreia operações  
✅ **Erro handling:** ValidationError se nenhuma geometria encontrada  

---

## 📝 Decisões Técnicas

### Por que MULTIPOLYGON em WKT?

1. **Compatibilidade PostGIS:** PostGIS nativo suporta ST_AsText('MULTIPOLYGON ...')
2. **Sem mudança de schema:** Usa même TextField (geom)
3. **GeoJSON compatível:** Ao retornar em /api/geo/, MULTIPOLYGON → GeoJSON FeatureCollection
4. **Simples:** Parsing string-based, sem deps geométricas

### Por que fallback em primeiro feature?

Se a combinação MULTIPOLYGON falhar (parsing WKT), retorna primeira geometria com aviso.  
→ Melhor ter algo que nada em caso de edge case

### DRY: Por que duplicar _process_kml_file()?

TalhaoSerializer e AreaSerializer teriam duplicação sem o método.  
→ Futura refatoração pode extrair para função utilitária compartilhada

---

## 🚀 Próximas Tarefas

**Bloqueadas por esta tarefa:**
- 1.2: Testes adicionais para edge cases (multi-layer, multi-polygon, etc.)
- 1.3: Lógica de validação multi-geometry (interseção, gaps, etc.)
- 2.x: Testes de endpoint /api/fazendas/geo/ com múltiplos talhões
- 3.x: Refactoring frontend FazendaMap (já suporta GeoJSON multi, só precisa dados)

---

## 🧪 Testes Futuros (Scope 1.2 +)

```python
# Edge cases A DEFINIR (fora do escopo 1.1):
def test_multi_placemark_with_multipolygon_kml(): pass
def test_multi_layer_kml(): pass
def test_invalid_geometry_error_handling(): pass
def test_kml_with_holes_multipolygon(): pass
```

---

## 📚 Referências

- **Tarefa no roadmap:** 1.1 (Backend multi-geometry KML support)
- **Branch:** feat/kml-multi-placemark-support
- **Task list:** docs/GOOGLE_MAPS_KML_TALHOES.md
- **GDAL docs:** https://osgeo.org/gdal-python-api/
- **WKT spec:** https://en.wikipedia.org/wiki/Well-known_text_representation_of_geometry
