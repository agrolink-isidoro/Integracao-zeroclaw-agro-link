from django.test import TestCase
from django.core.management import call_command
from apps.administrativo.models import FolhaPagamento, FolhaPagamentoItem, Funcionario
from apps.fiscal.models_impostos import ImpostoTrabalhista, ImpostoFederal
from decimal import Decimal
from io import StringIO

class RecalculateCommandTest(TestCase):
    def setUp(self):
        self.u1 = Funcionario.objects.create(nome='U1', salario_bruto=2000, dependentes=0)
        self.u2 = Funcionario.objects.create(nome='U2', salario_bruto=5000, dependentes=1)

    def test_dry_run_does_not_persist(self):
        folha = FolhaPagamento.objects.create(periodo_ano=2025, periodo_mes=12, executado=True)
        FolhaPagamentoItem.objects.create(folha=folha, funcionario=self.u1, salario_bruto=Decimal('2000'))
        out = StringIO()
        call_command('recalculate_folha_impostos', '--dry-run', stdout=out)
        # values remain zero
        item = FolhaPagamentoItem.objects.get(folha=folha)
        self.assertEqual(item.inss, Decimal('0'))
        self.assertEqual(item.ir, Decimal('0'))

    def test_command_recalculates_missing(self):
        folha = FolhaPagamento.objects.create(periodo_ano=2025, periodo_mes=12, executado=True)
        FolhaPagamentoItem.objects.create(folha=folha, funcionario=self.u1, salario_bruto=Decimal('2000'))
        call_command('recalculate_folha_impostos')
        item = FolhaPagamentoItem.objects.get(folha=folha)
        # INSS should be computed and IR should be present (may be zero depending on salary)
        self.assertGreater(item.inss, Decimal('0'))
        self.assertIsNotNone(item.ir)
        # Impostos persisted
        self.assertGreater(ImpostoTrabalhista.objects.filter(folha=folha).count(), 0)
        self.assertGreater(ImpostoFederal.objects.filter(folha=folha, tipo_imposto='INSS').count(), 0)

    def test_force_recalculates(self):
        folha = FolhaPagamento.objects.create(periodo_ano=2026, periodo_mes=1, executado=True)
        item = FolhaPagamentoItem.objects.create(folha=folha, funcionario=self.u1, salario_bruto=Decimal('2000'), inss=Decimal('150'), ir=Decimal('50'))
        # Change salary to force recompute if forced
        item.salario_bruto = Decimal('10000')
        item.save()
        call_command('recalculate_folha_impostos', '--force')
        item.refresh_from_db()
        self.assertNotEqual(item.inss, Decimal('150'))

    def test_competencia_filter(self):
        # Create folhas without triggering post_save signal handlers (set executado via update later)
        f1 = FolhaPagamento.objects.create(periodo_ano=2025, periodo_mes=12, executado=False)
        f2 = FolhaPagamento.objects.create(periodo_ano=2026, periodo_mes=1, executado=False)
        FolhaPagamentoItem.objects.create(folha=f1, funcionario=self.u1, salario_bruto=Decimal('2000'))
        FolhaPagamentoItem.objects.create(folha=f2, funcionario=self.u1, salario_bruto=Decimal('2000'))
        # mark only f1 as executed without firing signals
        FolhaPagamento.objects.filter(id=f1.id).update(executado=True)
        out = StringIO()
        call_command('recalculate_folha_impostos', '--competencia=2025-12', stdout=out)
        self.assertGreater(ImpostoTrabalhista.objects.filter(folha=f1).count(), 0)
        self.assertEqual(ImpostoTrabalhista.objects.filter(folha=f2).count(), 0)
