"""
Testes para o endpoint de KPIs de Safra (Plantio).
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.fazendas.models import Fazenda, Talhao, Proprietario, Area
from apps.agricultura.models import Plantio, Cultura, Colheita
from apps.financeiro.models import RateioCusto, RateioTalhao
from apps.administrativo.models import CentroCusto
from apps.core.models import Tenant

User = get_user_model()


class SafraKPIsAPITests(TestCase):
    """Testa GET /api/agricultura/plantios/{id}/kpis/"""

    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_agricultura_kpis',
            slug='test-tenant-agricultura-kpis'
        )
        self.user = User.objects.create_user(username='kpi_user', password='test123', is_staff=False)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.proprietario = Proprietario.objects.create(nome='Produtor', cpf_cnpj='00000000001')
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='Fazenda KPI', matricula='M-KPI')
        self.area = Area.objects.create(proprietario=self.proprietario, fazenda=self.fazenda, name='Area KPI', geom='POINT(0 0)')
        self.talhao1 = Talhao.objects.create(area=self.area, name='T1', area_size=50)
        self.talhao2 = Talhao.objects.create(area=self.area, name='T2', area_size=30)
        self.cultura = Cultura.objects.create(nome='Soja')

        self.plantio = Plantio.objects.create(
            cultura=self.cultura,
            fazenda=self.fazenda,
            data_plantio='2026-01-15',
            status='em_andamento',
            criado_por=self.user,
        )
        self.plantio.talhoes.add(self.talhao1, self.talhao2)

    def test_kpis_empty_safra(self):
        """Safra sem rateios/colheitas deve retornar zeros."""
        resp = self.client.get(f'/api/agricultura/plantios/{self.plantio.id}/kpis/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['safra_id'], self.plantio.id)
        self.assertEqual(data['area_ha'], 80.0)  # 50 + 30
        self.assertEqual(data['custo_total'], 0)
        self.assertEqual(data['producao_t'], 0)
        self.assertEqual(data['produtividade_t_ha'], 0)
        self.assertEqual(data['margem_bruta_pct'], 0)
        self.assertIn('costs_by_category', data)
        self.assertIn('updated_at', data)

    def test_kpis_with_rateios(self):
        """Rateios vinculados à safra devem aparecer nos custos."""
        cc = CentroCusto.objects.create(codigo='CC01', nome='Fertilizantes', categoria='outro')
        rateio = RateioCusto.objects.create(
            titulo='Rateio Soja',
            valor_total=Decimal('10000.00'),
            data_rateio='2026-02-01',
            safra=self.plantio,
            centro_custo=cc,
            criado_por=self.user,
        )
        rateio.talhoes.add(self.talhao1, self.talhao2)

        resp = self.client.get(f'/api/agricultura/plantios/{self.plantio.id}/kpis/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['custo_total'], 10000.0)
        self.assertAlmostEqual(data['custo_por_ha'], 125.0, places=1)  # 10000 / 80
        self.assertEqual(len(data['costs_by_category']), 1)
        self.assertEqual(data['costs_by_category'][0]['category'], 'Outro')

    def test_kpis_with_colheita(self):
        """Colheitas devem alimentar producao_t e produtividade."""
        Colheita.objects.create(
            plantio=self.plantio,
            data_colheita='2026-06-01',
            quantidade_colhida=Decimal('80000'),  # 80 toneladas (kg)
            criado_por=self.user,
        )
        resp = self.client.get(f'/api/agricultura/plantios/{self.plantio.id}/kpis/')
        data = resp.json()
        self.assertEqual(data['producao_t'], 80.0)
        self.assertEqual(data['produtividade_t_ha'], 1.0)  # 80t / 80ha

    def test_kpis_unauthenticated(self):
        """Requer autenticação."""
        self.client.logout()
        resp = self.client.get(f'/api/agricultura/plantios/{self.plantio.id}/kpis/')
        self.assertIn(resp.status_code, [401, 403])

    def test_kpis_not_found(self):
        """ID inexistente retorna 404."""
        resp = self.client.get('/api/agricultura/plantios/99999/kpis/')
        self.assertEqual(resp.status_code, 404)
