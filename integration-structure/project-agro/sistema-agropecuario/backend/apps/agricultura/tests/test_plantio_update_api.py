from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.fazendas.models import Proprietario, Fazenda, Area, Talhao
from apps.agricultura.models import Cultura, Plantio
from django.utils import timezone
from decimal import Decimal

User = get_user_model()


class PlantioUpdateAPITest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='apiuser', is_staff=False)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        self.prop = Proprietario.objects.create(nome='Test', cpf_cnpj='123')
        self.faz = Fazenda.objects.create(proprietario=self.prop, name='Faz', matricula='M')
        self.area = Area.objects.create(proprietario=self.prop, fazenda=self.faz, name='A', geom='POINT(0 0)')
        self.t1 = Talhao.objects.create(area=self.area, name='T1', area_size=10)
        self.t2 = Talhao.objects.create(area=self.area, name='T2', area_size=5)

        self.cultura = Cultura.objects.create(nome='TestC')
        self.plantio = Plantio.objects.create(cultura=self.cultura, data_plantio='2025-01-01', criado_por=self.user)
        self.plantio.talhoes.add(self.t1)

    def test_update_plantio_change_dates_and_status_and_talhoes(self):
        url = f'/api/agricultura/plantios/{self.plantio.id}/'
        payload = {
            'fazenda': self.faz.id,
            'talhoes': [self.t1.id, self.t2.id],
            'cultura': self.cultura.id,
            'data_plantio': '2025-02-01',
            'observacoes': 'Atualizando datas',
            'status': 'em_andamento'
        }
        resp = self.client.put(url, payload, format='json')
        # Expect success
        self.assertIn(resp.status_code, (200, 204), f"Unexpected status {resp.status_code} {resp.content}")
        self.plantio.refresh_from_db()
        self.assertEqual(self.plantio.status, 'em_andamento')
        self.assertEqual(set(self.plantio.talhoes.values_list('id', flat=True)), set([self.t1.id, self.t2.id]))

    def test_update_with_talhoes_as_strings(self):
        url = f'/api/agricultura/plantios/{self.plantio.id}/'
        payload = {
            'fazenda': self.faz.id,
            'talhoes': [str(self.t1.id), str(self.t2.id)],
            'cultura': self.cultura.id,
            'data_plantio': '2025-02-01',
            'observacoes': 'Strings in talhoes',
            'status': 'em_andamento'
        }
        resp = self.client.put(url, payload, format='json')
        self.assertIn(resp.status_code, (200, 204), f"Unexpected status with strings {resp.status_code} {resp.content}")

    def test_update_with_talhoes_as_objects(self):
        url = f'/api/agricultura/plantios/{self.plantio.id}/'
        payload = {
            'fazenda': self.faz.id,
            'talhoes': [{'id': self.t1.id}, {'id': self.t2.id}],
            'cultura': self.cultura.id,
            'data_plantio': '2025-02-01',
            'observacoes': 'Objects in talhoes',
            'status': 'em_andamento'
        }
        resp = self.client.put(url, payload, format='json')
        # If API doesn't accept objects, expect 400; ensure it does not raise 500
        self.assertNotEqual(resp.status_code, 500, f"Server error when talhoes are objects: {resp.status_code} {resp.content}")

