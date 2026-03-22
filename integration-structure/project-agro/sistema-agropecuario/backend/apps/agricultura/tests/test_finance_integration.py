from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from apps.fazendas.models import Fazenda, Talhao, Proprietario
from apps.agricultura.models import Plantio, Manejo, Colheita, Cultura
from apps.financeiro.models import RateioCusto, RateioApproval
from apps.administrativo.models import Notificacao
from apps.core.models import Tenant

User = get_user_model()


class FinanceIntegrationTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_agricultura_finance',
            slug='test-tenant-agricultura-finance'
        )
        self.creator = User.objects.create_user(username='creator', password='pass', is_staff=False)
        self.approver = User.objects.create_user(username='approver', password='pass', is_staff=False)
        g, _ = Group.objects.get_or_create(name='financeiro.rateio_approver')
        g.user_set.add(self.approver)

        self.proprietario = Proprietario.objects.create(nome='Produtor', cpf_cnpj='00000000000')
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='Fazenda Teste', matricula='M-001')
        self.cultura = Cultura.objects.create(nome='Cultura Teste')
        from apps.fazendas.models import Area
        self.area = Area.objects.create(proprietario=self.proprietario, fazenda=self.fazenda, name='A', geom='POINT(0 0)')
        self.talhao = Talhao.objects.create(area=self.area, name='Talhao 1', area_size=10)

    def test_manejo_generates_rateio_and_notification(self):
        manejo = Manejo.objects.create(tipo='capina', data_manejo='2025-07-01', custo_mao_obra=100, custo_maquinas=50, custo_insumos=20, criado_por=self.creator)
        manejo.talhoes.add(self.talhao)

        # Reload and assert contabilizado and rateio created
        m = Manejo.objects.get(id=manejo.id)
        self.assertTrue(m.contabilizado)

        rateio = RateioCusto.objects.filter(titulo__icontains=f'Operação #{m.id}').first()
        self.assertIsNotNone(rateio)

        approval = RateioApproval.objects.get(rateio=rateio)
        self.assertEqual(approval.status, 'pending')

        # Approver should have a notification
        notifs = Notificacao.objects.filter(usuario=self.approver, titulo__icontains='Rateio pendente')
        self.assertTrue(notifs.exists())

    def test_colheita_generates_rateio(self):
        plantio = Plantio.objects.create(cultura=self.cultura, data_plantio='2025-01-01', criado_por=self.creator)
        plantio.talhoes.add(self.talhao)
        colheita = Colheita.objects.create(plantio=plantio, data_colheita='2025-07-01', quantidade_colhida=100, custo_mao_obra=200, custo_maquina=100, custo_insumos=50, criado_por=self.creator)

        c = Colheita.objects.get(id=colheita.id)
        self.assertTrue(c.contabilizado)

        rateio = RateioCusto.objects.filter(titulo__icontains=f'Operação #{c.id}').first()
        self.assertIsNotNone(rateio)
