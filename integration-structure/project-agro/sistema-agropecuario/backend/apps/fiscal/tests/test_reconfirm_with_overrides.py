from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from apps.fiscal.models import NFe, ItemNFe
from apps.fiscal.models_overrides import ItemNFeOverride
from apps.estoque.models import Produto, MovimentacaoEstoque


class ReconfirmApplyOverridesTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='applier', password='pwd', is_staff=True)
        # give permission if available
        try:
            from django.contrib.auth.models import Permission
            perm = Permission.objects.get(codename='apply_itemnfeoverride')
            self.user.user_permissions.add(perm)
        except Exception:
            pass
        self.client.force_login(self.user)

    def test_reconfirm_applies_existing_override(self):
        prod = Produto.objects.create(codigo='R1', nome='ProdR', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='R'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='R1', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('90.00'))

        # Initial confirm
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp.status_code, 200)

        # Create override and mark aplicado=True
        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('7.0000'), valor_unitario=Decimal('9.00'), criado_por=self.user, aplicado=True, motivo='reconfirm')

        # Call confirmar_estoque again -> should apply override (create adjustment)
        resp2 = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/')
        self.assertEqual(resp2.status_code, 200)
        data = resp2.json()
        self.assertEqual(data.get('status'), 'applied_overrides')
        self.assertIn(ov.id, data.get('applied_overrides'))

        # Verify adjustment created
        adj = MovimentacaoEstoque.objects.filter(documento_referencia=f"{nfe.chave_acesso}#override-{ov.id}", produto=prod).first()
        self.assertIsNotNone(adj)
        self.assertEqual(adj.tipo, 'saida')
        self.assertEqual(adj.quantidade, Decimal('3'))
