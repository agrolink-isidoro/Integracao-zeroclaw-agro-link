import pytest
from rest_framework.test import APIClient

from apps.fazendas.models import Fazenda, Proprietario


@pytest.mark.django_db
def test_list_and_create_fazenda():
    # Criar um proprietário primeiro
    proprietario = Proprietario.objects.create(
        nome="João Silva",
        cpf_cnpj="12345678901"
    )
    
    Fazenda.objects.create(
        name="Fazenda A", 
        matricula="M-123",
        proprietario=proprietario
    )
    client = APIClient()
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user, _ = User.objects.get_or_create(username='testuser_view', defaults={'password':'pw'})
    client.force_authenticate(user=user)

    from django.contrib.auth import get_user_model
    User = get_user_model()
    user, _ = User.objects.get_or_create(username='testuser_view', defaults={'password':'pw'})
    client.force_authenticate(user=user)


    # list
    resp = client.get("/api/fazendas/")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(f.get("matricula") == "M-123" for f in data)

    # create (requires auth)
    from django.contrib.auth import get_user_model

    User = get_user_model()
    u = User.objects.create_superuser(username="adm", email="a@b.com", password="pass")
    client.force_authenticate(u)
    resp = client.post(
        "/api/fazendas/", 
        {
            "name": "Fazenda B", 
            "matricula": "M-456",
            "proprietario": proprietario.id
        }, 
        format="json"
    )
    assert resp.status_code == 201
    assert resp.json().get("matricula") == "M-456"
