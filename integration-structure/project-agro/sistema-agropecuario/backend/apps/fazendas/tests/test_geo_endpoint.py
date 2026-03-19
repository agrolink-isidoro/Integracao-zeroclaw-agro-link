"""
Test suite for /api/geo/ endpoint.
Tests GeoJSON retrieval, filtering by fazenda, tenant isolation.

Tarefa 2.1: Teste de integração do endpoint /api/geo/ retornando todos os talhões
"""
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from apps.core.models import Tenant
from apps.fazendas.models import Area, Fazenda, Proprietario, Talhao


User = get_user_model()


@pytest.mark.django_db
def test_geo_endpoint_returns_all_talhoes_for_fazenda():
    """
    Test 2.1 — Integration: /api/geo/ endpoint returns all Talhões for a given fazenda.
    
    Scenario:
    1. Create proprietário + fazenda
    2. Create area + 3 talhões (with different geometries)
    3. GET /api/geo/?fazenda=<id>&layer=talhoes
    4. Validate:
       - Returns GeoJSON FeatureCollection
       - Contains all 3 talhões
       - Each has correct properties (id, name, area_name, etc)
       - Geometry is valid (non-null)
    """
    # Setup: proprietário + fazenda
    proprietario = Proprietario.objects.create(
        nome="Geo Test Proprietário",
        cpf_cnpj="99999999999"
    )
    fazenda = Fazenda.objects.create(
        name="Geo Test Fazenda",
        matricula="M-GEO-001",
        proprietario=proprietario
    )
    
    # Create user for API auth
    user = User.objects.create_superuser(
        username="geo_test_user",
        email="geo@test.com",
        password="pass123"
    )
    
    # Create area for the fazenda
    area = Area.objects.create(
        proprietario=proprietario,
        fazenda=fazenda,
        name="Geo Test Area",
        tipo="propria",
        geom="POLYGON((-47.0 -15.0, -47.0 -15.01, -46.99 -15.01, -46.99 -15.0, -47.0 -15.0))"
    )
    
    # Create 3 talhões with different geometries
    talhoes_data = [
        {
            "name": "Talhao 1 - Geo Test",
            "geom": "POLYGON((-47.01 -15.01, -47.01 -15.02, -47.00 -15.02, -47.00 -15.01, -47.01 -15.01))",
            "area_size": 5.5,
        },
        {
            "name": "Talhao 2 - Geo Test",
            "geom": "POLYGON((-47.02 -15.02, -47.02 -15.03, -47.01 -15.03, -47.01 -15.02, -47.02 -15.02))",
            "area_size": 3.2,
        },
        {
            "name": "Talhao 3 - Geo Test",
            "geom": "POLYGON((-46.99 -15.00, -46.99 -15.01, -46.98 -15.01, -46.98 -15.00, -46.99 -15.00))",
            "area_size": 7.8,
        },
    ]
    
    talhoes = []
    for talhao_data in talhoes_data:
        talhao = Talhao.objects.create(
            area=area,
            name=talhao_data["name"],
            geom=talhao_data["geom"],
            area_size=talhao_data["area_size"]
        )
        talhoes.append(talhao)
    
    # API call: GET /api/geo/?fazenda=<id>&layer=talhoes
    client = APIClient()
    client.force_authenticate(user)
    
    response = client.get(
        "/api/geo/",
        {"fazenda": fazenda.id, "layer": "talhoes"}
    )
    
    # ASSERTIONS
    # 1. HTTP 200 OK
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.data}"
    
    # 2. Response is valid GeoJSON FeatureCollection
    data = response.json()
    assert data["type"] == "FeatureCollection", "Response should be a FeatureCollection"
    assert isinstance(data["features"], list), "features should be a list"
    
    # 3. Contains exactly 3 talhões
    features = data["features"]
    talhao_features = [f for f in features if f.get("properties", {}).get("entity_type") == "talhao"]
    assert len(talhao_features) == 3, f"Expected 3 talhões, got {len(talhao_features)}"
    
    # 4. Validate each talhão feature
    returned_ids = set()
    for feature in talhao_features:
        # Has required properties
        props = feature["properties"]
        assert "entity_type" in props
        assert props["entity_type"] == "talhao"
        assert "id" in props
        assert "name" in props
        assert "area_id" in props
        assert "area_name" in props
        assert "fazenda_id" in props
        assert "fazenda_name" in props
        
        # Geometry is present and non-null
        assert feature["geometry"] is not None, "Geometry should not be null"
        assert feature["geometry"]["type"] in ["Polygon", "MultiPolygon"]
        assert len(feature["geometry"]["coordinates"]) > 0
        
        # Verify fazenda_id matches
        assert props["fazenda_id"] == fazenda.id
        assert props["area_id"] == area.id
        
        returned_ids.add(props["id"])
    
    # 5. All created talhões are present
    created_ids = set(t.id for t in talhoes)
    assert returned_ids == created_ids, f"Missing talhões. Expected {created_ids}, got {returned_ids}"
    
    # 6. Verify each talhão's name is in response
    expected_names = set(t.name for t in talhoes)
    returned_names = set(f["properties"]["name"] for f in talhao_features)
    assert returned_names == expected_names, f"Names mismatch. Expected {expected_names}, got {returned_names}"


