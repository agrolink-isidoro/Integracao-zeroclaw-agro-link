from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from apps.financeiro.models import RateioCusto, RateioApproval
from apps.financeiro import services as financeiro_services
from apps.fazendas.models import Talhao, Area, Proprietario, Fazenda
from apps.administrativo.models import CentroCusto, DespesaAdministrativa
from decimal import Decimal
from django.utils import timezone

User = get_user_model()


class RateioModelAndServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='u', password='p', is_staff=False)
        self.prop = Proprietario.objects.create(nome='P', cpf_cnpj='000')
        self.fazenda = Fazenda.objects.create(proprietario=self.prop, name='F', matricula='M')
        self.area = Area.objects.create(proprietario=self.prop, fazenda=self.fazenda, name='A', geom='POINT(0 0)')
        self.talhao = Talhao.objects.create(area=self.area, name='T1', area_size=10)
        self.centro, _ = CentroCusto.objects.get_or_create(codigo='ADM', defaults={'nome':'Administrativo'})

    def test_driver_area_requires_talhao(self):
        r = RateioCusto.objects.create(titulo='R1', valor_total=Decimal('100.00'), criado_por=self.user)
        r.driver_de_rateio = 'area'
        # ensure no talhoes set
        r.save()
        with self.assertRaises(ValidationError):
            r.clean()

    def test_centrocusto_required_for_despesa_adm(self):
        r = RateioCusto.objects.create(titulo='R2', valor_total=Decimal('200.00'), criado_por=self.user)
        r.destino = 'despesa_adm'
        r.save()
        with self.assertRaises(ValidationError):
            r.clean()

    def test_approval_creates_vencimento_for_despesa_adm_but_not_operacional(self):
        # Create a despesa and rateio from it
        d = DespesaAdministrativa.objects.create(titulo='D1', valor=Decimal('500.00'), data=timezone.now().date(), centro=self.centro)
        r = financeiro_services.create_rateio_from_despesa(d, created_by=self.user)
        approval = RateioApproval.objects.get(rateio=r)
        approval, vencimento = financeiro_services.aprovar_rateio(approval, self.user)
        # despesa_adm should create a vencimento
        self.assertIsNotNone(vencimento)

        # Create an operacional rateio (from a Manejo-like dummy)
        r2 = RateioCusto.objects.create(titulo='R-Op', valor_total=Decimal('120.00'), criado_por=self.user, destino='operacional')
        RateioApproval.objects.get_or_create(rateio=r2, defaults={'criado_por': self.user})
        approval2 = RateioApproval.objects.get(rateio=r2)
        approval2, vencimento2 = financeiro_services.aprovar_rateio(approval2, self.user)
        # should NOT create a vencimento (None)
        self.assertIsNone(vencimento2)
