import pytest
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.fazendas.models import Area, Fazenda, Proprietario


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
