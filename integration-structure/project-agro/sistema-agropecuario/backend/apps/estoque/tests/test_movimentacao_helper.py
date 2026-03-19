from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from django.core.exceptions import ValidationError

from apps.estoque.models import Produto, MovimentacaoStatement
from apps.estoque.services import create_movimentacao
from apps.multi_tenancy.models import Tenant

User = get_user_model()


class MovimentacaoHelperTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_estoque_helper',
            slug='test-tenant-estoque-helper'
        )
    
    def test_create_entrada_sets_snapshots_and_statement(self):
        user = User.objects.create(username='tester', tenant=self.tenant)
        p = Produto.objects.create(codigo='P-ENT', nome='Produto Entrada', unidade='kg', quantidade_estoque=Decimal('10'), tenant=self.tenant)

        m = create_movimentacao(produto=p, tipo='entrada', quantidade=Decimal('5'), valor_unitario=Decimal('2.50'), criado_por=user, tenant=self.tenant)

        self.assertEqual(m.saldo_anterior, Decimal('10'))
        self.assertEqual(m.saldo_posterior, Decimal('15'))

        p.refresh_from_db()
        self.assertEqual(p.quantidade_estoque, Decimal('15'))

        stmt = MovimentacaoStatement.objects.filter(movimentacao=m).first()
        self.assertIsNotNone(stmt)
        self.assertEqual(stmt.saldo_posterior, Decimal('15'))
        self.assertEqual(stmt.saldo_anterior, Decimal('10'))

    def test_create_saida_blocks_negative(self):
        user = User.objects.create(username='tester2', tenant=self.tenant)
        p = Produto.objects.create(codigo='P-SAI', nome='Produto Saida', unidade='kg', quantidade_estoque=Decimal('2'), tenant=self.tenant)

        with self.assertRaises(ValidationError):
            create_movimentacao(produto=p, tipo='saida', quantidade=Decimal('5'), criado_por=user, tenant=self.tenant)

        p.refresh_from_db()
        self.assertEqual(p.quantidade_estoque, Decimal('2'))

    def test_create_saida_allows_negative_with_flag(self):
        user = User.objects.create(username='tester3')
        p = Produto.objects.create(codigo='P-SAI2', nome='Produto Saida2', unidade='kg', quantidade_estoque=Decimal('2'))

        m = create_movimentacao(produto=p, tipo='saida', quantidade=Decimal('5'), criado_por=user, allow_negative=True)
        self.assertEqual(m.saldo_anterior, Decimal('2'))
        self.assertEqual(m.saldo_posterior, Decimal('-3'))
        p.refresh_from_db()
        self.assertEqual(p.quantidade_estoque, Decimal('-3'))
