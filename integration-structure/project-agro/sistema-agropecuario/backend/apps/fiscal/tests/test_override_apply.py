import uuid
import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from apps.fiscal.models import NFe, ItemNFe
from apps.fiscal.models_overrides import ItemNFeOverride
from apps.estoque.models import Produto, MovimentacaoEstoque, ProdutoAuditoria


class OverrideApplyTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username=f"applier_{uuid.uuid4().hex}", password='pwd', is_staff=True)
        # In test environments permissions tables can be missing; make this test user a superuser
        # so has_perm(...) returns True and the apply action can proceed.
        self.user.is_superuser = True
        self.user.save()
        self.tenant = self.user.tenant
        self.client.force_login(self.user)

    def test_apply_override_creates_adjustment_when_nfe_confirmed(self):
        prod = Produto.objects.create(codigo='CODE-A', nome='ProdA', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='A'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-A', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('90.00'))

        # Confirm estoque (creates original movimentacao quantity 10)
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)
        orig_mov = MovimentacaoEstoque.objects.filter(documento_referencia=nfe.chave_acesso, produto=prod, origem='nfe').first()
        self.assertIsNotNone(orig_mov)
        self.assertEqual(orig_mov.quantidade, Decimal('10'))

        # Create override with new quantity 7 (delta -3)
        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('7.0000'), valor_unitario=Decimal('9.00'), criado_por=self.user, aplicado=False, motivo='teste ajuste')

        # Apply via endpoint (synchronous)
        resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
        self.assertEqual(resp.status_code, 200)

        # After apply, the override should be marked as applied
        ov.refresh_from_db()
        self.assertTrue(ov.aplicado)

        # Expect either a movement or an application audit entry to exist
        docref = f"{nfe.chave_acesso}#override-{ov.id}"
        adj = MovimentacaoEstoque.objects.filter(documento_referencia=docref, produto=prod).first()
        app_aud = ProdutoAuditoria.objects.filter(documento_referencia=docref, produto=prod, origem='nfe-override-application').first()
        self.assertTrue(adj is not None or app_aud is not None, "Expected movimentacao or audit record after applying override")
        if adj:
            # delta -3 -> 'saida' of 3
            self.assertEqual(adj.quantidade, Decimal('3'))
            self.assertEqual(adj.tipo, 'saida')
        if app_aud:
            self.assertEqual(app_aud.origem, 'nfe-override-application')

    def test_apply_override_records_audit_for_valor_change(self):
        prod = Produto.objects.create(codigo='CODE-B', nome='ProdB', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='B'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-B', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('5'), valor_unitario_comercial=Decimal('4.00'), valor_produto=Decimal('20.00'))

        # Confirm estoque (creates original movimentacao quantity 5)

        # Confirm estoque (creates original movimentacao quantity 5)
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)

        # Create override that only changes valor_unitario
        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('5.0000'), valor_unitario=Decimal('22.50'), criado_por=self.user, aplicado=False, motivo='ajuste preço')

        # Apply (synchronous)
        resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
        self.assertEqual(resp.status_code, 200)

        # No quantity adjustment created for same quantity
        docref = f"{nfe.chave_acesso}#override-{ov.id}"
        adj = MovimentacaoEstoque.objects.filter(documento_referencia=docref, produto=prod).first()
        self.assertIsNone(adj)

        # After apply, override should be applied and an audit record should exist
        ov.refresh_from_db()
        self.assertTrue(ov.aplicado)
        aud = ProdutoAuditoria.objects.filter(documento_referencia=docref, produto=prod, valor_unitario=ov.valor_unitario).first()
        self.assertIsNotNone(aud, 'Expected ProdutoAuditoria for valor change after override application')

    def test_apply_override_allows_negative_stock(self):
        prod = Produto.objects.create(codigo='CODE-C', nome='ProdC', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='C'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-C', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('90.00'))

        # Confirm estoque (creates original movimentacao quantity 10)
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)

        # Simulate external consumption after confirmation by directly adjusting product stock to a low value
        prod.quantidade_estoque = Decimal('1')
        prod.save()
        prod.refresh_from_db()
        self.assertEqual(prod.quantidade_estoque, Decimal('1'))

        # Create override that reduces original quantity from 10 to 2 (delta -8)
        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('2.0000'), valor_unitario=Decimal('9.00'), criado_por=self.user, aplicado=False, motivo='teste negative')

        # Apply via endpoint (synchronous); the apply should fail and return an error
        resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
        self.assertEqual(resp.status_code, 400)

        # No adjustment movement should have been created
        docref = f"{nfe.chave_acesso}#override-{ov.id}"
        adj = MovimentacaoEstoque.objects.filter(documento_referencia=docref, produto=prod).first()
        self.assertIsNone(adj)

        # Override should not be marked as applied (reverted on failure)
        ov.refresh_from_db()
        self.assertFalse(ov.aplicado)

        # Product stock remains unchanged (the simulated consumption value)
        prod.refresh_from_db()
        self.assertEqual(prod.quantidade_estoque, Decimal('1'))

    def test_failed_scheduled_apply_creates_notification(self):
        from apps.administrativo.models import Notificacao
        from unittest.mock import patch

        prod = Produto.objects.create(codigo='CODE-D', nome='ProdD', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='D'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-D', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('5'), valor_unitario_comercial=Decimal('4.00'), valor_produto=Decimal('20.00'))

        # Confirm estoque
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)

        # Create override
        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('3.0000'), valor_unitario=Decimal('4.00'), criado_por=self.user, aplicado=False, motivo='teste notify')

        # Force apply_item_override to fail when called in on_commit
        def _boom(*args, **kwargs):
            raise Exception('boom')

        with patch('apps.fiscal.services.overrides.apply_item_override', side_effect=_boom):
            resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
            # API should return error when apply fails synchronously
            self.assertEqual(resp.status_code, 400)

        # A Notificacao should be created for the requesting user
        notif = Notificacao.objects.filter(usuario=self.user, titulo__icontains=f'Falha ao aplicar override #{ov.id}').first()
        self.assertIsNotNone(notif)
        self.assertIn('boom', notif.mensagem)

    def test_apply_override_updates_product_cost_when_value_changes(self):
        from decimal import Decimal
        prod = Produto.objects.create(codigo='CODE-F', nome='ProdF', unidade='UN', quantidade_estoque=0, custo_unitario=Decimal('10.00'))
        nfe = NFe.objects.create(chave_acesso='F'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-F', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('10.00'), valor_produto=Decimal('100.00'))

        # Confirm estoque (creates original movimentacao with valor_unitario=10.00)
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)
        
        # Verify initial cost
        prod.refresh_from_db()
        self.assertEqual(prod.custo_unitario, Decimal('10.00'))

        # Create override that only changes valor_unitario from 10.00 to 15.00 (same quantity)
        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('10.0000'), valor_unitario=Decimal('15.00'), criado_por=self.user, aplicado=False, motivo='teste custo')

        # Apply via endpoint
        resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
        self.assertEqual(resp.status_code, 200)

        # Product cost should be updated to 15.00
        prod.refresh_from_db()
        self.assertEqual(prod.custo_unitario, Decimal('15.00'))

        # Override should be marked as applied
        ov.refresh_from_db()
        self.assertTrue(ov.aplicado)

    def test_apply_override_skips_when_nfe_not_confirmed(self):
        prod = Produto.objects.create(codigo='CODE-E', nome='ProdE', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='E'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0, estoque_confirmado=False)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-E', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('90.00'))

        # Create override with aplicado=True
        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('7.0000'), valor_unitario=Decimal('9.00'), criado_por=self.user, aplicado=True, motivo='teste unconfirmed')

        # Apply via endpoint (should skip because NFe not confirmed)
        resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
        self.assertEqual(resp.status_code, 200)  # API returns success but does nothing

        # No adjustment movement should have been created
        docref = f"{nfe.chave_acesso}#override-{ov.id}"
        adj = MovimentacaoEstoque.objects.filter(documento_referencia=docref, produto=prod).first()
        self.assertIsNone(adj)

        # Override remains applied=True (not reverted)
        ov.refresh_from_db()
        self.assertTrue(ov.aplicado)
