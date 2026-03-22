from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.comercial.models import CargaViagem
from apps.fazendas.models import Fazenda, Area, Talhao
from apps.agricultura.models import Plantio, Cultura, Colheita

User = get_user_model()


class CargaWeighingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester', is_staff=False)
        from apps.core.models import Tenant
        tenant, _ = Tenant.objects.get_or_create(nome='Test Tenant ' + str(hash(self.user.username) % 10000), defaults={'slug': 'test' + str(hash(self.user.username) % 10000)})
        self.user.tenant = tenant
        self.user.save()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        from apps.fazendas.models import Proprietario
        self.proprietario = Proprietario.objects.create(nome='Produtor2', cpf_cnpj='111111111')
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='F2', matricula='M2')
        self.cultura = Cultura.objects.create(nome='Soja')
        self.plantio = Plantio.objects.create(fazenda=self.fazenda, cultura=self.cultura, data_plantio='2025-01-01')
        self.colheita = Colheita.objects.create(plantio=self.plantio, data_colheita='2025-12-01', quantidade_colhida=1000)

        self.carga = CargaViagem.objects.create(tipo_colheita='colheita_completa', data_colheita='2025-12-01', peso_total=0, fazenda=self.fazenda, cultura=self.cultura, colheita_agricola=self.colheita)

    def test_weigh_and_unload_flow(self):
        tare_url = f'/api/comercial/carga-viagems/{self.carga.id}/weigh_tare/'
        resp = self.client.post(tare_url, {'tare_weight': 8000, 'truck_plate': 'ABC-1234'})
        self.assertEqual(resp.status_code, 200)
        self.carga.refresh_from_db()
        self.assertEqual(float(self.carga.tare_weight), 8000)

        gross_url = f'/api/comercial/carga-viagems/{self.carga.id}/weigh_gross/'
        resp = self.client.post(gross_url, {'gross_weight': 12000})
        self.assertEqual(resp.status_code, 200)
        self.carga.refresh_from_db()
        self.assertEqual(float(self.carga.gross_weight), 12000)
        self.assertEqual(float(self.carga.net_weight), 4000)

        # Create a LocalArmazenamento to unload
        from apps.estoque.models import LocalArmazenamento
        local = LocalArmazenamento.objects.create(nome='Armazem X', tipo='armazem', fazenda=self.fazenda)

        # Create a Produto matching the cultura name so unload can find it
        from apps.estoque.models import Produto
        Produto.objects.create(nome=f"{self.cultura.nome} Produto", quantidade_estoque=100000, custo_unitario=1)

        unload_url = f'/api/comercial/carga-viagems/{self.carga.id}/unload/'
        resp = self.client.post(unload_url, {'local_armazenamento_id': local.id})
        self.assertEqual(resp.status_code, 200)
        self.carga.refresh_from_db()
        # After unload, unload_movimentacao should be set
        self.assertIsNotNone(self.carga.unload_movimentacao)
        self.colheita.refresh_from_db()
        self.assertEqual(self.colheita.status, 'armazenada')
