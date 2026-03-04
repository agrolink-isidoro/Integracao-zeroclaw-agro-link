from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
import pytest

User = get_user_model()

@pytest.mark.django_db
def test_agregados_requires_authentication():
    client = APIClient()
    resp = client.get('/api/comercial/agregados/')
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

@pytest.mark.django_db
def test_agregados_forbidden_for_normal_user():
    user = User.objects.create_user(username='normal', password='pass')
    client = APIClient()
    client.force_authenticate(user=user)
    resp = client.get('/api/comercial/agregados/')
    # endpoint requires IsComercialAdmin so normal user should be forbidden
    assert resp.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.django_db
def test_agregados_allowed_for_staff_user():
    user = User.objects.create_user(username='staff', password='pass', is_staff=True)
    client = APIClient()
    client.force_authenticate(user=user)
    resp = client.get('/api/comercial/agregados/')
    assert resp.status_code == status.HTTP_200_OK

@pytest.mark.django_db
def test_agregados_csv_allowed_for_staff_user():
    user = User.objects.create_user(username='staff2', password='pass', is_staff=True)
    client = APIClient()
    client.force_authenticate(user=user)
    resp = client.get('/api/comercial/agregados/?format=csv')
    assert resp.status_code == status.HTTP_200_OK
    assert 'text/csv' in resp['Content-Type']
