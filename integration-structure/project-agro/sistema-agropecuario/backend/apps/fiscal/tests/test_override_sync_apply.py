from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from apps.fiscal.models import NFe, ItemNFe
from apps.fiscal.models_overrides import ItemNFeOverride
from apps.estoque.models import Produto, MovimentacaoEstoque
from apps.core.models import Tenant


class OverrideSyncApplyTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.tenant = Tenant.objects.create(nome='test_tenant_sync_apply', slug='test-tenant-sync-apply')
        self.user = User.objects.create_user(username='sync_applier', password='pwd', is_staff=False, tenant=self.tenant)
        self.client.force_login(self.user)

    def test_create_override_applies_immediately_when_nfe_confirmed_and_user_has_permission(self):
        # User is superuser to shortcut permission checks
        self.user.is_superuser = True
        self.user.save()

        prod = Produto.objects.create(codigo='SYNC-A', nome='ProdSyncA', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='S'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0, tenant=self.tenant)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='SYNC-A', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('90.00'))

        # Confirm estoque (creates original movimentacao quantity 10)
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)
        prod.refresh_from_db()
        self.assertEqual(prod.quantidade_estoque, Decimal('10'))

        # Calling confirmar_estoque again should not duplicate movements or change stock
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json().get('movimentacoes'), [])
        prod.refresh_from_db()
        self.assertEqual(prod.quantidade_estoque, Decimal('10'))

        # Create override with new quantity 7 (delta -3) and aplicado=True
        payload = {
            'item': item.id,
            'quantidade': '7.0000',
            'valor_unitario': '9.00',
            'aplicado': True,
            'motivo': 'sync apply'
        }
        resp = self.client.post('/api/fiscal/item-overrides/', payload, content_type='application/json')
        # Expect creation and synchronous application
        self.assertEqual(resp.status_code, 201)
        created = resp.json()
        self.assertTrue(created.get('aplicado'))

        # Movement created referencing override
        docref = f"{nfe.chave_acesso}#override-{created['id']}"
        mov = MovimentacaoEstoque.objects.filter(documento_referencia=docref, produto=prod).first()
        self.assertIsNotNone(mov, 'Expected adjustment movement to be created synchronously')
        self.assertEqual(mov.quantidade, Decimal('3'))
        self.assertEqual(mov.tipo, 'saida')

        # Product stock updated
        prod.refresh_from_db()
        self.assertEqual(prod.quantidade_estoque, Decimal('7'))

    def test_create_override_returns_403_when_applying_on_confirmed_nfe_without_permission(self):
        prod = Produto.objects.create(codigo='SYNC-B', nome='ProdSyncB', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='T'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0, tenant=self.tenant)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='SYNC-B', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('8'), valor_unitario_comercial=Decimal('5.00'), valor_produto=Decimal('40.00'))

        # Allow confirming as superuser first
        self.user.is_superuser = True
        self.user.save()
        # Confirm estoque
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)

        # Revert to normal user for the negative test
        self.user.is_superuser = False
        self.user.save()

        # Create override with aplicado=True using a non-super user (no special permission)
        payload = {
            'item': item.id,
            'quantidade': '6.0000',
            'valor_unitario': '5.00',
            'aplicado': True,
            'motivo': 'no perm'
        }
        resp = self.client.post('/api/fiscal/item-overrides/', payload, content_type='application/json')
        self.assertEqual(resp.status_code, 403)

        # Ensure no movement created
        # We don't have an override id here since creation was forbidden
        docref_like = f"{nfe.chave_acesso}#override-"
        mov = MovimentacaoEstoque.objects.filter(documento_referencia__contains=docref_like, produto=prod).first()
        self.assertIsNone(mov)

    def test_apply_endpoint_applies_synchronously(self):
        # Apply via explicit endpoint
        self.user.is_superuser = True
        self.user.save()

        prod = Produto.objects.create(codigo='SYNC-C', nome='ProdSyncC', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='U'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0, tenant=self.tenant)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='SYNC-C', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('90.00'))

        # Confirm estoque
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)

        # Create override without applying
        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('8.0000'), valor_unitario=Decimal('9.00'), criado_por=self.user, aplicado=False, motivo='explicit apply')

        # Apply via apply action
        resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
        self.assertEqual(resp.status_code, 200)

        # Movement created and product updated
        docref = f"{nfe.chave_acesso}#override-{ov.id}"
        mov = MovimentacaoEstoque.objects.filter(documento_referencia=docref, produto=prod).first()
        self.assertIsNotNone(mov)
        self.assertEqual(mov.quantidade, Decimal('2'))
        self.assertEqual(mov.tipo, 'saida')

        prod.refresh_from_db()
        self.assertEqual(prod.quantidade_estoque, Decimal('8'))
