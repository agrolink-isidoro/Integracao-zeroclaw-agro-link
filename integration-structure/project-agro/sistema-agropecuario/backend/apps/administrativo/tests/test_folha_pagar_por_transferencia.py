from django.test import TestCase
from decimal import Decimal
from django.contrib.auth import get_user_model
from apps.administrativo.models import FolhaPagamento, FolhaPagamentoItem, Funcionario
from apps.financeiro.models import ContaBancaria, Transferencia, PaymentAllocation, Vencimento
from apps.multi_tenancy.models import Tenant
from apps.fazendas.models import Proprietario, Fazenda

from django.urls import reverse

User = get_user_model()


class TenantTestCase(TestCase):
    """Base class para testes com multi-tenancy"""
    def setUp(self):
        super().setUp()
        self.tenant, _ = Tenant.objects.get_or_create(
            nome="test_tenant_" + self.__class__.__name__,
            defaults={"slug": f"test-{self.__class__.__name__.lower()}"}
        )
        self.proprietario, _ = Proprietario.objects.get_or_create(
            tenant=self.tenant,
            nome="Test Owner",
            cpf_cnpj="00000000000",
            defaults={"email": "owner@test.local", "telefone": "11999999999"}
        )
        self.user = User.objects.create(
            username=f'user_{self.__class__.__name__}',
            email='user@test.local',
            tenant=self.tenant
        )
        self.fazenda, _ = Fazenda.objects.get_or_create(
            tenant=self.tenant,
            name="Test Farm",
            proprietario=self.proprietario,
            defaults={"matricula": "TEST-FARM-001"}
        )
        self.client.force_login(self.user)


class FolhaPagarPorTransferenciaAPITests(TenantTestCase):
    def setUp(self):
        super().setUp()
        # Now self.user, self.tenant, self.fazenda are available
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
