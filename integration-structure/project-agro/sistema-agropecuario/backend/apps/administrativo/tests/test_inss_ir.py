import pytest
from decimal import Decimal
from apps.administrativo.utils import compute_inss, compute_ir

pytestmark = pytest.mark.django_db


def test_compute_inss_brackets():
    salary = Decimal('1000.00')
    total, breakdown = compute_inss(salary, Decimal('1621.00'), Decimal('8537.55'))
    # below SM: should be salary * 7.5%
    assert total == (salary * Decimal('0.075')).quantize(Decimal('0.001'))
    assert len(breakdown) >= 1


def test_ir_examples():
    salario = Decimal('4000')
    inss, _ = compute_inss(salario, Decimal('1621.00'), Decimal('8537.55'))
    imposto, info = compute_ir(salario, inss, 0)
    assert imposto == Decimal('0')


def test_compute_inss_cap_and_values():
    salario = Decimal('10000')
    total, breakdown = compute_inss(salario, Decimal('1621.00'), Decimal('8537.55'))
    # Expected total computed over brackets with cap at 8537.55
    assert total == Decimal('976.422')
    assert len(breakdown) == 4


def test_compute_ir_with_redutor_results_in_zero():
    salario = Decimal('6000')
    inss, _ = compute_inss(salario, Decimal('1621.00'), Decimal('8537.55'))
    imposto, info = compute_ir(salario, inss, 0)
    # With redutor applied, reduced base should fall below exemption threshold
    assert imposto == Decimal('0')
    assert 'isencao parcial' in info.get('motivo')


def test_compute_ir_alta_aliquota():
    salario = Decimal('8000')
    inss, _ = compute_inss(salario, Decimal('1621.00'), Decimal('8537.55'))
    imposto, info = compute_ir(salario, inss, 0)
    # Expected value approximated; ensures non-zero and 'alíquota alta' reason
    assert imposto > 0
    assert info.get('motivo') == 'alíquota alta' or 'alíquota alta' in info.get('motivo', '')
