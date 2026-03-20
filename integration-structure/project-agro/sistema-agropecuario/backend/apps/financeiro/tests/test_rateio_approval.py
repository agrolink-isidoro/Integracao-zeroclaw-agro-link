from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.financeiro.models import RateioCusto, RateioApproval
from apps.core.models import Tenant

User = get_user_model()


class RateioApprovalTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_financeiro_approval',
            slug='test-tenant-financeiro-approval'
        )
    
    def test_request_and_approve_rateio(self):
        u = User.objects.create_user(username='creator', tenant=self.tenant)
        approver = User.objects.create_user(username='approver', tenant=self.tenant)

        rateio = RateioCusto.objects.create(titulo='Test Rateio', descricao='Desc', valor_total=1000.00, tenant=self.tenant)
        approval, _ = RateioApproval.objects.get_or_create(rateio=rateio, defaults={'criado_por': u})

        self.assertEqual(approval.status, 'pending')

        approval.approve(approver, comentario='Ok')
        approval.refresh_from_db()
        self.assertEqual(approval.status, 'approved')
        self.assertEqual(approval.aprovado_por.username, 'approver')

    def test_reject_rateio(self):
        u = User.objects.create_user(username='creator2', tenant=self.tenant)
        approver = User.objects.create_user(username='approver2', tenant=self.tenant)

        rateio = RateioCusto.objects.create(titulo='Test Rateio 2', descricao='Desc', valor_total=500.00, tenant=self.tenant)
        approval, _ = RateioApproval.objects.get_or_create(rateio=rateio, defaults={'criado_por': u})

        approval.reject(approver, comentario='Wrong values')
        approval.refresh_from_db()
        self.assertEqual(approval.status, 'rejected')
        self.assertEqual(approval.aprovado_por.username, 'approver2')
