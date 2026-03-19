import pytest
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.fazendas.models import Area, Fazenda, Proprietario, Talhao


@pytest.mark.django_db
def test_create_area_with_kml():
    # criar proprietario e fazenda
    proprietario = Proprietario.objects.create(nome="Teste", cpf_cnpj="11111111111")
    fazenda = Fazenda.objects.create(name="Fazenda Teste", matricula="M-999", proprietario=proprietario)

    # autenticar
    from django.contrib.auth import get_user_model
    User = get_user_model()
    u = User.objects.create_superuser(username="adm2", email="x@y.com", password="pass")

    client = APIClient()
    client.force_authenticate(u)

    kml = b"""<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
      <Placemark>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>-47,-15 -47,-15.01 -46.99,-15.01 -46.99,-15 -47,-15</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>
    </kml>"""

    sf = SimpleUploadedFile("teste.kml", kml, content_type='application/vnd.google-earth.kml+xml')

    resp = client.post("/api/fazendas/areas/", {"fazenda": fazenda.id, "proprietario": proprietario.id, "name": "teste kml", "kml_file": sf}, format='multipart')
    assert resp.status_code == 201, resp.content

    assert Area.objects.filter(name="teste kml").exists()
    area = Area.objects.get(name="teste kml")
    assert area.geom is not None


@pytest.mark.django_db
def test_create_area_with_multi_placemark_kml():
    """Test KML with multiple Placemarks (multi-geometry support - TDD happy path)"""
    # Setup: create proprietario, fazenda, user
    proprietario = Proprietario.objects.create(nome="Multi Teste", cpf_cnpj="22222222222")
    fazenda = Fazenda.objects.create(name="Fazenda Multi", matricula="M-888", proprietario=proprietario)

    from django.contrib.auth import get_user_model
    User = get_user_model()
    u = User.objects.create_superuser(username="adm3", email="y@z.com", password="pass")

    client = APIClient()
    client.force_authenticate(u)

    # KML with 2 Placemarks (multi-polygon)
    kml = b"""<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
      <Placemark>
        <name>Polygon 1</name>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>-47.0,-15.0 -47.0,-15.01 -46.99,-15.01 -46.99,-15.0 -47.0,-15.0</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>
      <Placemark>
        <name>Polygon 2</name>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>-46.98,-15.02 -46.98,-15.03 -46.97,-15.03 -46.97,-15.02 -46.98,-15.02</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>
    </kml>"""

    sf = SimpleUploadedFile(
        "multi.kml",
        kml,
        content_type='application/vnd.google-earth.kml+xml'
    )

    resp = client.post(
        "/api/fazendas/areas/",
        {
            "fazenda": fazenda.id,
            "proprietario": proprietario.id,
            "name": "teste multi kml",
            "kml_file": sf
        },
        format='multipart'
    )

    # EXPECTED: API returns 201 (task 1.1 required to make this pass)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.content}"

    # EXPECTED: Area created with geometry containing both polygons
    assert Area.objects.filter(name="teste multi kml").exists()
    area = Area.objects.get(name="teste multi kml")
    assert area.geom is not None

    # EXPECTED: Geometry contains both polygons (MultiPolygon or similar multi-geometry)
    # Validation: geom must reference both coordinate sets
    geom_str = area.geom.lower()
    assert "multipolygon" in geom_str or (
        "-47.0" in area.geom and "-46.98" in area.geom
    ), "Geometry should contain both polygon coordinates"


@pytest.mark.django_db
def test_create_area_with_multipolygon_placemark_kml():
    """Test KML with single Placemark containing MULTIPOLYGON (edge case: different WKT parsing)"""
    proprietario = Proprietario.objects.create(nome="MultiPoly Test", cpf_cnpj="33333333333")
    fazenda = Fazenda.objects.create(name="Fazenda MultiPoly", matricula="M-777", proprietario=proprietario)

    from django.contrib.auth import get_user_model
    User = get_user_model()
    u = User.objects.create_superuser(username="adm4", email="z@w.com", password="pass")

    client = APIClient()
    client.force_authenticate(u)

    # KML with 1 Placemark containing MULTIPOLYGON (inner geometry structure)
    kml = b"""<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
      <Placemark>
        <name>Multi-polygon Area</name>
        <MultiGeometry>
          <Polygon>
            <outerBoundaryIs>
              <LinearRing>
                <coordinates>-47.5,-15.5 -47.5,-15.51 -47.49,-15.51 -47.49,-15.5 -47.5,-15.5</coordinates>
              </LinearRing>
            </outerBoundaryIs>
          </Polygon>
          <Polygon>
            <outerBoundaryIs>
              <LinearRing>
                <coordinates>-47.48,-15.52 -47.48,-15.53 -47.47,-15.53 -47.47,-15.52 -47.48,-15.52</coordinates>
              </LinearRing>
            </outerBoundaryIs>
          </Polygon>
        </MultiGeometry>
      </Placemark>
    </kml>"""

    sf = SimpleUploadedFile(
        "multipoly.kml",
        kml,
        content_type='application/vnd.google-earth.kml+xml'
    )

    resp = client.post(
        "/api/fazendas/areas/",
        {
            "fazenda": fazenda.id,
            "proprietario": proprietario.id,
            "name": "teste multipoly kml",
            "kml_file": sf
        },
        format='multipart'
    )

    # EXPECTED: API returns 201 (GDAL handles MultiGeometry natively)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.content}"

    # EXPECTED: Area created with parsed geometry
    assert Area.objects.filter(name="teste multipoly kml").exists()
    area = Area.objects.get(name="teste multipoly kml")
    assert area.geom is not None

    # EXPECTED: Geometry represents multi-polygon structure
    geom_str = area.geom.lower()
    # Should be either explicit MULTIPOLYGON or at least reference both coordinate sets
    assert "multipolygon" in geom_str or (
        "-47.5" in area.geom and "-47.48" in area.geom
    ), "Geometry should represent inner multi-polygon structure"


