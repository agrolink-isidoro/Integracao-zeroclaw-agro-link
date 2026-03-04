import pytest
from apps.estoque.utils import convert_to_kg, convert_between


def test_convert_to_kg():
    assert convert_to_kg(1, 'kg') == 1
    assert convert_to_kg(1, 't') == 1000
    assert convert_to_kg(1, 'saca_60kg') == 60


def test_convert_between():
    # 1 tonelada = 1000 kg -> should be 16.666... sacks of 60kg
    sacks = convert_between(1, 't', 'saca_60kg')
    assert round(sacks, 6) == round(1000 / 60, 6)

    # 10 sacas -> kilograms
    kg = convert_between(10, 'saca_60kg', 'kg')
    assert kg == 600

    # round-trip
    assert convert_between(convert_between(5, 'saca_60kg', 'kg'), 'kg', 'saca_60kg') == 5
