import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.comercial.models import CargaViagem, SiloBolsa, Cliente

User = get_user_model()


@pytest.mark.django_db
def test_create_venda_exceeds_carga_weight():
    user = User.objects.create_user(username='seller', password='pass', is_staff=False)
    client = APIClient()
    client.force_authenticate(user=user)

    # create minimal required related objects
    from apps.fazendas.models import Proprietario, Fazenda
    from apps.agricultura.models import Cultura
    proprietario = Proprietario.objects.create(nome='P', cpf_cnpj='00000000000')
    fazenda = Fazenda.objects.create(proprietario=proprietario, name='Faz1', matricula='M1')
    cultura = Cultura.objects.create(nome='Soja', ciclo_dias=120)

    carga = CargaViagem.objects.create(tipo_colheita='colheita_completa', peso_total=100.00, data_colheita='2025-01-01', fazenda=fazenda, cultura=cultura, criado_por=user)
    cliente_obj = Cliente.objects.create(nome='Cliente1', tipo_pessoa='pj', cpf_cnpj='111', criado_por=user)

    payload = {
        'origem_tipo': 'carga_viagem',
        'origem_id': carga.id,
        'data_venda': '2025-01-10',
        'quantidade': '200.00',
        'preco_unitario': '1.50',
        'cliente': cliente_obj.id
    }

    resp = client.post('/api/comercial/vendas-colheita/', payload)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    data = resp.json()
    assert 'quantidade' in data
    assert 'excede' in data['quantidade'][0].lower()


@pytest.mark.django_db
def test_create_venda_success_calculates_total():
    user = User.objects.create_user(username='seller2', password='pass', is_staff=False)
    client = APIClient()
    client.force_authenticate(user=user)

    from apps.fazendas.models import Proprietario, Fazenda
    from apps.agricultura.models import Cultura
    proprietario = Proprietario.objects.create(nome='P2', cpf_cnpj='11111111111')
    fazenda = Fazenda.objects.create(proprietario=proprietario, name='Faz2', matricula='M2')
    cultura = Cultura.objects.create(nome='Milho', ciclo_dias=100)

    carga = CargaViagem.objects.create(tipo_colheita='silo_bolsa', data_colheita='2025-01-01', peso_total=1000.00, fazenda=fazenda, cultura=cultura, criado_por=user)
    silo = SiloBolsa.objects.create(carga_viagem=carga, capacidade_total=1000, estoque_atual=500.00, data_armazenamento='2025-01-01', criado_por=user)
    cliente_obj = Cliente.objects.create(nome='Cliente2', tipo_pessoa='pj', cpf_cnpj='222', criado_por=user)

    payload = {
        'origem_tipo': 'silo_bolsa',
        'origem_id': silo.id,
        'data_venda': '2025-01-10',
        'quantidade': '100.00',
        'preco_unitario': '2.00',
        'cliente': cliente_obj.id
    }

    resp = client.post('/api/comercial/vendas-colheita/', payload)
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert float(data['valor_total']) == pytest.approx(100.00 * 2.00)
    assert data['criado_por'] is not None
