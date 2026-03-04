from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from apps.fiscal.models import NFe, ItemNFe
from apps.fiscal.models_overrides import ItemNFeOverride
from apps.estoque.models import Produto


class ItemNFeAPITestUnappliedOverride(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='tester2', password='pwd', is_staff=True)
        self.client.force_login(self.user)

    def test_unapplied_override_updates_nfe_effective_values(self):
        """Saving an unapplied override MUST update what the NFe API returns (display change),
        but must NOT apply to estoque or other modules without explicit 'Refletir' action."""
        prod = Produto.objects.create(codigo='CODE-U', nome='ProdU', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='U'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-U', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('12'), valor_unitario_comercial=Decimal('3.00'), valor_produto=Decimal('36.00'))

        payload = {
            'item': item.id,
            'quantidade': '8.0000',
            'valor_unitario': '3.00',
            'aplicado': False,
            'motivo': 'UI edit unapplied'
        }
        resp = self.client.post('/api/fiscal/item-overrides/', payload, content_type='application/json')
        self.assertEqual(resp.status_code, 201)

        # Fetch NFe detail and verify effective values reflect the saved (unapplied) override
        resp2 = self.client.get(f'/api/fiscal/nfes/{nfe.id}/')
        self.assertEqual(resp2.status_code, 200)
        data = resp2.json()
        it = data['itens'][0]
        self.assertEqual(it.get('effective_quantidade'), '8.0000')
