from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from pathlib import Path
from apps.fiscal.models_certificados import CertificadoSefaz
from cryptography.fernet import Fernet


class CertificadoEncryptionTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_superuser(username='admin_enc', password='adminpass')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        # Enable deterministic key per test run
        self._override = override_settings(CERT_ENCRYPTION_KEY=Fernet.generate_key().decode())
        self._override.enable()

    def tearDown(self):
        self._override.disable()

    def test_upload_encrypts_and_decrypts(self):
        p12_path = Path(__file__).parent / 'fixtures' / 'test_cert.p12'
        original = p12_path.read_bytes()
        with open(p12_path, 'rb') as fh:
            data = {'nome': 'cert-enc', 'arquivo': fh}
            resp = self.client.post('/api/fiscal/certificados/', data, format='multipart')
        self.assertEqual(resp.status_code, 201)
        # Response should include arquivo_name and uploaded_by
        self.assertIn('arquivo_name', resp.data)
        self.assertIn('uploaded_by', resp.data)
        cert = CertificadoSefaz.objects.get(id=resp.data['id'])
        # encrypted bytes stored
        self.assertIsNotNone(cert.arquivo_encrypted)
        self.assertIsNotNone(cert.arquivo_name)
        # plaintext file should not be kept
        self.assertTrue(not cert.arquivo or not getattr(cert.arquivo, 'name', None))
        # decrypted bytes equal original
        self.assertEqual(cert.get_arquivo_bytes(), original)
        # fingerprint preserved
        self.assertEqual(resp.data.get('fingerprint'), cert.fingerprint)
