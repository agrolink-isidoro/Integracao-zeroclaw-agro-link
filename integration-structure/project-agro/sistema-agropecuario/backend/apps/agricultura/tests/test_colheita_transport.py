from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.agricultura.models import Colheita, ColheitaTransporte
from apps.fazendas.models import Fazenda, Area, Talhao
from apps.agricultura.models import Plantio, Cultura

User = get_user_model()


class ColheitaTransportTests(TestCase):
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

    def test_create_colheita_with_transporte(self):
        url = '/api/agricultura/colheitas/'
        payload = {
            'plantio': self.plantio.id,
            'data_colheita': '2025-12-01',
            'quantidade_colhida': 1000,
            'unidade': 'kg',
            'transportes': [
                {
                    'placa': 'ABC1234',
                    'tara': '1000',
                    'peso_bruto': '1500',
                    'custo_transporte': '200.00'
                }
            ]
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        data = resp.json()
        self.assertIn('id', data)
        col = Colheita.objects.get(id=data['id'])
        self.assertTrue(ColheitaTransporte.objects.filter(colheita=col, placa='ABC1234').exists())
        transporte = ColheitaTransporte.objects.get(colheita=col, placa='ABC1234')
        self.assertEqual(float(transporte.peso_liquido), 500.0)
