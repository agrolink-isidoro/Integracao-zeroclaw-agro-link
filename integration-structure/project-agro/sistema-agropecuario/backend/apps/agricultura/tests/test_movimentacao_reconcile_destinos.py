from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.fazendas.models import Fazenda, Area, Talhao
from apps.agricultura.models import Plantio, Cultura, HarvestSession
from apps.core.models import Tenant

User = get_user_model()


class MovimentacaoReconcileDestinosTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_agricultura_movimentacao_reconcile_destinos',
            slug='test-tenant-agricultura-movimentacao-reconcile-destinos'
        )
        self.user = User.objects.create_user(username='tester', is_staff=False, tenant=self.tenant)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        from apps.fazendas.models import Proprietario
        from apps.estoque.models import LocalArmazenamento, Produto
        from apps.comercial.models import Empresa

        self.proprietario = Proprietario.objects.create(nome='Produtor Test', cpf_cnpj='000000000', tenant=self.tenant)
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='F', matricula='M1', tenant=self.tenant)
        self.cultura = Cultura.objects.create(nome='Soja', tenant=self.tenant)
        self.plantio = Plantio.objects.create(fazenda=self.fazenda, cultura=self.cultura, data_plantio='2025-01-01', tenant=self.tenant)
        self.area = Area.objects.create(proprietario=self.proprietario, fazenda=self.fazenda, name='Area')
        self.talhao1 = Talhao.objects.create(area=self.area, name='T1', area_size=10, tenant=self.tenant)
        self.plantio.talhoes.add(self.talhao1)

        self.produto = Produto.objects.create(codigo='SOJA-1', nome='Soja Produto', unidade='kg', quantidade_estoque=0, tenant=self.tenant)
        self.local = LocalArmazenamento.objects.create(nome='Silo A', fazenda=self.fazenda, tenant=self.tenant)
        self.empresa = Empresa.objects.create(nome='Comprador X', tenant=self.tenant)

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
        session_id = resp.json()['id']
        self.session_item = HarvestSession.objects.get(id=session_id).itens.first()

    def test_reconcile_with_local_destino_creates_entrada(self):
        mv_url = '/api/agricultura/movimentacoes-carga/'
        mv_payload = {
            'session_item': self.session_item.id,
            'talhao': self.session_item.talhao.id,
            'transporte': {'placa': 'XYZ999', 'motorista': 'Maria', 'tara': '1000', 'peso_bruto': '1500', 'descontos': '5.5', 'custo_transporte': '120.00'},
            'destino_tipo': 'armazenagem_interna',
            'local_destino': self.local.id
        }
        mv_resp = self.client.post(mv_url, mv_payload, format='json')
        self.assertEqual(mv_resp.status_code, 201)
        data = mv_resp.json()
        mov_id = data['id']

        rec_url = f'/api/agricultura/movimentacoes-carga/{mov_id}/reconcile/'
        rec_resp = self.client.post(rec_url, {}, format='json')
        self.assertEqual(rec_resp.status_code, 200)
        rec_data = rec_resp.json()
        from apps.estoque.models import MovimentacaoEstoque
        me = MovimentacaoEstoque.objects.get(id=rec_data.get('movimentacao_estoque'))
        self.assertEqual(me.tipo, 'entrada')
        self.assertIsNotNone(me.local_armazenamento)

    def test_reconcile_with_venda_creates_saida_and_mentions_empresa(self):
        mv_url = '/api/agricultura/movimentacoes-carga/'
        mv_payload = {
            'session_item': self.session_item.id,
            'talhao': self.session_item.talhao.id,
            'transporte': {'placa': 'ABC123', 'motorista': 'Joao', 'tara': '1000', 'peso_bruto': '1500'},
            'destino_tipo': 'venda_direta',
            'empresa_destino': self.empresa.id
        }
        mv_resp = self.client.post(mv_url, mv_payload, format='json')
        self.assertEqual(mv_resp.status_code, 201)
        data = mv_resp.json()
        mov_id = data['id']

        rec_url = f'/api/agricultura/movimentacoes-carga/{mov_id}/reconcile/'
        rec_resp = self.client.post(rec_url, {}, format='json')
        self.assertEqual(rec_resp.status_code, 200)
        rec_data = rec_resp.json()
        from apps.estoque.models import MovimentacaoEstoque
        me = MovimentacaoEstoque.objects.get(id=rec_data.get('movimentacao_estoque'))
        self.assertEqual(me.tipo, 'saida')
        self.assertIn('Comprador X', me.motivo)

    def test_reconcile_without_session_uses_plantio_to_find_product(self):
        """When session_item is not provided, reconcile should derive produto using talhão -> plantio->cultura"""
        mv_url = '/api/agricultura/movimentacoes-carga/'
        mv_payload = {
            # no session_item here
            'talhao': self.talhao1.id,
            'transporte': {'placa': 'NOP111', 'motorista': 'Zezinho', 'peso_bruto': '800', 'peso_liquido': '780'},
            'destino_tipo': 'armazenagem_interna',
            'local_destino': self.local.id
        }
        mv_resp = self.client.post(mv_url, mv_payload, format='json')
        self.assertEqual(mv_resp.status_code, 201)
        data = mv_resp.json()
        mov_id = data['id']

        rec_url = f'/api/agricultura/movimentacoes-carga/{mov_id}/reconcile/'
        rec_resp = self.client.post(rec_url, {}, format='json')
        # Expect success now that produto can be derived from plantio
        self.assertEqual(rec_resp.status_code, 200)
        rec_data = rec_resp.json()
        from apps.estoque.models import MovimentacaoEstoque
        me = MovimentacaoEstoque.objects.get(id=rec_data.get('movimentacao_estoque'))
        self.assertEqual(me.tipo, 'entrada')
        self.assertIsNotNone(me.local_armazenamento)
