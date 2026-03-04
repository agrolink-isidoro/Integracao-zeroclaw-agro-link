from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
import pytest

User = get_user_model()

@pytest.mark.django_db
def test_create_and_list_cliente():
    user = User.objects.create_user(username='cuser2', password='pass')
    client = APIClient()
    client.force_authenticate(user=user)

    payload = {
        'nome': 'Cliente Teste',
        'tipo_pessoa': 'PJ',
        'cpf_cnpj': '12345678000199',
    }

    resp = client.post('/api/comercial/clientes/', payload)
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data['nome'] == 'Cliente Teste'

    # list
    resp2 = client.get('/api/comercial/clientes/')
    assert resp2.status_code == status.HTTP_200_OK
    assert any(c['nome'] == 'Cliente Teste' for c in resp2.json())
