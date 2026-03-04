from django.core.management import call_command
from django.test import TestCase
from apps.estoque.models import MovimentacaoEstoque, MovimentacaoStatement, ProdutoAuditoria, Produto


class BackfillCommandTests(TestCase):
    def test_dry_run_creates_no_statements(self):
        produto = Produto.objects.create(codigo='B-1', nome='Backfill Prod', unidade='kg', quantidade_estoque=50)
        # Use bulk_create to avoid save() side-effects that create statements immediately
        MovimentacaoEstoque.objects.bulk_create([
            MovimentacaoEstoque(produto=produto, tipo='entrada', quantidade=10)
        ])
        mov = MovimentacaoEstoque.objects.get(produto=produto, quantidade=10)

        call_command('backfill_movimentacao_statements', '--dry-run')

        self.assertFalse(MovimentacaoStatement.objects.filter(movimentacao=mov).exists())

    def test_run_creates_statements_and_audits(self):
        produto = Produto.objects.create(codigo='B-2', nome='Backfill Prod 2', unidade='kg', quantidade_estoque=100)
        MovimentacaoEstoque.objects.bulk_create([
            MovimentacaoEstoque(produto=produto, tipo='entrada', quantidade=15, documento_referencia='BF-01')
        ])
        mov = MovimentacaoEstoque.objects.get(produto=produto, quantidade=15)

        call_command('backfill_movimentacao_statements')

        self.assertTrue(MovimentacaoStatement.objects.filter(movimentacao=mov).exists())
        self.assertTrue(ProdutoAuditoria.objects.filter(produto=produto, acao='movimentacao', quantidade=mov.quantidade).exists())

    def test_idempotent(self):
        produto = Produto.objects.create(codigo='B-3', nome='Backfill Prod 3', unidade='kg', quantidade_estoque=200)
        MovimentacaoEstoque.objects.bulk_create([
            MovimentacaoEstoque(produto=produto, tipo='saida', quantidade=5)
        ])
        mov = MovimentacaoEstoque.objects.get(produto=produto, quantidade=5)

        call_command('backfill_movimentacao_statements')
        count1 = MovimentacaoStatement.objects.filter(movimentacao=mov).count()
        call_command('backfill_movimentacao_statements')
        count2 = MovimentacaoStatement.objects.filter(movimentacao=mov).count()

        self.assertEqual(count1, count2)
