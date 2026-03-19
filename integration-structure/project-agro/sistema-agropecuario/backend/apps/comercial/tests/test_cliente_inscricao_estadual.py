import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

@pytest.mark.django_db
def test_create_cliente_with_inscricao_estadual():
    user = User.objects.create_user(username='cliuser', password='pass', is_staff=False)
    client = APIClient()
    client.force_authenticate(user=user)

    payload = {
        'nome': 'Cliente IE',
        'tipo_pessoa': 'pj',
        'cpf_cnpj': '12345678000199',
        'rg_ie': '',
        'inscricao_estadual': '123456789',
        'status': 'ativo'
    }

    resp = client.post('/api/comercial/clientes/', payload)
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data.get('inscricao_estadual') == '123456789'

    # PATCH update
    resp2 = client.patch(f"/api/comercial/clientes/{data['id']}/", {'inscricao_estadual': '987654321'})
    assert resp2.status_code == status.HTTP_200_OK
    assert resp2.json()['inscricao_estadual'] == '987654321'
