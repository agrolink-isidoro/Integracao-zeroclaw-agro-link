import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

pytestmark = pytest.mark.django_db
User = get_user_model()
BASE = '/api/administrativo/folha-pagamento/'


@pytest.fixture
def user_with_tenant():
    """User autenticado com tenant para testes (resolve 403)"""
    from apps.core.models import Tenant
    from apps.fazendas.models import Proprietario, Fazenda
    
    # 1. Criar tenant
    tenant, _ = Tenant.objects.get_or_create(
        nome="test_tenant_administrativo",
        defaults={"slug": "test-tenant-administrativo"}
    )
    
    # 2. Criar proprietario
    proprietario, _ = Proprietario.objects.get_or_create(
        tenant=tenant,
        nome="Test Owner",
        cpf_cnpj="00000000000",
        defaults={"email": "owner@test.local", "telefone": "11999999999"}
    )
    
    # 3. Criar fazenda
    fazenda, _ = Fazenda.objects.get_or_create(
        tenant=tenant,
        nome="Test Farm",
        proprietario=proprietario,
        defaults={
            "localizacao": "POINT(-48.123 -15.456)",
            "area_total": 100.0,
        }
    )
    
    # 4. Criar user com tenant
    user = User.objects.create_user(username='u2', password='p', tenant=tenant)
    
    # 5. Criar client autenticado
    client = APIClient()
    client.force_authenticate(user=user)
    
    return client, tenant, user


def test_create_preview_and_run_folha(user_with_tenant):
    client, tenant, user = user_with_tenant
    # create two funcionarios
    f1 = client.post('/api/administrativo/funcionarios/', {'nome': 'F1', 'salario_bruto': '1000.00'}, format='json')
    f2 = client.post('/api/administrativo/funcionarios/', {'nome': 'F2', 'salario_bruto': '1500.00'}, format='json')
    assert f1.status_code == 201

    res = client.post(BASE, {'periodo_mes': 1, 'periodo_ano': 2026, 'funcionarios_ids': [f1.json()['id'], f2.json()['id']]}, format='json')
    assert res.status_code == 201
    data = res.json()
    assert 'itens' in data
    assert float(data['valor_total']) > 0

    # preview with 10 extra hours (normal days) and 2 holidays
    res2 = client.post(BASE, {'periodo_mes': 1, 'periodo_ano': 2026, 'hora_extra_hours': '10', 'hora_extra_type': 'normal', 'holidays_count': 2, 'funcionarios_ids': [f1.json()['id']]}, format='json')
    assert res2.status_code == 201
    d2 = res2.json()
    assert len(d2['itens']) == 1
    it = d2['itens'][0]
    # salary 1000 -> hourly_rate = 1000/220 ~ 4.54545
    # base_hours_pay = ~45.45; premium = 50% -> ~22.727; total_extra ~= 68.18
    assert float(it['hora_extra_hours']) == 10.0
    assert float(it['hora_extra']) > 60
    assert float(it['dsr']) > 0
    # verify INSS and IR keys exist and are numeric-convertible
    assert 'inss' in it and float(it['inss']) >= 0
    assert 'ir' in it and float(it['ir']) >= 0

    # preview with multiple overtime entries (4 normal + 6 sunday) and DSR
    res_multi = client.post(BASE, {'periodo_mes': 1, 'periodo_ano': 2026, 'per_employee_horas': [{'id': f1.json()['id'], 'entries': [{'hours': '4', 'type': 'normal'}, {'hours': '6', 'type': 'sunday'}], 'include_dsr': True}], 'holidays_count': 2}, format='json')
    assert res_multi.status_code == 201
    dm = res_multi.json()
    # find item for f1
    items = [i for i in dm['itens'] if i['funcionario']['id'] == f1.json()['id']]
    assert len(items) == 1
    itm = items[0]
    assert float(itm['hora_extra_hours']) == 10.0
    assert float(itm['hora_extra']) > 60
    assert float(itm['dsr']) > 0
    assert 'hora_extra_entries' in itm and isinstance(itm['hora_extra_entries'], list)

    # preview with diária on domingo: 9 hours as sunday-type entries
    res_diaria_dom = client.post(BASE, {'periodo_mes': 1, 'periodo_ano': 2026, 'per_employee_horas': [{'id': f1.json()['id'], 'entries': [{'hours': '9', 'kind': 'diaria', 'day_type': 'domingo'}], 'include_dsr': True}], 'holidays_count': 2}, format='json')
    assert res_diaria_dom.status_code == 201
    dd = res_diaria_dom.json()
    itm2 = [i for i in dd['itens'] if i['funcionario']['id'] == f1.json()['id']][0]
    assert float(itm2['hora_extra_hours']) == 9.0
    assert float(itm2['hora_extra']) > 0
    assert float(itm2['dsr']) > 0
    assert any(e['type'] == 'sunday' and abs(e['hours'] - 9.0) < 0.001 for e in itm2['hora_extra_entries'])

    # preview with diária on weekday >9h: only overflow counts as normal extra
    res_diaria_wd = client.post(BASE, {'periodo_mes': 1, 'periodo_ano': 2026, 'per_employee_horas': [{'id': f1.json()['id'], 'entries': [{'hours': '11', 'kind': 'diaria', 'day_type': 'weekday'}], 'include_dsr': False}], 'holidays_count': 0}, format='json')
    assert res_diaria_wd.status_code == 201
    dw = res_diaria_wd.json()
    itm3 = [i for i in dw['itens'] if i['funcionario']['id'] == f1.json()['id']][0]
    # overflow 2h
    assert abs(float(itm3['hora_extra_hours']) - 2.0) < 0.001
    assert any(e['type'] == 'normal' and abs(e['hours'] - 2.0) < 0.001 for e in itm3['hora_extra_entries'])

    # preview with an 'outro' desconto applied
    res3 = client.post(BASE, {'periodo_mes': 1, 'periodo_ano': 2026, 'outros_descontos': [{'label': 'Vale', 'amount': '5.50'}], 'funcionarios_ids': [f1.json()['id']]}, format='json')
    assert res3.status_code == 201
    d3 = res3.json()
    it3 = d3['itens'][0]
    assert float(it3['descontos_outro']) == 5.5


