import uuid
import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from apps.fiscal.models import NFe, ItemNFe
from apps.fiscal.models_overrides import ItemNFeOverride
from apps.estoque.models import Produto, MovimentacaoEstoque


class OverrideSequenceTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username=f"seqtester_{uuid.uuid4().hex}", password='pwd')
        self.user.is_superuser = True
        self.user.save()
        self.tenant = self.user.tenant
        self.client.force_login(self.user)

    def _create_and_confirm(self, codigo, quantidade, valor_unitario):
        prod = Produto.objects.create(codigo=codigo, nome=f'Prod {codigo}', unidade='UN', quantidade_estoque=0, custo_unitario=Decimal(str(valor_unitario)))
        nfe = NFe.objects.create(chave_acesso=(codigo*44)[:44], numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=Decimal(str(quantidade*Decimal(str(valor_unitario)))), valor_nota=Decimal(str(quantidade*Decimal(str(valor_unitario)))))
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto=prod.codigo, descricao='Produto Seq', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal(str(quantidade)), valor_unitario_comercial=Decimal(str(valor_unitario)), valor_produto=Decimal(str(quantidade*Decimal(str(valor_unitario)))))
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)
        return prod, nfe, item

    def test_successive_value_edits_update_stock_value(self):
        # initial 1 x 100
        prod, nfe, item = self._create_and_confirm('SEQ-V', 1, 100)

        sequence = [101, 112, 107, 96]
        for val in sequence:
            ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('1.0000'), valor_unitario=Decimal(str(val)), criado_por=self.user, aplicado=False, motivo='seq value')
            resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
            self.assertEqual(resp.status_code, 200)
            prod.refresh_from_db()
            # product unit cost should be set to the latest override value
            self.assertEqual(prod.custo_unitario, Decimal(str(val)))

    def test_successive_quantity_edits_update_stock_quantity(self):
        prod, nfe, item = self._create_and_confirm('SEQ-Q', 1, 100)

        sequence = [2, 6, 4, 7]
        for qty in sequence:
            ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal(str(qty)), valor_unitario=None, criado_por=self.user, aplicado=False, motivo='seq qty')
            resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
            self.assertEqual(resp.status_code, 200)
            prod.refresh_from_db()
            # product total quantity should equal the overridden quantity (single NFe case)
            self.assertEqual(prod.quantidade_estoque, Decimal(str(qty)))

    def test_successive_pairs_update_quantity_and_value(self):
        prod, nfe, item = self._create_and_confirm('SEQ-P', 1, 100)

        pairs = [(2, 101), (6, 97), (1, 104), (7, 103)]
        for qty, val in pairs:
            ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal(str(qty)), valor_unitario=Decimal(str(val)), criado_por=self.user, aplicado=False, motivo='seq pair')
            resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
            self.assertEqual(resp.status_code, 200)
            prod.refresh_from_db()
            self.assertEqual(prod.quantidade_estoque, Decimal(str(qty)))
            self.assertEqual(prod.custo_unitario, Decimal(str(val)))

    def test_two_nfes_consolidated_then_reflect_change_on_second(self):
        # NFe1: 1 x 100
        prod = Produto.objects.create(codigo='SEQ-M', nome='ProdM', unidade='UN', quantidade_estoque=0, custo_unitario=Decimal('0'))
        nfe1 = NFe.objects.create(chave_acesso='M1'*22, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E1', destinatario_nome='D', valor_produtos=Decimal('100.00'), valor_nota=Decimal('100.00'))
        item1 = ItemNFe.objects.create(nfe=nfe1, numero_item=1, codigo_produto=prod.codigo, descricao='Produto M1', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('1'), valor_unitario_comercial=Decimal('100.00'), valor_produto=Decimal('100.00'))
        resp = self.client.post(f'/api/fiscal/nfes/{nfe1.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)

        # NFe2: 2 x 101
        nfe2 = NFe.objects.create(chave_acesso='M2'*22, numero='2', serie='1', data_emissao=timezone.now(), emitente_nome='E2', destinatario_nome='D', valor_produtos=Decimal('202.00'), valor_nota=Decimal('202.00'))
        item2 = ItemNFe.objects.create(nfe=nfe2, numero_item=1, codigo_produto=prod.codigo, descricao='Produto M2', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('2'), valor_unitario_comercial=Decimal('101.00'), valor_produto=Decimal('202.00'))
        resp = self.client.post(f'/api/fiscal/nfes/{nfe2.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)

        # After both confirms consolidated: qty 3, total value 302
        prod.refresh_from_db()
        self.assertEqual(prod.quantidade_estoque, Decimal('3'))
        entradas = MovimentacaoEstoque.objects.filter(produto=prod, origem='nfe')
        total_value = sum((m.quantidade * (m.valor_unitario or Decimal('0'))) for m in entradas)
        self.assertEqual(total_value, Decimal('302'))

        # Modify NFe2: qty 3, val 102 and reflect
        ov = ItemNFeOverride.objects.create(item=item2, quantidade=Decimal('3'), valor_unitario=Decimal('102.00'), criado_por=self.user, aplicado=False, motivo='modify note2')
        resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
        self.assertEqual(resp.status_code, 200)

        prod.refresh_from_db()
        self.assertEqual(prod.quantidade_estoque, Decimal('4'))
        entradas = MovimentacaoEstoque.objects.filter(produto=prod, origem='nfe')
        total_value = sum((m.quantidade * (m.valor_unitario or Decimal('0'))) for m in entradas) + sum((m.quantidade * (m.valor_unitario or Decimal('0'))) for m in MovimentacaoEstoque.objects.filter(produto=prod, origem='ajuste'))
        # Expect consolidated total 406
        self.assertEqual(total_value, Decimal('406'))