@pytest.mark.django_db
def test_geo_endpoint_filters_by_fazenda():
    """
    Test 2.1 — Filtering: /api/geo/?fazenda=X only returns entities for fazenda X.
    
    Scenario:
    1. Create 2 fazendas (A and B)
    2. Create 2 talhões for fazenda A
    3. Create 1 talhão for fazenda B
    4. GET /api/geo/?fazenda=A returns only 2 talhões
    5. GET /api/geo/?fazenda=B returns only 1 talhão
    """
    proprietario = Proprietario.objects.create(
        nome="Filter Test Prop",
        cpf_cnpj="88888888888"
    )
    
    # Create 2 fazendas
    fazenda_a = Fazenda.objects.create(
        name="Fazenda A - Filter Test",
        matricula="M-FILTER-A",
        proprietario=proprietario
    )
    fazenda_b = Fazenda.objects.create(
        name="Fazenda B - Filter Test",
        matricula="M-FILTER-B",
        proprietario=proprietario
    )
    
    user = User.objects.create_superuser(
        username="filter_test_user",
        email="filter@test.com",
        password="pass123"
    )
    
    # Create areas for each fazenda
    area_a = Area.objects.create(
        proprietario=proprietario,
        fazenda=fazenda_a,
        name="Area A",
        tipo="propria",
        geom="POLYGON((-47.0 -15.0, -47.0 -15.01, -46.99 -15.01, -46.99 -15.0, -47.0 -15.0))"
    )
    area_b = Area.objects.create(
        proprietario=proprietario,
        fazenda=fazenda_b,
        name="Area B",
        tipo="propria",
        geom="POLYGON((-46.0 -14.0, -46.0 -14.01, -45.99 -14.01, -45.99 -14.0, -46.0 -14.0))"
    )
    
    # Create talhões
    talhao_a1 = Talhao.objects.create(
        area=area_a,
        name="Talhao A1",
        geom="POLYGON((-47.001 -15.001, -47.001 -15.002, -47.000 -15.002, -47.000 -15.001, -47.001 -15.001))"
    )
    talhao_a2 = Talhao.objects.create(
        area=area_a,
        name="Talhao A2",
        geom="POLYGON((-47.003 -15.003, -47.003 -15.004, -47.002 -15.004, -47.002 -15.003, -47.003 -15.003))"
    )
    talhao_b1 = Talhao.objects.create(
        area=area_b,
        name="Talhao B1",
        geom="POLYGON((-46.001 -14.001, -46.001 -14.002, -46.000 -14.002, -46.000 -14.001, -46.001 -14.001))"
    )
    
    client = APIClient()
    client.force_authenticate(user)
    
    # Test: GET /geo/?fazenda=A should return 2 talhões
    response_a = client.get(
        "/api/geo/",
        {"fazenda": fazenda_a.id, "layer": "talhoes"}
    )
    assert response_a.status_code == 200
    features_a = response_a.json()["features"]
    talhao_features_a = [f for f in features_a if f.get("properties", {}).get("entity_type") == "talhao"]
    assert len(talhao_features_a) == 2, f"Fazenda A should have 2 talhões, got {len(talhao_features_a)}"
    
    returned_ids_a = set(f["properties"]["id"] for f in talhao_features_a)
    assert returned_ids_a == {talhao_a1.id, talhao_a2.id}
    
    # Test: GET /geo/?fazenda=B should return 1 talhão
    response_b = client.get(
        "/api/geo/",
        {"fazenda": fazenda_b.id, "layer": "talhoes"}
    )
    assert response_b.status_code == 200
    features_b = response_b.json()["features"]
    talhao_features_b = [f for f in features_b if f.get("properties", {}).get("entity_type") == "talhao"]
    assert len(talhao_features_b) == 1, f"Fazenda B should have 1 talhão, got {len(talhao_features_b)}"
    
    returned_ids_b = set(f["properties"]["id"] for f in talhao_features_b)
    assert returned_ids_b == {talhao_b1.id}


