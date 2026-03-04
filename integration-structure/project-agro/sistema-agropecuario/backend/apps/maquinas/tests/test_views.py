from django.urls import reverse
from rest_framework.test import APITestCase
from apps.maquinas.models import CategoriaEquipamento, Equipamento, Abastecimento
from apps.core.models import CustomUser
from django.utils import timezone


class MaquinasListPaginationTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(username='mtest', password='pass')
        # create categories
        cat = CategoriaEquipamento.objects.create(nome='Cat A', ativo=True)
        # create many equipamentos
        for i in range(30):
            Equipamento.objects.create(
                nome=f'Equip {i}',
                marca='MarcaX',
                modelo='ModeloY',
                categoria=cat,
                status='ativo',
                ano_fabricacao=2020,
                data_aquisicao='2020-01-01',
                valor_aquisicao=1000
            )
        # Authenticate client
        self.client.force_authenticate(user=self.user)

    def test_por_categoria_paginated(self):
        url = '/api/maquinas/equipamentos/por_categoria/'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('count', data)
        self.assertIn('results', data)
        self.assertGreaterEqual(data['count'], 1)

    def test_por_equipamento_consumo_paginated(self):
        # create abastecimentos across equipamentos
        equipamentos = Equipamento.objects.all()
        hoje = timezone.now()
        for eq in equipamentos:
            for j in range(2):
                Abastecimento.objects.create(
                    equipamento=eq,
                    quantidade_litros=10,
                    valor_unitario=10,
                    valor_total=100,
                    horimetro_km=1000,
                    data_abastecimento=hoje
                )

        url = '/api/maquinas/abastecimentos/por_equipamento/?dias=365'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('count', data)
        self.assertIn('results', data)
        self.assertGreaterEqual(data['count'], 1)
