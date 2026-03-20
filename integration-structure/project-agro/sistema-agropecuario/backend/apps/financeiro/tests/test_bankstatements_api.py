from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
import io
from apps.financeiro.models import ContaBancaria, BankStatementImport, BankTransaction
from apps.core.models import Tenant


class BankStatementAPI(TestCase):
    def setUp(self):
        User = get_user_model()
        self.tenant = Tenant.objects.create(nome='test_tenant_bankstatements_api', slug='test-tenant-bankstatements-api')
        self.user = User.objects.create_user(username='api_user', password='p', is_staff=False, tenant=self.tenant)
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.conta = ContaBancaria.objects.create(banco='Test Bank', conta='999', tenant=self.tenant)

    def _make_csv(self):
        csv = 'date,amount,description,external_id,balance\n'
        csv += '2026-01-01,100.50,Pagamento A,ext-1,1000.50\n'
        csv += '2026-01-02,200.00,Pagamento B,ext-2,1200.50\n'
        return csv.encode('utf-8')

    def test_dry_run_preview(self):
        data = {
            'conta': str(self.conta.id),
            'dry_run': 'true'
        }
        filedata = SimpleUploadedFile('stmt.csv', self._make_csv(), content_type='text/csv')
        resp = self.client.post('/api/financeiro/bank-statements/', {**data, 'arquivo': filedata}, format='multipart')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('preview', resp.data)
        self.assertEqual(len(resp.data['preview']), 2)
        self.assertIn('arquivo_hash', resp.data)

    def test_create_import_and_transactions(self):
        filedata = SimpleUploadedFile('stmt.csv', self._make_csv(), content_type='text/csv')

        # Patch Celery enqueue to run synchronously during tests
        from unittest.mock import patch
        def fake_apply_async(args=None, kwargs=None, **_):
            from apps.financeiro.services import process_bank_statement_import
            process_bank_statement_import(args[0])
            class R: pass
            R.id = 'mock-job'
            return R()

        with patch('apps.financeiro.tasks.process_bank_statement_import_task.apply_async', side_effect=fake_apply_async):
            resp = self.client.post('/api/financeiro/bank-statements/', {'conta': str(self.conta.id), 'arquivo': filedata}, format='multipart')

        self.assertIn(resp.status_code, (201, 202))
        self.assertTrue(BankStatementImport.objects.filter(conta=self.conta).exists())
        imp = BankStatementImport.objects.filter(conta=self.conta).first()
        # after processing (fake sync), it should be success
        imp.refresh_from_db()
        self.assertEqual(imp.rows_count, 2)
        self.assertEqual(imp.status, 'success')
        self.assertEqual(imp.transactions.count(), 2)

    def test_idempotent_duplicate_upload(self):
        # first upload (fake Celery runs synchronously)
        filedata = SimpleUploadedFile('stmt.csv', self._make_csv(), content_type='text/csv')
        from unittest.mock import patch
        def fake_apply_async(args=None, kwargs=None, **_):
            from apps.financeiro.services import process_bank_statement_import
            process_bank_statement_import(args[0])
            class R: pass
            R.id = 'job-1'
            return R()

        with patch('apps.financeiro.tasks.process_bank_statement_import_task.apply_async', side_effect=fake_apply_async):
            resp1 = self.client.post('/api/financeiro/bank-statements/', {'conta': str(self.conta.id), 'arquivo': filedata}, format='multipart')
        self.assertIn(resp1.status_code, (201, 202))

        # second upload same file should be deduped and return existing import
        filedata2 = SimpleUploadedFile('stmt.csv', self._make_csv(), content_type='text/csv')
        resp2 = self.client.post('/api/financeiro/bank-statements/', {'conta': str(self.conta.id), 'arquivo': filedata2}, format='multipart')
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.data.get('detail'), 'already_imported')
        self.assertIn('import', resp2.data)

    def test_parsing_edge_cases(self):
        csv = 'date,amount,description,external_id,balance\n'
        csv += '01/02/2026,1.234,56,Pagamento A,ext-1,1.234,56\n'
        # fix to valid row with amount in Brazilian format (1.234,56)
        csv = 'date,amount,description,external_id,balance\n'
        csv += '01/02/2026,1.234,56,Pagamento A,ext-1,1.234,56\n'
        # but SimpleUploadedFile expects bytes; use a correctly formatted amount
        csv = 'date,amount,description,external_id,balance\n'
        csv += '01/02/2026,"1.234,56",Pagamento A,ext-1,"1.234,56"\n'
        filedata = SimpleUploadedFile('stmt2.csv', csv.encode('utf-8'), content_type='text/csv')

        # patch apply_async to run sync
        from unittest.mock import patch
        def fake_apply_async(args=None, kwargs=None, **_):
            from apps.financeiro.services import process_bank_statement_import
            process_bank_statement_import(args[0])
            class R: pass
            R.id = 'mock-job2'
            return R()

        with patch('apps.financeiro.tasks.process_bank_statement_import_task.apply_async', side_effect=fake_apply_async):
            resp = self.client.post('/api/financeiro/bank-statements/', {'conta': str(self.conta.id), 'arquivo': filedata}, format='multipart')

        self.assertIn(resp.status_code, (201, 202))
        imp = BankStatementImport.objects.filter(conta=self.conta).order_by('-id').first()
        imp.refresh_from_db()
        self.assertEqual(imp.rows_count, 1)
        tx = imp.transactions.first()
        from decimal import Decimal
        # Expect amount parsed to 1234.56
        self.assertEqual(tx.amount, Decimal('1234.56'))

    def test_serializer_includes_transactions(self):
        imp = BankStatementImport.objects.create(conta=self.conta, formato='csv', arquivo_hash='h1')
        BankTransaction.objects.create(importacao=imp, external_id='x', amount=10)
        from apps.financeiro.serializers import BankStatementImportSerializer
        ser = BankStatementImportSerializer(imp)
        self.assertIn('transactions', ser.data)
        self.assertEqual(len(ser.data['transactions']), 1)

    def test_extrato_endpoint_returns_balance_and_transactions(self):
        from apps.financeiro.models import BankTransaction, LancamentoFinanceiro
        # set initial balance and create lancamentos
        self.conta.saldo_inicial = 1000
        self.conta.save()
        LancamentoFinanceiro.objects.create(conta=self.conta, tipo='entrada', valor=500, data='2026-01-01')
        LancamentoFinanceiro.objects.create(conta=self.conta, tipo='saida', valor=200, data='2026-01-02')

        # create bank transaction import and tx
        imp = BankStatementImport.objects.create(conta=self.conta, formato='csv', criado_por=self.user, arquivo_hash='h1')
        BankTransaction.objects.create(importacao=imp, external_id='tx1', amount=250, description='Bank tx', date='2026-01-01')

        resp = self.client.get(f'/api/financeiro/contas/{self.conta.id}/extrato/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # saldo = saldo_inicial + entradas - saidas = 1000 + 500 - 200 = 1300
        self.assertIn(str(data['saldo']), ['1300','1300.00'])
        self.assertTrue('lancamentos' in data)
        self.assertTrue('bank_transactions' in data)