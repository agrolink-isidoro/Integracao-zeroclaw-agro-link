import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.comercial.models import Empresa, DespesaPrestadora
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()
pytestmark = pytest.mark.django_db


def create_despesa(empresa, categoria, valor, data='2026-01-05', tenant=None):
    return DespesaPrestadora.objects.create(empresa=empresa, data=data, categoria=categoria, valor=Decimal(valor), tenant=tenant)


def test_empresa_agregados_json_and_csv():
    from apps.core.models import Tenant
    
    # Create tenant and user with tenant
    tenant = Tenant.objects.create(nome="test_tenant", slug="test-tenant")
    
    client = APIClient()
    user = User.objects.create_user(username='tester', password='pass', tenant=tenant)
    client.force_authenticate(user=user)

    emp = Empresa.objects.create(nome='Emp A', cnpj='111')

    create_despesa(emp, 'transporte', '100.00', data='2026-01-05', tenant=tenant)
    create_despesa(emp, 'material', '50.50', data='2026-01-05', tenant=tenant)
    create_despesa(emp, 'transporte', '25.25', data='2026-01-05', tenant=tenant)

    url = reverse('empresa-agregados', kwargs={'pk': emp.id})

    # JSON
    resp = client.get(url, {'periodo': '2026-01'})
    assert resp.status_code == 200
    j = resp.json()
    assert j['periodo'] == '2026-01'
    assert abs(Decimal(j['total']) - Decimal('175.75')) < Decimal('0.01')

    categorias = {c['categoria']: Decimal(str(c['total'])) for c in j['por_categoria']}
    assert categorias['transporte'] == Decimal('125.25')
    assert categorias['material'] == Decimal('50.5')

    # CSV (explicit /csv/ endpoint)
    csv_url = url.rstrip('/') + '/csv/'
    csv_resp = client.get(csv_url + '?periodo=2026-01')
    # debug
    print('CSV RESP (explicit):', csv_resp.status_code)
    assert csv_resp.status_code == 200
    assert 'text/csv' in csv_resp['Content-Type']
    content = csv_resp.content.decode()
    assert 'transporte' in content
    assert 'material' in content
    assert 'TOTAL' in content


def test_global_agregados_pagination():
    from apps.core.models import Tenant
    
    # Create tenant and staff user with tenant
    tenant = Tenant.objects.create(nome="test_tenant2", slug="test-tenant-2")
    
    client = APIClient()
    user = User.objects.create_user(username='tester2', password='pass', is_staff=True, tenant=tenant)
    client.force_authenticate(user=user)

    e1 = Empresa.objects.create(nome='E1', cnpj='1')
    e2 = Empresa.objects.create(nome='E2', cnpj='2')
    for _ in range(3):
        create_despesa(e1, 'servico', '100.00', data='2026-01-05', tenant=tenant)
    for _ in range(2):
        create_despesa(e2, 'material', '50.00', data='2026-01-05', tenant=tenant)

    url = reverse('agregados')
    resp = client.get(url, {'periodo': '2026-01'})
    assert resp.status_code == 200
    data = resp.json()
    # paginated response should include count and results
    assert 'count' in data and 'results' in data
    # ensure both empresas present
    totals = {r['empresa']['nome']: Decimal(str(r['total'])) for r in data['results']}
    assert totals['E1'] == Decimal('300.00')
    assert totals['E2'] == Decimal('100.00')

    # CSV for global (explicit /csv/ endpoint)
    csv_url = url.rstrip('/') + '/csv/'
    csv_resp = client.get(csv_url + '?periodo=2026-01')
    assert csv_resp.status_code == 200
    assert 'text/csv' in csv_resp['Content-Type']
    content = csv_resp.content.decode()
    assert 'E1' in content and 'E2' in content
