import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.comercial.models import Fornecedor, Compra
from django.contrib.auth import get_user_model
User = get_user_model()

pytestmark = pytest.mark.django_db


def test_create_and_list_compra():
    client = APIClient()
    user = User.objects.create_user(username='comprador', password='pass')
    client.force_authenticate(user=user)

    fornecedor = Fornecedor.objects.create(nome='Fornecedor Y', cpf_cnpj='99999999000100')

    payload = {
        'fornecedor': fornecedor.id,
        'data': '2026-01-05',
        'valor_total': '1500.00',
        'descricao': 'Compra de ferramentas'
    }

    url = reverse('compra-list')
    resp = client.post(url, payload, format='json')
    assert resp.status_code == 201
    assert Compra.objects.filter(fornecedor=fornecedor).count() == 1

    list_resp = client.get(url + f'?fornecedor={fornecedor.id}')
    assert list_resp.status_code == 200
    assert len(list_resp.json()['results']) >= 1
