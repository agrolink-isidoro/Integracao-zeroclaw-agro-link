from django.test import TestCase
from decimal import Decimal
from apps.maquinas.models import Abastecimento, OrdemServico
from apps.estoque.models import Produto, MovimentacaoEstoque
from apps.fazendas.models import Fazenda
from apps.core.models import CustomUser


class MaquinasSignalsTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create(username='tester')
        from apps.fazendas.models import Proprietario
        self.proprietario = Proprietario.objects.create(nome='Prop X', cpf_cnpj='11122233344')
        self.fazenda = Fazenda.objects.create(name='FazX', proprietario=self.proprietario, matricula='M-001')
        from apps.maquinas.models import Equipamento, CategoriaEquipamento
        cat, _ = CategoriaEquipamento.objects.get_or_create(nome='Trator', defaults={'tipo_mobilidade':'autopropelido'})
        self.equip, _ = Equipamento.objects.get_or_create(nome='Trator 1', defaults={'marca':'Marca', 'modelo':'M1', 'ano_fabricacao':2020, 'data_aquisicao':'2020-01-01', 'valor_aquisicao':Decimal('10000'), 'categoria': cat})
        self.prod = Produto.objects.create(codigo='COMB', nome='Diesel', unidade='L', quantidade_estoque=Decimal('1000'))

    def test_abastecimento_creates_saida_when_produto_linked(self):
        ab = Abastecimento.objects.create(
            equipamento=self.equip,
            data_abastecimento='2025-01-01T10:00:00Z',
            quantidade_litros=Decimal('50'),
            valor_unitario=Decimal('4.5'),
            valor_total=Decimal('225'),
            produto_estoque=self.prod,
            criado_por=self.user
        )

        mov = MovimentacaoEstoque.objects.filter(documento_referencia=f'Abastecimento #{ab.pk}').first()
        self.assertIsNotNone(mov)
        self.assertEqual(mov.tipo, 'saida')
        self.assertEqual(mov.produto, self.prod)
        self.assertEqual(mov.quantidade, Decimal('50'))

    def test_ordem_servico_finalizada_consumes_insumos(self):
        os = OrdemServico.objects.create(
            equipamento=self.equip,
            descricao_problema='Troca de filtro',
            data_previsao='2025-01-01',
            status='pendente',
            insumos=[{'produto_id': self.prod.pk, 'quantidade': '5'}]
        )

        # Transition to finalizada
        os.status = 'finalizada'
        os.save()

        mov = MovimentacaoEstoque.objects.filter(documento_referencia=f'OS #{os.pk}').first()
        self.assertIsNotNone(mov)
        self.assertEqual(mov.tipo, 'saida')
        self.assertEqual(mov.produto, self.prod)
        self.assertEqual(mov.quantidade, Decimal('5'))
