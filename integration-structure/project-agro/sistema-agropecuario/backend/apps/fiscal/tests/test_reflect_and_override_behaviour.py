from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from apps.fiscal.models import NFe, ItemNFe
from apps.fiscal.models_overrides import ItemNFeOverride
from apps.estoque.models import Produto, MovimentacaoEstoque
from apps.comercial.models import Fornecedor


class ReflectAndOverrideBehaviourTests(TransactionTestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='tester', password='pwd', is_staff=False)
        self.user.is_superuser = True
        self.user.save()
        self.client.force_login(self.user)

    def test_quantity_change_creates_adjustment_and_keeps_unit_cost(self):
        # Setup product and NFe with a single item quantity 1 valor_unitario 100
        prod = Produto.objects.create(codigo='QTY-1', nome='ProdQ', unidade='UN', quantidade_estoque=0, custo_unitario=Decimal('100.00'))
        nfe = NFe.objects.create(chave_acesso='Q'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=Decimal('100.00'), valor_nota=Decimal('100.00'))
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto=prod.codigo, descricao='Produto Q', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('1.0000'), valor_unitario_comercial=Decimal('100.00'), valor_produto=Decimal('100.00'))

        # Confirm estoque (creates original movimentacao quantity 1 valor_unitario 100)
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)

        orig_mov = MovimentacaoEstoque.objects.filter(documento_referencia=nfe.chave_acesso, produto=prod, origem='nfe').first()
        self.assertIsNotNone(orig_mov)
        self.assertEqual(orig_mov.quantidade, Decimal('1'))
        self.assertEqual(orig_mov.valor_unitario, Decimal('100.00'))

        # Create override changing quantity to 3 (increase)
        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('3.0000'), valor_unitario=None, criado_por=self.user, aplicado=False, motivo='teste qty')

        # Apply override via endpoint
        resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
        self.assertEqual(resp.status_code, 200)

        ov.refresh_from_db()
        self.assertTrue(ov.aplicado)

        # Expect an adjustment movement of quantidade 2 (entrada)
        docref = f"{nfe.chave_acesso}#override-{ov.id}"
        adj = MovimentacaoEstoque.objects.filter(documento_referencia=docref, produto=prod).first()
        self.assertIsNotNone(adj, 'Expected adjustment movement for quantity change')
        self.assertEqual(adj.tipo, 'entrada')
        self.assertEqual(adj.quantidade, Decimal('2'))

        # Product unit cost should remain 100.00 (recalculated or unchanged)
        prod.refresh_from_db()
        self.assertEqual(prod.custo_unitario, Decimal('100.00'))

    def test_reflect_fornecedor_updates_name_and_cnpj(self):
        # Create fornecedor and NFe with different emitente data
        fornecedor = Fornecedor.objects.create(nome='Orig Supplier', cpf_cnpj='11111111111111')
        nfe = NFe.objects.create(chave_acesso='R'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='New Supplier Name', emitente_cnpj='22222222222222', destinatario_nome='D', valor_produtos=Decimal('0'), valor_nota=Decimal('0'))

        # Ensure fornecedor exists before reflect
        self.assertEqual(Fornecedor.objects.filter(cpf_cnpj='11111111111111').count(), 1)

        # Call reflect endpoint with force and overrides to update existing fornecedor
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/reflect_fornecedor/', {'force': True, 'nome': 'Updated Name', 'cpf_cnpj': '22222222222222'}, content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get('updated') or data.get('created'))

        # Verify fornecedor with new CNPJ exists and has updated name
        f = Fornecedor.objects.filter(cpf_cnpj='22222222222222').first()
        self.assertIsNotNone(f)
        self.assertEqual(f.nome, 'Updated Name')
