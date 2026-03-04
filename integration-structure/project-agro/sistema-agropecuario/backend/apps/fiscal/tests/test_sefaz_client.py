from django.test import TestCase
from apps.fiscal.services.sefaz_client import SefazClient
from types import SimpleNamespace
from unittest import mock


class SefazClientTest(TestCase):
    def test_simulate_emit_success(self):
        client = SefazClient(simulate=True)
        nfe = SimpleNamespace(xml_content='<xml/>', chave_acesso='0001')
        res = client.emit(nfe)
        self.assertTrue(res.success)
        self.assertIsNotNone(res.protocolo)
        self.assertEqual(res.status, '100')

    def test_production_without_cert_fails(self):
        client = SefazClient(simulate=False, endpoint='http://example.local')
        nfe = SimpleNamespace(xml_content='<xml/>', chave_acesso='0001')
        res = client.emit(nfe, certificado=None)
        self.assertFalse(res.success)
        self.assertIn('Certificado', res.message)

    def test_production_http_flow(self):
        # requests may not be installed in the test environment; inject a fake module
        import sys
        fake_requests = mock.Mock()
        mock_resp = mock.Mock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {'protocolo': 'P123', 'status': '100', 'data_autorizacao': '2026-01-01T00:00:00'}
        # Simulate requests module and Session.post
        fake_requests.adapters = mock.Mock(HTTPAdapter=mock.Mock)
        fake_urllib3_retry = SimpleNamespace(Retry=mock.Mock)
        sys.modules['urllib3.util.retry'] = fake_urllib3_retry
        fake_requests.Session.return_value.post.return_value = mock_resp
        sys.modules['requests'] = fake_requests

        try:
            client = SefazClient(simulate=False, endpoint='http://example.local')
            nfe = SimpleNamespace(xml_content='<xml/>', chave_acesso='0001')
            fake_cert = SimpleNamespace(id=1)
            res = client.emit(nfe, certificado=fake_cert)
            self.assertTrue(res.success)
            self.assertEqual(res.protocolo, 'P123')
            fake_requests.Session.return_value.post.assert_called_once()
        finally:
            del sys.modules['requests']

    def test_production_with_pkcs12_cert(self):
        # Create a PKCS12 in-memory and ensure SefazClient passes cert tuple to requests
        try:
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.x509 import NameOID
            from cryptography import x509
            from datetime import datetime, timedelta
            from cryptography.hazmat.primitives.serialization import pkcs12
        except Exception:
            self.skipTest('cryptography not available')

        # Generate key and self-signed cert
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, u'Test')
        ])
        cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(
            key.public_key()
        ).serial_number(x509.random_serial_number()).not_valid_before(datetime.utcnow()).not_valid_after(
            datetime.utcnow() + timedelta(days=1)
        ).sign(key, hashes.SHA256())

        p12 = pkcs12.serialize_key_and_certificates(name=b'test', key=key, cert=cert, cas=None, encryption_algorithm=serialization.NoEncryption())

        class FakeCert:
            def get_arquivo_bytes(self):
                return p12

        import sys
        fake_requests = mock.Mock()
        mock_resp = mock.Mock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {'protocolo': 'P999', 'status': '100'}
        fake_requests.adapters = mock.Mock(HTTPAdapter=mock.Mock)
        fake_urllib3_retry = SimpleNamespace(Retry=mock.Mock)
        sys.modules['urllib3.util.retry'] = fake_urllib3_retry
        # Record cert_path observed during the POST call
        observed = {}
        def post_side_effect(*args, **kwargs):
            observed['cert'] = kwargs.get('cert')
            # Assert files exist during the call
            import os
            certs = observed['cert']
            if certs and isinstance(certs, tuple):
                assert os.path.exists(certs[0]) and os.path.exists(certs[1])
            return mock_resp

        fake_requests.Session.return_value.post.side_effect = post_side_effect
        sys.modules['requests'] = fake_requests

        try:
            client = SefazClient(simulate=False, endpoint='http://example.local')
            nfe = SimpleNamespace(xml_content='<xml/>', chave_acesso='0001')
            fake_cert = FakeCert()
            res = client.emit(nfe, certificado=fake_cert)
            self.assertTrue(res.success)
            self.assertEqual(res.protocolo, 'P999')
            # Ensure cert tuple was passed
            self.assertIn('cert', observed)
            cert_tuple = observed.get('cert')
            self.assertIsInstance(cert_tuple, tuple)
            # After call the files should have been cleaned up
            import os
            self.assertFalse(os.path.exists(cert_tuple[0]))
            self.assertFalse(os.path.exists(cert_tuple[1]))
        finally:
            del sys.modules['requests']

    def test_production_http_non_200_returns_error(self):
        import sys
        fake_requests = mock.Mock()
        mock_resp = mock.Mock()
        mock_resp.status_code = 500
        mock_resp.text = 'internal error'
        fake_requests.adapters = mock.Mock(HTTPAdapter=mock.Mock)
        fake_urllib3_retry = SimpleNamespace(Retry=mock.Mock)
        sys.modules['urllib3.util.retry'] = fake_urllib3_retry
        fake_requests.Session.return_value.post.return_value = mock_resp
        sys.modules['requests'] = fake_requests

        try:
            client = SefazClient(simulate=False, endpoint='http://example.local')
            nfe = SimpleNamespace(xml_content='<xml/>', chave_acesso='0001')
            fake_cert = SimpleNamespace(id=1)
            res = client.emit(nfe, certificado=fake_cert)
            self.assertFalse(res.success)
            self.assertIn('SEFAZ HTTP 500', res.message)
        finally:
            del sys.modules['requests']
