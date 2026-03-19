from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from apps.financeiro.models import ContaBancaria, Vencimento, Transferencia, BankStatementImport, BankTransaction, LancamentoFinanceiro
from apps.financeiro.services import pagar_vencimentos_por_transferencia, match_bank_transaction_to_transfer
from apps.multi_tenancy.models import Tenant

User = get_user_model()

class BankMatchingTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_financeiro_bank_matching',
            slug='test-tenant-financeiro-bank-matching'
        )
        self.user = User.objects.create_user('bm', 'bm@example.com', 'pw', tenant=self.tenant)
        self.c1 = ContaBancaria.objects.create(banco='Origem', agencia='0001', conta='1111', saldo_inicial=Decimal('1000'), tenant=self.tenant)
        self.c2 = ContaBancaria.objects.create(banco='Destino', agencia='0002', conta='2222', saldo_inicial=Decimal('0'), tenant=self.tenant)
        self.v = Vencimento.objects.create(titulo='Venc Match', valor=Decimal('200.00'), data_vencimento='2026-04-01', tenant=self.tenant)

    def test_match_by_external_id(self):
        # create pending transfer with external_reference empty
        transfer = pagar_vencimentos_por_transferencia(self.c1, [{'vencimento': self.v.id, 'valor': '200.00'}], tipo='ted', dados_bancarios={'conta_destino': self.c2.id}, criado_por=self.user, client_tx_id='tx-1')
        self.assertEqual(transfer.status, 'pending')
        imp = BankStatementImport.objects.create(conta=self.c2, formato='csv')
        tx = BankTransaction.objects.create(importacao=imp, external_id='bank-123', amount=Decimal('200.00'))

        # no match yet by external id because transfer.external_reference not set
        res = match_bank_transaction_to_transfer(tx)
        self.assertIsNone(res)

        # set external_reference on transfer and try again
        transfer.external_reference = 'bank-123'
        transfer.save()
        res2 = match_bank_transaction_to_transfer(tx)
        self.assertEqual(res2.id, transfer.id)
        transfer.refresh_from_db()
        self.assertEqual(transfer.status, 'settled')
        self.v.refresh_from_db()
        self.assertEqual(self.v.status, 'pago')
        # ensure entry lancamento exists
        self.assertTrue(LancamentoFinanceiro.objects.filter(origem_content_type__model='transferencia', origem_object_id=transfer.id, tipo='entrada').exists())

    def test_match_by_amount_date_conta(self):
        transfer = pagar_vencimentos_por_transferencia(self.c1, [{'vencimento': self.v.id, 'valor': '200.00'}], tipo='ted', dados_bancarios={'conta_destino': self.c2.id}, criado_por=self.user, client_tx_id='tx-2')
        self.assertEqual(transfer.status, 'pending')
        imp = BankStatementImport.objects.create(conta=self.c2, formato='csv')
        tx = BankTransaction.objects.create(importacao=imp, amount=Decimal('200.00'), date='2026-04-01')

        res = match_bank_transaction_to_transfer(tx)
        self.assertEqual(res.id, transfer.id)
        transfer.refresh_from_db()
        self.assertEqual(transfer.status, 'settled')
        self.v.refresh_from_db()
        self.assertEqual(self.v.status, 'pago')
