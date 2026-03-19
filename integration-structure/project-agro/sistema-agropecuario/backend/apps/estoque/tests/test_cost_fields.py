from django.test import TestCase
from apps.estoque.models import MovimentacaoEstoque, Produto
from django.contrib.auth import get_user_model
from apps.multi_tenancy.models import Tenant

User = get_user_model()

class MovimentacaoCostFieldsTest(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_estoque_cost',
            slug='test-tenant-estoque-cost'
        )
    
    def test_movimentacao_has_cost_fields(self):
        user = User.objects.create(username='u', tenant=self.tenant)
        p = Produto.objects.create(codigo='P1', nome='Produto 1', unidade='kg', tenant=self.tenant)
        m = MovimentacaoEstoque.objects.create(produto=p, tipo='saida', quantidade=10, criado_por=user, tenant=self.tenant)
        # fields exist and default to None/False
        self.assertIsNone(m.custo_alocado)
        self.assertFalse(m.pendente_rateio)
        self.assertIsNone(m.saldo_anterior)
        self.assertIsNone(m.saldo_posterior)
