from rest_framework.test import APIClient, APITestCase
from decimal import Decimal
from apps.maquinas.models import CategoriaEquipamento, Equipamento
from apps.fazendas.models import Proprietario, Fazenda
from apps.estoque.models import Produto
from apps.core.models import CustomUser

class AbastecimentoAPITests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create(username='apiuser')
        self.prop = Proprietario.objects.create(nome='Prop', cpf_cnpj='99988877766')
        self.faz = Fazenda.objects.create(proprietario=self.prop, name='FazA', matricula='M-01')
        cat, _ = CategoriaEquipamento.objects.get_or_create(nome='Trator', defaults={'tipo_mobilidade':'autopropelido'})
        self.equip, _ = Equipamento.objects.get_or_create(nome='TratorX', defaults={'marca':'X','modelo':'M','ano_fabricacao':2020,'data_aquisicao':'2020-01-01','valor_aquisicao':Decimal('1000'),'categoria':cat})
        self.prod = Produto.objects.create(codigo='COMB', nome='Diesel', unidade='L', quantidade_estoque=Decimal('1000'), custo_unitario=Decimal('5.50'))
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_abastecimento_without_produto(self):
        payload = {
            'equipamento': self.equip.pk,
            'quantidade_litros': 230,
            'valor_unitario': 5.5,
            'data_abastecimento': '2026-02-11T20:42'
        }
        res = self.client.post('/api/maquinas/abastecimentos/', payload, format='json')
        assert res.status_code == 201, (res.status_code, res.content)

    def test_create_abastecimento_with_produto_creates_movimentacao(self):
        payload = {
            'equipamento': self.equip.pk,
            'quantidade_litros': 50,
            'valor_unitario': 5.5,
            'produto_estoque': self.prod.pk,
            'data_abastecimento': '2026-02-11T20:42'
        }
        res = self.client.post('/api/maquinas/abastecimentos/', payload, format='json')
        assert res.status_code == 201, (res.status_code, res.content)
