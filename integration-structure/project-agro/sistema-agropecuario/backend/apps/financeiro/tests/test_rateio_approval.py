from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.financeiro.models import RateioCusto, RateioApproval

User = get_user_model()


class RateioApprovalTests(TestCase):
    def test_request_and_approve_rateio(self):
        u = User.objects.create_user(username='creator')
        approver = User.objects.create_user(username='approver')

        rateio = RateioCusto.objects.create(titulo='Test Rateio', descricao='Desc', valor_total=1000.00)
        approval, _ = RateioApproval.objects.get_or_create(rateio=rateio, defaults={'criado_por': u})

        self.assertEqual(approval.status, 'pending')

        approval.approve(approver, comentario='Ok')
        approval.refresh_from_db()
        self.assertEqual(approval.status, 'approved')
        self.assertEqual(approval.aprovado_por.username, 'approver')

    def test_reject_rateio(self):
        u = User.objects.create_user(username='creator2')
        approver = User.objects.create_user(username='approver2')

        rateio = RateioCusto.objects.create(titulo='Test Rateio 2', descricao='Desc', valor_total=500.00)
        approval, _ = RateioApproval.objects.get_or_create(rateio=rateio, defaults={'criado_por': u})

        approval.reject(approver, comentario='Wrong values')
        approval.refresh_from_db()
        self.assertEqual(approval.status, 'rejected')
        self.assertEqual(approval.aprovado_por.username, 'approver2')
