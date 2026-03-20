from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.fazendas.models import Fazenda, Area, Talhao
from apps.agricultura.models import Plantio, Cultura, HarvestSession
from apps.core.models import Tenant

User = get_user_model()


class HarvestToStockIntegrationTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_agricultura_harvest_stock',
            slug='test-tenant-agricultura-harvest-stock'
        )
        self.user = User.objects.create_user(username='tester', tenant=self.tenant)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        from apps.fazendas.models import Proprietario
        self.proprietario = Proprietario.objects.create(nome='Produtor Test', cpf_cnpj='000000000', tenant=self.tenant)
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='F', matricula='M1', tenant=self.tenant)
        self.cultura = Cultura.objects.create(nome='Soja', tenant=self.tenant)
        self.plantio = Plantio.objects.create(fazenda=self.fazenda, cultura=self.cultura, data_plantio='2025-01-01', tenant=self.tenant)
        self.area = Area.objects.create(proprietario=self.proprietario, fazenda=self.fazenda, name='Area', tenant=self.tenant)
        self.talhao1 = Talhao.objects.create(area=self.area, name='T1', area_size=10, tenant=self.tenant)
        self.talhao2 = Talhao.objects.create(area=self.area, name='T2', area_size=5, tenant=self.tenant)
        self.plantio.talhoes.add(self.talhao1, self.talhao2)

        # create product and local
        from apps.estoque.models import Produto, LocalArmazenamento
        Produto.objects.create(codigo='SOJA-1', nome='Soja Produto', unidade='kg', quantidade_estoque=0)
        self.local = LocalArmazenamento.objects.create(nome='Silo A', fazenda=self.fazenda)

    def test_full_flow_session_to_reconciled_stock(self):
        # create session with two items
        url = '/api/agricultura/harvest-sessions/'
        payload = {
            'plantio': self.plantio.id,
            'data_inicio': '2025-12-01',
            'itens': [
                {'talhao': self.talhao1.id, 'quantidade_colhida': '1000'},
                {'talhao': self.talhao2.id, 'quantidade_colhida': '500'},
            ]
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        session_id = resp.json()['id']
        session = HarvestSession.objects.get(id=session_id)
        self.assertEqual(session.itens.count(), 2)

        # create movimentos for each item
        mv_url = '/api/agricultura/movimentacoes-carga/'
        movements = []
        for item in session.itens.all():
            mv_payload = {
                'session_item': item.id,
                'talhao': item.talhao.id,
                'transporte': {'placa': f'PL-{item.id}', 'tara': '1000', 'peso_bruto': '1500', 'descontos': '0'},
                'destino_tipo': 'armazenagem_interna',
            }
            mv_resp = self.client.post(mv_url, mv_payload, format='json')
            self.assertEqual(mv_resp.status_code, 201, mv_resp.content)
            movements.append(mv_resp.json())

        # reconcile each movement
        from apps.estoque.models import MovimentacaoEstoque
        for m in movements:
            rec_url = f"/api/agricultura/movimentacoes-carga/{m['id']}/reconcile/"
            rec_resp = self.client.post(rec_url, {}, format='json')
            self.assertEqual(rec_resp.status_code, 200, rec_resp.content)
            rec_data = rec_resp.json()
            self.assertEqual(rec_data.get('status'), 'reconciled')
            me = MovimentacaoEstoque.objects.get(id=rec_data.get('movimentacao_estoque'))
            self.assertIsNotNone(me)

        # session should be finalized
        session.refresh_from_db()
        self.assertEqual(session.status, 'finalizada')
