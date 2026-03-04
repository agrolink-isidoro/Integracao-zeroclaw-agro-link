from decimal import Decimal
from django.test import TestCase
from apps.estoque.models import Produto, LocalArmazenamento, Localizacao, ProdutoArmazenado, MovimentacaoEstoque
from apps.estoque.services import create_movimentacao
from apps.core.models import CustomUser

class MovimentacaoLocalizacaoTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create(username='tester')
        self.prod = Produto.objects.create(codigo='PLOC', nome='Produto Local', unidade='kg', quantidade_estoque=Decimal('0'))
        # criar fazenda e proprietario necessários para LocalArmazenamento
        from apps.fazendas.models import Proprietario, Fazenda
        prov = Proprietario.objects.create(nome='Prop', cpf_cnpj='00000000000')
        faz = Fazenda.objects.create(proprietario=prov, name='Faz A', matricula='FAZ-001')
        self.local_armaz = LocalArmazenamento.objects.create(nome='SILO A', tipo='silo', capacidade_maxima=Decimal('1000'), fazenda=faz)
        # create a Localizacao with same name to enable sync
        self.localizacao = Localizacao.objects.create(nome=self.local_armaz.nome, tipo='interna', capacidade_total=Decimal('1000'), capacidade_ocupada=Decimal('0'))
        # create a Lote to attach to movimentacao tests
        from apps.estoque.models import Lote
        self.lote = Lote.objects.create(produto=self.prod, numero_lote='L1', quantidade_inicial=Decimal('0'), quantidade_atual=Decimal('0'))

    def test_entrada_updates_produto_armazenado_and_localizacao(self):
        m = create_movimentacao(produto=self.prod, tipo='entrada', quantidade=Decimal('10'), criado_por=self.user, local_armazenamento=self.local_armaz)
        # Produto global updated
        self.prod.refresh_from_db()
        self.assertEqual(self.prod.quantidade_estoque, Decimal('10'))
        # ProdutoArmazenado created
        pa = ProdutoArmazenado.objects.filter(produto=self.prod, localizacao=self.localizacao).first()
        self.assertIsNotNone(pa)
        self.assertEqual(pa.quantidade, Decimal('10'))
        # Localizacao capacity updated
        self.localizacao.refresh_from_db()
        self.assertEqual(self.localizacao.capacidade_ocupada, Decimal('10'))

    def test_saida_consumes_produto_armazenado_and_localizacao(self):
        # seed available product in location
        Producto = ProdutoArmazenado.objects.create(produto=self.prod, localizacao=self.localizacao, lote='L1', quantidade=Decimal('20'), data_entrada='2025-01-01', status='disponivel')
        # ensure product global matches
        self.prod.quantidade_estoque = Decimal('20')
        self.prod.save()
        # set location occupied capacity to reflect seeded stored quantity
        self.localizacao.capacidade_ocupada = Decimal('20')
        self.localizacao.save()
        # perform saída
        m = create_movimentacao(produto=self.prod, tipo='saida', quantidade=Decimal('4'), criado_por=self.user, local_armazenamento=self.local_armaz, lote=self.lote)
        # product decreased
        self.prod.refresh_from_db()
        self.assertEqual(self.prod.quantidade_estoque, Decimal('16'))
        # produto armazenado decreased
        Producto.refresh_from_db()
        self.assertEqual(Producto.quantidade, Decimal('16'))
        # localizacao cap decreased
        self.localizacao.refresh_from_db()
        self.assertEqual(self.localizacao.capacidade_ocupada, Decimal('16'))

    def test_reserva_moves_disponivel_to_reservado(self):
        # seed available product in location
        pa = ProdutoArmazenado.objects.create(produto=self.prod, localizacao=self.localizacao, lote='L1', quantidade=Decimal('8'), data_entrada='2025-01-01', status='disponivel')
        self.prod.quantidade_estoque = Decimal('8')
        self.prod.save()
        # reflect stored quantity in location capacity
        self.localizacao.capacidade_ocupada = Decimal('8')
        self.localizacao.save()

        m = create_movimentacao(produto=self.prod, tipo='reserva', quantidade=Decimal('3'), criado_por=self.user, local_armazenamento=self.local_armaz, lote=self.lote)
        # global reserved updated
        self.prod.refresh_from_db()
        self.assertEqual(self.prod.quantidade_reservada, Decimal('3'))
        # inspect DB state
        pa.refresh_from_db()
        available = list(ProdutoArmazenado.objects.filter(produto=self.prod, localizacao=self.localizacao, status='disponivel').values_list('quantidade', flat=True))
        reserved = list(ProdutoArmazenado.objects.filter(produto=self.prod, localizacao=self.localizacao, status='reservado').values_list('quantidade', flat=True))
        print('DBG_AVAIL', available, 'DBG_RESERVED', reserved)
        self.assertEqual(pa.quantidade, Decimal('5'))
        # reserved record exists
        reserved_obj = ProdutoArmazenado.objects.filter(produto=self.prod, localizacao=self.localizacao, status='reservado').first()
        self.assertIsNotNone(reserved_obj)
        self.assertEqual(reserved_obj.quantidade, Decimal('3'))
