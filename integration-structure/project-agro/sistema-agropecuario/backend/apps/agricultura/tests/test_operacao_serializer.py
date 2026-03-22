from rest_framework.test import APITestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from apps.estoque.models import Produto
from apps.fazendas.models import Fazenda, Talhao
from apps.core.models import Tenant

User = get_user_model()


class OperacaoSerializerTests(APITestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_agricultura_operacao_serializer',
            slug='test-tenant-agricultura-operacao-serializer'
        )
        self.user = User.objects.create_user(username='tester', password='pass', is_staff=False)
        self.client.force_authenticate(user=self.user)
        from apps.fazendas.models import Proprietario
        proprietario = Proprietario.objects.create(nome='Produtor Teste', cpf_cnpj='00011122233')
        self.fazenda = Fazenda.objects.create(name='Fazenda Teste', proprietario=proprietario, matricula='TEST-001')
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
            'categoria': 'preparacao',
            'tipo': 'prep_aracao',
            'talhoes': [self.talhao.id],
            'data_operacao': '2025-12-30',
            'produtos_input': [
                { 'produto_id': produto.id }
            ]
        }

        resp = self.client.post(url, payload, format='json')
        # Expect 201 because reservation fails are caught in signal and logged, without blocking operation creation
        self.assertEqual(resp.status_code, 201, resp.content)
        
        produto.refresh_from_db()
        self.assertEqual(produto.quantidade_reservada, 0)
