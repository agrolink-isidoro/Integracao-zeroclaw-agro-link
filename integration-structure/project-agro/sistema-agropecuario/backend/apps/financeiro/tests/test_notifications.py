from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from apps.administrativo.models import CentroCusto, DespesaAdministrativa, Notificacao
from apps.financeiro.services import create_rateio_from_despesa
from apps.financeiro.models import RateioCusto, RateioApproval
from apps.agricultura.models import Plantio

User = get_user_model()

class RateioNotificationTests(TestCase):
    def setUp(self):
        self.creator = User.objects.create_user(username='creator', password='pass')
        self.approver = User.objects.create_user(username='approver', password='pass')
        g, _ = Group.objects.get_or_create(name='financeiro.rateio_approver')
        g.user_set.add(self.approver)

        self.centro = CentroCusto.objects.create(codigo='C1', nome='Centro 1')
        # Create required related records to avoid FK issues
        from apps.fazendas.models import Fazenda, Proprietario
        from apps.agricultura.models import Cultura
        # Create a proprietario required by Fazenda
        self.proprietario = Proprietario.objects.create(nome='Produtor', cpf_cnpj='00000000000')
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='Fazenda Teste', matricula='M-001')
        self.cultura = Cultura.objects.create(nome='Cultura Teste')
        self.plantio = Plantio.objects.create(fazenda=self.fazenda, cultura=self.cultura, data_plantio='2025-01-01')
        # Create an area and a talhao, then attach to plantio so rateio can be generated
        from apps.fazendas.models import Area, Talhao
        self.area = Area.objects.create(proprietario=self.proprietario, fazenda=self.fazenda, name='Area Teste')
        self.talhao = Talhao.objects.create(area=self.area, name='Talhao 1', area_size=10)
        self.plantio.talhoes.add(self.talhao)
        # create a despesa with safra to allow rateio
        self.despesa = DespesaAdministrativa.objects.create(centro=self.centro, titulo='D1', valor=100, data='2025-12-01', safra=self.plantio)

    def test_notifications_on_rateio_creation_and_approval(self):
        # create rateio
        rateio = create_rateio_from_despesa(self.despesa, created_by=self.creator)
        self.assertIsNotNone(rateio)

        # approval must be created by signal
        approval = RateioApproval.objects.get(rateio=rateio)
        self.assertEqual(approval.status, 'pending')

        # approver should have received a Notificacao
        notifications = Notificacao.objects.filter(usuario=self.approver, titulo__icontains=f'Rateio pendente')
        self.assertTrue(notifications.exists())

        # approving should notify creator
        approval.approve(self.approver, comentario='OK')
        notif_creator = Notificacao.objects.filter(usuario=self.creator, titulo__icontains=f'Rateio aprovado')
        self.assertTrue(notif_creator.exists())

        # Rejection flow - create another rateio and reject
        d2 = DespesaAdministrativa.objects.create(centro=self.centro, titulo='D2', valor=50, data='2025-12-01', safra=self.plantio)
        r2 = create_rateio_from_despesa(d2, created_by=self.creator)
        ap2 = RateioApproval.objects.get(rateio=r2)
        ap2.reject(self.approver, comentario='Wrong')
        notif_reject = Notificacao.objects.filter(usuario=self.creator, titulo__icontains='Rateio rejeitado')
        self.assertTrue(notif_reject.exists())
