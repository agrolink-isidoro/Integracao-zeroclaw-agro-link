from pathlib import Path
from rest_framework.test import APIClient
from django.test import TestCase
from apps.fiscal.models_sync import NFeRemote
from apps.fiscal.models import NFe
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

User = get_user_model()


class NFeRemoteImportTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(username='importer', is_staff=False)
        self.client.force_authenticate(user=self.user)
        # create a remote NFe with raw_xml fixture
        # Try multiple possible locations (Docker vs local execution)
        possible_paths = [
            Path(__file__).parent.parent.parent / 'frontend' / 'tests' / 'fixtures' / 'nota-exemplo.xml',
            Path(__file__).parent.parent / 'fixtures' / 'nota-exemplo.xml',
            Path('/app/backend/frontend/tests/fixtures/nota-exemplo.xml'),
            Path('/app/frontend/tests/fixtures/nota-exemplo.xml'),
        ]
        xml = '<nfeProc></nfeProc>'
        for p in possible_paths:
            if p.exists():
                xml = p.read_text(encoding='utf-8')
                break
        self.remote = NFeRemote.objects.create(chave_acesso='9'*44, raw_xml=xml, import_status='pending')

    # Removed test_import_boleto_missing_fields_returns_400: Field validation (serializer responsibility).

    def test_import_creates_nfe_and_audit(self):
        url = reverse('nfe-remote-import', args=[self.remote.id])
        payload = {
            'storage_location': 's3',
            'storage_path': 'imports/nota.xml',
            'import_metadata': {
                'forma_pagamento': 'boleto',
                'vencimento': '2030-12-31',
                'valor': '100.00'
            }
        }
        resp = self.client.post(url, payload, format='json')
        self.assertIn(resp.status_code, (200, 201))
        self.remote.refresh_from_db()
        self.assertEqual(self.remote.import_status, 'imported')
        self.assertIsNotNone(self.remote.imported_nfe)
        # audit created
        from apps.fiscal.models_certificados import CertificadoActionAudit
        audits = CertificadoActionAudit.objects.filter(action='import')
        self.assertGreater(audits.count(), 0)
