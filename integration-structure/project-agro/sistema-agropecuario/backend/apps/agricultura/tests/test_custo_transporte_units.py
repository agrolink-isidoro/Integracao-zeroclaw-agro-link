from decimal import Decimal

import pytest

from apps.fazendas.models import Fazenda, Proprietario, Area, Talhao
from apps.agricultura.models import Plantio, Cultura, HarvestSession, HarvestSessionItem
from apps.agricultura.serializers import MovimentacaoCargaSerializer


@pytest.mark.django_db
def test_movimentacao_accepts_zero_cost_and_unit():
    # Setup producer and location
    proprietario = Proprietario.objects.create(nome='Prod C', cpf_cnpj='333')
    fazenda = Fazenda.objects.create(proprietario=proprietario, name='Faz C', matricula='MC')
    area = Area.objects.create(proprietario=proprietario, fazenda=fazenda, name='Area C')
    talhao = Talhao.objects.create(area=area, name='T1', area_size=1)

    cultura = Cultura.objects.create(nome='Soja')
    plantio = Plantio.objects.create(fazenda=fazenda, cultura=cultura, data_plantio='2025-01-01')
    plantio.talhoes.add(talhao)

    session = HarvestSession.objects.create(plantio=plantio, data_inicio='2025-02-01', status='em_andamento')
    item = HarvestSessionItem.objects.create(session=session, talhao=talhao, quantidade_colhida=0, status='pendente')

    data = {
        'session_item': item.id,
        'talhao': talhao.id,
        'transporte': {
            'placa': 'ABC-123',
            'motorista': 'Joao',
            'tara': '1000',
            'peso_bruto': '2000',
            'descontos': '0',
            'custo_transporte': '0',
            'custo_transporte_unidade': 'saca'
        },
        'destino_tipo': 'armazenagem_interna',
        'local_destino': None,
        'peso_estimado': 900
    }

    s = MovimentacaoCargaSerializer(data=data, context={'request': None})
    assert s.is_valid(), s.errors
    mov = s.save()

    mov.refresh_from_db()
    assert mov.transporte is not None
    assert mov.transporte.custo_transporte == Decimal('0')
    assert mov.transporte.custo_transporte_unidade == 'saca'
    assert mov.custo_transporte == Decimal('0') or mov.custo_transporte == 0
    assert mov.custo_transporte_unidade == 'saca'
