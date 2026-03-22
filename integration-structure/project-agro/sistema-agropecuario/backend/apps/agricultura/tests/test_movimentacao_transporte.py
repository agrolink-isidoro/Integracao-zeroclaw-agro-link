from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.fazendas.models import Fazenda, Area, Talhao
from apps.agricultura.models import Plantio, Cultura, HarvestSession, HarvestSessionItem
from apps.core.models import Tenant

User = get_user_model()


class MovimentacaoTransporteTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_agricultura_movimentacao_transporte',
            slug='test-tenant-agricultura-movimentacao-transporte'
        )
        self.user = User.objects.create_user(username='tester', is_staff=False)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        from apps.fazendas.models import Proprietario
        self.proprietario = Proprietario.objects.create(nome='Produtor Test', cpf_cnpj='000000000')
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='F', matricula='M1')
        self.cultura = Cultura.objects.create(nome='Soja')
        self.plantio = Plantio.objects.create(fazenda=self.fazenda, cultura=self.cultura, data_plantio='2025-01-01')
        self.area = Area.objects.create(proprietario=self.proprietario, fazenda=self.fazenda, name='Area')
        self.talhao1 = Talhao.objects.create(area=self.area, name='T1', area_size=10)
        self.plantio.talhoes.add(self.talhao1)

        # create a product for this cultura so reconcile can create MovimentacaoEstoque
        from apps.estoque.models import Produto
        Produto.objects.create(codigo='SOJA-1', nome='Soja Produto', unidade='kg', quantidade_estoque=0)

        # create a session with one item
        url = '/api/agricultura/harvest-sessions/'
        payload = {
            'plantio': self.plantio.id,
            'data_inicio': '2025-12-01',
            'itens': [
                {'talhao': self.talhao1.id, 'quantidade_colhida': '1000'},
            ]
        }
        resp = self.client.post(url, payload, format='json')
        assert resp.status_code == 201, resp.content
        self.session_id = resp.json()['id']
        self.session_item = HarvestSession.objects.get(id=self.session_id).itens.first()

    def test_create_movimentacao_with_nested_transporte(self):
        mv_url = '/api/agricultura/movimentacoes-carga/'
        mv_payload = {
            'session_item': self.session_item.id,
            'talhao': self.session_item.talhao.id,
            'descontos': '5.5',
            'transporte': {
                'placa': 'XYZ999',
                'motorista': 'Maria',
                'tara': '1000',
                'peso_bruto': '1500',
                'descontos': '5.5',
                'custo_transporte': '120.00'
            },
            'destino_tipo': 'armazenagem_interna'
        }
        mv_resp = self.client.post(mv_url, mv_payload, format='json')
        self.assertEqual(mv_resp.status_code, 201, mv_resp.content)
        data = mv_resp.json()
        # transporte should be created and referenced
        self.assertIn('transporte', data)
        self.assertIsNotNone(data['transporte'])
        # peso_liquido should be peso_bruto - tara - descontos
        expected = 1500 - 1000 - 5.5
        self.assertAlmostEqual(float(data['peso_liquido']), expected, places=3)
        # session item should be carregado
        self.session_item.refresh_from_db()
        self.assertEqual(self.session_item.status, 'carregado')

