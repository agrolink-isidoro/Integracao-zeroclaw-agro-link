from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.fazendas.models import Fazenda, Area, Talhao, Proprietario
from apps.core.models import Tenant
from apps.agricultura.models import Plantio, Cultura

User = get_user_model()


class TenantTestCase(TestCase):
    """Base para testes com multi-tenancy"""
    def setUp(self):
        super().setUp()
        self.tenant, _ = Tenant.objects.get_or_create(
            nome="test_tenant_" + self.__class__.__name__,
            defaults={"slug": f"test-{self.__class__.__name__.lower()}"}
        )
        self.proprietario, _ = Proprietario.objects.get_or_create(
            tenant=self.tenant,
            nome="Test Owner",
            cpf_cnpj="00000000000",
            defaults={"email": "owner@test.local", "telefone": "11999999999"}
        )
        self.user = User.objects.create(
            username=f'user_{self.__class__.__name__}',
            email='user@test.local',
            tenant=self.tenant
        )
        self.fazenda, _ = Fazenda.objects.get_or_create(
            tenant=self.tenant,
            name="Test Farm",
            proprietario=self.proprietario,
            defaults={"descricao": "Fazenda para testes"}
        )
        self.client.force_login(self.user)


class ColheitaConfirmTests(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.cultura = Cultura.objects.create(nome='Soja')
        self.plantio = Plantio.objects.create(fazenda=self.fazenda, cultura=self.cultura, data_plantio='2025-01-01')
        self.area = Area.objects.create(proprietario=self.proprietario, fazenda=self.fazenda, name='Area')
        self.talhao1 = Talhao.objects.create(area=self.area, name='T1', area_size=10)
        self.plantio.talhoes.add(self.talhao1)

        # create product and local
        from apps.estoque.models import Produto, LocalArmazenamento
        Produto.objects.create(codigo='SOJA-1', nome='Soja Produto', unidade='kg', quantidade_estoque=0)
        self.local = LocalArmazenamento.objects.create(nome='Silo A', fazenda=self.fazenda)

        # create a colheita
        url = '/api/agricultura/colheitas/'
        payload = {
            'plantio': self.plantio.id,
            'data_colheita': '2025-12-01',
            'quantidade_colhida': '1200',
            'itens': []
        }
        resp = self.client.post(url, payload, format='json')
        assert resp.status_code == 201, resp.content
        self.colheita_id = resp.json()['id']

    def test_armazenar_colheita_confirma_e_cria_movimentacao(self):
        url = f'/api/agricultura/colheitas/{self.colheita_id}/armazenar_estoque/'
        resp = self.client.post(url, {'local_armazenamento_id': self.local.id, 'lote_numero': 'COL-TESTE'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        data = resp.json()
        # colheita should be updated and marked not estimated
        from apps.agricultura.models import Colheita
        c = Colheita.objects.get(id=self.colheita_id)
        self.assertFalse(c.is_estimada)
        self.assertEqual(c.status, 'armazenada')
        self.assertIsNotNone(c.movimentacao_estoque)
