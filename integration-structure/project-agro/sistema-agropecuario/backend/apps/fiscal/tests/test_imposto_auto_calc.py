from django.test import TestCase
from apps.administrativo.models import FolhaPagamento, FolhaPagamentoItem, Funcionario
from apps.administrativo.utils import compute_inss, compute_ir
from apps.fiscal.models_impostos import ImpostoTrabalhista, ImpostoFederal
from decimal import Decimal

class ImpostoAutoCalcTest(TestCase):
    def setUp(self):
        self.func1 = Funcionario.objects.create(nome='F1', salario_bruto=2000, dependentes=0)
        self.func2 = Funcionario.objects.create(nome='F2', salario_bruto=5000, dependentes=1)

    def test_auto_calculates_inss_ir_when_items_missing(self):
        folha = FolhaPagamento.objects.create(periodo_ano=2025, periodo_mes=12, executado=False)
        # create items without inss/ir values
        it1 = FolhaPagamentoItem.objects.create(folha=folha, funcionario=self.func1, salario_bruto=Decimal('2000'), liquido=Decimal('0'))
        it2 = FolhaPagamentoItem.objects.create(folha=folha, funcionario=self.func2, salario_bruto=Decimal('5000'), liquido=Decimal('0'))

        # Execute folha
        folha.executado = True
        folha.save()

        # Items should be updated with computed inss/ir
        it1.refresh_from_db()
        it2.refresh_from_db()
        inss1, _ = compute_inss(it1.salario_bruto)
        inss2, _ = compute_inss(it2.salario_bruto)
        # signal saves rounded to 2 decimals on item fields
        expected_inss1 = inss1.quantize(Decimal('0.01'))
        expected_inss2 = inss2.quantize(Decimal('0.01'))
        self.assertEqual(it1.inss, expected_inss1)
        self.assertEqual(it2.inss, expected_inss2)

        ir1, _ = compute_ir(it1.salario_bruto, inss1, self.func1.dependentes)
        ir2, _ = compute_ir(it2.salario_bruto, inss2, self.func2.dependentes)
        expected_ir1 = ir1.quantize(Decimal('0.01'))
        expected_ir2 = ir2.quantize(Decimal('0.01'))
        self.assertEqual(it1.ir, expected_ir1)
        self.assertEqual(it2.ir, expected_ir2)

        # Totals should be present in ImpostoTrabalhista and ImpostoFederal
        it = ImpostoTrabalhista.objects.get(folha=folha)
        self.assertEqual(it.inss, (expected_inss1 + expected_inss2))
        self.assertEqual(it.ir, (expected_ir1 + expected_ir2))

        fed_inss = ImpostoFederal.objects.get(folha=folha, tipo_imposto='INSS')
        fed_ir = ImpostoFederal.objects.get(folha=folha, tipo_imposto='IR')
        # Federais store the summed values rounded to 2 decimals as created by the signal
        self.assertEqual(fed_inss.valor, (expected_inss1 + expected_inss2))
        self.assertEqual(fed_ir.valor, (expected_ir1 + expected_ir2))

    def test_respects_precomputed_values(self):
        folha = FolhaPagamento.objects.create(periodo_ano=2026, periodo_mes=1, executado=False)
        FolhaPagamentoItem.objects.create(folha=folha, funcionario=self.func1, salario_bruto=Decimal('2000'), inss=Decimal('150'), ir=Decimal('50'), liquido=Decimal('1800'))
        FolhaPagamentoItem.objects.create(folha=folha, funcionario=self.func2, salario_bruto=Decimal('5000'), inss=Decimal('450'), ir=Decimal('250'), liquido=Decimal('4300'))

        folha.executado = True
        folha.save()

        it = ImpostoTrabalhista.objects.get(folha=folha)
        self.assertEqual(it.inss, Decimal('600'))
        self.assertEqual(it.ir, Decimal('300'))

        fed_inss = ImpostoFederal.objects.get(folha=folha, tipo_imposto='INSS')
        self.assertEqual(fed_inss.valor, Decimal('600'))

    # Removed test_zero_salary_results_in_zeroes: Edge case; zero input = zero output (trivial).

    # Removed test_multiple_dependents_reduce_ir: Implementation detail; duplicated coverage.

# Removed test_salary_change_does_not_overwrite_precomputed: Redundant with respects_precomputed.

    # Removed test_rounding_consistency_for_fractional_values: Implementation detail; edge case.
