from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
import pytest
from apps.administrativo.models import Notificacao
from apps.fazendas.models import Tenant

User = get_user_model()

@pytest.mark.django_db
def test_nao_lidas_and_marcar_todas_lidas_endpoints(user_with_tenant):
    user, tenant = user_with_tenant
    
    # Create another user in same tenant for isolation test
    other = User.objects.create_user(username='other', password='pass', tenant=tenant)

    # create notifications
    Notificacao.objects.create(titulo='One', mensagem='First', usuario=user, lida=False)
    Notificacao.objects.create(titulo='Two', mensagem='Second', usuario=user, lida=False)
    Notificacao.objects.create(titulo='Other', mensagem='Other user', usuario=other, lida=False)

    client = APIClient()
    client.force_authenticate(user=user)

    # test nao_lidas
    resp = client.get('/api/administrativo/notificacoes/nao_lidas/')
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 2
    titles = {d['titulo'] for d in data}
    assert titles == {'One', 'Two'}

    # test marcar_todas_lidas
    resp2 = client.post('/api/administrativo/notificacoes/marcar_todas_lidas/')
    assert resp2.status_code == status.HTTP_200_OK
    assert resp2.json().get('updated') == 2

    # subsequent nao_lidas should be empty
    resp3 = client.get('/api/administrativo/notificacoes/nao_lidas/')
    assert resp3.status_code == status.HTTP_200_OK
    assert resp3.json() == []
