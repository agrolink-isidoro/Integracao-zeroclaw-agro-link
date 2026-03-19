from django.test import TestCase
from apps.fazendas.models import Fazenda, Talhao, Proprietario, Area
from apps.agricultura.models import Manejo, Cultura
from apps.agricultura.services import calcular_custo_manejo
from django.contrib.auth import get_user_model
from apps.estoque.models import Produto
from apps.multi_tenancy.models import Tenant

User = get_user_model()

class ManejoServiceTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_agricultura_manejo',
            slug='test-tenant-agricultura-manejo'
        )
        self.proprietario = Proprietario.objects.create(nome='Produtor', cpf_cnpj='00000000000', tenant=self.tenant)
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='Fazenda Teste', matricula='M-001', tenant=self.tenant)
        self.area = Area.objects.create(proprietario=self.proprietario, fazenda=self.fazenda, name='A', geom='POINT(0 0)', tenant=self.tenant)
        self.talhao = Talhao.objects.create(area=self.area, name='Talhao 1', area_size=10, tenant=self.tenant)
        self.user = User.objects.create_user(username='u', is_staff=False, tenant=self.tenant)
        self.produto = Produto.objects.create(codigo='P1', nome='Semente X', unidade='kg', custo_unitario=5, tenant=self.tenant)

    def test_calcular_custo_manejo_with_products(self):
        manejo = Manejo.objects.create(tipo='capina', data_manejo='2025-06-01', custo_mao_obra=100, custo_maquinas=50, criado_por=self.user)
        manejo.talhoes.add(self.talhao)
        # create ManejoProduto
        from apps.agricultura.models import ManejoProduto
        mp = ManejoProduto.objects.create(manejo=manejo, produto=self.produto, dosagem=1, unidade_dosagem='kg/ha', quantidade=10, unidade='kg')

        resumo = calcular_custo_manejo(manejo)
        # produto 10 * custo_unitario 5 = 50
        self.assertEqual(resumo['custo_insumos'], 50)
        self.assertEqual(resumo['custo_total'], 200)
