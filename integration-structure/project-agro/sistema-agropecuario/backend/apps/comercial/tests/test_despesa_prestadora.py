import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.comercial.models import Empresa, DespesaPrestadora
from django.contrib.auth import get_user_model
User = get_user_model()

pytestmark = pytest.mark.django_db


def test_create_and_list_despesa_prestadora():
    client = APIClient()
    user = User.objects.create_user(username='tester', password='pass')
    from apps.core.models import Tenant
    tenant, _ = Tenant.objects.get_or_create(nome='Test Tenant ' + str(hash(user.username) % 10000), defaults={'subdominio': 'test' + str(hash(user.username) % 10000)})
    user.tenant = tenant
    user.save()
    client.force_authenticate(user=user)

    empresa = Empresa.objects.create(nome='Prestadora X', cnpj='12345678000199')

    payload = {
        'empresa': empresa.id,
        'data': '2026-01-05',
        'categoria': 'transporte',
        'valor': '1250.50',
        'descricao': 'Frete entrega'
    }

    url = reverse('despesaprestadora-list')
    resp = client.post(url, payload, format='json')
    assert resp.status_code == 201
    assert DespesaPrestadora.objects.filter(empresa=empresa).count() == 1

    list_resp = client.get(url + f'?empresa={empresa.id}')
    assert list_resp.status_code == 200
    assert len(list_resp.json()['results']) >= 1
