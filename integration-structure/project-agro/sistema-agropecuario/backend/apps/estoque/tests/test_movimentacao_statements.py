from django.test import TestCase
from apps.estoque.models import Produto, Lote, MovimentacaoEstoque, MovimentacaoStatement, ProdutoAuditoria
from apps.fazendas.models import Fazenda
from apps.core.models import CustomUser


class MovimentacaoStatementTests(TestCase):
    def test_movimentacao_creates_statement_and_audit(self):
        user = CustomUser.objects.create_user(username='tester', password='test')
        proprietario = Fazenda._meta.get_field('proprietario').related_model.objects.create(nome='Prop X', cpf_cnpj='00011122233')
        fazenda = Fazenda.objects.create(proprietario=proprietario, name='Fazenda A', matricula='X')
        produto = Produto.objects.create(codigo='T-1', nome='Prod Teste', unidade='L', quantidade_estoque=10)

        mov = MovimentacaoEstoque.objects.create(
            produto=produto,
            tipo='entrada',
            origem='manual',
            quantidade=5,
            valor_unitario=2.0,
            documento_referencia='TEST-01',
            criado_por=user,
            fazenda=fazenda
        )

        # Refresh from DB
        produto.refresh_from_db()

        # Statement must exist
        stmt_qs = MovimentacaoStatement.objects.filter(movimentacao=mov)
        self.assertTrue(stmt_qs.exists())
        stmt = stmt_qs.first()
        self.assertAlmostEqual(float(stmt.quantidade), 5.0)
        self.assertAlmostEqual(float(stmt.saldo_resultante), float(produto.quantidade_estoque))

        # Auditoria entry should exist
        aud = ProdutoAuditoria.objects.filter(produto=produto, acao='movimentacao').order_by('-criado_em').first()
        self.assertIsNotNone(aud)
        self.assertAlmostEqual(float(aud.quantidade), 5.0)

    def test_deleting_movimentacao_creates_deleted_statement(self):
        produto = Produto.objects.create(codigo='T-2', nome='Prod Teste 2', unidade='L', quantidade_estoque=20)
        mov = MovimentacaoEstoque.objects.create(produto=produto, tipo='saida', quantidade=3, criado_por=None)

        # Delete movimentacao
        mov_id = mov.id
        mov.delete()

        deleted_stmt = MovimentacaoStatement.objects.filter(observacoes__contains=f"Movimentacao deletada (id {mov_id})").first()
        self.assertIsNotNone(deleted_stmt)
        self.assertTrue(deleted_stmt.metadata.get('deleted'))

    def test_deleting_product_creates_statements_with_snapshot(self):
        # When product is removed, deleting should not raise and a statement snapshot should be created
        produto = Produto.objects.create(codigo='T-3', nome='Prod To Remove', unidade='L', quantidade_estoque=50)
        mov = MovimentacaoEstoque.objects.create(produto=produto, tipo='entrada', quantidade=10, criado_por=None)

        # Delete the product (should cascade and create statements without raising)
        produto_id = produto.id
        produto.delete()

        # There should be a statement referencing the movimentacao with produto=NULL but snapshot fields set
        # The Movimentacao may have been deleted as part of the cascade; find statement by observacoes or by produto snapshot
        stmt = MovimentacaoStatement.objects.filter(observacoes__contains=f"Movimentacao deletada (id {mov.id})").first()
        if not stmt:
            stmt = MovimentacaoStatement.objects.filter(produto_codigo='T-3').order_by('-criado_em').first()

        self.assertIsNotNone(stmt, 'Expected a MovimentacaoStatement snapshot after deleting product')
        self.assertIsNone(stmt.produto)
        self.assertEqual(stmt.produto_codigo, 'T-3')
        self.assertEqual(stmt.produto_nome, 'Prod To Remove')
        self.assertTrue(stmt.metadata.get('deleted') or stmt.observacoes)

