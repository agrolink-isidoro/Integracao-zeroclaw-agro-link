from django.test import TestCase
from apps.fazendas.models import Fazenda, Talhao, Proprietario, Area
from apps.agricultura.models import Plantio, Cultura
from apps.agricultura.services import calcular_custos_plantio
from django.contrib.auth import get_user_model

User = get_user_model()

class ServicesTests(TestCase):
    def setUp(self):
        self.proprietario = Proprietario.objects.create(nome='Produtor', cpf_cnpj='00000000000')
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='Fazenda Teste', matricula='M-001')
        self.area = Area.objects.create(proprietario=self.proprietario, fazenda=self.fazenda, name='A', geom='POINT(0 0)')
        self.talhao = Talhao.objects.create(area=self.area, name='Talhao 1', area_size=10)
        self.cultura = Cultura.objects.create(nome='Cultura Teste')
        self.user = User.objects.create_user(username='u')

    def test_calcular_custos_plantio(self):
        plantio = Plantio.objects.create(cultura=self.cultura, data_plantio='2025-01-01', criado_por=self.user)
        plantio.talhoes.add(self.talhao)
        # add a manejo and a colheita
        from apps.agricultura.models import Manejo, Colheita
        m = Manejo.objects.create(tipo='capina', data_manejo='2025-06-01', custo_mao_obra=100, custo_maquinas=50, criado_por=self.user)
        m.talhoes.add(self.talhao)
        # link manejo to plantio
        m.plantio = plantio
        m.save()
        c = Colheita.objects.create(plantio=plantio, data_colheita='2025-07-01', quantidade_colhida=100, custo_mao_obra=200, custo_maquina=100, criado_por=self.user)
        # link colheita to plantio (already set via constructor)

        resumo = calcular_custos_plantio(plantio)
        self.assertEqual(resumo['total_manejos'], 150)
        self.assertEqual(resumo['total_colheitas'], 300)
        self.assertEqual(resumo['total_plantio'], 450)