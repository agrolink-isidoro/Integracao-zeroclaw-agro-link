import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.comercial.models import CargaViagem, SiloBolsa, Cliente

User = get_user_model()


@pytest.mark.django_db
def test_product_must_belong_to_local():
    user = User.objects.create_user(username='prodtest', password='pass')
    from apps.core.models import Tenant
    tenant, _ = Tenant.objects.get_or_create(nome='Test Tenant ' + str(hash(user.username) % 10000), defaults={'subdominio': 'test' + str(hash(user.username) % 10000)})
    user.tenant = tenant
    user.save()
    client = APIClient()
    client.force_authenticate(user=user)

    from apps.fazendas.models import Proprietario, Fazenda
    from apps.agricultura.models import Cultura
    from apps.estoque.models import LocalArmazenamento, Produto

    proprietario = Proprietario.objects.create(nome='Pp', cpf_cnpj='12')
    fazenda = Fazenda.objects.create(proprietario=proprietario, name='Fx', matricula='MX')
    cultura = Cultura.objects.create(nome='Soja', ciclo_dias=120)

    local1 = LocalArmazenamento.objects.create(nome='Silo A', tipo='silo', capacidade_maxima=1000, unidade_capacidade='kg', fazenda=fazenda, ativo=True, criado_por=user)
    local2 = LocalArmazenamento.objects.create(nome='Silo B', tipo='silo', capacidade_maxima=1000, unidade_capacidade='kg', fazenda=fazenda, ativo=True, criado_por=user)

    produto_local1 = Produto.objects.create(codigo='P1', nome='Prod1', quantidade_estoque=100, unidade='kg', local_armazenamento=local1, criado_por=user)
    produto_local2 = Produto.objects.create(codigo='P2', nome='Prod2', quantidade_estoque=200, unidade='kg', local_armazenamento=local2, criado_por=user)

    carga = CargaViagem.objects.create(tipo_colheita='colheita_completa', data_colheita='2025-01-01', peso_total=500.00, fazenda=fazenda, cultura=cultura, criado_por=user)
    cliente = Cliente.objects.create(nome='ClientA', tipo_pessoa='pj', cpf_cnpj='777', criado_por=user)

    payload = {
        'origem_tipo': 'carga_viagem',
        'origem_id': carga.id,
        'data_venda': '2025-01-20',
        'quantidade': '10.00',
        'preco_unitario': '3.00',
        'cliente': cliente.id,
        'local_armazenamento': local1.id,
        'produto': produto_local2.id  # product belongs to local2, not local1
    }

    resp = client.post('/api/comercial/vendas-colheita/', payload)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert 'produto' in resp.json()

    # Now test success when product matches local
    payload['produto'] = produto_local1.id
    resp2 = client.post('/api/comercial/vendas-colheita/', payload)
    assert resp2.status_code == status.HTTP_201_CREATED

    # quantity exceeding product stock should fail
    payload['quantidade'] = '9999.00'
    resp3 = client.post('/api/comercial/vendas-colheita/', payload)
    assert resp3.status_code == status.HTTP_400_BAD_REQUEST
    assert 'quantidade' in resp3.json()