@pytest.mark.django_db
def test_geo_endpoint_returns_areas_and_multipolygon():
    """
    Test 2.1 — Multi-geometry: /api/geo/?layer=areas returns Areas with MultiPolygon support.
    
    Scenario:
    1. Create area with MULTIPOLYGON geometry (from 1.1 parser output)
    2. GET /api/geo/?layer=areas
    3. Validate:
       - Returns area with same geometry
       - Geometry is properly converted to GeoJSON
    """
    proprietario = Proprietario.objects.create(
        nome="Multi Geo Test",
        cpf_cnpj="77777777777"
    )
    fazenda = Fazenda.objects.create(
        name="Fazenda Multi Geo",
        matricula="M-MULTI-GEO",
        proprietario=proprietario
    )
    
    user = User.objects.create_superuser(
        username="multigeo_test_user",
        email="multigeo@test.com",
        password="pass123"
    )
    
    # Create area with MULTIPOLYGON
    multipolygon_wkt = (
        "MULTIPOLYGON(("
        "(-47.001 -15.001, -47.001 -15.002, -47.000 -15.002, -47.000 -15.001, -47.001 -15.001),"
        "(-46.981 -15.021, -46.981 -15.022, -46.980 -15.022, -46.980 -15.021, -46.981 -15.021)"
        "))"
    )
    area = Area.objects.create(
        proprietario=proprietario,
        fazenda=fazenda,
        name="Multi Polygon Area",
        tipo="propria",
        geom=multipolygon_wkt
    )
    
    client = APIClient()
    client.force_authenticate(user)
    
    response = client.get(
        "/api/geo/",
        {"fazenda": fazenda.id, "layer": "areas"}
    )
    
    assert response.status_code == 200
    data = response.json()
    features = data["features"]
    
    # Should have 1 area feature
    area_features = [f for f in features if f.get("properties", {}).get("entity_type") == "area"]
    assert len(area_features) == 1
    
    area_feature = area_features[0]
    props = area_feature["properties"]
    
    # Verify properties
    assert props["id"] == area.id
    assert props["name"] == "Multi Polygon Area"
    assert props["entity_type"] == "area"
    assert props["fazenda_id"] == fazenda.id
    
    # Verify geometry is converted (should be MultiPolygon in GeoJSON)
    geom = area_feature["geometry"]
    assert geom["type"] == "MultiPolygon"
    assert len(geom["coordinates"]) > 0


@pytest.mark.django_db
def test_geo_endpoint_layer_parameter():
    """
    Test 2.1 — Layer parameter: /api/geo/?layer=<type> correctly filters entities.
    
    Scenario:
    1. Create area + talhão
    2. GET ?layer=areas -> returns only area
    3. GET ?layer=talhoes -> returns only talhão
    4. GET ?layer=all -> returns both
    """
    proprietario = Proprietario.objects.create(
        nome="Layer Test",
        cpf_cnpj="66666666666"
    )
    fazenda = Fazenda.objects.create(
        name="Fazenda Layer Test",
        matricula="M-LAYER-001",
        proprietario=proprietario
    )
    
    user = User.objects.create_superuser(
        username="layer_test_user",
        email="layer@test.com",
        password="pass123"
    )
    
    area = Area.objects.create(
        proprietario=proprietario,
        fazenda=fazenda,
        name="Layer Test Area",
        tipo="propria",
        geom="POLYGON((-47.0 -15.0, -47.0 -15.01, -46.99 -15.01, -46.99 -15.0, -47.0 -15.0))"
    )
    
    talhao = Talhao.objects.create(
        area=area,
        name="Layer Test Talhao",
        geom="POLYGON((-47.001 -15.001, -47.001 -15.002, -47.000 -15.002, -47.000 -15.001, -47.001 -15.001))"
    )
    
    client = APIClient()
    client.force_authenticate(user)
    
    # Test: layer=areas
    response = client.get(
        "/api/geo/",
        {"fazenda": fazenda.id, "layer": "areas"}
    )
    assert response.status_code == 200
    features = response.json()["features"]
    entity_types = [f["properties"]["entity_type"] for f in features]
    assert "area" in entity_types
    assert "talhao" not in entity_types, "Should not include talhoes when layer=areas"
    
    # Test: layer=talhoes
    response = client.get(
        "/api/geo/",
        {"fazenda": fazenda.id, "layer": "talhoes"}
    )
    assert response.status_code == 200
    features = response.json()["features"]
    entity_types = [f["properties"]["entity_type"] for f in features]
    assert "talhao" in entity_types
    assert "area" not in entity_types, "Should not include areas when layer=talhoes"
    
    # Test: layer=all (default)
    response = client.get(
        "/api/geo/",
        {"fazenda": fazenda.id, "layer": "all"}
    )
    assert response.status_code == 200
    features = response.json()["features"]
    entity_types = [f["properties"]["entity_type"] for f in features]
    assert "area" in entity_types
    assert "talhao" in entity_types, "Should include both when layer=all"


