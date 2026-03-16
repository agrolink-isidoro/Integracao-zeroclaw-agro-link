import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from django.contrib.auth import get_user_model

pytestmark = pytest.mark.django_db

User = get_user_model()

BASE_URL = '/api/administrativo/centros-custo/'


@pytest.fixture
def client_with_tenant_staff(user_with_tenant):
    """APIClient com user autenticado que tem tenant (e pode ser staff)"""
    user, tenant = user_with_tenant
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def test_create_centrocusto_authenticated(client_with_tenant_staff):
    client, user = client_with_tenant_staff
    payload = { 'codigo': 'C001', 'nome': 'Centro A', 'categoria': 'administrativo', 'ativo': True }
    resp = client.post(BASE_URL, payload, format='json')
    assert resp.status_code == 201
    data = resp.json()
    assert data['codigo'] == 'C001'
    assert data['nome'] == 'Centro A'


def test_list_centros(client_with_tenant_staff):
    client, user = client_with_tenant_staff
    # create two
    client.post(BASE_URL, { 'codigo': 'C001', 'nome': 'Centro A', 'categoria': 'administrativo' })
    client.post(BASE_URL, { 'codigo': 'C002', 'nome': 'Centro B', 'categoria': 'transporte' })
    resp = client.get(BASE_URL)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 2


def test_update_centrocusto(client_with_tenant_staff):
    client, user = client_with_tenant_staff
    r = client.post(BASE_URL, { 'codigo': 'C003', 'nome': 'Centro C', 'categoria': 'outro' })
    cid = r.json()['id']
    resp = client.patch(f'{BASE_URL}{cid}/', { 'nome': 'Centro C Updated' }, format='json')
    assert resp.status_code == 200
    assert resp.json()['nome'] == 'Centro C Updated'


def test_delete_centrocusto(client_with_tenant_staff):
    client, user = client_with_tenant_staff
    r = client.post(BASE_URL, { 'codigo': 'C004', 'nome': 'Centro D', 'categoria': 'alimentacao' })
    cid = r.json()['id']
    resp = client.delete(f'{BASE_URL}{cid}/')
    assert resp.status_code in (204, 200)
    get = client.get(f'{BASE_URL}{cid}/')
    assert get.status_code == 404
