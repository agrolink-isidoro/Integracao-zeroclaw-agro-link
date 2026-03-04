from rest_framework.test import APITestCase
from django.urls import reverse
from apps.estoque.models import Produto
from apps.fazendas.models import Fazenda, Talhao
from apps.core.models import CustomUser


class OperacaoSerializerTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)
        from apps.fazendas.models import Proprietario
        proprietario = Proprietario.objects.create(nome='Produtor Teste', cpf_cnpj='00011122233')
        self.fazenda = Fazenda.objects.create(name='Fazenda Teste', proprietario=proprietario)
        from apps.fazendas.models import Area
        self.area = Area.objects.create(name='Area 1', tipo='propria', geom='', fazenda=self.fazenda, proprietario=proprietario)
        self.talhao = Talhao.objects.create(name='T1', area_size=10, area=self.area)

    def test_create_operacao_with_produto_without_dosagem_uses_produto_defaults(self):
        # Create product with dosagem_padrao and unidade_dosagem
        produto = Produto.objects.create(
            codigo='ADUB-1', nome='Adubo Teste', quantidade_estoque=100, unidade='kg',
            dosagem_padrao=2.5, unidade_dosagem='kg/ha'
        )

        url = reverse('agricultura:operacao-list')  # namespaced router name
        payload = {
            'categoria': 'adubacao',
            'tipo': 'adub_cobertura',
            'talhoes': [self.talhao.id],
            'data_operacao': '2025-12-30',
            'produtos_input': [
                { 'produto_id': produto.id }
            ]
        }

        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        data = resp.json()
        # verify nested produto created
        op_id = data['id']
        # fetch detail and inspect produtos_operacao
        detail = self.client.get(f"{url}{op_id}/").json()
        produtos = detail.get('produtos_operacao', [])
        self.assertEqual(len(produtos), 1)
        self.assertEqual(float(produtos[0]['dosagem']), float(produto.dosagem_padrao))
        self.assertEqual(produtos[0]['unidade_dosagem'], produto.unidade_dosagem)

    def test_create_operacao_fails_when_stock_insufficient_returns_structured_error(self):
        # Create product with insufficient stock
        produto = Produto.objects.create(
            codigo='HERB-1', nome='Herbicida Teste', quantidade_estoque=0, unidade='L',
            dosagem_padrao=10, unidade_dosagem='L/ha'
        )

        url = reverse('agricultura:operacao-list')
        payload = {
            'categoria': 'herbicida',
            'tipo': 'prep_herbicida',
            'talhoes': [self.talhao.id],
            'data_operacao': '2025-12-30',
            'produtos_input': [
                { 'produto_id': produto.id }
            ]
        }

        resp = self.client.post(url, payload, format='json')
        # Should be a bad request (400) because reservation fails
        self.assertEqual(resp.status_code, 400, resp.content)
        data = resp.json()
        self.assertIn('produtos_operacao', data)
        # The API should return a structured object with produto and mensagem
        self.assertIsInstance(data['produtos_operacao'], dict)
        self.assertEqual(data['produtos_operacao'].get('produto'), produto.id)
        self.assertIn('mensagem', data['produtos_operacao'])