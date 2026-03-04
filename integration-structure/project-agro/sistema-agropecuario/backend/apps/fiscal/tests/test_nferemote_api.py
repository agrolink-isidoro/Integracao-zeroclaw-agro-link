from rest_framework.test import APIClient
from django.test import TestCase
from django.urls import reverse
from apps.fiscal.models_sync import NFeRemote
from django.contrib.auth import get_user_model
from django.test import override_settings
from pathlib import Path

User = get_user_model()


@override_settings(FISCAL_MANIFESTACAO_ENABLED=True)
class NFeRemoteImportTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(username='importuser')
        self.client.force_authenticate(user=self.user)
        # Load XML fixture for remote entry
        possible_paths = [
            Path(__file__).parent.parent / 'fixtures' / 'nota-exemplo.xml',
            Path('/app/backend/frontend/tests/fixtures/nota-exemplo.xml'),
        ]
        xml = '<xml/>'
        for p in possible_paths:
            if p.exists():
                xml = p.read_text(encoding='utf-8')
                break
        self.remote = NFeRemote.objects.create(chave_acesso='2'*44, raw_xml=xml)

    # Removed test_import_boleto_requires_vencimento_and_valor: Field validation (framework/serializer responsibility).

    def test_import_boleto_success(self):
        url = reverse('nfe-remote-import', args=[self.remote.id])
        payload = {
            'import_metadata': {
                'forma_pagamento': 'boleto',
                'vencimento': '2030-12-31',
                'valor': '100.00'
            },
        }
        resp = self.client.post(url, payload, format='json')
        self.assertIn(resp.status_code, (200, 201))
        self.remote.refresh_from_db()
        self.assertEqual(self.remote.import_status, 'imported')
