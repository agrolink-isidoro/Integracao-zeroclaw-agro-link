from rest_framework.test import APITestCase, APIClient
from apps.estoque.models import Produto, MovimentacaoEstoque
from apps.maquinas.models import CategoriaEquipamento, Equipamento
from apps.fazendas.models import Proprietario, Fazenda
from apps.core.models import CustomUser
from decimal import Decimal

class ProdutoUltimoPrecoTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create(username='u1')
        self.prop = Proprietario.objects.create(nome='P', cpf_cnpj='123')
        self.faz = Fazenda.objects.create(proprietario=self.prop, name='F', matricula='M1')
        self.prod = Produto.objects.create(codigo='P1', nome='Diesel', unidade='L', quantidade_estoque=Decimal('100'))
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_ultimo_preco_none_when_no_entries(self):
        res = self.client.get('/api/estoque/produto-ultimo-preco/?produto_id=%s' % self.prod.pk)
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.json().get('valor_unitario'))

    def test_ultimo_preco_returns_last_entry(self):
        MovimentacaoEstoque.objects.create(produto=self.prod, tipo='entrada', quantidade=10, valor_unitario=Decimal('4.25'))
        MovimentacaoEstoque.objects.create(produto=self.prod, tipo='entrada', quantidade=20, valor_unitario=Decimal('4.5'))
        res = self.client.get('/api/estoque/produto-ultimo-preco/?produto_id=%s' % self.prod.pk)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Decimal(res.json().get('valor_unitario')), Decimal('4.5'))

    def test_search_movimentacoes_by_produto_name(self):
        # cria uma movimentacao de entrada para o produto Diesel e verifica que a busca não gera 500
        MovimentacaoEstoque.objects.create(produto=self.prod, tipo='entrada', quantidade=5, valor_unitario=Decimal('4.75'))
        res = self.client.get('/api/estoque/movimentacoes/?tipo=entrada&search=diesel&ordering=-data_movimentacao&page_size=1')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('results', data)
        self.assertGreaterEqual(len(data['results']), 1)