def test_temporario_uses_diaria_and_no_taxes_or_overtime(user_with_tenant):
    client, tenant, user = user_with_tenant
    # create a temporario with daily wage
    f = client.post('/api/administrativo/funcionarios/', {'nome': 'Temp1', 'tipo': 'temporario', 'diaria_valor': '100.00'}, format='json')
    assert f.status_code == 201

    # preview specifying dias_trabalhados
    res = client.post(BASE, {'periodo_mes': 1, 'periodo_ano': 2026, 'per_employee_horas': [{'id': f.json()['id'], 'dias_trabalhados': 5, 'entries': [{'hours': '10', 'type': 'normal'}]}]}, format='json')
    assert res.status_code == 201
    data = res.json()
    items = [i for i in data['itens'] if i['funcionario']['id'] == f.json()['id']]
    assert len(items) == 1
    it = items[0]
    # salary should be diaria * days = 100 * 5 = 500
    assert float(it['salario_bruto']) == 500.0
    # temporario shouldn't have INSS/IR/DSR or overtime applied
    assert float(it['inss']) == 0.0
    assert float(it['ir']) == 0.0
    assert float(it['dsr']) == 0.0
    assert float(it['hora_extra']) == 0.0
    assert float(it['hora_extra_hours']) == 0.0
    # descontos_outro may still apply (not provided here)

    # run
    run = client.post(f"{BASE}{data['id']}/run/", format='json')
    assert run.status_code == 200
    assert run.json().get('status') == 'executed'

    # fetch and check executed flag
    get = client.get(f"{BASE}{data['id']}/")
    assert get.status_code == 200
    assert get.json().get('executado') is True


def test_temporario_requires_diaria(user_with_tenant):
    client, tenant, user = user_with_tenant
    # attempt to create temporario without diaria_valor should fail
    res = client.post('/api/administrativo/funcionarios/', {'nome': 'TempFail', 'tipo': 'temporario'}, format='json')
    assert res.status_code == 400
    assert 'diaria_valor' in res.json()


