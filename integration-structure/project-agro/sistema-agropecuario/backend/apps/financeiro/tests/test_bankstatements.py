import pytest
from django.contrib.auth import get_user_model
from apps.financeiro.models import BankStatementImport, BankTransaction, ContaBancaria
from apps.core.models import Tenant

User = get_user_model()

@pytest.mark.django_db
def test_create_bank_statement_import_and_transactions(db):
    tenant = Tenant.objects.create(nome='test_tenant_bankstatements', slug='test-tenant-bankstatements')
    user = User.objects.create(username='testuser', tenant=tenant)
    conta = ContaBancaria.objects.create(banco='Test Bank', conta='1234', tenant=tenant)

    imp = BankStatementImport.objects.create(conta=conta, formato='csv', criado_por=user, arquivo_hash='abc123', tenant=tenant)
    assert imp.id is not None
    assert imp.status == 'pending'

    tx = BankTransaction.objects.create(importacao=imp, external_id='ext-1', amount=100.50, description='Pago', date='2026-01-01', tenant=tenant)
    assert tx.importacao == imp
    assert str(tx.amount).startswith('100')

@pytest.mark.django_db
def test_duplicate_hash_allowed_but_indexed(db):
    tenant = Tenant.objects.create(nome='test_tenant_bankstatements_2', slug='test-tenant-bankstatements-2')
    conta = ContaBancaria.objects.create(banco='Test Bank', conta='4321', tenant=tenant)
    imp1 = BankStatementImport.objects.create(conta=conta, formato='csv', arquivo_hash='dup-hash', tenant=tenant)
    imp2 = BankStatementImport.objects.create(conta=conta, formato='csv', arquivo_hash='dup-hash', tenant=tenant)
    assert imp1.arquivo_hash == imp2.arquivo_hash
    # Uniqueness is not enforced at DB level here; dedupe logic will be in service layer
