from django.urls import reverse
from rest_framework.test import APITestCase
from apps.estoque.models import Produto, LocalArmazenamento, Lote
from apps.fazendas.models import Proprietario, Fazenda
from apps.core.models import CustomUser
from decimal import Decimal


class ProdutoAPITests(APITestCase):
    def setUp(self):
        # user to authenticate requests (perform_create uses request.user)
        self.user = CustomUser.objects.create_user(username='apitest', password='testpass')
        self.client.force_authenticate(self.user)

    def test_create_product_with_tag_category(self):
        url = '/api/estoque/produtos/'
        payload = {
            'codigo': 'ARE0001',
            'nome': 'AREIA GROSSA',
            'categoria': 'construcao',
            'unidade': 'm3',
            'estoque_minimo': 2,
            'quantidade_estoque': 22,
            'custo_unitario': '700.00',
            'vencimento': '2029-01-26',
            'ativo': True
        }

        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, 201, msg=f"Body: {resp.content}")
        data = resp.json()
        self.assertEqual(data['categoria'], 'construcao')
        # confirm stored in DB
        prod = Produto.objects.get(codigo='ARE0001')
        self.assertEqual(prod.categoria, 'construcao')


class LoteLocalArmazenamentoAPITests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(username='loteuser', password='testpass')
        self.client.force_authenticate(self.user)

        # create owner and fazenda required for LocalArmazenamento
        self.proprietario = Proprietario.objects.create(nome='Proprietario Teste', cpf_cnpj='12345678901')
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='Fazenda Teste', matricula='FZ-123')

    def test_create_local_armazenamento_and_lote(self):
        # create local via API
        url_locais = '/api/estoque/locais-armazenamento/'
        local_payload = {
            'nome': 'Silo A',
            'tipo': 'silo',
            'capacidade_maxima': '1000.00',
            'unidade_capacidade': 'kg',
            'fazenda': self.fazenda.id,
            'ativo': True
        }
        resp_local = self.client.post(url_locais, local_payload, format='json')
        self.assertEqual(resp_local.status_code, 201, msg=resp_local.content)
        local_data = resp_local.json()

        # create product
        produto = Produto.objects.create(codigo='LOT001', nome='Produto Lote', unidade='kg', criado_por=self.user)

        # create lote referencing local name in local_armazenamento text field
        url_lotes = '/api/estoque/lotes/'
        lote_payload = {
            'produto': produto.id,
            'numero_lote': 'L-2025-001',
            'data_fabricacao': '2025-01-01',
            'data_validade': '2026-01-01',
            'quantidade_inicial': '100.00',
            'quantidade_atual': '100.00',
            'local_armazenamento': local_data['nome'],
            'observacoes': 'Armazenado no Silo A'
        }

        resp_lote = self.client.post(url_lotes, lote_payload, format='json')
        self.assertEqual(resp_lote.status_code, 201, msg=resp_lote.content)
        lote_data = resp_lote.json()
        self.assertEqual(lote_data['local_armazenamento'], 'Silo A')
        # ensure the lote exists in DB
        lote_obj = Lote.objects.get(numero_lote='L-2025-001')
        self.assertEqual(str(lote_obj.local_armazenamento), 'Silo A')

    def test_create_lote_with_local_id(self):
        # create a local first
        local = LocalArmazenamento.objects.create(nome='Silo B', tipo='silo', capacidade_maxima=500, unidade_capacidade='kg', fazenda=self.fazenda, ativo=True)
        produto = Produto.objects.create(codigo='LOT002', nome='Produto Lote 2', unidade='kg', criado_por=self.user)

        url_lotes = '/api/estoque/lotes/'
        lote_payload = {
            'produto': produto.id,
            'numero_lote': 'L-2025-002',
            'data_fabricacao': '2025-02-01',
            'data_validade': '2026-02-01',
            'quantidade_inicial': '50.00',
            'quantidade_atual': '50.00',
            'local_armazenamento_id': local.id,
            'observacoes': 'Armazenado no Silo B'
        }

        resp = self.client.post(url_lotes, lote_payload, format='json')
        self.assertEqual(resp.status_code, 201, msg=resp.content)
        data = resp.json()
        self.assertEqual(data['local_armazenamento'], 'Silo B')
        # read-only id field should be present and equal
        self.assertEqual(data.get('local_armazenamento_id_read'), local.id)

    def test_create_lote_with_invalid_local_id(self):
        produto = Produto.objects.create(codigo='LOT003', nome='Produto Lote 3', unidade='kg', criado_por=self.user)
        url_lotes = '/api/estoque/lotes/'
        lote_payload = {
            'produto': produto.id,
            'numero_lote': 'L-2025-003',
            'quantidade_inicial': '10.00',
            'quantidade_atual': '10.00',
            'local_armazenamento_id': 999999,
        }
        resp = self.client.post(url_lotes, lote_payload, format='json')
        self.assertEqual(resp.status_code, 400)
        data = resp.json()
        self.assertIn('local_armazenamento_id', data)
