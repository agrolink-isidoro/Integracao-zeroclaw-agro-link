from rest_framework.test import APIClient
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.financeiro.models import Vencimento, LancamentoFinanceiro
from apps.multi_tenancy.models import Tenant

User = get_user_model()


class QuitacaoAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant = Tenant.objects.create(nome='test_tenant_quitacao_api', slug='test-tenant-quitacao-api')
        self.user = User.objects.create_user(username='apiuser', tenant=self.tenant)
        self.client.force_authenticate(self.user)
        self.v = Vencimento.objects.create(titulo='V-API-1', valor=150.00, data_vencimento='2025-12-01', tipo='despesa', status='pendente', criado_por=self.user, tenant=self.tenant)

    def test_quitar_creates_lancamento_and_marks_vencimento_paid(self):
        res = self.client.post(f'/api/financeiro/vencimentos/{self.v.id}/quitar/', data={}, format='json')
        self.assertEqual(res.status_code, 200)
        json = res.json()
        self.assertIn('lancamento', json)
        lanc = json['lancamento']
        self.assertIn('id', lanc)
        # Verify DB created lancamento linked to vencimento
        self.assertTrue(LancamentoFinanceiro.objects.filter(origem_object_id=self.v.id).exists())
        # Verify vencimento status updated
        self.v.refresh_from_db()
        self.assertEqual(self.v.status, 'pago')

    def test_quitar_idempotent_returns_existing_lancamento(self):
        # First quit
        res1 = self.client.post(f'/api/financeiro/vencimentos/{self.v.id}/quitar/', data={}, format='json')
        self.assertEqual(res1.status_code, 200)
        id1 = res1.json()['lancamento']['id']

        # Second quit should not create another lancamento
        res2 = self.client.post(f'/api/financeiro/vencimentos/{self.v.id}/quitar/', data={}, format='json')
        self.assertEqual(res2.status_code, 200)
        id2 = res2.json()['lancamento']['id']
        self.assertEqual(id1, id2)
        self.assertEqual(LancamentoFinanceiro.objects.filter(origem_object_id=self.v.id).count(), 1)
