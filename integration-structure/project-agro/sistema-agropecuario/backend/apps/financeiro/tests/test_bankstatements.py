import pytest
from django.contrib.auth import get_user_model
from apps.financeiro.models import BankStatementImport, BankTransaction, ContaBancaria

User = get_user_model()

@pytest.mark.django_db
def test_create_bank_statement_import_and_transactions(db):
    user = User.objects.create(username='testuser')
    conta = ContaBancaria.objects.create(banco='Test Bank', conta='1234')

    imp = BankStatementImport.objects.create(conta=conta, formato='csv', criado_por=user, arquivo_hash='abc123')
    assert imp.id is not None
    assert imp.status == 'pending'

    tx = BankTransaction.objects.create(importacao=imp, external_id='ext-1', amount=100.50, description='Pago', date='2026-01-01')
    assert tx.importacao == imp
    assert str(tx.amount).startswith('100')

@pytest.mark.django_db
def test_duplicate_hash_allowed_but_indexed(db):
    conta = ContaBancaria.objects.create(banco='Test Bank', conta='4321')
    imp1 = BankStatementImport.objects.create(conta=conta, formato='csv', arquivo_hash='dup-hash')
    imp2 = BankStatementImport.objects.create(conta=conta, formato='csv', arquivo_hash='dup-hash')
    assert imp1.arquivo_hash == imp2.arquivo_hash
    # Uniqueness is not enforced at DB level here; dedupe logic will be in service layer
