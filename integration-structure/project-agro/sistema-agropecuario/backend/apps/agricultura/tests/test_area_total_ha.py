from decimal import Decimal

import pytest

from apps.fazendas.models import Fazenda, Proprietario, Area, Talhao
from apps.agricultura.models import Plantio, OrdemServico, Cultura


@pytest.mark.django_db
def test_area_total_ha_handles_decimal_and_float(monkeypatch):
    proprietario = Proprietario.objects.create(nome='Prod A', cpf_cnpj='00000000001')
    fazenda = Fazenda.objects.create(proprietario=proprietario, name='Faz A', matricula='M-1')
    area = Area.objects.create(proprietario=proprietario, fazenda=fazenda, name='Area 1')

    # Talhão com Decimal area_size
    talhao1 = Talhao.objects.create(area=area, name='T1', area_size=Decimal('10.50'))

    # Talhão cuja área virá de area_hectares (float)
    talhao2 = Talhao.objects.create(area=area, name='T2', area_size=None)
    monkeypatch.setattr(Talhao, 'area_hectares', property(lambda self: 3.25 if self.area_size is None else None))

    cultura = Cultura.objects.create(nome='Soja')
    plantio = Plantio.objects.create(fazenda=fazenda, cultura=cultura, data_plantio='2025-01-01')
    plantio.talhoes.add(talhao1, talhao2)

    assert isinstance(plantio.area_total_ha, float)
    assert plantio.area_total_ha == pytest.approx(13.75, rel=1e-6)


@pytest.mark.django_db
def test_ordem_servico_area_total_ha_handles_decimal_and_float(monkeypatch):
    proprietario = Proprietario.objects.create(nome='Prod B', cpf_cnpj='00000000002')
    fazenda = Fazenda.objects.create(proprietario=proprietario, name='Faz B', matricula='M-2')
    area = Area.objects.create(proprietario=proprietario, fazenda=fazenda, name='Area 2')

    talhao1 = Talhao.objects.create(area=area, name='T3', area_size=Decimal('5'))
    talhao2 = Talhao.objects.create(area=area, name='T4', area_size=None)
    monkeypatch.setattr(Talhao, 'area_hectares', property(lambda self: 2.75 if self.area_size is None else None))

    os = OrdemServico.objects.create(fazenda=fazenda, tarefa='Test', data_inicio='2025-01-02')
    os.talhoes.add(talhao1, talhao2)

    assert isinstance(os.area_total_ha, float)
    assert os.area_total_ha == pytest.approx(7.75, rel=1e-6)
