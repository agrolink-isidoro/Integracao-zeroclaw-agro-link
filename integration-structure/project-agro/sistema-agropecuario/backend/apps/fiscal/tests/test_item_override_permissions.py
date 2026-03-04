from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.utils import timezone
from decimal import Decimal

from apps.fiscal.models import NFe, ItemNFe
from apps.fiscal.models_overrides import ItemNFeOverride
from apps.estoque.models import Produto, MovimentacaoEstoque


class ItemNFeOverridePermissionTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='plain', password='pwd', is_staff=False)
        self.user_with_perm = User.objects.create_user(username='priv', password='pwd', is_staff=False)
        # Administrative user used to confirm estoque
        self.admin = User.objects.create_user(username='admin', password='pwd', is_staff=True)
        self.client.force_login(self.user)

        # Ensure permission exists and grant it to privileged user
        from django.contrib.contenttypes.models import ContentType
        try:
            perm = Permission.objects.get(codename='apply_itemnfeoverride')
        except Permission.DoesNotExist:
            ct = ContentType.objects.get_for_model(ItemNFeOverride)
            perm = Permission.objects.create(codename='apply_itemnfeoverride', name='Can apply ItemNFe override', content_type=ct)
        self.user_with_perm.user_permissions.add(perm)

    def test_apply_endpoint_requires_permission(self):
        prod = Produto.objects.create(codigo='CODE-P', nome='ProdP', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='P'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-P', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('100.00'))

        # Confirm estoque to create the original movement (use admin)
        self.client.force_login(self.admin)
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)
        # return to default user context
        self.client.force_login(self.user)

        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('7.0000'), valor_unitario=Decimal('9.00'), criado_por=self.user, aplicado=False, motivo='teste ajuste')

        # Unprivileged user (self.user) tries to apply -> should be 403
        self.client.force_login(self.user)
        resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
        # Depending on routing/permission config, this may return 403 or 404 for unprivileged users
        self.assertIn(resp.status_code, (403, 404))

        # Privileged user can apply
        self.client.force_login(self.user_with_perm)
        resp = self.client.post(f'/api/fiscal/item-overrides/{ov.id}/apply/')
        self.assertEqual(resp.status_code, 200)

        docref = f"{nfe.chave_acesso}#override-{ov.id}"
        adj = MovimentacaoEstoque.objects.filter(documento_referencia=docref, produto=prod).first()
        self.assertIsNotNone(adj)

    def test_create_aplicado_true_disallowed_for_unpriv_when_nfe_confirmed(self):
        prod = Produto.objects.create(codigo='CODE-Q', nome='ProdQ', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='Q'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-Q', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('5'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('100.00'))

        # Confirm estoque (use admin)
        self.client.force_login(self.admin)
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)
        self.client.force_login(self.user)

        # Unprivileged user tries to create override with aplicado=True -> should receive 403
        payload = {'item': item.id, 'quantidade': '3.0000', 'valor_unitario': '9.00', 'aplicado': True, 'motivo': 'teste'}
        self.client.force_login(self.user)
        resp = self.client.post('/api/fiscal/item-overrides/', payload, content_type='application/json')
        self.assertEqual(resp.status_code, 403)

        # Privileged user can create with aplicado=True
        self.client.force_login(self.user_with_perm)
        resp = self.client.post('/api/fiscal/item-overrides/', payload, content_type='application/json')
        self.assertEqual(resp.status_code, 201)

        # Ensure an override was created and applied and adjustment recorded
        ov = ItemNFeOverride.objects.filter(item=item).order_by('-criado_em').first()
        self.assertIsNotNone(ov)
        self.assertTrue(ov.aplicado)
        docref = f"{nfe.chave_acesso}#override-{ov.id}"
        adj = MovimentacaoEstoque.objects.filter(documento_referencia=docref).first()
        self.assertIsNotNone(adj)

        # Product stock should reflect the applied adjustment (original=5, override=3 -> final 3)
        prod.refresh_from_db()
        self.assertEqual(prod.quantidade_estoque, Decimal('3'))

    def test_update_aplicado_true_requires_permission(self):
        prod = Produto.objects.create(codigo='CODE-U', nome='ProdU', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='U'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-U', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('8'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('72.00'))

        # Confirm estoque
        self.client.force_login(self.admin)
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)
        self.client.force_login(self.user)

        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('5.0000'), valor_unitario=Decimal('9.00'), criado_por=self.user, aplicado=False, motivo='teste update')

        # Unprivileged user attempts to patch aplicado=True -> should be denied (400/403)
        self.client.force_login(self.user)
        resp = self.client.patch(f'/api/fiscal/item-overrides/{ov.id}/', {'aplicado': True}, content_type='application/json')
        self.assertIn(resp.status_code, (400, 403))
        ov.refresh_from_db()
        self.assertFalse(ov.aplicado)

        # Privileged user can patch aplicado=True and adjustment is recorded
        self.client.force_login(self.user_with_perm)
        resp = self.client.patch(f'/api/fiscal/item-overrides/{ov.id}/', {'aplicado': True}, content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        ov.refresh_from_db()
        self.assertTrue(ov.aplicado)
        docref = f"{nfe.chave_acesso}#override-{ov.id}"
        adj = MovimentacaoEstoque.objects.filter(documento_referencia=docref).first()
        self.assertIsNotNone(adj)
