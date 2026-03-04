from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from apps.financeiro.models import RateioCusto

User = get_user_model()


class RateioSignalsTests(TestCase):
    def test_rateio_creation_creates_pending_approval(self):
        creator = User.objects.create_user(username='creator')
        rateio = RateioCusto.objects.create(titulo='Signal Rateio', descricao='desc', valor_total=200.00, criado_por=creator)

        self.assertTrue(hasattr(rateio, 'approval'))
        self.assertEqual(rateio.approval.status, 'pending')
        self.assertEqual(rateio.approval.criado_por.username, 'creator')

    def test_rateio_auto_approve_when_creator_in_approver_group(self):
        approver = User.objects.create_user(username='approver')
        group, _ = Group.objects.get_or_create(name='financeiro.rateio_approver')
        approver.groups.add(group)

        rateio = RateioCusto.objects.create(titulo='AutoApprove Rateio', descricao='desc', valor_total=500.00, criado_por=approver)

        self.assertTrue(hasattr(rateio, 'approval'))
        self.assertEqual(rateio.approval.status, 'approved')
        self.assertEqual(rateio.approval.aprovado_por.username, 'approver')
