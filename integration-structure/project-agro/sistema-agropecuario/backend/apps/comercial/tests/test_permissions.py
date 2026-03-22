import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.comercial.models import Empresa, DespesaPrestadora
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()
pytestmark = pytest.mark.django_db


def create_despesa(empresa, categoria, valor, data='2026-01-05'):
    return DespesaPrestadora.objects.create(empresa=empresa, data=data, categoria=categoria, valor=Decimal(valor))


def test_unauthenticated_cannot_access_agregados():
    client = APIClient()

    e = Empresa.objects.create(nome='Emp X', cnpj='999')
    create_despesa(e, 'servico', '100.00')

    url = reverse('empresa-agregados', kwargs={'pk': e.id})
    resp = client.get(url)
    assert resp.status_code == 401

    csv_url = url.rstrip('/') + '/csv/'
    csv_resp = client.get(csv_url)
    assert csv_resp.status_code == 401

    global_url = reverse('agregados')
    resp2 = client.get(global_url)
    assert resp2.status_code == 401


def test_non_staff_cannot_access_global_csv():
    client = APIClient()
    user = User.objects.create_user(username='regular', password='pass', is_staff=False)
    from apps.core.models import Tenant
    tenant, _ = Tenant.objects.get_or_create(nome='Test Tenant ' + str(hash(user.username) % 10000), defaults={'slug': 'test' + str(hash(user.username) % 10000)})
    user.tenant = tenant
    user.save()
    client.force_authenticate(user=user)

    e1 = Empresa.objects.create(nome='E1', cnpj='1')
    create_despesa(e1, 'servico', '100.00')

    url = reverse('agregados')
    csv_url = url.rstrip('/') + '/csv/'
    resp = client.get(csv_url + '?periodo=2026-01')
    assert resp.status_code == 403


def test_staff_can_access_global_csv():
    client = APIClient()
    staff = User.objects.create_user(username='staff', password='pass', is_staff=True)
    from apps.core.models import Tenant
    tenant, _ = Tenant.objects.get_or_create(nome='Test Tenant ' + str(hash(user.username) % 10000), defaults={'slug': 'test' + str(hash(user.username) % 10000)})
    user.tenant = tenant
    user.save()
    client.force_authenticate(user=staff)

    e1 = Empresa.objects.create(nome='E1', cnpj='1')
    e2 = Empresa.objects.create(nome='E2', cnpj='2')
    create_despesa(e1, 'servico', '100.00')
    create_despesa(e2, 'material', '50.00')

    url = reverse('agregados')
    csv_url = url.rstrip('/') + '/csv/'
    resp = client.get(csv_url + '?periodo=2026-01')
    assert resp.status_code == 200
    assert 'text/csv' in resp['Content-Type']
    s = resp.content.decode()
    assert 'E1' in s and 'E2' in s


def test_authenticated_can_access_empresa_agregados_and_csv():
    client = APIClient()
    user = User.objects.create_user(username='u1', password='pass', is_staff=False)
    from apps.core.models import Tenant
    tenant, _ = Tenant.objects.get_or_create(nome='Test Tenant ' + str(hash(user.username) % 10000), defaults={'slug': 'test' + str(hash(user.username) % 10000)})
    user.tenant = tenant
    user.save()
    client.force_authenticate(user=user)

    e = Empresa.objects.create(nome='Emp Y', cnpj='222')
    create_despesa(e, 'material', '10.00')

    url = reverse('empresa-agregados', kwargs={'pk': e.id})
    resp = client.get(url + '?periodo=2026-01')
    assert resp.status_code == 200
    j = resp.json()
    assert j['empresa']['nome'] == 'Emp Y'

    csv_url = url.rstrip('/') + '/csv/'
    csv_resp = client.get(csv_url + '?periodo=2026-01')
    assert csv_resp.status_code == 200
    assert 'text/csv' in csv_resp['Content-Type']
    content = csv_resp.content.decode()
    assert 'material' in content


def test_fornecedores_dashboard_requires_admin():
    client = APIClient()
    # normal user should be forbidden from global fornecedores dashboard
    user = User.objects.create_user(username='normal2', is_staff=False)
    from apps.core.models import Tenant
    tenant, _ = Tenant.objects.get_or_create(nome='Test Tenant ' + str(hash(user.username) % 10000), defaults={'slug': 'test' + str(hash(user.username) % 10000)})
    user.tenant = tenant
    user.save()
    client.force_authenticate(user=user)
    resp = client.get('/api/comercial/fornecedores/dashboard/')
    assert resp.status_code in (403, 404)

    # admin user can access
    admin = User.objects.create_user(username='admin2', is_staff=True)
    from apps.core.models import Tenant
    tenant, _ = Tenant.objects.get_or_create(nome='Test Tenant ' + str(hash(user.username) % 10000), defaults={'slug': 'test' + str(hash(user.username) % 10000)})
    user.tenant = tenant
    user.save()
    client.force_authenticate(user=admin)
    resp = client.get('/api/comercial/fornecedores/dashboard/')
    assert resp.status_code == 200
    data = resp.json()
    assert 'total_fornecedores' in data
