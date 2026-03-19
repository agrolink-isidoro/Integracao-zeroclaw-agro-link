from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
import pytest
from apps.comercial.models import Compra, Contrato, Fornecedor, Cliente, CargaViagem, SiloBolsa, VendaColheita

User = get_user_model()

@pytest.mark.django_db
def test_create_and_list_contrato():
    user = User.objects.create_user(username='cuser', password='pass')
    client = APIClient()
    client.force_authenticate(user=user)

    payload = {
        'numero_contrato': 'CTR-001',
        'titulo': 'Contrato de teste',
        'tipo_contrato': 'compra',
        'categoria': 'insumos',
        'status': 'rascunho',
        'valor_total': '1234.56',
        'data_inicio': '2025-01-01'
    }

    resp = client.post('/api/comercial/contratos/', payload)
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data['numero_contrato'] == 'CTR-001'

    # list
    resp2 = client.get('/api/comercial/contratos/')
    assert resp2.status_code == status.HTTP_200_OK
    assert any(c['numero_contrato'] == 'CTR-001' for c in resp2.json())

@pytest.mark.django_db
def test_vendas_compras_list_and_create_compra():
    from apps.multi_tenancy.models import Tenant
    
    tenant = Tenant.objects.create(nome='test_tenant_vendas_compras', slug='test-tenant-vendas-compras')
    user = User.objects.create_user(username='u2', password='pass', tenant=tenant)
    fornecedor = Fornecedor.objects.create(nome='F', tipo_pessoa='pj', cpf_cnpj='000', criado_por=user, tenant=tenant)
    client = APIClient()
    client.force_authenticate(user=user)

    # create a compra directly
    Compra.objects.create(fornecedor=fornecedor, data='2025-01-02', valor_total='200.00', criado_por=user, tenant=tenant)

    # create a venda via model (cliente required)
    cliente = Cliente.objects.create(nome='C', tipo_pessoa='pj', cpf_cnpj='111', criado_por=user, tenant=tenant)
    # create a VendaColheita via model (requires valid origem) - skip creation here for simplicity

    resp = client.get('/api/comercial/vendas-compras/')
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    # should contain at least the compra
    assert any(x['tipo_operacao'] == 'compra' and x['entidade_id'] == fornecedor.id for x in data)

    # test create compra through unified endpoint
    payload = {
        'tipo_operacao': 'compra',
        'fornecedor': fornecedor.id,
        'data': '2025-01-10',
        'valor_total': '500.00',
        'descricao': 'Compra via API'
    }

    resp2 = client.post('/api/comercial/vendas-compras/', payload)
    assert resp2.status_code == status.HTTP_201_CREATED
    assert resp2.json().get('fornecedor') == fornecedor.id


@pytest.mark.django_db
def test_create_venda_via_unified_endpoint():
    user = User.objects.create_user(username='uv', password='pass')
    client = APIClient()
    client.force_authenticate(user=user)

    # prepare related objects
    from apps.fazendas.models import Proprietario, Fazenda
    from apps.agricultura.models import Cultura
    proprietario = Proprietario.objects.create(nome='P3', cpf_cnpj='33333333333')
    fazenda = Fazenda.objects.create(proprietario=proprietario, name='Faz3', matricula='M3')
    cultura = Cultura.objects.create(nome='Soja', ciclo_dias=120)

    carga = CargaViagem.objects.create(tipo_colheita='colheita_completa', data_colheita='2025-01-01', peso_total=500.00, fazenda=fazenda, cultura=cultura, criado_por=user)
    cliente = Cliente.objects.create(nome='ClientX', tipo_pessoa='pj', cpf_cnpj='999', criado_por=user)

    payload = {
        'tipo_operacao': 'venda',
        'origem_tipo': 'carga_viagem',
        'origem_id': carga.id,
        'data_venda': '2025-01-20',
        'quantidade': '50.00',
        'preco_unitario': '3.00',
        'cliente': cliente.id
    }

    resp = client.post('/api/comercial/vendas-compras/', payload)
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert float(data['valor_total']) == pytest.approx(50.00 * 3.00)
