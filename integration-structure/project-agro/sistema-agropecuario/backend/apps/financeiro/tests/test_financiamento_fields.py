from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.financeiro.models import ContaBancaria
from apps.core.models import Tenant

User = get_user_model()

class FinanciamentoFieldsTest(TestCase):
    def setUp(self):
        from apps.comercial.models import InstituicaoFinanceira
        self.tenant = Tenant.objects.create(
            nome='test_tenant_financeiro_fields',
            slug='test-tenant-financeiro-fields'
        )
        self.user = User.objects.create_user('tester', 'tester@example.com', 'pw', )
        self.client.force_login(self.user)
        # create required related objects
        self.conta = ContaBancaria.objects.create(banco='Banco', agencia='0001', conta='12345', )
        self.inst, _ = InstituicaoFinanceira.objects.get_or_create(codigo_bacen='998', defaults={'nome': 'Inst Test'})

    def test_create_financiamento_requires_conta_destino(self):
        payload = {
            'titulo': 'Fin Mod A',
            'descricao': 'Teste',
            'valor_total': '10000.00',
            'valor_financiado': '9000.00',
            'taxa_juros': '1.5',
            'numero_parcelas': 10,
            'prazo_meses': 10,
            'data_contratacao': '2026-01-01',
            'data_primeiro_vencimento': '2026-02-01',
            'tipo_financiamento': 'custeio',
            'instituicao_financeira': self.inst.id
        }
        res = self.client.post('/api/financeiro/financiamentos/', payload, format='json')
        # expect validation error due to missing conta_destino
        self.assertEqual(res.status_code, 400)
        self.assertIn('conta_destino', str(res.data))

    def test_create_financiamento_with_optional_fields(self):
        payload = {
            'titulo': 'Fin Mod B',
            'descricao': 'Teste B',
            'valor_total': '20000.00',
            'valor_entrada': '1000.00',
            'valor_financiado': '19000.00',
            'taxa_juros': '2.0',
            'numero_parcelas': 12,
            'prazo_meses': 12,
            'data_contratacao': '2026-01-01',
            'data_primeiro_vencimento': '2026-02-01',
            'tipo_financiamento': 'investimento',
            'instituicao_financeira': self.inst.id,
            'conta_destino': self.conta.id,
            'garantias': 'Garantia ABC',
            'taxa_multa': '0.5',
            'taxa_mora': '0.25',
            'observacoes': 'Observações teste'
        }
        res = self.client.post('/api/financeiro/financiamentos/', payload, format='json')
        if res.status_code != 201:
            print('DEBUG RESPONSE', res.status_code, res.data)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['conta_destino'], self.conta.id)
        self.assertEqual(res.data['garantias'], 'Garantia ABC')