def test_per_employee_overrides_are_used(user_with_tenant):
    client, tenant, user = user_with_tenant
    f1 = client.post('/api/administrativo/funcionarios/', {'nome': 'F3', 'salario_bruto': '2000.00'}, format='json')
    assert f1.status_code == 201

    # get a preview with an override for inss and ir
    res = client.post(BASE, {'periodo_mes': 1, 'periodo_ano': 2026, 'funcionarios_ids': [f1.json()['id']], 'per_employee_overrides': [{'id': f1.json()['id'], 'inss': '10.00', 'ir': '5.00'}]}, format='json')
    assert res.status_code == 201
    data = res.json()
    it = data['itens'][0]
    # overrides should be applied in the preview
    assert float(it['inss']) == 10.0
    assert float(it['ir']) == 5.0
    assert it.get('overrides') is not None

    # execute with overrides and check persisted values on the created folha items
    run = client.post(f"{BASE}{data['id']}/run/", {'per_employee_overrides': [{'id': f1.json()['id'], 'inss': '7.00', 'ir': '3.00'}]}, format='json')
    assert run.status_code == 200
    # fetch created folha and its items
    get = client.get(f"{BASE}{data['id']}/")
    assert get.status_code == 200
    itens = get.json().get('itens', [])
    assert len(itens) == 1
    persisted = itens[0]
    assert float(persisted['inss']) == 7.0
    assert float(persisted['ir']) == 3.0


def test_summary_endpoint_returns_aggregates(user_with_tenant):
    client, tenant, user = user_with_tenant
    # create two funcionarios
    f1 = client.post('/api/administrativo/funcionarios/', {'nome': 'S1', 'salario_bruto': '2000.00'}, format='json')
    f2 = client.post('/api/administrativo/funcionarios/', {'nome': 'S2', 'salario_bruto': '3000.00'}, format='json')
    assert f1.status_code == 201

    # create a preview for a specific month/year and run it
    periodo_mes = 3
    periodo_ano = 2026
    res = client.post(BASE, {'periodo_mes': periodo_mes, 'periodo_ano': periodo_ano, 'hora_extra_hours': '10', 'hora_extra_type': 'normal', 'funcionarios_ids': [f1.json()['id'], f2.json()['id']]}, format='json')
    assert res.status_code == 201
    folha = res.json()

    run = client.post(f"{BASE}{folha['id']}/run/", format='json')
    assert run.status_code == 200

    # call the summary endpoint for that month/year
    s = client.get(f"{BASE}summary/?month={periodo_mes}&year={periodo_ano}")
    assert s.status_code == 200
    data = s.json()
    assert 'total_horas_extra_cost' in data and float(data['total_horas_extra_cost']) > 0
    assert 'total_inss' in data and float(data['total_inss']) >= 0
    assert 'total_folha' in data

    # total_folha should match the created folha valor_total
    assert float(data['total_folha']) == pytest.approx(float(folha['valor_total']), rel=1e-6)

    # total_inss should equal sum of persisted item.inss values
    get_f = client.get(f"{BASE}{folha['id']}/")
    assert get_f.status_code == 200
    itens = get_f.json().get('itens', [])
    expected_inss_sum = sum([float(itm['inss']) for itm in itens])
    assert float(data['total_inss']) == pytest.approx(expected_inss_sum, rel=1e-6)


def test_run_creates_vencimentos_and_aggregate_despesa(user_with_tenant):
    """When a folha is executed it should create Vencimento entries for each item
    and an aggregate DespesaAdministrativa (centro 'ADM' if present) for reporting/rateio.
    """
    client, tenant, user = user_with_tenant
    f1 = client.post('/api/administrativo/funcionarios/', {'nome': 'V1', 'salario_bruto': '1200.00'}, format='json')
    assert f1.status_code == 201

    res = client.post(BASE, {'periodo_mes': 4, 'periodo_ano': 2026, 'funcionarios_ids': [f1.json()['id']]}, format='json')
    assert res.status_code == 201
    folha = res.json()

    run = client.post(f"{BASE}{folha['id']}/run/", format='json')
    assert run.status_code == 200

    # fetch persisted folha and its items (items include persisted item.id)
    get_f = client.get(f"{BASE}{folha['id']}/")
    assert get_f.status_code == 200
    itens = get_f.json().get('itens', [])
    assert len(itens) == 1
    item = itens[0]

    # verify a Vencimento exists linked to the FolhaPagamentoItem
    from django.contrib.contenttypes.models import ContentType
    from apps.financeiro.models import Vencimento
    from apps.administrativo.models import FolhaPagamentoItem, DespesaAdministrativa

    ct = ContentType.objects.get_for_model(FolhaPagamentoItem)
    venc = Vencimento.objects.filter(content_type=ct, object_id=item['id']).first()
    assert venc is not None
    assert float(venc.valor) == pytest.approx(float(item['liquido']), rel=1e-6)

    # verify an aggregate DespesaAdministrativa was created with the folha total
    desp = DespesaAdministrativa.objects.filter(valor=folha['valor_total']).first()
    assert desp is not None
    assert desp.pendente_rateio is True
