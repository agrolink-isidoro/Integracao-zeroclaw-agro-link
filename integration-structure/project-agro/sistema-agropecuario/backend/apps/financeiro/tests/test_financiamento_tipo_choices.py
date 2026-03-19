from django.test import TestCase
from rest_framework.test import APIClient
from apps.comercial.models import InstituicaoFinanceira
from apps.multi_tenancy.models import Tenant


class FinanciamentoTipoChoicesTest(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_financeiro_tipo_choices',
            slug='test-tenant-financeiro-tipo-choices'
        )
        self.client = APIClient()
        # create admin user and login via token obtain
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_superuser('testadmin', 'test@example.com', 'pass', tenant=self.tenant)
        # get tokens
        resp = self.client.post('/api/auth/login/', {'username': 'testadmin', 'password': 'pass'}, format='json')
        self.assertEqual(resp.status_code, 200)
        token = resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # create institution
        self.inst = InstituicaoFinanceira.objects.create(codigo_bacen='999', nome='TEST BANK', tenant=self.tenant)

    def test_create_financiamento_with_cpr(self):
        payload = {
            'titulo': 'CPR financing',
            'descricao': '',
            'valor_total': 1000,
            'valor_entrada': 0,
            'valor_financiado': 1000,
            'taxa_juros': 0,
            'frequencia_taxa': 'mensal',
            'metodo_calculo': 'price',
            'numero_parcelas': 1,
            'prazo_meses': 1,
            'data_contratacao': '2026-01-01',
            'data_primeiro_vencimento': '2026-02-01',
            'instituicao_financeira': self.inst.id,
            'tipo_financiamento': 'cpr',
        }
        resp = self.client.post('/api/financeiro/financiamentos/', payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)

    def test_create_financiamento_with_credito_rotativo(self):
        payload = {
            'titulo': 'Rotativo financing',
            'descricao': '',
            'valor_total': 2000,
            'valor_entrada': 0,
            'valor_financiado': 2000,
            'taxa_juros': 0,
            'frequencia_taxa': 'mensal',
            'metodo_calculo': 'price',
            'numero_parcelas': 1,
            'prazo_meses': 1,
            'data_contratacao': '2026-01-01',
            'data_primeiro_vencimento': '2026-02-01',
            'instituicao_financeira': self.inst.id,
            'tipo_financiamento': 'credito_rotativo',
        }
        resp = self.client.post('/api/financeiro/financiamentos/', payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
