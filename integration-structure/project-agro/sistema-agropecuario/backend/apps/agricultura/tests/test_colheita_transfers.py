from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.agricultura.models import Colheita, ColheitaItem, HarvestTransfer
from apps.fazendas.models import Fazenda, Area, Talhao
from apps.agricultura.models import Plantio, Cultura

User = get_user_model()


class ColheitaTransferTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        from apps.fazendas.models import Proprietario
        self.proprietario = Proprietario.objects.create(nome='Produtor Test', cpf_cnpj='000000000')
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='F', matricula='M1')
        self.cultura = Cultura.objects.create(nome='Soja')
        self.plantio = Plantio.objects.create(fazenda=self.fazenda, cultura=self.cultura, data_plantio='2025-01-01')
        self.area = Area.objects.create(proprietario=self.proprietario, fazenda=self.fazenda, name='Area')
        self.talhao = Talhao.objects.create(area=self.area, name='T1', area_size=10)
        self.plantio.talhoes.add(self.talhao)

        self.colheita = Colheita.objects.create(plantio=self.plantio, data_colheita='2025-12-01', quantidade_colhida=1000)

    def test_start_item(self):
        url = f'/api/agricultura/colheitas/{self.colheita.id}/start-item/'
        resp = self.client.post(url, {'talhao_id': self.talhao.id, 'maquina': 'Colheitadeira X', 'quantidade_colhida': 500})
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(float(data['quantidade_colhida']), 500)
        self.assertTrue(ColheitaItem.objects.filter(colheita=self.colheita, talhao=self.talhao).exists())

    def test_add_transfer(self):
        item = ColheitaItem.objects.create(colheita=self.colheita, talhao=self.talhao, quantidade_colhida=400)
        url = f'/api/agricultura/colheitas/{self.colheita.id}/add-transfer/'
        resp = self.client.post(url, {'item_id': item.id, 'from_vehicle': 'Colheitadeira A', 'to_vehicle': 'Trator B', 'quantidade': 400})
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(HarvestTransfer.objects.filter(item=item, quantidade=400).exists() )
