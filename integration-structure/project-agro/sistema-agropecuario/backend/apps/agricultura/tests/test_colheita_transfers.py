from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.agricultura.models import Colheita, ColheitaItem, HarvestTransfer
from apps.fazendas.models import Fazenda, Area, Talhao, Tenant, Proprietario
from apps.agricultura.models import Plantio, Cultura

User = get_user_model()


class TenantTestCase(TestCase):
    """Base para testes com multi-tenancy"""
    def setUp(self):
        super().setUp()
        self.tenant, _ = Tenant.objects.get_or_create(
            nome="test_tenant_" + self.__class__.__name__,
            defaults={"descricao": "Tenant para testes"}
        )
        self.proprietario, _ = Proprietario.objects.get_or_create(
            tenant=self.tenant,
            nome="Test Owner",
            cpf="00000000000",
            defaults={"email": "owner@test.local", "telefone": "11999999999"}
        )
        self.user = User.objects.create(
            username=f'user_{self.__class__.__name__}',
            email='user@test.local',
            tenant=self.tenant
        )
        self.fazenda, _ = Fazenda.objects.get_or_create(
            tenant=self.tenant,
            nome="Test Farm",
            proprietario=self.proprietario,
            defaults={"descricao": "Fazenda para testes"}
        )
        self.client.force_login(self.user)


class ColheitaTransferTests(TenantTestCase):
    def setUp(self):
        super().setUp()
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
