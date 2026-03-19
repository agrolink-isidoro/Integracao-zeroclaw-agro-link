from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from apps.financeiro.models import ContaBancaria, LancamentoFinanceiro, Transferencia, PaymentAllocation, Vencimento
from apps.financeiro.services import pagar_vencimentos_por_transferencia
from apps.multi_tenancy.models import Tenant

from apps.comercial.models import Fornecedor
from apps.fazendas.models import Proprietario

User = get_user_model()

class QuitarPorTransferenciaTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(nome='test_tenant_quitar_transferencia', slug='test-tenant-quitar-transferencia')
        self.user = User.objects.create_user('tester2', 't2@example.com', 'pw', tenant=self.tenant)
        self.c1 = ContaBancaria.objects.create(banco='Banco A', agencia='0001', conta='1111', saldo_inicial=Decimal('10000'), tenant=self.tenant)
        self.c2 = ContaBancaria.objects.create(banco='Banco B', agencia='0002', conta='2222', saldo_inicial=Decimal('500'), tenant=self.tenant)
        self.v1 = Vencimento.objects.create(titulo='Fatura 1', valor=Decimal('150.00'), data_vencimento='2026-02-01', criado_por=self.user, tenant=self.tenant)
        self.v2 = Vencimento.objects.create(titulo='Fatura 2', valor=Decimal('75.00'), data_vencimento='2026-02-05', criado_por=self.user, tenant=self.tenant)

    def test_quitar_por_transferencia_pix_sets_settled_and_marks_vencimento_paid(self):
        dados = {
            'pix_key': 'chave_dest',
            'conta_destino': self.c2.id,
            'pix_key_origem': 'chave_origem',
            'pix_key_destino': 'chave_dest'
        }

        transfer = pagar_vencimentos_por_transferencia(
            conta_origem=self.c1,
            itens=[{'vencimento': self.v1.id, 'valor': '150.00'}],
            tipo='pix',
            dados_bancarios=dados,
            criado_por=self.user,
            client_tx_id='ext-123'
        )

        self.assertIsInstance(transfer, Transferencia)
        self.assertEqual(transfer.status, 'settled')
        self.v1.refresh_from_db()
        self.assertEqual(self.v1.status, 'pago')
        # allocation created
        self.assertTrue(PaymentAllocation.objects.filter(transferencia=transfer, vencimento=self.v1).exists())
        # lancamentos
        self.assertTrue(LancamentoFinanceiro.objects.filter(tipo='saida', conta=self.c1, valor=Decimal('150.00')).exists())

    def test_quitar_por_transferencia_ted_leaves_pending_and_annotations(self):
        dados = {
            'conta_destino': self.c2.id
        }
        transfer = pagar_vencimentos_por_transferencia(
            conta_origem=self.c1,
            itens=[{'vencimento': self.v2.id, 'valor': '75.00'}],
            tipo='ted',
            dados_bancarios=dados,
            criado_por=self.user
        )

        self.assertEqual(transfer.status, 'pending')
        self.v2.refresh_from_db()
        self.assertEqual(self.v2.status, 'pendente')
        self.assertIn('Pagamento pendente por transferencia', self.v2.descricao)

    def test_idempotency_client_tx_id(self):
        dados = {'pix_key': 'ch1', 'conta_destino': self.c2.id}
        t1 = pagar_vencimentos_por_transferencia(self.c1, [{'vencimento': self.v1.id, 'valor': '150.00'}], tipo='pix', dados_bancarios=dados, criado_por=self.user, client_tx_id='same-id')
        t2 = pagar_vencimentos_por_transferencia(self.c1, [{'vencimento': self.v1.id, 'valor': '150.00'}], tipo='pix', dados_bancarios=dados, criado_por=self.user, client_tx_id='same-id')
        self.assertEqual(t1.id, t2.id)
        allocations = PaymentAllocation.objects.filter(transferencia=t1)
        # only one allocation should exist (idempotent)
        self.assertEqual(allocations.count(), 1)
