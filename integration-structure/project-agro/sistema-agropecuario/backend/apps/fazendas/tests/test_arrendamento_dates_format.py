import pytest
from rest_framework.test import APIClient

from apps.fazendas.models import Arrendamento, Area, Fazenda, Proprietario


@pytest.mark.django_db
def test_create_arrendamento_with_ddmmyyyy_dates():
    # Criar proprietarios
    arrendador = Proprietario.objects.create(nome="Arrendador", cpf_cnpj="11111111111")
    arrendatario = Proprietario.objects.create(nome="Arrendatario", cpf_cnpj="22222222222")

    # Criar fazenda pertencente ao arrendador
    fazenda = Fazenda.objects.create(name="Fazenda Teste", matricula="M-321", proprietario=arrendador)

    # Criar área pertencente à fazenda para usar no arrendamento
    area = Area.objects.create(name="Area A", fazenda=fazenda, proprietario=arrendador)

    # Autenticar como superuser
    from django.contrib.auth import get_user_model
    User = get_user_model()
    u = User.objects.create_superuser(username="adm_arr", email="adm@x.com", password="pass")

    client = APIClient()
    client.force_authenticate(u)

    payload = {
        "arrendador": arrendador.id,
        "arrendatario": arrendatario.id,
        "fazenda": fazenda.id,
        "areas": [area.id],
        # dates in DD/MM/YYYY format (pt-BR)
        "start_date": "02/01/2026",
        "end_date": "31/12/2026",
        "custo_sacas_hectare": "1.50"
    }

    resp = client.post("/api/arrendamentos/", payload, format='json')
    assert resp.status_code == 201, resp.content

    # Confirm created and parsed dates
    a = Arrendamento.objects.get(fazenda=fazenda)
    assert str(a.start_date) == '2026-01-02'
    assert str(a.end_date) == '2026-12-31'
