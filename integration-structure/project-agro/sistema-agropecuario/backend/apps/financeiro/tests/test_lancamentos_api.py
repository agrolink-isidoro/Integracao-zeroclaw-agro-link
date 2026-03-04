from django.test import TestCase
from apps.financeiro.models import ContaBancaria, LancamentoFinanceiro
from django.contrib.auth import get_user_model
from django.urls import reverse

class LancamentosApiTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='apiuser', password='test', is_staff=True)
        self.client.force_login(self.user)
        self.conta = ContaBancaria.objects.create(banco='Teste', agencia='0001', conta='12345', saldo_inicial=0)

    def test_list_lancamentos(self):
        LancamentoFinanceiro.objects.create(conta=self.conta, tipo='saida', valor=100, data='2026-01-01', descricao='Teste')
        url = reverse('lancamentos-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # expecting paginated result or list; ensure at least one found
        if isinstance(data, dict) and 'results' in data:
            results = data['results']
        else:
            results = data
        self.assertTrue(len(results) >= 1)
