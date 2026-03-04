import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from apps.fazendas.models import Fazenda, Area, Talhao, Proprietario
from apps.estoque.models import Produto

pytestmark = pytest.mark.django_db


def test_estimate_quantities_and_costs():
    client = APIClient()

    # Setup fazenda/area/talhao
    owner = Proprietario.objects.create(nome='Produtor', cpf_cnpj='12345678901')
    fazenda = Fazenda.objects.create(proprietario=owner, name='Fazenda X', matricula='123')
    area = Area.objects.create(proprietario=owner, fazenda=fazenda, name='Area A')
    talhao = Talhao.objects.create(area=area, name='Talhao 1', area_size=5.0)

    # Produto com estoque suficiente
    produto = Produto.objects.create(
        codigo='P-001', nome='Herbicida Teste', unidade='L', quantidade_estoque=100, custo_unitario=10.0
    )

    url = '/api/agricultura/operacoes/estimate/'
    payload = {
        'talhoes': [talhao.id],
        'produtos_input': [
            {'produto_id': produto.id, 'dosagem': 2.5, 'unidade_dosagem': 'L/ha'}
        ]
    }

    response = client.post(url, payload, format='json')
    assert response.status_code == 200, response.content
    data = response.json()

    assert data['area_total_ha'] == pytest.approx(5.0)
    assert len(data['produtos']) == 1
    p = data['produtos'][0]
    assert p['produto_id'] == produto.id
    assert p['quantidade_total'] == pytest.approx(12.5)
    assert p['estoque_suficiente'] is True
    assert p['custo_total'] == pytest.approx(125.0)

    # Now set low stock and test insufficient
    produto.quantidade_estoque = 5
    produto.save()

    response2 = client.post(url, payload, format='json')
    assert response2.status_code == 200
    p2 = response2.json()['produtos'][0]
    assert p2['estoque_suficiente'] is False
