from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.core.models import CustomUser
from apps.fiscal.models_certificados import CertificadoSefaz
from apps.fiscal.views_certificados import CertificadoSefazViewSet
from django.core.files.base import ContentFile
from unittest.mock import patch


@override_settings(CERT_ENCRYPTION_KEY=__import__('cryptography.fernet').fernet.Fernet.generate_key().decode())
class CertificadoPasswordTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_superuser(username='admin', password='pass')
        self.factory = APIRequestFactory()

        # Create a dummy p12 content (not validated here because we mock pkcs12)
        data = b'fake-p12-bytes'
        cert = CertificadoSefaz()
        cert.nome = 'Test P12'
        cert.arquivo_name = 'test.p12'
        cert.arquivo.save('test.p12', ContentFile(data), save=False)
        cert.save()
        self.cert = cert

    def test_set_password_success(self):
        view = CertificadoSefazViewSet.as_view({'post': 'set_password'})
        request = self.factory.post(f'/fiscal/certificados/{self.cert.id}/set_password/', {'password': 'secret'})
        force_authenticate(request, user=self.user)

        # Mock pkcs12.load_key_and_certificates to succeed for provided password
        with patch('cryptography.hazmat.primitives.serialization.pkcs12.load_key_and_certificates') as mock_load:
            mock_load.return_value = (b'key', b'cert', None)
            response = view(request, pk=self.cert.id)
            self.assertEqual(response.status_code, 200)
            self.cert.refresh_from_db()
            self.assertIsNotNone(self.cert.senha_encrypted)
            # Audit entry created
            from apps.fiscal.models_certificados import CertificadoActionAudit
            self.assertTrue(CertificadoActionAudit.objects.filter(certificado=self.cert, action='set_password').exists())

        # Also test posting JSON payload (application/json)
        import json as _json
        request_json = self.factory.post(f'/fiscal/certificados/{self.cert.id}/set_password/', _json.dumps({'password': 'secret2'}), content_type='application/json')
        force_authenticate(request_json, user=self.user)
        with patch('cryptography.hazmat.primitives.serialization.pkcs12.load_key_and_certificates') as mock_load2:
            mock_load2.return_value = (b'key', b'cert', None)
            response_json = view(request_json, pk=self.cert.id)
            self.assertEqual(response_json.status_code, 200)
            self.cert.refresh_from_db()
            self.assertIsNotNone(self.cert.senha_encrypted)
    def test_set_password_invalid(self):
        view = CertificadoSefazViewSet.as_view({'post': 'set_password'})
        request = self.factory.post(f'/fiscal/certificados/{self.cert.id}/set_password/', {'password': 'wrong'})
        force_authenticate(request, user=self.user)

        # Mock pkcs12 to raise on load
        with patch('cryptography.hazmat.primitives.serialization.pkcs12.load_key_and_certificates') as mock_load:
            mock_load.side_effect = Exception('Invalid password')
            response = view(request, pk=self.cert.id)
            self.assertEqual(response.status_code, 400)
            self.cert.refresh_from_db()
            self.assertIsNone(self.cert.senha_encrypted)
