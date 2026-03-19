from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.estoque.services import create_movimentacao, reserve_operacao_stock, commit_reservations_for_operacao, release_reservations_for_operacao
from apps.estoque.models import Produto, MovimentacaoEstoque
from apps.agricultura.models import Operacao, OperacaoProduto
from datetime import date
from apps.core.models import CustomUser
from apps.multi_tenancy.models import Tenant


class ReservationTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_estoque_reservations',
            slug='test-tenant-estoque-reservations'
        )
        self.user = CustomUser.objects.create(username='tester', tenant=self.tenant)
        self.prod = Produto.objects.create(codigo='P1', nome='Produto 1', unidade='kg', quantidade_estoque=Decimal('10'), estoque_minimo=Decimal('0'), tenant=self.tenant)

    def test_create_reservation_success(self):
        # Reserve 4 units
        m = create_movimentacao(produto=self.prod, tipo='reserva', quantidade=Decimal('4'), criado_por=self.user)
        self.prod.refresh_from_db()
        self.assertEqual(self.prod.quantidade_reservada, Decimal('4'))
        self.assertEqual(m.tipo, 'reserva')

    def test_create_reservation_insufficient(self):
        self.prod.quantidade_estoque = Decimal('3')
        self.prod.save()
        with self.assertRaises(ValidationError):
            create_movimentacao(produto=self.prod, tipo='reserva', quantidade=Decimal('5'), criado_por=self.user)

    def test_commit_reservation_flow(self):
        # Create operation and item
        op = Operacao.objects.create(categoria='plantio', tipo='plantio_semeadura', status='planejada', data_operacao=date.today())
        item = OperacaoProduto.objects.create(operacao=op, produto=self.prod, dosagem=Decimal('4'), unidade_dosagem='kg/ha')
        # Force quantidade_total for the test (use update to avoid recompute in save)
        OperacaoProduto.objects.filter(pk=item.pk).update(quantidade_total=Decimal('4'))

        # Reserve
        reserve_operacao_stock(op, criado_por=self.user)
        self.prod.refresh_from_db()
        self.assertEqual(self.prod.quantidade_reservada, Decimal('4'))

        # Commit
        commit_reservations_for_operacao(op, criado_por=self.user)
        self.prod.refresh_from_db()
        self.assertEqual(self.prod.quantidade_reservada, Decimal('0'))
        self.assertEqual(self.prod.quantidade_estoque, Decimal('6'))

        # Check that movements exist: reservation + liberacao + saida linked to the operacao
        movimientos = MovimentacaoEstoque.objects.filter(operacao=op).order_by('id')
        self.assertEqual(movimientos.count(), 3)
        tipos = list(movimientos.values_list('tipo', flat=True))
        self.assertEqual(tipos, ['reserva', 'liberacao', 'saida'])

    def test_release_reservation_on_cancel(self):
        op = Operacao.objects.create(categoria='plantio', tipo='plantio_semeadura', status='planejada', data_operacao=date.today())
        item = OperacaoProduto.objects.create(operacao=op, produto=self.prod, dosagem=Decimal('2'), unidade_dosagem='kg/ha')
        OperacaoProduto.objects.filter(pk=item.pk).update(quantidade_total=Decimal('2'))

        reserve_operacao_stock(op, criado_por=self.user)
        self.prod.refresh_from_db()
        self.assertEqual(self.prod.quantidade_reservada, Decimal('2'))

        release_reservations_for_operacao(op, criado_por=self.user)
        self.prod.refresh_from_db()
        self.assertEqual(self.prod.quantidade_reservada, Decimal('0'))
