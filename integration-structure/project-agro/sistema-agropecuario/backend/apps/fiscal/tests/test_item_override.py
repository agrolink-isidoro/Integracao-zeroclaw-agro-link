from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from apps.fiscal.models import NFe, ItemNFe
from apps.fiscal.models_overrides import ItemNFeOverride
from apps.estoque.models import Produto, MovimentacaoEstoque
from apps.core.models import Tenant


class ItemNFeOverrideTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.tenant = Tenant.objects.create(nome='test_tenant_item_override', slug='test-tenant-item-override')
        self.user = User.objects.create_user(username='tester', password='pwd', is_staff=False, tenant=self.tenant)
        self.client.force_login(self.user)

    def test_create_override(self):
        nfe = NFe.objects.create(chave_acesso='1'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0, tenant=self.tenant)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-1', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('90.00'))

        payload = {'item': item.id, 'quantidade': '5.0000', 'valor_unitario': '2.50', 'motivo': 'ajuste teste'}
        resp = self.client.post('/api/fiscal/item-overrides/', payload, content_type='application/json')
        self.assertEqual(resp.status_code, 201)

        ov = ItemNFeOverride.objects.filter(item=item).first()
        self.assertIsNotNone(ov)
        self.assertEqual(ov.criado_por, self.user)
        self.assertEqual(str(ov.quantidade), '5.0000')

    def test_confirmar_estoque_uses_override(self):
        prod = Produto.objects.create(codigo='CODE-2', nome='Prod', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='2'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0, tenant=self.tenant)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-2', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('90.00'))

        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('3.0000'), valor_unitario=Decimal('2.50'), criado_por=self.user, aplicado=True, motivo='teste')

        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)

        movs = MovimentacaoEstoque.objects.filter(documento_referencia=nfe.chave_acesso)
        self.assertTrue(movs.exists())
        m = movs.first()
        self.assertEqual(m.quantidade, ov.quantidade)
        self.assertEqual(m.valor_unitario, ov.valor_unitario)