@pytest.mark.django_db
def test_geo_endpoint_tenant_isolation():
    """
    Test that /api/geo/ respects tenant boundaries.
    Users from different tenants must NOT see each other's data.
    
    Scenario:
    - Tenant A: user_a, fazenda_a, talhao_a
    - Tenant B: user_b, fazenda_b, talhao_b
    - Verify: user_a sees only tenant A data, user_b sees only tenant B data
    """
    # Setup Tenant A
    tenant_a = Tenant.objects.create(
        nome="Tenant A",
        slug="tenant-a",
        plano="enterprise",
        ativo=True
    )
    user_a = User.objects.create_user(
        tenant=tenant_a,
        username="user_tenant_a",
        email="user_a@test.com",
        password="pass123"
    )
    proprietario_a = Proprietario.objects.create(
        nome="Proprietario A",
        cpf_cnpj="12345678901234"
    )
    fazenda_a = Fazenda.objects.create(
        tenant=tenant_a,
        proprietario=proprietario_a,
        name="Fazenda A",
        matricula="00001"
    )
    area_a = Area.objects.create(
        proprietario=proprietario_a,
        fazenda=fazenda_a,
        name="Area A",
        tipo="propria",
        geom="POLYGON((-47.0 -15.0, -47.0 -15.01, -46.99 -15.01, -46.99 -15.0, -47.0 -15.0))"
    )
    talhao_a = Talhao.objects.create(
        area=area_a,
        name="Talhao A",
        geom="POLYGON((-47.001 -15.001, -47.001 -15.002, -47.000 -15.002, -47.000 -15.001, -47.001 -15.001))"
    )
    
    # Setup Tenant B
    tenant_b = Tenant.objects.create(
        nome="Tenant B",
        slug="tenant-b",
        plano="enterprise",
        ativo=True
    )
    user_b = User.objects.create_user(
        tenant=tenant_b,
        username="user_tenant_b",
        email="user_b@test.com",
        password="pass123"
    )
    proprietario_b = Proprietario.objects.create(
        nome="Proprietario B",
        cpf_cnpj="98765432109876"
    )
    fazenda_b = Fazenda.objects.create(
        tenant=tenant_b,
        proprietario=proprietario_b,
        name="Fazenda B",
        matricula="00002"
    )
    area_b = Area.objects.create(
        proprietario=proprietario_b,
        fazenda=fazenda_b,
        name="Area B",
        tipo="propria",
        geom="POLYGON((-46.0 -14.0, -46.0 -14.01, -45.99 -14.01, -45.99 -14.0, -46.0 -14.0))"
    )
    talhao_b = Talhao.objects.create(
        area=area_b,
        name="Talhao B",
        geom="POLYGON((-46.001 -14.001, -46.001 -14.002, -46.000 -14.002, -46.000 -14.001, -46.001 -14.001))"
    )
    
    # Verify: User from Tenant A should only see Tenant A data
    client = APIClient()
    client.force_authenticate(user_a)
    
    response = client.get("/api/geo/")
    assert response.status_code == 200
    features_a = response.json()["features"]
    area_names_a = [f["properties"]["name"] for f in features_a]
    
    # User A should see Area A and Talhao A
    assert "Area A" in area_names_a, "User A should see Area A"
    assert "Talhao A" in area_names_a, "User A should see Talhao A"
    # User A should NOT see Area B or Talhao B
    assert "Area B" not in area_names_a, "User A must NOT see Area B (tenant isolation)"
    assert "Talhao B" not in area_names_a, "User A must NOT see Talhao B (tenant isolation)"
    
    # Verify: User from Tenant B should only see Tenant B data
    client.force_authenticate(user_b)
    
    response = client.get("/api/geo/")
    assert response.status_code == 200
    features_b = response.json()["features"]
    area_names_b = [f["properties"]["name"] for f in features_b]
    
    # User B should see Area B and Talhao B
    assert "Area B" in area_names_b, "User B should see Area B"
    assert "Talhao B" in area_names_b, "User B should see Talhao B"
    # User B should NOT see Area A or Talhao A
    assert "Area A" not in area_names_b, "User B must NOT see Area A (tenant isolation)"
    assert "Talhao A" not in area_names_b, "User B must NOT see Talhao A (tenant isolation)"


