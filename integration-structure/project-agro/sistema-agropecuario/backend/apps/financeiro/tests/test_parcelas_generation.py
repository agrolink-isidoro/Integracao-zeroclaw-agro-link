from django.test import TestCase
from decimal import Decimal
from django.utils import timezone
from apps.financeiro.models import Financiamento, Emprestimo, ParcelaFinanciamento, ParcelaEmprestimo
from apps.financeiro.services import gerar_parcelas_financiamento, gerar_parcelas_emprestimo
from django.contrib.auth import get_user_model
from apps.core.models import Tenant

User = get_user_model()


class ParcelasGenerationTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_financeiro_parcelas',
            slug='test-tenant-financeiro-parcelas'
        )
        self.user = User.objects.create_user(username='tester', tenant=self.tenant)
        from apps.comercial.models import InstituicaoFinanceira
        from apps.financeiro.models import ContaBancaria
        self.instituicao = InstituicaoFinanceira.objects.create(codigo_bacen='000', nome='Banco Test', tenant=self.tenant)
        self.conta = ContaBancaria.objects.create(banco='Banco Local', agencia='0001', conta='1111', tenant=self.tenant)

    def test_financiamento_calculo_price_and_sac(self):
        c = self.conta
        f = Financiamento.objects.create(
            titulo='Fin Test',
            valor_total=Decimal('1200'),
            valor_entrada=Decimal('0'),
            valor_financiado=Decimal('1200'),
            taxa_juros=Decimal('12.0'),
            frequencia_taxa='mensal',
            metodo_calculo='price',
            numero_parcelas=12,
            prazo_meses=12,
            data_contratacao=timezone.now().date(),
            data_primeiro_vencimento=timezone.now().date(),
            criado_por=self.user,
            instituicao_financeira=self.instituicao,
            conta_destino=c,
            tenant=self.tenant
        )

        parcelas_price = f.calcular_parcelas_price()
        self.assertEqual(len(parcelas_price), 12)
        vals = [p['valor_parcela'] for p in parcelas_price]
        # In PRICE, parcela (payment) should be roughly constant
        self.assertTrue(max(vals) - min(vals) < Decimal('0.01'))
        # Sum of amortizacoes ~ valor_financiado
        total_amort = sum(p['amortizacao'] for p in parcelas_price)
        self.assertAlmostEqual(total_amort, Decimal('1200'), places=2)

        f.metodo_calculo = 'sac'
        parcelas_sac = f.calcular_parcelas_sac()
        self.assertEqual(len(parcelas_sac), 12)
        amortizacoes = [p['amortizacao'] for p in parcelas_sac]
        # In SAC, amortizacao should be constant
        self.assertTrue(max(amortizacoes) - min(amortizacoes) < Decimal('0.0001'))
        # parcelas should decrease over time
        parcelas_values = [p['valor_parcela'] for p in parcelas_sac]
        self.assertTrue(parcelas_values[0] > parcelas_values[-1])

    def test_gerar_parcelas_service_creates_records_financiamento(self):
        f = Financiamento.objects.create(
            titulo='Fin Service',
            valor_total=Decimal('1000'),
            valor_entrada=Decimal('0'),
            valor_financiado=Decimal('1000'),
            taxa_juros=Decimal('12.0'),
            frequencia_taxa='mensal',
            metodo_calculo='price',
            numero_parcelas=10,
            prazo_meses=10,
            data_contratacao=timezone.now().date(),
            data_primeiro_vencimento=timezone.now().date(),
            criado_por=self.user,
            instituicao_financeira=self.instituicao,
            conta_destino=self.conta,
            tenant=self.tenant
        )

        parcelas = gerar_parcelas_financiamento(f)
        self.assertEqual(len(parcelas), 10)
        self.assertEqual(ParcelaFinanciamento.objects.filter(financiamento=f).count(), 10)
        # check vencimento dates increment by months
        dates = [p.data_vencimento for p in ParcelaFinanciamento.objects.filter(financiamento=f).order_by('numero_parcela')]
        self.assertTrue(all(dates[i] < dates[i+1] for i in range(len(dates)-1)))

    def test_gerar_parcelas_service_creates_records_emprestimo(self):
        e = Emprestimo.objects.create(
            titulo='Emp Test',
            valor_emprestimo=Decimal('500'),
            valor_entrada=Decimal('0'),
            taxa_juros=Decimal('6.0'),
            frequencia_taxa='mensal',
            metodo_calculo='sac',
            numero_parcelas=5,
            prazo_meses=5,
            data_contratacao=timezone.now().date(),
            data_primeiro_vencimento=timezone.now().date(),
            criado_por=self.user,
            instituicao_financeira=self.instituicao,
            tenant=self.tenant
        )

        parcelas = gerar_parcelas_emprestimo(e)
        self.assertEqual(len(parcelas), 5)
        self.assertEqual(ParcelaEmprestimo.objects.filter(emprestimo=e).count(), 5)
        dates = [p.data_vencimento for p in ParcelaEmprestimo.objects.filter(emprestimo=e).order_by('numero_parcela')]
        self.assertTrue(all(dates[i] < dates[i+1] for i in range(len(dates)-1)))

    def test_carencia_with_juros_embutidos_increases_principal_price(self):
        f = Financiamento.objects.create(
            titulo='Fin Carencia',
            valor_total=Decimal('1000'),
            valor_entrada=Decimal('0'),
            valor_financiado=Decimal('1000'),
            taxa_juros=Decimal('12.0'),
            frequencia_taxa='mensal',
            metodo_calculo='price',
            numero_parcelas=12,
            prazo_meses=12,
            data_contratacao=timezone.now().date(),
            data_primeiro_vencimento=timezone.now().date(),
            criado_por=self.user,
            instituicao_financeira=self.instituicao,
            conta_destino=self.conta
        )

        # baseline without carencia
        f.juros_embutidos = False
        f.carencia_meses = 0
        baseline = f.calcular_parcelas_price()

        # with carencia and juros embutidos
        f.juros_embutidos = True
        f.carencia_meses = 2
        with_car = f.calcular_parcelas_price()

        self.assertTrue(len(baseline) == len(with_car) == 12)
        self.assertTrue(with_car[0]['valor_parcela'] > baseline[0]['valor_parcela'])

    def test_carencia_with_juros_embutidos_emprestimo_sac(self):
        e = Emprestimo.objects.create(
            titulo='Emp Carencia',
            valor_emprestimo=Decimal('2000'),
            valor_entrada=Decimal('0'),
            taxa_juros=Decimal('12.0'),
            frequencia_taxa='mensal',
            metodo_calculo='sac',
            numero_parcelas=12,
            prazo_meses=12,
            data_contratacao=timezone.now().date(),
            data_primeiro_vencimento=timezone.now().date(),
            criado_por=self.user,
            instituicao_financeira=self.instituicao
        )

        e.juros_embutidos = False
        e.carencia_meses = 0
        baseline = e.calcular_parcelas_sac()

        e.juros_embutidos = True
        e.carencia_meses = 3
        with_car = e.calcular_parcelas_sac()

        self.assertTrue(len(baseline) == len(with_car) == 12)
        # first payment should be larger when interest during carência is capitalized
        self.assertTrue(with_car[0]['valor_parcela'] > baseline[0]['valor_parcela'])
