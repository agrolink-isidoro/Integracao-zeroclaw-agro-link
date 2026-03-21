from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.financeiro.models import ContaBancaria, Vencimento, Transferencia
from rest_framework.test import APIClient
from decimal import Decimal
from apps.core.models import Tenant

User = get_user_model()

class QuitarPorTransferenciaAPITests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_financeiro_quitacao_api',
            slug='test-tenant-financeiro-quitacao-api'
        )
        self.user = User.objects.create_user('apiuser', 'api@example.com', 'pw', tenant=self.tenant, is_staff=True, is_superuser=True)
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.c1 = ContaBancaria.objects.create(banco='Banco A', agencia='0001', conta='1111', saldo_inicial=Decimal('10000'), tenant=self.tenant)
        self.c2 = ContaBancaria.objects.create(banco='Banco B', agencia='0002', conta='2222', saldo_inicial=Decimal('500'), tenant=self.tenant)
        self.v = Vencimento.objects.create(titulo='Fatura API', valor=Decimal('120.00'), data_vencimento='2026-02-01', tenant=self.tenant)

    def test_quitar_por_transferencia_api_pix_success(self):
        payload = {
            'conta_origem': self.c1.id,
            'tipo_transferencia': 'pix',
            'dados_bancarios': {'pix_key': 'destpix', 'conta_destino': self.c2.id, 'pix_key_origem': 'origenpix', 'pix_key_destino': 'destpix'},
            'itens': [{'vencimento': self.v.id, 'valor': '120.00'}],
            'client_tx_id': 'api-123'
        }
        res = self.client.post('/api/financeiro/vencimentos/quitar_por_transferencia/', data=payload, format='json')
        if res.status_code != 201:
            print('response', res.status_code, res.data)
        self.assertEqual(res.status_code, 201)
        self.assertIn('id', res.data)
        t = Transferencia.objects.get(client_tx_id='api-123')
        self.assertEqual(t.status, 'settled')
