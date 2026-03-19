from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from apps.financeiro.models import ContaBancaria, Vencimento, Transferencia, LancamentoFinanceiro, PaymentAllocation
from apps.financeiro.services import pagar_vencimentos_por_transferencia, marcar_transferencia_settled
from apps.multi_tenancy.models import Tenant

User = get_user_model()

class TransferenciaSettledTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_financeiro_settled',
            slug='test-tenant-financeiro-settled'
        )
        self.user = User.objects.create_user('settleuser', 's@example.com', 'pw', tenant=self.tenant)
        self.c1 = ContaBancaria.objects.create(banco='Banco A', agencia='0001', conta='1111', saldo_inicial=Decimal('1000'), tenant=self.tenant)
        self.c2 = ContaBancaria.objects.create(banco='Banco B', agencia='0002', conta='2222', saldo_inicial=Decimal('500'), tenant=self.tenant)
        self.v = Vencimento.objects.create(titulo='Venc A', valor=Decimal('120.00'), data_vencimento='2026-03-01', tenant=self.tenant)

    def test_mark_settled_changes_status_and_marks_vencimento(self):
        # create pending transfer via TED
        transfer = pagar_vencimentos_por_transferencia(self.c1, [{'vencimento': self.v.id, 'valor': '120.00'}], tipo='ted', dados_bancarios={'conta_destino': self.c2.id}, criado_por=self.user)
        self.assertEqual(transfer.status, 'pending')
        # there should be allocation
        self.assertTrue(PaymentAllocation.objects.filter(transferencia=transfer, vencimento=self.v).exists())

        trans2 = marcar_transferencia_settled(transfer, external_reference='bank-abc', criado_por=self.user)
        self.assertEqual(trans2.status, 'settled')
        self.v.refresh_from_db()
        self.assertEqual(self.v.status, 'pago')
        # ensure entrada lancamento exists
        self.assertTrue(LancamentoFinanceiro.objects.filter(origem_content_type__model='transferencia', origem_object_id=transfer.id, tipo='entrada').exists())

    def test_mark_settled_idempotent(self):
        transfer = pagar_vencimentos_por_transferencia(self.c1, [{'vencimento': self.v.id, 'valor': '120.00'}], tipo='ted', dados_bancarios={'conta_destino': self.c2.id}, criado_por=self.user)
        t1 = marcar_transferencia_settled(transfer, external_reference='x')
        t2 = marcar_transferencia_settled(transfer, external_reference='x')
        self.assertEqual(t1.id, t2.id)
        self.assertEqual(t1.status, 'settled')
