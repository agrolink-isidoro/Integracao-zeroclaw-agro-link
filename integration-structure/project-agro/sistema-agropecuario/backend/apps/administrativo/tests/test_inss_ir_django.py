from django.test import TestCase
from decimal import Decimal
from apps.administrativo.utils import compute_inss, compute_ir


class INSSIRDjangoTest(TestCase):
    def test_compute_inss_cap_and_values(self):
        salario = Decimal('10000')
        total, breakdown = compute_inss(salario, Decimal('1621.00'), Decimal('8537.55'))
        self.assertEqual(total, Decimal('976.422'))
        self.assertEqual(len(breakdown), 4)

    def test_compute_ir_with_redutor_results_in_zero(self):
        salario = Decimal('6000')
        inss, _ = compute_inss(salario, Decimal('1621.00'), Decimal('8537.55'))
        imposto, info = compute_ir(salario, inss, 0)
        self.assertEqual(imposto, Decimal('0'))
        self.assertIn('isencao parcial', info.get('motivo'))

    def test_compute_ir_alta_aliquota(self):
        salario = Decimal('8000')
        inss, _ = compute_inss(salario, Decimal('1621.00'), Decimal('8537.55'))
        imposto, info = compute_ir(salario, inss, 0)
        self.assertGreater(imposto, Decimal('0'))
        self.assertTrue(info.get('motivo') == 'alíquota alta' or 'alíquota alta' in info.get('motivo', ''))
