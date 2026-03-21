from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.agricultura.models import Colheita, ColheitaItem
from apps.fazendas.models import Fazenda, Area, Talhao
from apps.agricultura.models import Plantio, Cultura
from apps.core.models import Tenant

User = get_user_model()


class ColheitaItemTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(nome='test_tenant_colheita_items', slug='test-tenant-colheita-items')
        self.user = User.objects.create_user(username='tester', is_staff=False, tenant=self.tenant)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        from apps.fazendas.models import Proprietario
        self.proprietario = Proprietario.objects.create(nome='Produtor Test', cpf_cnpj='000000000', tenant=self.tenant)
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='F', matricula='M1', tenant=self.tenant)
        self.cultura = Cultura.objects.create(nome='Soja', tenant=self.tenant)
        self.plantio = Plantio.objects.create(fazenda=self.fazenda, cultura=self.cultura, data_plantio='2025-01-01', tenant=self.tenant)
        self.area = Area.objects.create(proprietario=self.proprietario, fazenda=self.fazenda, name='Area')
        self.talhao1 = Talhao.objects.create(area=self.area, name='T1', area_size=10, tenant=self.tenant)
        self.talhao2 = Talhao.objects.create(area=self.area, name='T2', area_size=5, tenant=self.tenant)
        self.plantio.talhoes.add(self.talhao1)
        self.plantio.talhoes.add(self.talhao2)

    def test_create_colheita_with_itens(self):
        url = '/api/agricultura/colheitas/'
        payload = {
            'plantio': self.plantio.id,
            'data_colheita': '2025-12-01',
            'quantidade_colhida': 1500,
            'unidade': 'kg',
            'itens': [
                {'talhao': self.talhao1.id, 'quantidade_colhida': '1000'},
                {'talhao': self.talhao2.id, 'quantidade_colhida': '500'},
            ]
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        data = resp.json()
        self.assertIn('id', data)
        col = Colheita.objects.get(id=data['id'])
        items = ColheitaItem.objects.filter(colheita=col)
        self.assertEqual(items.count(), 2)
        totals = sum([float(i.quantidade_colhida) for i in items])
        self.assertEqual(float(col.quantidade_colhida), totals)

    def test_colheita_serializer_handles_missing_movimentacao_and_safe_plantio_talhoes(self):
        """Regressão: serialização não deve lançar quando `movimentacao_estoque` ou plantio/talhões estiverem ausentes."""
        from apps.agricultura.serializers import ColheitaSerializer

        # Criar colheita sem movimentacao_estoque (o campo é opcional)
        col = Colheita.objects.create(plantio=self.plantio, data_colheita='2025-12-01', quantidade_colhida=100, tenant=self.tenant)
        ser = ColheitaSerializer(col)
        data = ser.data
        # movimentacao_estoque_info deve ser None e plantio_talhoes uma string (mesmo que vazia)
        self.assertIsNone(data.get('movimentacao_estoque_info'))
        self.assertIsInstance(data.get('plantio_talhoes'), str)

        # Simular plantio sem talhões -> plantio_talhoes deve ser string vazia
        self.plantio.talhoes.clear()
        col2 = Colheita.objects.create(plantio=self.plantio, data_colheita='2025-12-02', quantidade_colhida=50, tenant=self.tenant)
        ser2 = ColheitaSerializer(col2)
        self.assertEqual(ser2.data.get('plantio_talhoes'), '')
