from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from apps.fiscal.models import NFe, ItemNFe
from apps.fiscal.models_overrides import ItemNFeOverride
from apps.estoque.models import Produto, MovimentacaoEstoque
from apps.multi_tenancy.models import Tenant


class DivergenceReflectTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.tenant = Tenant.objects.create(nome='test_tenant_divergence', slug='test-tenant-divergence')
        self.user = User.objects.create_user(username='reflect_user', password='pwd', is_staff=False, tenant=self.tenant)
        self.client.force_login(self.user)

    def test_detect_divergence_for_unapplied_override(self):
        prod = Produto.objects.create(codigo='DIV-A', nome='ProdDivA', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='V'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0, tenant=self.tenant)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='DIV-A', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('90.00'))

        # Confirm estoque (creates original movimentacao quantity 10)
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)

        # Create override but do not apply (user probably does not have apply perm in this test)
        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('7.0000'), valor_unitario=Decimal('9.00'), criado_por=self.user, aplicado=False, motivo='divergence test')

        # Request divergence report
        resp = self.client.get(f'/api/fiscal/nfes/{nfe.id}/divergencias/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # Expect list-like response with an entry for this item/override
        found = [d for d in data if d.get('override_id') == ov.id]
        self.assertTrue(found, 'Expected divergence entry for unapplied override')

    def test_refletir_action_applies_override_and_updates_stock(self):
        # User is superuser to have apply permission
        self.user.is_superuser = True
        self.user.save()

        prod = Produto.objects.create(codigo='DIV-B', nome='ProdDivB', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='W'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0, tenant=self.tenant)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='DIV-B', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('90.00'))

        # Confirm estoque
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)

        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('8.0000'), valor_unitario=Decimal('9.00'), criado_por=self.user, aplicado=False, motivo='reflect test')

        # Divergence exists
        resp = self.client.get(f'/api/fiscal/nfes/{nfe.id}/divergencias/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        found = [d for d in data if d.get('override_id') == ov.id]
        self.assertTrue(found)

        # Apply via endpoint (should be synchronous)
        resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
        self.assertEqual(resp.status_code, 200)

        # Movement created and product updated (delta 2 -> saida 2)
        docref = f"{nfe.chave_acesso}#override-{ov.id}"
        mov = MovimentacaoEstoque.objects.filter(documento_referencia=docref, produto=prod).first()
        self.assertIsNotNone(mov)
        self.assertEqual(mov.quantidade, Decimal('2'))

        prod.refresh_from_db()
        self.assertEqual(prod.quantidade_estoque, Decimal('8'))