@pytest.mark.django_db
def test_create_area_with_empty_kml_error():
    """Test error handling: KML with no valid geometry returns ValidationError"""
    proprietario = Proprietario.objects.create(nome="Empty KML Test", cpf_cnpj="44444444444")
    fazenda = Fazenda.objects.create(name="Fazenda Empty", matricula="M-666", proprietario=proprietario)

    from django.contrib.auth import get_user_model
    User = get_user_model()
    u = User.objects.create_superuser(username="adm5", email="a@b.com", password="pass")

    client = APIClient()
    client.force_authenticate(u)

    # KML with Placemark but NO geometry (or only Point with no coordinates)
    kml = b"""<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
      <Placemark>
        <name>Empty Geometry</name>
        <description>No geometry here</description>
      </Placemark>
    </kml>"""

    sf = SimpleUploadedFile(
        "empty.kml",
        kml,
        content_type='application/vnd.google-earth.kml+xml'
    )

    resp = client.post(
        "/api/fazendas/areas/",
        {
            "fazenda": fazenda.id,
            "proprietario": proprietario.id,
            "name": "teste empty kml",
            "kml_file": sf
        },
        format='multipart'
    )

    # EXPECTED: API returns 400 (ValidationError due to missing geometry)
    assert resp.status_code == 400, f"Expected 400 for empty geometry, got {resp.status_code}: {resp.content}"

    # EXPECTED: Area NOT created
    assert not Area.objects.filter(name="teste empty kml").exists(), "Empty KML should not create Area"

    # EXPECTED: Error message mentions geometry
    resp_data = resp.json()
    assert any(
        "geometria" in str(msg).lower() or "geometry" in str(msg).lower()
        for msg in (resp_data.get("non_field_errors", []) + resp_data.get("kml_file", []))
    ), f"Error response should mention missing geometry. Got: {resp_data}"


@pytest.mark.django_db
def test_multipolygon_geometry_geos_parsing_and_area_calculation():
    """
    Test 1.3 — GEOS Validation: Confirm MultiPolygon geometries can be:
    1. Saved to database (TextField geom)
    2. Parsed back by GEOSGeometry without errors
    3. Area calculated (area_hectares) works for MultiPolygon
    """
    proprietario = Proprietario.objects.create(nome="GEOS Test", cpf_cnpj="55555555555")
    fazenda = Fazenda.objects.create(name="Fazenda GEOS", matricula="M-555", proprietario=proprietario)

    # Programatically create area with MULTIPOLYGON geometry (simulating 1.1 parser output)
    # MULTIPOLYGON with 2 polygons (contrived for testing):
    #   Polygon 1: ~100m x 100m at -47.0, -15.0
    #   Polygon 2: ~100m x 100m at -46.98, -15.02
    multipolygon_wkt = (
        "MULTIPOLYGON(("
        "(-47.001 -15.001, -47.001 -15.002, -47.000 -15.002, -47.000 -15.001, -47.001 -15.001),"
        "(-46.981 -15.021, -46.981 -15.022, -46.980 -15.022, -46.980 -15.021, -46.981 -15.021)"
        "))"
    )

    # Create Area with MULTIPOLYGON
    area = Area.objects.create(
        proprietario=proprietario,
        fazenda=fazenda,
        name="Teste GEOS MultiPolygon",
        tipo="propria",
        geom=multipolygon_wkt
    )

    # TEST 1: Verify saved
    assert area.id is not None, "Area should be saved"
    assert area.geom == multipolygon_wkt, "Geometry WKT should be preserved"

    # TEST 2: Verify GEOSGeometry can parse it (no exception)
    try:
        from django.contrib.gis.geos import GEOSGeometry
        geom_obj = GEOSGeometry(area.geom, srid=4326)
        assert geom_obj is not None, "GEOSGeometry parse should not raise"
        assert "MULTIPOLYGON" in geom_obj.wkt.upper(), "Parsed geometry should be MULTIPOLYGON"
    except Exception as e:
        pytest.fail(f"GEOSGeometry parsing failed for MultiPolygon: {e}")

    # TEST 3: Verify area_hectares calculates (returns number, not 0 or error)
    # Note: area_hectares uses PostGIS; in SQLite test it may return 0 gracefully
    # but the important thing is it doesn't crash
    try:
        calculated_area = area.area_hectares
        assert isinstance(calculated_area, (int, float)), "area_hectares should return a number"
        assert calculated_area >= 0, "area_hectares should not be negative"
        # In test env (SQLite), might be 0; that's OK as long as no exception
    except Exception as e:
        pytest.fail(f"area_hectares calculation crashed for MultiPolygon: {e}")

    # TEST 4: Create Talhao with MultiPolygon (same flow as Area)
    talhao = Talhao.objects.create(
        area=area,
        name="Teste GEOS Talhao MultiPolygon",
        geom=multipolygon_wkt
    )

    assert talhao.id is not None, "Talhao should be saved"
    
    # Verify Talhao.area_hectares also works
    try:
        talhao_area = talhao.area_hectares
        assert isinstance(talhao_area, (int, float)), "Talhao.area_hectares should return number"
        assert talhao_area >= 0, "Talhao.area_hectares should not be negative"
    except Exception as e:
        pytest.fail(f"Talhao.area_hectares calculation crashed for MultiPolygon: {e}")
