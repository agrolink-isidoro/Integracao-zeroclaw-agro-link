from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.financeiro.services import quitar_vencimento
from apps.financeiro.models import Vencimento, LancamentoFinanceiro

User = get_user_model()


class QuitacaoServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester')

    def test_quitar_full_payment_creates_lancamento_and_marks_paid(self):
        v = Vencimento.objects.create(titulo='V1', valor=100.00, data_vencimento=timezone.now().date(), tipo='despesa', criado_por=self.user)
        lanc = quitar_vencimento(v, self.user)
        self.assertIsNotNone(lanc)
        v.refresh_from_db()
        self.assertEqual(v.status, 'pago')
        self.assertIsNotNone(v.data_pagamento)
        self.assertTrue(LancamentoFinanceiro.objects.filter(origem_object_id=v.id).exists())

    def test_quitar_partial_creates_split_vencimento(self):
        v = Vencimento.objects.create(titulo='V2', valor=100.00, data_vencimento=timezone.now().date(), tipo='despesa', criado_por=self.user)
        lanc = quitar_vencimento(v, self.user, valor_pago=40.00)
        self.assertIsNotNone(lanc)
        v.refresh_from_db()
        self.assertEqual(v.status, 'pago')
        self.assertAlmostEqual(float(v.valor), 40.00)
        # a new remanescente should exist
        self.assertTrue(Vencimento.objects.filter(titulo__contains='restante', valor=60.00).exists())

    def test_quitar_idempotent_returns_existing_lancamento(self):
        v = Vencimento.objects.create(titulo='V3', valor=50.00, data_vencimento=timezone.now().date(), tipo='despesa', criado_por=self.user)
        l1 = quitar_vencimento(v, self.user)
        l2 = quitar_vencimento(v, self.user)
        self.assertEqual(l1.id, l2.id)
        self.assertEqual(LancamentoFinanceiro.objects.filter(origem_object_id=v.id).count(), 1)
