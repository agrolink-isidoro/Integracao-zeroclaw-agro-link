from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from apps.financeiro.models import ContaBancaria, LancamentoFinanceiro, Transferencia
from apps.financeiro.services import transferir_entre_contas
from apps.comercial.models import Fornecedor
from apps.fazendas.models import Proprietario
from apps.multi_tenancy.models import Tenant

User = get_user_model()

class TransferenciasTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(nome='test_tenant_transferencias', slug='test-tenant-transferencias')
        self.user = User.objects.create_user('tester', 't@example.com', 'pw', tenant=self.tenant)
        self.c1 = ContaBancaria.objects.create(banco='Banco A', agencia='0001', conta='1111', saldo_inicial=Decimal('10000'), tenant=self.tenant)
        self.c2 = ContaBancaria.objects.create(banco='Banco B', agencia='0002', conta='2222', saldo_inicial=Decimal('500'), tenant=self.tenant)
        self.prop = Proprietario.objects.create(nome='Produtor Test', cpf_cnpj='00000000', tenant=self.tenant)
        self.fornecedor = Fornecedor.objects.create(nome='Fornecedor X', cpf_cnpj='11111111', tenant=self.tenant)

    def test_transferencia_doc_between_accounts_creates_lancamentos(self):
        t = transferir_entre_contas(self.c1, self.c2, Decimal('150.00'), tipo='doc', criado_por=self.user, descricao='Teste DOC')
        self.assertIsInstance(t, Transferencia)
        # two lancamentos should be created referencing the transfer
        lancs = LancamentoFinanceiro.objects.filter(origem_content_type__model='transferencia', origem_object_id=t.id)
        self.assertEqual(lancs.count(), 2)
        self.assertTrue(LancamentoFinanceiro.objects.filter(conta=self.c1, tipo='saida', valor=Decimal('150.00')).exists())
        self.assertTrue(LancamentoFinanceiro.objects.filter(conta=self.c2, tipo='entrada', valor=Decimal('150.00')).exists())

    def test_transferencia_pix_requires_pix_keys(self):
        # Creating PIX without keys should raise at service level
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValueError):
            transferir_entre_contas(self.c1, self.c2, Decimal('50.00'), tipo='pix', criado_por=self.user)

        # Valid creation when keys are provided
        t = transferir_entre_contas(self.c1, self.c2, Decimal('50.00'), tipo='pix', criado_por=self.user, pix_key_origem='chaveA', pix_key_destino='chaveB')
        self.assertEqual(t.tipo_transferencia, 'pix')
        self.assertEqual(t.pix_key_origem, 'chaveA')
        self.assertEqual(t.pix_key_destino, 'chaveB')

    def test_transferencia_pix_serializer_validation(self):
        """Ensure API serializer rejects PIX without keys"""
        from apps.financeiro.serializers import TransferenciaSerializer
        data = {
            'conta_origem': self.c1.id,
            'conta_destino': self.c2.id,
            'tipo_transferencia': 'pix',
            'valor': '10.00'
        }
        ser = TransferenciaSerializer(data=data)
        self.assertFalse(ser.is_valid())
        self.assertIn('pix_key_origem', ser.errors)
        self.assertIn('pix_key_destino', ser.errors)

    def test_transferencia_between_titulares(self):
        # origem titular: proprietario; destino titular: fornecedor
        t = transferir_entre_contas(self.c1, self.c2, Decimal('60.00'), tipo='ted', criado_por=self.user, origem_ct=Proprietario, origem_obj=self.prop, destino_ct=Fornecedor, destino_obj=self.fornecedor)
        self.assertEqual(t.origem, self.prop)
        self.assertEqual(t.destino, self.fornecedor)