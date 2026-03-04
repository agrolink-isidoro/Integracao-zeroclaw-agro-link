from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal

from apps.estoque.services import create_movimentacao
from apps.estoque.models import Produto, MovimentacaoEstoque, MovimentacaoStatement
from apps.agricultura.models import Cultura, Plantio
from apps.fazendas.models import Proprietario, Fazenda

User = get_user_model()


class AutoRateioTests(TestCase):
    def test_movimentacao_with_plantio_and_custo_creates_rateio(self):
        user = User.objects.create_user(username='u1')
        p = Produto.objects.create(codigo='PR-1', nome='Produto', unidade='kg', quantidade_estoque=Decimal('10'))

        prop = Proprietario.objects.create(nome='Prop', cpf_cnpj='00011122233')
        faz = Fazenda.objects.create(proprietario=prop, name='Faz A', matricula='M1')
        cultura = Cultura.objects.create(nome='Soja')
        plantio = Plantio.objects.create(cultura=cultura, data_plantio='2025-01-01', fazenda=faz)

        m = create_movimentacao(produto=p, tipo='saida', quantidade=Decimal('2'), custo_alocado=Decimal('100.00'), plantio=plantio, criado_por=user)

        m.refresh_from_db()
        self.assertTrue(m.pendente_rateio)
        self.assertIsNotNone(m.rateio)

        stmt = MovimentacaoStatement.objects.filter(movimentacao=m).first()
        self.assertIsNotNone(stmt)
        self.assertTrue(stmt.pendente_rateio)
        self.assertIsNotNone(stmt.rateio)
