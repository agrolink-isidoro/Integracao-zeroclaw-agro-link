from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal

from apps.estoque.services import create_movimentacao
from apps.estoque.models import Produto, MovimentacaoEstoque, MovimentacaoStatement
from apps.agricultura.models import Cultura, Plantio
from apps.fazendas.models import Proprietario, Fazenda
from apps.core.models import Tenant

User = get_user_model()


class AutoRateioTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(nome='test_tenant_Auto_rateio', slug='test-tenant-auto-rateio')
        self.user = User.objects.create_user(username='u1', tenant=self.tenant)

    def test_movimentacao_with_plantio_and_custo_creates_rateio(self):
        p = Produto.objects.create(codigo='PR-1', nome='Produto', unidade='kg', quantidade_estoque=Decimal('10'), tenant=self.tenant)

        prop = Proprietario.objects.create(nome='Prop', cpf_cnpj='00011122233', tenant=self.tenant)
        faz = Fazenda.objects.create(proprietario=prop, name='Faz A', matricula='M1', tenant=self.tenant)
        cultura = Cultura.objects.create(nome='Soja', tenant=self.tenant)
        plantio = Plantio.objects.create(cultura=cultura, data_plantio='2025-01-01', fazenda=faz, tenant=self.tenant)

        m = create_movimentacao(produto=p, tipo='saida', quantidade=Decimal('2'), custo_alocado=Decimal('100.00'), plantio=plantio, criado_por=self.user)

        m.refresh_from_db()
        self.assertTrue(m.pendente_rateio)
        self.assertIsNotNone(m.rateio)

        stmt = MovimentacaoStatement.objects.filter(movimentacao=m).first()
        self.assertIsNotNone(stmt)
        self.assertTrue(stmt.pendente_rateio)
        self.assertIsNotNone(stmt.rateio)
