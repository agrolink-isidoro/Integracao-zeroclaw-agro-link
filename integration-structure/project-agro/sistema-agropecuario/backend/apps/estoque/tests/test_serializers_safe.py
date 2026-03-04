from rest_framework.test import APITestCase
from apps.estoque.serializers import MovimentacaoEstoqueSerializer
from apps.estoque.models import MovimentacaoEstoque

class MovimentacaoSerializerSafeTests(APITestCase):
    def test_serializer_handles_null_relations(self):
        from apps.estoque.models import Produto
        prod = Produto.objects.create(codigo='X1', nome='X', unidade='kg', quantidade_estoque=10)
        # create movimentacao with nullable relations left None
        mov = MovimentacaoEstoque.objects.create(produto=prod, tipo='entrada', quantidade=10, valor_unitario=1.5)
        s = MovimentacaoEstoqueSerializer(mov)
        data = s.data
        assert data['produto'] == prod.pk
        assert data['produto_nome'] == 'X'
        assert data['lote_numero'] is None
        assert data['fazenda_nome'] is None
        assert data['talhao_nome'] is None
        assert data['local_armazenamento_nome'] is None
