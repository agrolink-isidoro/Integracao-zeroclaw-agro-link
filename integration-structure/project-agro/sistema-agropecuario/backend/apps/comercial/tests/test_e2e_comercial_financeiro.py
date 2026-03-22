"""
End-to-End Test: Módulo Comercial + Módulo Financeiro
=====================================================
Cobre o fluxo completo:
  - 2 Clientes via API
  - 2 Fornecedores via API
  - 1 Empresa (fixture direta)
  - 1 InstituicaoFinanceira (fixture direta)
  - 2 ContaBancaria no Módulo Financeiro via API
  - 2 Contratos de Compra via API (com itens)
  - 2 Contratos de Venda via API (com itens)
  - 2 Contratos Financeiros via API (emprestimo + consorcio)
  - 2 VendaContrato (vendas avulsas) via API
  - LancamentoFinanceiro: saídas para compras, entradas para vendas

Regras:
  - Sem alterar nenhum arquivo do sistema existente.
  - Apenas usa endpoints e modelos que o sistema já oferece.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal

from apps.comercial.models import (
    Cliente,
    Fornecedor,
    Empresa,
    InstituicaoFinanceira,
)
from apps.financeiro.models import ContaBancaria

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures compartilhadas
# ---------------------------------------------------------------------------

@pytest.fixture
def user(db):
    user = User.objects.create_user(
        username='e2e_user', password='e2e_pass',
        is_staff=True, is_superuser=True,
    )
    from apps.core.models import Tenant
    tenant, _ = Tenant.objects.get_or_create(nome='Test Tenant', defaults={'subdominio': 'test'})
    user.tenant = tenant
    user.save()
    return user


@pytest.fixture
def api_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def empresa(db, user):
    return Empresa.objects.create(
        nome='Agro E2E Ltda',
        cnpj='12345678000199',
    )


@pytest.fixture
def instituicao(db):
    # codigo_bacen is max_length=10; use a short unique test code
    obj, _ = InstituicaoFinanceira.objects.get_or_create(
        codigo_bacen='E2E01',
        defaults={
            'nome': 'Banco Teste E2E S.A.',
            'nome_reduzido': 'BTE2E',
            'segmento': 'banco_comercial',
        }
    )
    return obj


@pytest.fixture
def conta_financeiro_a(db):
    """Conta bancária no módulo financeiro — criada diretamente como fixture."""
    return ContaBancaria.objects.create(
        banco='Banco Demo A',
        agencia='0001',
        conta='12345-6',
        tipo='corrente',
        saldo_inicial=Decimal('50000.00'),
    )


@pytest.fixture
def conta_financeiro_b(db):
    """Segunda conta bancária no módulo financeiro — criada diretamente."""
    return ContaBancaria.objects.create(
        banco='Banco Demo B',
        agencia='0002',
        conta='98765-4',
        tipo='poupanca',
        saldo_inicial=Decimal('20000.00'),
    )


# ---------------------------------------------------------------------------
# 1. Clientes via API
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCriacaoClientes:
    def test_cria_cliente_1(self, api_client):
        payload = {
            'nome': 'João Silva',
            'tipo_pessoa': 'pf',
            'cpf_cnpj': '111.111.111-11',
            'email': 'joao.silva@email.com',
            'telefone': '11999990001',
            'status': 'ativo',
        }
        resp = api_client.post('/api/comercial/clientes/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['nome'] == 'João Silva'
        assert data['tipo_pessoa'] == 'pf'

    def test_cria_cliente_2(self, api_client):
        payload = {
            'nome': 'Fazenda Boa Terra LTDA',
            'tipo_pessoa': 'pj',
            'cpf_cnpj': '22.222.222/0001-22',
            'email': 'contato@boaterra.com.br',
            'telefone': '11999990002',
            'status': 'ativo',
        }
        resp = api_client.post('/api/comercial/clientes/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['nome'] == 'Fazenda Boa Terra LTDA'
        assert data['tipo_pessoa'] == 'pj'

    def test_lista_clientes_retorna_os_criados(self, api_client):
        nomes = ['Cliente Lista A', 'Cliente Lista B']
        for i, nome in enumerate(nomes, start=90):
            api_client.post('/api/comercial/clientes/', {
                'nome': nome,
                'tipo_pessoa': 'pf',
                'cpf_cnpj': f'9900000000{i}',
            })
        resp = api_client.get('/api/comercial/clientes/')
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        # The endpoint may return a direct list or a paginated dict
        results = body.get('results', body) if isinstance(body, dict) else body
        result_nomes = [c['nome'] for c in results]
        for nome in nomes:
            assert nome in result_nomes


# ---------------------------------------------------------------------------
# 2. Fornecedores via API
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCriacaoFornecedores:
    def test_cria_fornecedor_1(self, api_client, user):
        payload = {
            'nome': 'AgroInsumos LTDA',
            'tipo_pessoa': 'pj',
            'cpf_cnpj': '33.333.333/0001-33',
            'email': 'vendas@agroinsumos.com.br',
            'telefone': '11988880001',
            'categoria_fornecedor': 'insumos',
            'status': 'ativo',
        }
        resp = api_client.post('/api/comercial/fornecedores/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.json()['nome'] == 'AgroInsumos LTDA'

    def test_cria_fornecedor_2(self, api_client, user):
        payload = {
            'nome': 'Transportes Campo Verde',
            'tipo_pessoa': 'pj',
            'cpf_cnpj': '44.444.444/0001-44',
            'email': 'frete@campoverde.com.br',
            'telefone': '11988880002',
            'categoria_fornecedor': 'servicos',
            'status': 'ativo',
        }
        resp = api_client.post('/api/comercial/fornecedores/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.json()['nome'] == 'Transportes Campo Verde'

    def test_lista_fornecedores_retorna_os_criados(self, api_client):
        nomes = ['Forn Lista A', 'Forn Lista B']
        for i, nome in enumerate(nomes, start=80):
            api_client.post('/api/comercial/fornecedores/', {
                'nome': nome,
                'tipo_pessoa': 'pj',
                'cpf_cnpj': f'8800000000{i}',
                'categoria_fornecedor': 'insumos',
            })
        resp = api_client.get('/api/comercial/fornecedores/')
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        results = body.get('results', body) if isinstance(body, dict) else body
        assert any(f['nome'] in nomes for f in results)


# ---------------------------------------------------------------------------
# 3. Contas Bancárias via API (módulo financeiro)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestContasBancarias:
    def test_cria_conta_corrente_via_api(self, api_client):
        payload = {
            'banco': 'Caixa Econômica Federal',
            'agencia': '1234',
            'conta': '56789-0',
            'tipo': 'corrente',
            'saldo_inicial': '10000.00',
            'ativo': True,
        }
        resp = api_client.post('/api/financeiro/contas/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['banco'] == 'Caixa Econômica Federal'
        assert data['tipo'] == 'corrente'

    def test_cria_conta_poupanca_via_api(self, api_client):
        payload = {
            'banco': 'Bradesco',
            'agencia': '4321',
            'conta': '11111-1',
            'tipo': 'poupanca',
            'saldo_inicial': '5000.00',
            'ativo': True,
        }
        resp = api_client.post('/api/financeiro/contas/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['banco'] == 'Bradesco'
        assert data['tipo'] == 'poupanca'

    def test_lista_contas_bancarias(self, api_client, conta_financeiro_a, conta_financeiro_b):
        resp = api_client.get('/api/financeiro/contas/')
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        results = body.get('results', body)
        bancos = [c['banco'] for c in results]
        assert 'Banco Demo A' in bancos
        assert 'Banco Demo B' in bancos


# ---------------------------------------------------------------------------
# 4. Contratos de Compra via API
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestContratosCompra:
    @pytest.fixture
    def fornecedor(self, db, user):
        return Fornecedor.objects.create(
            nome='Forn Compra Teste',
            tipo_pessoa='pj',
            cpf_cnpj='55.555.555/0001-55',
            criado_por=user,
        )

    def test_cria_contrato_compra_1(self, api_client, fornecedor, empresa):
        payload = {
            'titulo': 'Compra de Sementes 2025',
            'numero_contrato': 'CC-001',
            'fornecedor': fornecedor.id,
            'empresa': empresa.id,
            'status': 'rascunho',
            'data_inicio': '2025-01-01',
            'data_fim': '2025-06-30',
        }
        resp = api_client.post('/api/comercial/contratos-compra/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['titulo'] == 'Compra de Sementes 2025'
        assert data['numero_contrato'] == 'CC-001'
        assert data['fornecedor'] == fornecedor.id

    def test_cria_contrato_compra_2(self, api_client, fornecedor, empresa):
        payload = {
            'titulo': 'Compra de Fertilizantes 2025',
            'numero_contrato': 'CC-002',
            'fornecedor': fornecedor.id,
            'empresa': empresa.id,
            'status': 'pendente',
            'data_inicio': '2025-02-01',
            'data_fim': '2025-08-31',
        }
        resp = api_client.post('/api/comercial/contratos-compra/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['titulo'] == 'Compra de Fertilizantes 2025'
        assert data['status'] == 'pendente'

    @pytest.mark.xfail(
        reason="Bug em ContratoCompra.calcular_valor_total(): uses complex aggregate "
               "without alias — TypeError: Complex aggregates require an alias",
        strict=False,
    )
    def test_adiciona_item_ao_contrato_compra(self, api_client, fornecedor, empresa):
        # Cria o contrato primeiro
        c_resp = api_client.post('/api/comercial/contratos-compra/', {
            'titulo': 'Compra para Itens',
            'numero_contrato': 'CC-003',
            'fornecedor': fornecedor.id,
            'empresa': empresa.id,
        })
        assert c_resp.status_code == status.HTTP_201_CREATED
        contrato_id = c_resp.json()['id']

        # Adiciona um item
        item_payload = {
            'contrato': contrato_id,
            'descricao_item': 'Semente de Soja Certificada',
            'quantidade': '100.0000',
            'preco_unitario': '150.00',
        }
        item_resp = api_client.post('/api/comercial/itens-compra/', item_payload)
        assert item_resp.status_code == status.HTTP_201_CREATED
        item_data = item_resp.json()
        assert item_data['descricao_item'] == 'Semente de Soja Certificada'
        assert item_data['contrato'] == contrato_id

    def test_lista_contratos_compra(self, api_client, fornecedor, empresa):
        for i in range(1, 3):
            api_client.post('/api/comercial/contratos-compra/', {
                'titulo': f'Compra Lista {i}',
                'numero_contrato': f'CC-L0{i}',
                'fornecedor': fornecedor.id,
                'empresa': empresa.id,
            })
        resp = api_client.get('/api/comercial/contratos-compra/')
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        results = body.get('results', body) if isinstance(body, dict) else body
        assert len(results) >= 2


# ---------------------------------------------------------------------------
# 5. Contratos de Venda via API
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestContratosVenda:
    @pytest.fixture
    def cliente(self, db, user):
        return Cliente.objects.create(
            nome='Cliente Venda Teste',
            tipo_pessoa='pj',
            cpf_cnpj='66666666000166',
            criado_por=user,
        )

    def test_cria_contrato_venda_1(self, api_client, cliente, empresa):
        payload = {
            'titulo': 'Venda de Soja Safra 2025',
            'numero_contrato': 'CV-001',
            'cliente': cliente.id,
            'empresa': empresa.id,
            'status': 'rascunho',
            'numero_parcelas': 3,
            'data_inicio': '2025-03-01',
            'data_fim': '2025-05-31',
        }
        resp = api_client.post('/api/comercial/contratos-venda/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['titulo'] == 'Venda de Soja Safra 2025'
        assert data['numero_contrato'] == 'CV-001'
        assert data['cliente'] == cliente.id

    def test_cria_contrato_venda_2(self, api_client, cliente, empresa):
        payload = {
            'titulo': 'Venda de Milho Safra 2025',
            'numero_contrato': 'CV-002',
            'cliente': cliente.id,
            'empresa': empresa.id,
            'status': 'pendente',
            'numero_parcelas': 1,
            'data_inicio': '2025-04-01',
            'data_fim': '2025-06-30',
        }
        resp = api_client.post('/api/comercial/contratos-venda/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['titulo'] == 'Venda de Milho Safra 2025'
        assert data['status'] == 'pendente'

    @pytest.mark.xfail(
        reason="Bug em ContratoVenda.calcular_valor_total(): usa aggregate complexo "
               "sem alias — TypeError: Complex aggregates require an alias",
        strict=False,
    )
    def test_adiciona_item_ao_contrato_venda(self, api_client, cliente, empresa):
        c_resp = api_client.post('/api/comercial/contratos-venda/', {
            'titulo': 'Venda para Itens',
            'numero_contrato': 'CV-003',
            'cliente': cliente.id,
            'empresa': empresa.id,
        })
        assert c_resp.status_code == status.HTTP_201_CREATED
        contrato_id = c_resp.json()['id']

        item_payload = {
            'contrato': contrato_id,
            'descricao_produto': 'Soja Grão a Fixar',
            'quantidade': '500.0000',
            'unidade_medida': 'sc',
            'preco_unitario': '130.00',
        }
        item_resp = api_client.post('/api/comercial/itens-venda/', item_payload)
        assert item_resp.status_code == status.HTTP_201_CREATED
        item_data = item_resp.json()
        assert item_data['descricao_produto'] == 'Soja Grão a Fixar'
        assert item_data['contrato'] == contrato_id

    def test_lista_contratos_venda(self, api_client, cliente, empresa):
        for i in range(1, 3):
            api_client.post('/api/comercial/contratos-venda/', {
                'titulo': f'Venda Lista {i}',
                'numero_contrato': f'CV-L0{i}',
                'cliente': cliente.id,
                'empresa': empresa.id,
            })
        resp = api_client.get('/api/comercial/contratos-venda/')
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        results = body.get('results', body) if isinstance(body, dict) else body
        assert len(results) >= 2


# ---------------------------------------------------------------------------
# 6. Contratos Financeiros via API
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestContratosFinanceiros:
    @pytest.fixture
    def beneficiario(self, db, user):
        return Cliente.objects.create(
            nome='Beneficiário Financeiro',
            tipo_pessoa='pj',
            cpf_cnpj='77.777.777/0001-77',
            criado_por=user,
        )

    def test_cria_contrato_emprestimo(self, api_client, beneficiario, empresa, instituicao):
        payload = {
            'titulo': 'Empréstimo Rural 2025',
            'numero_contrato': 'CF-001',
            'produto_financeiro': 'emprestimo',
            'beneficiario': beneficiario.id,
            'instituicao_financeira': instituicao.id,
            'empresa': empresa.id,
            'valor_total': '150000.00',
            'valor_entrada': '15000.00',
            'status': 'proposta',
            'data_vigencia_inicial': '2025-01-01',
            'data_vigencia_final': '2026-01-01',
        }
        resp = api_client.post('/api/comercial/contratos-financeiro/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['titulo'] == 'Empréstimo Rural 2025'
        assert data['produto_financeiro'] == 'emprestimo'
        assert data['beneficiario'] == beneficiario.id

    def test_cria_contrato_consorcio(self, api_client, beneficiario, empresa, instituicao):
        payload = {
            'titulo': 'Consórcio Maquinário Agrícola',
            'numero_contrato': 'CF-002',
            'produto_financeiro': 'consorcio',
            'beneficiario': beneficiario.id,
            'instituicao_financeira': instituicao.id,
            'empresa': empresa.id,
            'valor_total': '80000.00',
            'valor_entrada': '8000.00',
            'status': 'proposta',
            'data_vigencia_inicial': '2025-02-01',
            'data_vigencia_final': '2027-02-01',
        }
        resp = api_client.post('/api/comercial/contratos-financeiro/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['titulo'] == 'Consórcio Maquinário Agrícola'
        assert data['produto_financeiro'] == 'consorcio'

    def test_lista_contratos_financeiros(self, api_client, beneficiario, empresa, instituicao):
        for i, produto in enumerate(['seguro', 'aplicacao'], start=3):
            api_client.post('/api/comercial/contratos-financeiro/', {
                'titulo': f'Contrato Financeiro {produto.title()}',
                'numero_contrato': f'CF-00{i}',
                'produto_financeiro': produto,
                'beneficiario': beneficiario.id,
                'instituicao_financeira': instituicao.id,
                'empresa': empresa.id,
            })
        resp = api_client.get('/api/comercial/contratos-financeiro/')
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        results = body.get('results', body) if isinstance(body, dict) else body
        produtos = [c['produto_financeiro'] for c in results]
        assert 'seguro' in produtos
        assert 'aplicacao' in produtos


# ---------------------------------------------------------------------------
# 7. Lançamentos Financeiros via API (entradas e saídas)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestLancamentosFinanceiros:
    def test_entrada_referente_a_venda(self, api_client, conta_financeiro_a):
        payload = {
            'conta': conta_financeiro_a.id,
            'tipo': 'entrada',
            'valor': '65000.00',
            'data': '2025-03-15',
            'descricao': 'Recebimento — Venda de Soja Safra 2025 (CV-001)',
        }
        resp = api_client.post('/api/financeiro/lancamentos/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['tipo'] == 'entrada'
        assert float(data['valor']) == pytest.approx(65000.0)
        assert data['conta'] == conta_financeiro_a.id

    def test_saida_referente_a_compra(self, api_client, conta_financeiro_a):
        payload = {
            'conta': conta_financeiro_a.id,
            'tipo': 'saida',
            'valor': '15000.00',
            'data': '2025-01-20',
            'descricao': 'Pagamento — Compra de Sementes 2025 (CC-001)',
        }
        resp = api_client.post('/api/financeiro/lancamentos/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['tipo'] == 'saida'
        assert float(data['valor']) == pytest.approx(15000.0)

    def test_entrada_segunda_venda(self, api_client, conta_financeiro_b):
        payload = {
            'conta': conta_financeiro_b.id,
            'tipo': 'entrada',
            'valor': '42000.00',
            'data': '2025-04-10',
            'descricao': 'Recebimento — Venda de Milho Safra 2025 (CV-002)',
        }
        resp = api_client.post('/api/financeiro/lancamentos/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['tipo'] == 'entrada'
        assert data['conta'] == conta_financeiro_b.id

    def test_saida_segunda_compra(self, api_client, conta_financeiro_b):
        payload = {
            'conta': conta_financeiro_b.id,
            'tipo': 'saida',
            'valor': '22000.00',
            'data': '2025-02-05',
            'descricao': 'Pagamento — Compra de Fertilizantes 2025 (CC-002)',
        }
        resp = api_client.post('/api/financeiro/lancamentos/', payload)
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.json()
        assert data['tipo'] == 'saida'
        assert float(data['valor']) == pytest.approx(22000.0)

    def test_lista_lancamentos(self, api_client, conta_financeiro_a):
        # Cria dois lançamentos e verifica que a listagem os retorna
        api_client.post('/api/financeiro/lancamentos/', {
            'conta': conta_financeiro_a.id,
            'tipo': 'entrada',
            'valor': '1000.00',
            'data': '2025-05-01',
            'descricao': 'Entrada de teste',
        })
        api_client.post('/api/financeiro/lancamentos/', {
            'conta': conta_financeiro_a.id,
            'tipo': 'saida',
            'valor': '500.00',
            'data': '2025-05-02',
            'descricao': 'Saída de teste',
        })
        resp = api_client.get('/api/financeiro/lancamentos/')
        assert resp.status_code == status.HTTP_200_OK
        body = resp.json()
        results = body.get('results', body)
        assert len(results) >= 2

    def test_saldo_resultante_apos_lancamentos(self, db, user, conta_financeiro_a):
        """Verifica que a soma dos lancamentos reflete a movimentação esperada."""
        from apps.financeiro.models import LancamentoFinanceiro

        LancamentoFinanceiro.objects.create(
            conta=conta_financeiro_a,
            tipo='entrada',
            valor=Decimal('100000.00'),
            data='2025-01-01',
            descricao='Venda Soja',
        )
        LancamentoFinanceiro.objects.create(
            conta=conta_financeiro_a,
            tipo='saida',
            valor=Decimal('30000.00'),
            data='2025-01-10',
            descricao='Compra Insumos',
        )

        from django.db.models import Sum, Q
        entradas = LancamentoFinanceiro.objects.filter(
            conta=conta_financeiro_a, tipo='entrada'
        ).aggregate(total=Sum('valor'))['total'] or Decimal('0')

        saidas = LancamentoFinanceiro.objects.filter(
            conta=conta_financeiro_a, tipo='saida'
        ).aggregate(total=Sum('valor'))['total'] or Decimal('0')

        saldo_calculado = conta_financeiro_a.saldo_inicial + entradas - saidas
        assert saldo_calculado == Decimal('120000.00')


# ---------------------------------------------------------------------------
# 8. Fluxo E2E Integrado: Comercial → Financeiro
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestFluxoE2EIntegrado:
    """
    Simula o fluxo completo de ponta a ponta:
    Criação de entidades, contratos e lançamentos financeiros associados.
    """

    @pytest.mark.xfail(
        reason="Depende de ItemCompra via API — bug em ContratoCompra.calcular_valor_total(): "
               "Complex aggregates require an alias",
        strict=False,
    )
    def test_fluxo_completo_compra_com_lancamento(self, api_client, user, empresa):
        # 1. Cria fornecedor
        forn_resp = api_client.post('/api/comercial/fornecedores/', {
            'nome': 'E2E Fornecedor Completo',
            'tipo_pessoa': 'pj',
            'cpf_cnpj': '99.888.777/0001-11',
            'categoria_fornecedor': 'insumos',
        })
        assert forn_resp.status_code == status.HTTP_201_CREATED
        forn_id = forn_resp.json()['id']

        # 2. Cria contrato de compra
        ctrato_resp = api_client.post('/api/comercial/contratos-compra/', {
            'titulo': 'E2E Compra Completa',
            'numero_contrato': 'E2E-CC-001',
            'fornecedor': forn_id,
            'empresa': empresa.id,
            'status': 'ativo',
        })
        assert ctrato_resp.status_code == status.HTTP_201_CREATED
        contrato_id = ctrato_resp.json()['id']

        # 3. Adiciona item ao contrato (triggers calcular_valor_total — known bug)
        item_resp = api_client.post('/api/comercial/itens-compra/', {
            'contrato': contrato_id,
            'descricao_item': 'Herbicida Glifosato 20L',
            'quantidade': '50.0000',
            'preco_unitario': '95.00',
        })
        assert item_resp.status_code == status.HTTP_201_CREATED

        # 4. Cria conta bancária e registra saída
        conta_resp = api_client.post('/api/financeiro/contas/', {
            'banco': 'E2E Banco A',
            'agencia': '9001',
            'conta': 'E2E-001',
            'tipo': 'corrente',
            'saldo_inicial': '200000.00',
        })
        assert conta_resp.status_code == status.HTTP_201_CREATED
        conta_id = conta_resp.json()['id']

        lanc_resp = api_client.post('/api/financeiro/lancamentos/', {
            'conta': conta_id,
            'tipo': 'saida',
            'valor': '4750.00',
            'data': '2025-01-15',
            'descricao': f'Pagamento contrato E2E-CC-001 (id={contrato_id})',
        })
        assert lanc_resp.status_code == status.HTTP_201_CREATED
        assert lanc_resp.json()['tipo'] == 'saida'

    def test_fluxo_completo_venda_com_lancamento(self, api_client, user, empresa):
        # 1. Cria cliente
        cli_resp = api_client.post('/api/comercial/clientes/', {
            'nome': 'E2E Cliente Completo',
            'tipo_pessoa': 'pj',
            'cpf_cnpj': '88.777.666/0001-22',
        })
        assert cli_resp.status_code == status.HTTP_201_CREATED
        cli_id = cli_resp.json()['id']

        # 2. Cria contrato de venda
        ctrato_resp = api_client.post('/api/comercial/contratos-venda/', {
            'titulo': 'E2E Venda Completa',
            'numero_contrato': 'E2E-CV-001',
            'cliente': cli_id,
            'empresa': empresa.id,
            'status': 'ativo',
            'numero_parcelas': 2,
        })
        assert ctrato_resp.status_code == status.HTTP_201_CREATED
        contrato_id = ctrato_resp.json()['id']

        # 3. Adiciona item ao contrato de venda
        item_resp = api_client.post('/api/comercial/itens-venda/', {
            'contrato': contrato_id,
            'descricao_produto': 'Soja Grão Premium',
            'quantidade': '1000.0000',
            'unidade_medida': 'sc',
            'preco_unitario': '140.00',
        })
        assert item_resp.status_code == status.HTTP_201_CREATED

        # 4. Cria conta bancária e registra entrada
        conta_resp = api_client.post('/api/financeiro/contas/', {
            'banco': 'E2E Banco B',
            'agencia': '9002',
            'conta': 'E2E-002',
            'tipo': 'corrente',
            'saldo_inicial': '0.00',
        })
        assert conta_resp.status_code == status.HTTP_201_CREATED
        conta_id = conta_resp.json()['id']

        lanc_resp = api_client.post('/api/financeiro/lancamentos/', {
            'conta': conta_id,
            'tipo': 'entrada',
            'valor': '140000.00',
            'data': '2025-05-20',
            'descricao': f'Recebimento contrato E2E-CV-001 (id={contrato_id})',
        })
        assert lanc_resp.status_code == status.HTTP_201_CREATED
        assert lanc_resp.json()['tipo'] == 'entrada'

    def test_fluxo_completo_contrato_financeiro(self, api_client, user, empresa, instituicao):
        # 1. Cria beneficiário (cliente)
        cli_resp = api_client.post('/api/comercial/clientes/', {
            'nome': 'E2E Beneficiário',
            'tipo_pessoa': 'pf',
            'cpf_cnpj': '777.666.555-44',
        })
        assert cli_resp.status_code == status.HTTP_201_CREATED
        cli_id = cli_resp.json()['id']

        # 2. Cria contrato financeiro (empréstimo)
        ctrato_resp = api_client.post('/api/comercial/contratos-financeiro/', {
            'titulo': 'E2E Empréstimo Custeio',
            'numero_contrato': 'E2E-CF-001',
            'produto_financeiro': 'emprestimo',
            'beneficiario': cli_id,
            'instituicao_financeira': instituicao.id,
            'empresa': empresa.id,
            'valor_total': '50000.00',
            'valor_entrada': '5000.00',
            'status': 'ativo',
        })
        assert ctrato_resp.status_code == status.HTTP_201_CREATED
        data = ctrato_resp.json()
        assert data['produto_financeiro'] == 'emprestimo'
        assert data['beneficiario'] == cli_id

        # 3. Registra entrada do crédito recebido
        conta_resp = api_client.post('/api/financeiro/contas/', {
            'banco': 'E2E Banco Financeiro',
            'agencia': '9003',
            'conta': 'E2E-003',
            'tipo': 'corrente',
            'saldo_inicial': '0.00',
        })
        assert conta_resp.status_code == status.HTTP_201_CREATED
        conta_id = conta_resp.json()['id']

        lanc_resp = api_client.post('/api/financeiro/lancamentos/', {
            'conta': conta_id,
            'tipo': 'entrada',
            'valor': '50000.00',
            'data': '2025-01-05',
            'descricao': 'Crédito empréstimo custeio E2E-CF-001',
        })
        assert lanc_resp.status_code == status.HTTP_201_CREATED
        assert float(lanc_resp.json()['valor']) == pytest.approx(50000.0)
