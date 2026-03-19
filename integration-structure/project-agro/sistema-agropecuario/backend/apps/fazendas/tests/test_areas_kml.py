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
