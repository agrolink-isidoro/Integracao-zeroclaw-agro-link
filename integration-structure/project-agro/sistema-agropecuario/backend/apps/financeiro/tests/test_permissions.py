from rest_framework.test import APIClient
from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class FinanceiroPermissionsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='user')

    def test_unauthenticated_cannot_list_financiamentos(self):
        res = self.client.get('/api/financeiro/financiamentos/')
        self.assertIn(res.status_code, (401, 403))

    def test_authenticated_can_list_financiamentos(self):
        self.client.force_authenticate(self.user)
        res = self.client.get('/api/financeiro/financiamentos/')
        self.assertEqual(res.status_code, 200)

    def test_unauthenticated_cannot_create_emprestimo(self):
        res = self.client.post('/api/financeiro/emprestimos/', {})
        self.assertIn(res.status_code, (401, 403))

    def test_authenticated_can_create_emprestimo(self):
        self.client.force_authenticate(self.user)
        payload = { 'titulo': 'T', 'valor_emprestimo': 100 }
        res = self.client.post('/api/financeiro/emprestimos/', payload)
        # either created or validation error, but not unauthorized
        self.assertNotIn(res.status_code, (401, 403))
