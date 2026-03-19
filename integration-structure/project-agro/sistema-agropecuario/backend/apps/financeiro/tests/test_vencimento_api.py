from rest_framework.test import APIClient
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.financeiro.models import Vencimento
from apps.multi_tenancy.models import Tenant

User = get_user_model()


class VencimentoAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant = Tenant.objects.create(nome='test_tenant_vencimento_api', slug='test-tenant-vencimento-api')
        self.user = User.objects.create_user(username='vuser', tenant=self.tenant)
        Vencimento.objects.create(titulo='V1', valor=100, data_vencimento='2025-01-01', tipo='despesa', status='pendente', criado_por=self.user, tenant=self.tenant)
        Vencimento.objects.create(titulo='V2', valor=200, data_vencimento='2025-01-02', tipo='despesa', status='pago', criado_por=self.user, tenant=self.tenant)
        Vencimento.objects.create(titulo='V3', valor=50, data_vencimento='2025-01-03', tipo='despesa', status='atrasado', criado_por=self.user, tenant=self.tenant)

    def test_resumo_financeiro_endpoint(self):
        res = self.client.get('/api/financeiro/vencimentos/resumo_financeiro/')
        self.assertEqual(res.status_code, 200)
        json = res.json()
        self.assertIn('vencimentos', json)
        venc = json['vencimentos']
        self.assertIn('count_pendente', venc)
        self.assertEqual(venc['count_pendente'], 1)
        self.assertIn('total_pago', venc)

    def test_resumo_financeiro_with_financiamento(self):
        """Ensure resumo_financeiro handles Financiamento records without error and computes totals"""
        from apps.financeiro.services import resumo_financeiro
        from apps.comercial.models import InstituicaoFinanceira
        from apps.financeiro.models import Financiamento, ParcelaFinanciamento
        from decimal import Decimal

        inst = InstituicaoFinanceira.objects.create(nome='Inst Test', codigo_bacen='000')
        fin = Financiamento.objects.create(
            titulo='F1',
            valor_total=Decimal('5000.00'),
            valor_entrada=Decimal('0'),
            valor_financiado=Decimal('5000.00'),
            taxa_juros=Decimal('1.0'),
            frequencia_taxa='mensal',
            metodo_calculo='price',
            numero_parcelas=5,
            prazo_meses=5,
            data_contratacao='2026-01-01',
            data_primeiro_vencimento='2026-02-01',
            instituicao_financeira=inst,
            criado_por=self.user,
        )
        ParcelaFinanciamento.objects.create(
            financiamento=fin,
            numero_parcela=1,
            valor_parcela=Decimal('1000.00'),
            valor_pago=Decimal('0'),
            data_vencimento='2026-02-01'
        )

        resumo = resumo_financeiro()
        self.assertIn('financiamentos', resumo)
        fin_resumo = resumo['financiamentos']
        self.assertEqual(fin_resumo['total_financiado'], Decimal('5000.00'))
        self.assertEqual(fin_resumo['total_pendente'], Decimal('5000.00'))