@pytest.mark.django_db
def test_geo_endpoint_fazenda_filter_respects_tenant():
    """
    Test that fazenda_id parameter correctly filters within tenant boundary.
    
    Scenario:
    - Tenant A has: fazenda_1 with talhaoX, fazenda_2 with talhaoY
    - User requests: /api/geo/?fazenda=fazenda_1 → should get ONLY talhaoX
    - User requests: /api/geo/?fazenda=fazenda_2 → should get ONLY talhaoY
    - Prevent: user accessing fazenda from another tenant via parameter
    """
    tenant = Tenant.objects.create(
        nome="Tenant Multi-Fazenda",
        slug="tenant-multi-fazenda",
        plano="enterprise",
        ativo=True
    )
    user = User.objects.create_user(
        tenant=tenant,
        username="multi_fazenda_user",
        email="multi@test.com",
        password="pass123"
    )
    proprietario = Proprietario.objects.create(
        nome="Proprietario Multi",
        cpf_cnpj="11122233344455"
    )
    
    # Create 2 fazendas within same tenant
    fazenda_1 = Fazenda.objects.create(
        tenant=tenant,
        proprietario=proprietario,
        name="Fazenda 1",
        matricula="00003"
    )
    fazenda_2 = Fazenda.objects.create(
        tenant=tenant,
        proprietario=proprietario,
        name="Fazenda 2",
        matricula="00004"
    )
    
    # Create talhões in each fazenda
    area_1 = Area.objects.create(
        proprietario=proprietario,
        fazenda=fazenda_1,
        name="Area in Fazenda 1",
        tipo="propria",
        geom="POLYGON((-47.1 -15.1, -47.1 -15.11, -47.09 -15.11, -47.09 -15.1, -47.1 -15.1))"
    )
    talhao_1 = Talhao.objects.create(
        area=area_1,
        name="Talhao in Fazenda 1",
        geom="POLYGON((-47.101 -15.101, -47.101 -15.102, -47.100 -15.102, -47.100 -15.101, -47.101 -15.101))"
    )
    
    area_2 = Area.objects.create(
        proprietario=proprietario,
        fazenda=fazenda_2,
        name="Area in Fazenda 2",
        tipo="propria",
        geom="POLYGON((-47.2 -15.2, -47.2 -15.21, -47.19 -15.21, -47.19 -15.2, -47.2 -15.2))"
    )
    talhao_2 = Talhao.objects.create(
        area=area_2,
        name="Talhao in Fazenda 2",
        geom="POLYGON((-47.201 -15.201, -47.201 -15.202, -47.200 -15.202, -47.200 -15.201, -47.201 -15.201))"
    )
    
    client = APIClient()
    client.force_authenticate(user)
    
    # Get data from fazenda_1 only
    response = client.get(
        "/api/geo/",
        {"fazenda": fazenda_1.id}
    )
    assert response.status_code == 200
    features = response.json()["features"]
    names = [f["properties"]["name"] for f in features]
    
    assert "Area in Fazenda 1" in names, "Should return area from fazenda_1"
    assert "Talhao in Fazenda 1" in names, "Should return talhao from fazenda_1"
    assert "Area in Fazenda 2" not in names, "Should NOT return data from fazenda_2"
    assert "Talhao in Fazenda 2" not in names, "Should NOT return data from fazenda_2"
    
    # Get data from fazenda_2 only
    response = client.get(
        "/api/geo/",
        {"fazenda": fazenda_2.id}
    )
    assert response.status_code == 200
    features = response.json()["features"]
    names = [f["properties"]["name"] for f in features]
    
    assert "Area in Fazenda 2" in names, "Should return area from fazenda_2"
    assert "Talhao in Fazenda 2" in names, "Should return talhao from fazenda_2"
    assert "Area in Fazenda 1" not in names, "Should NOT return data from fazenda_1"
    assert "Talhao in Fazenda 1" not in names, "Should NOT return data from fazenda_1"
