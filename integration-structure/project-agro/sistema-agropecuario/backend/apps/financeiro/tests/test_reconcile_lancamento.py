from django.test import TestCase
from apps.financeiro.models import LancamentoFinanceiro, ContaBancaria
from django.contrib.auth import get_user_model
from django.urls import reverse
from apps.core.models import Tenant

class ReconcileLancamentoTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.tenant = Tenant.objects.create(nome='test_tenant_reconcile', slug='test-tenant-reconcile')
        self.user = User.objects.create_user(username='apiuser', password='test', is_staff=True, is_superuser=True, tenant=self.tenant)
        self.client.force_login(self.user)
        self.conta = ContaBancaria.objects.create(banco='Teste', agencia='0001', conta='12345', saldo_inicial=0, tenant=self.tenant)
        self.l = LancamentoFinanceiro.objects.create(conta=self.conta, tipo='saida', valor=200, descricao='Test', data='2026-01-01', tenant=self.tenant)

    def test_reconcile(self):
        url = reverse('lancamentos-reconcile', args=[self.l.id])
        resp = self.client.post(url, data={'reconciled': True}, content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        self.l.refresh_from_db()
        self.assertTrue(self.l.reconciled)
        self.assertIsNotNone(self.l.reconciled_at)

        # undo
        resp = self.client.post(url, data={'reconciled': False}, content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        self.l.refresh_from_db()
        self.assertFalse(self.l.reconciled)
        self.assertIsNone(self.l.reconciled_at)
