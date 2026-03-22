from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.fiscal.models import ItemNFe, NFe
from apps.fiscal.models_overrides import ItemNFeOverride
from apps.core.models import Tenant


class SEFAZComplianceTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(nome='test_tenant_sefaz', slug='test-tenant-sefaz')
    def test_field_meta_matches_sefaz(self):
        item = ItemNFe()
        self.assertEqual(item._meta.get_field('quantidade_comercial').max_digits, 21)
        self.assertEqual(item._meta.get_field('quantidade_comercial').decimal_places, 4)
        self.assertEqual(item._meta.get_field('valor_unitario_comercial').max_digits, 21)
        self.assertEqual(item._meta.get_field('valor_unitario_comercial').decimal_places, 10)
        self.assertEqual(item._meta.get_field('valor_produto').max_digits, 21)
        self.assertEqual(item._meta.get_field('valor_produto').decimal_places, 6)

        self.assertEqual(item._meta.get_field('quantidade_tributaria').max_digits, 21)
        self.assertEqual(item._meta.get_field('quantidade_tributaria').decimal_places, 4)
        self.assertEqual(item._meta.get_field('valor_unitario_tributario').max_digits, 21)
        self.assertEqual(item._meta.get_field('valor_unitario_tributario').decimal_places, 10)

        nfe = NFe()
        self.assertEqual(nfe._meta.get_field('valor_produtos').max_digits, 21)
        self.assertEqual(nfe._meta.get_field('valor_produtos').decimal_places, 6)
        self.assertEqual(nfe._meta.get_field('valor_nota').max_digits, 21)
        self.assertEqual(nfe._meta.get_field('valor_nota').decimal_places, 6)

        ov = ItemNFeOverride()
        self.assertEqual(ov._meta.get_field('quantidade').max_digits, 21)
        self.assertEqual(ov._meta.get_field('quantidade').decimal_places, 4)
        self.assertEqual(ov._meta.get_field('valor_unitario').max_digits, 21)
        self.assertEqual(ov._meta.get_field('valor_unitario').decimal_places, 10)
        self.assertEqual(ov._meta.get_field('valor_produto').max_digits, 21)
        self.assertEqual(ov._meta.get_field('valor_produto').decimal_places, 6)

    def test_quantity_validation_rejects_excess_integer_digits(self):
        nfe = NFe.objects.create(chave_acesso='1'*44, numero='1', serie='1', data_emissao='2025-01-01T00:00:00Z', emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0, tenant=self.tenant)
        item = ItemNFe(nfe=nfe, numero_item=1, codigo_produto='X', descricao='d', cfop='5102', unidade_comercial='UN')
        # qCom int part allowed: 11 - 4 = 7 digits -> 8-digit integer should fail
        item.quantidade_comercial = Decimal('12345678.0000')
        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_valor_unitario_validation(self):
        nfe = NFe.objects.create(chave_acesso='2'*44, numero='1', serie='1', data_emissao='2025-01-01T00:00:00Z', emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0, tenant=self.tenant)
        item = ItemNFe(nfe=nfe, numero_item=1, codigo_produto='Y', descricao='d', cfop='5102', unidade_comercial='UN')
        # vUnCom: 11 digits total, 10 decimals -> only 1 integer digit allowed
        item.valor_unitario_comercial = Decimal('100.0000000000')
        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_valor_produto_validation(self):
        nfe = NFe.objects.create(chave_acesso='3'*44, numero='1', serie='1', data_emissao='2025-01-01T00:00:00Z', emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0, tenant=self.tenant)
        item = ItemNFe(nfe=nfe, numero_item=1, codigo_produto='Z', descricao='d', cfop='5102', unidade_comercial='UN')
        # vProd: 13 digits total, 2 decimals -> 11 integer digits allowed; 12-digit integer should fail
        item.valor_produto = Decimal('123456789012.00')
        with self.assertRaises(ValidationError):
            item.full_clean()
