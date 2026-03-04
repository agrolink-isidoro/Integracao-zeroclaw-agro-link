from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

from apps.fiscal.models import NFe, ItemNFe
from apps.fiscal.models_overrides import ItemNFeOverride
from apps.estoque.models import Produto


class ItemNFeAPIEffectiveTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='tester', password='pwd', is_staff=True)
        self.client.force_login(self.user)

    def test_item_serializer_returns_effective_values(self):
        prod = Produto.objects.create(codigo='CODE-X', nome='ProdX', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='X'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-X', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('90.00'))

        # Create and apply override
        ov = ItemNFeOverride.objects.create(item=item, quantidade=Decimal('7.0000'), valor_unitario=Decimal('9.00'), criado_por=self.user, aplicado=True, motivo='teste')

        # Fetch NFe detail and check effective fields on items
        resp = self.client.get(f'/api/fiscal/nfes/{nfe.id}/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('itens', data)
        itens = data['itens']
        self.assertEqual(len(itens), 1)
        it = itens[0]
        self.assertEqual(it.get('effective_quantidade'), str(ov.quantidade))
        self.assertEqual(Decimal(it.get('effective_valor_unitario')), Decimal(str(ov.valor_unitario)))

    def test_api_creating_override_updates_effective_values(self):
        prod = Produto.objects.create(codigo='CODE-API', nome='ProdAPI', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='Y'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-API', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('12'), valor_unitario_comercial=Decimal('3.00'), valor_produto=Decimal('36.00'))

        payload = {
            'item': item.id,
            'quantidade': '8.0000',
            'valor_unitario': '3.00',
            'aplicado': True,
            'motivo': 'UI edit test'
        }
        resp = self.client.post('/api/fiscal/item-overrides/', payload, content_type='application/json')
        self.assertEqual(resp.status_code, 201)
        created = resp.json()
        self.assertTrue(created.get('aplicado'))

        # Fetch NFe detail and verify effective values reflect override
        resp2 = self.client.get(f'/api/fiscal/nfes/{nfe.id}/')
        self.assertEqual(resp2.status_code, 200)
        data = resp2.json()
        it = data['itens'][0]
        self.assertEqual(it.get('effective_quantidade'), '8.0000')

    def test_api_creating_override_rounds_valor_unitario_two_decimals(self):
        prod = Produto.objects.create(codigo='CODE-API2', nome='ProdAPI2', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='Z'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-API2', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('6'), valor_unitario_comercial=Decimal('1.2345'), valor_produto=Decimal('7.41'))

        payload = {
            'item': item.id,
            'quantidade': '6.0000',
            'valor_unitario': '1.9999',
            'aplicado': True,
            'motivo': 'rounding test'
        }
        resp = self.client.post('/api/fiscal/item-overrides/', payload, content_type='application/json')
        self.assertEqual(resp.status_code, 201)
        created = resp.json()
        self.assertTrue(created.get('aplicado'))

        # Check stored override value rounded to 2 decimals
        ov = ItemNFeOverride.objects.get(id=created['id'])
        self.assertEqual(ov.valor_unitario, Decimal('2.00'))

        # NFe detail effective valor_unitario must be 2.00
        resp2 = self.client.get(f'/api/fiscal/nfes/{nfe.id}/')
        data = resp2.json()
        it = data['itens'][0]
        self.assertEqual(Decimal(it.get('effective_valor_unitario')), Decimal('2.00'))

    def test_item_serializer_formats_unit_price_two_decimals(self):
        prod = Produto.objects.create(codigo='CODE-FMT', nome='ProdFMT', unidade='UN', quantidade_estoque=0)
        nfe = NFe.objects.create(chave_acesso='F'*44, numero='1', serie='1', data_emissao=timezone.now(), emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        # Create item with 3-decimal value to assert serializer will format to 2 decimals
        item = ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-FMT', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('1'), valor_unitario_comercial=Decimal('1.239'), valor_produto=Decimal('1.24'))

        resp = self.client.get(f'/api/fiscal/nfes/{nfe.id}/')
        self.assertEqual(resp.status_code, 200)
        it = resp.json()['itens'][0]
        self.assertEqual(it.get('valor_unitario_comercial'), '1.24')
