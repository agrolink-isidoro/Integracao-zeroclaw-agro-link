from django.test import TestCase
from decimal import Decimal
from django.contrib.auth import get_user_model
from apps.administrativo.models import FolhaPagamento, FolhaPagamentoItem, Funcionario
from apps.financeiro.models import ContaBancaria, Transferencia, PaymentAllocation, Vencimento

from django.urls import reverse

User = get_user_model()

class FolhaPagarPorTransferenciaAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('paytester', 'p@example.com', 'pw')
        self.client.force_login(self.user)
        self.c1 = ContaBancaria.objects.create(banco='Banco A', agencia='0001', conta='1111', saldo_inicial=Decimal('10000'))
        self.func1 = Funcionario.objects.create(nome='Alice', cpf='123', salario_bruto=Decimal('2000.00'))
        self.func2 = Funcionario.objects.create(nome='Bob', cpf='456', salario_bruto=Decimal('1500.00'))
        self.folha = FolhaPagamento.objects.create(descricao='Folha Jan', periodo_ano=2026, periodo_mes=1)
        self.item1 = FolhaPagamentoItem.objects.create(folha=self.folha, funcionario=self.func1, liquido=Decimal('150.00'))
        self.item2 = FolhaPagamentoItem.objects.create(folha=self.folha, funcionario=self.func2, liquido=Decimal('75.00'))

    def test_pagar_folha_batch_creates_transfers_and_vencimentos(self):
        url = reverse('folha-pagamento-pagar-por-transferencia', kwargs={'pk': self.folha.id})
        payload = {
            'conta_origem': self.c1.id,
            'pagamentos': [
                {'funcionario_id': self.func1.id, 'valor': '150.00', 'forma': 'pix', 'dados_bancarios_override': {'pix_key': 'ch1', 'conta_destino': self.c1.id}},
                {'funcionario_id': self.func2.id, 'valor': '75.00', 'forma': 'ted', 'dados_bancarios_override': {'conta_destino': self.c1.id}}
            ]
        }
        resp = self.client.post(url, payload, content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('results', data)
        res1 = data['results'][0]
        self.assertTrue(res1['success'])
        t1 = Transferencia.objects.get(pk=res1['transfer_id'])
        self.assertEqual(t1.status, 'settled')
        # allocation created
        self.assertTrue(PaymentAllocation.objects.filter(transferencia=t1).exists())

    def test_error_reported_for_bad_data(self):
        url = reverse('folha-pagamento-pagar-por-transferencia', kwargs={'pk': self.folha.id})
        payload = {'conta_origem': 9999, 'pagamentos': [{'funcionario_id': self.func1.id, 'valor': '150.00'}]}
        resp = self.client.post(url, payload, content_type='application/json')
        self.assertEqual(resp.status_code, 400)
