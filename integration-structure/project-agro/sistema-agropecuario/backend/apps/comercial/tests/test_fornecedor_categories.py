import pytest
from apps.comercial.models import Fornecedor


def test_fornecedor_has_canonical_categories():
    expected_keys = {
        'insumos', 'servicos', 'maquinas', 'transporte', 'produtos_agricolas', 'combustiveis',
        'ti', 'manutencao', 'prestador_servicos', 'fabricante', 'outros'
    }
    available = {c[0] for c in Fornecedor.CATEGORIA_CHOICES}
    assert expected_keys.issubset(available), f"Missing expected categories: {expected_keys - available}"
