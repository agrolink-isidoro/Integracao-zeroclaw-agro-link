import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.comercial.models import Contrato

User = get_user_model()

@pytest.mark.django_db
def test_create_contrato_with_new_types():
    user = User.objects.create_user(username='ct', password='pass')
    client = APIClient()
    client.force_authenticate(user=user)

    for t in ['venda_futura', 'venda_spot', 'bater']:
        payload = {
            'numero_contrato': f'CTR-{t}',
            'titulo': 'Contrato tipo ' + t,
            'tipo_contrato': t,
            'categoria': 'insumos',
            'status': 'rascunho',
            'valor_total': '100.00',
            'data_inicio': '2025-01-01'
        }
        resp = client.post('/api/comercial/contratos/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.json()['tipo_contrato'] == t
