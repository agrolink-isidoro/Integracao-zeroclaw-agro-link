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
