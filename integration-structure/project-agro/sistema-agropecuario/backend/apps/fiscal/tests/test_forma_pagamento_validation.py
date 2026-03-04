"""
TEST_DEFINITION - forma_pagamento validation
Purpose: Comprehensive validation for import_metadata.forma_pagamento
Test Coverage:
- Boleto requires: vencimento (date) + valor (decimal > 0)
- Avista requires: nothing extra
- Cartao requires: nothing extra (optional metadata)
- Outra requires: nothing extra, observacao optional

Acceptance Criteria:
- POST /fiscal/nfes/remotas/{id}/import/ with missing vencimento for boleto → 400
- POST /fiscal/nfes/remotas/{id}/import/ with invalid valor for boleto → 400
- POST /fiscal/nfes/remotas/{id}/import/ with avista → accepts without vencimento
- POST /fiscal/nfes/remotas/{id}/import/ with cartao → accepts
- POST /fiscal/nfes/remotas/{id}/import/ with outra + observacao → accepts
- Cross-field validations enforced in serializer
"""

from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.core.models import CustomUser
from apps.fiscal.models_sync import NFeRemote
from apps.fiscal.views import NFeRemoteImportView
from apps.fiscal.serializers_import import ImportMetadataSerializer
from datetime import datetime, timedelta
from decimal import Decimal
import json


class ImportMetadataSerializerTest(TestCase):
    """Unit tests for ImportMetadataSerializer with forma_pagamento validation."""

    def test_boleto_requires_vencimento_and_valor(self):
        """Boleto must have vencimento (date) and valor (decimal > 0)."""
        data = {
            'forma_pagamento': 'boleto',
            'vencimento': None,
            'valor': None
        }
        serializer = ImportMetadataSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('vencimento', serializer.errors)
        self.assertIn('valor', serializer.errors)

    def test_boleto_vencimento_future_date(self):
        """Boleto vencimento must be a future date (ISO 8601)."""
        tomorrow = (datetime.now() + timedelta(days=1)).date().isoformat()
        data = {
            'forma_pagamento': 'boleto',
            'vencimento': tomorrow,
            'valor': '1500.00'
        }
        serializer = ImportMetadataSerializer(data=data)
        self.assertTrue(serializer.is_valid(), f"Errors: {serializer.errors}")

    def test_boleto_vencimento_past_date_invalid(self):
        """Boleto vencimento cannot be in the past."""
        yesterday = (datetime.now() - timedelta(days=1)).date().isoformat()
        data = {
            'forma_pagamento': 'boleto',
            'vencimento': yesterday,
            'valor': '1500.00'
        }
        serializer = ImportMetadataSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('vencimento', serializer.errors)

    def test_boleto_valor_must_be_positive(self):
        """Boleto valor must be > 0."""
        tomorrow = (datetime.now() + timedelta(days=1)).date().isoformat()
        data = {
            'forma_pagamento': 'boleto',
            'vencimento': tomorrow,
            'valor': '0'
        }
        serializer = ImportMetadataSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('valor', serializer.errors)

    def test_boleto_valor_negative_invalid(self):
        """Boleto valor cannot be negative."""
        tomorrow = (datetime.now() + timedelta(days=1)).date().isoformat()
        data = {
            'forma_pagamento': 'boleto',
            'vencimento': tomorrow,
            'valor': '-100.00'
        }
        serializer = ImportMetadataSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('valor', serializer.errors)

    def test_avista_no_vencimento_required(self):
        """Avista does NOT require vencimento or valor."""
        data = {
            'forma_pagamento': 'avista'
        }
        serializer = ImportMetadataSerializer(data=data)
        self.assertTrue(serializer.is_valid(), f"Errors: {serializer.errors}")

    def test_cartao_no_extra_fields_required(self):
        """Cartão does NOT require vencimento, valor, or observacao."""
        data = {
            'forma_pagamento': 'cartao'
        }
        serializer = ImportMetadataSerializer(data=data)
        self.assertTrue(serializer.is_valid(), f"Errors: {serializer.errors}")

    def test_cartao_accepts_opcional_metadata(self):
        """Cartão can have optional fields (nsu, bandeira, etc)."""
        data = {
            'forma_pagamento': 'cartao',
            'nsu': '123456',
            'bandeira': 'visa'
        }
        serializer = ImportMetadataSerializer(data=data)
        self.assertTrue(serializer.is_valid(), f"Errors: {serializer.errors}")

    def test_outra_accepts_observacao(self):
        """Outra forma_pagamento accepts observacao field."""
        data = {
            'forma_pagamento': 'outra',
            'observacao': 'Pagamento via transferência bancária'
        }
        serializer = ImportMetadataSerializer(data=data)
        self.assertTrue(serializer.is_valid(), f"Errors: {serializer.errors}")

    def test_outra_without_observacao_valid(self):
        """Outra pode ser criado sem observacao."""
        data = {
            'forma_pagamento': 'outra'
        }
        serializer = ImportMetadataSerializer(data=data)
        self.assertTrue(serializer.is_valid(), f"Errors: {serializer.errors}")

    def test_invalid_forma_pagamento_choice(self):
        """Invalid forma_pagamento choice should be rejected."""
        data = {
            'forma_pagamento': 'invalido'
        }
        serializer = ImportMetadataSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('forma_pagamento', serializer.errors)

    def test_missing_forma_pagamento_required(self):
        """forma_pagamento is required field."""
        data = {}
        serializer = ImportMetadataSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('forma_pagamento', serializer.errors)


class NFeRemoteImportViewFormaPagamentoTest(TestCase):
    """Integration tests for NFeRemoteImportView with forma_pagamento validation."""

    def setUp(self):
        """Create test user and NFe remote."""
        self.user = CustomUser.objects.create_user(username='testuser', password='testpass')
        self.factory = APIRequestFactory()

    def test_post_import_boleto_missing_vencimento(self):
        """POST import with boleto but missing vencimento should return 400."""
        remote = NFeRemote.objects.create(
            chave_acesso='35230214730635000155550010000000011000000019',
            raw_xml='<NFe>test</NFe>'
        )

        view = NFeRemoteImportView.as_view()
        request = self.factory.post(f'/fiscal/nfes/remotas/{remote.id}/import/', {
            'import_metadata': {
                'forma_pagamento': 'boleto',
                'valor': '1500.00'
                # Missing vencimento
            }
        }, format='json')
        force_authenticate(request, user=self.user)
        response = view(request, pk=remote.id)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'validation_error')

    def test_post_import_boleto_missing_valor(self):
        """POST import with boleto but missing valor should return 400."""
        remote = NFeRemote.objects.create(
            chave_acesso='35230214730635000155550010000000011000000019',
            raw_xml='<NFe>test</NFe>'
        )

        tomorrow = (datetime.now() + timedelta(days=1)).date().isoformat()
        view = NFeRemoteImportView.as_view()
        request = self.factory.post(f'/fiscal/nfes/remotas/{remote.id}/import/', {
            'import_metadata': {
                'forma_pagamento': 'boleto',
                'vencimento': tomorrow
                # Missing valor
            }
        }, format='json')
        force_authenticate(request, user=self.user)
        response = view(request, pk=remote.id)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'validation_error')
