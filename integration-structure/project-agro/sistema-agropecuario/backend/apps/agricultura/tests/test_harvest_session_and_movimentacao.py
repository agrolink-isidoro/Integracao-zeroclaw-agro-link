from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.fazendas.models import Fazenda, Area, Talhao
from apps.agricultura.models import Plantio, Cultura, HarvestSession, HarvestSessionItem, MovimentacaoCarga
from apps.core.models import Tenant

User = get_user_model()


class HarvestSessionTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_agricultura_harvest_movimentacao',
            slug='test-tenant-agricultura-harvest-movimentacao'
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
        self.talhao2 = Talhao.objects.create(area=self.area, name='T2', area_size=5)
        self.plantio.talhoes.add(self.talhao1)
        self.plantio.talhoes.add(self.talhao2)

    def test_create_session_and_movimentacao_finalize_flow(self):
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
        data = resp.json()
        session = HarvestSession.objects.get(id=data['id'])
        self.assertEqual(session.itens.count(), 2)

        # Create a movimentacao for first item
        item = session.itens.first()
        mv_url = '/api/agricultura/movimentacoes-carga/'
        mv_payload = {
            'session_item': item.id,
            'talhao': item.talhao.id,
            'placa': 'ABC1234',
            'motorista': 'Joao',
            'tara': '1000',
            'peso_bruto': '1500',
            'descontos': '0'
        }
        mv_resp = self.client.post(mv_url, mv_payload, format='json')
        self.assertEqual(mv_resp.status_code, 201, mv_resp.content)
        item.refresh_from_db()
        self.assertEqual(item.status, 'carregado')

        # Session should not be finalized until all items are carregado
        session.refresh_from_db()
        self.assertNotEqual(session.status, 'finalizada')

        # Create movimentacao for second item
        item2 = session.itens.last()
        mv_payload2 = {**mv_payload, 'session_item': item2.id}
        mv_resp2 = self.client.post(mv_url, mv_payload2, format='json')
        self.assertEqual(mv_resp2.status_code, 201, mv_resp2.content)
        session.refresh_from_db()
        finalize_resp = self.client.post(f'/api/agricultura/harvest-sessions/{session.id}/finalize/')
        self.assertEqual(finalize_resp.status_code, 200)
        session.refresh_from_db()
        self.assertEqual(session.status, 'finalizada')
