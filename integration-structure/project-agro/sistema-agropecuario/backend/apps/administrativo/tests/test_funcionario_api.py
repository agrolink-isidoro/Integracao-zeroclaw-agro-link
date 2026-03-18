import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

pytestmark = pytest.mark.django_db
User = get_user_model()
BASE = '/api/administrativo/funcionarios/'


@pytest.fixture
def client_with_tenant(user_with_tenant):
    """Fixture que retorna APIClient autenticado com user+tenant"""
    user, tenant = user_with_tenant
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def test_create_and_list_funcionario(client_with_tenant):
    client = client_with_tenant
    # Include pix_key since recebe_por defaults to 'pix' and serializer requires it
    payload = {
        'nome': 'João',
        'cpf': '12345678901',
        'cargo': 'Operador',
        'salario_bruto': '2000.00',
        'recebe_por': 'pix',
        'pix_key': '12345678901'  # CPF works as PIX key
    }
    r = client.post(BASE, payload, format='json')
    assert r.status_code == 201
    data = r.json()
    assert data['nome'] == 'João'

    r2 = client.get(BASE)
    assert r2.status_code == 200
    assert any(f['nome'] == 'João' for f in r2.json())


def test_update_and_delete_funcionario(client_with_tenant):
    client = client_with_tenant
    # Create with minimal required fields
    r = client.post(BASE, {
        'nome': 'Maria',
        'recebe_por': 'pix',
        'pix_key': '12345678902'  # CPF works as PIX key
    }, format='json')
    assert r.status_code == 201, f"POST failed: {r.content}"
    fid = r.json()['id']

    # Update cargo (PATCH allows partial updates)
    patch = client.patch(f'{BASE}{fid}/', {'cargo': 'Analista'}, format='json')
    assert patch.status_code == 200, f"PATCH failed: {patch.content}"
    assert patch.json()['cargo'] == 'Analista'

    delete = client.delete(f'{BASE}{fid}/')
    assert delete.status_code in (200, 204)
    get = client.get(f'{BASE}{fid}/')
    assert get.status_code == 404
