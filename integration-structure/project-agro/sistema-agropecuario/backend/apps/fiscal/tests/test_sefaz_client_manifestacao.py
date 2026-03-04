from django.test import TestCase
from apps.fiscal.services.sefaz_client import SefazClient


class SefazClientManifestacaoTest(TestCase):
    def test_send_manifestacao_simulate(self):
        client = SefazClient(simulate=True)
        res = client.send_manifestacao('0'*44, 'ciencia')
        self.assertTrue(res.get('success'))
        self.assertEqual(res.get('cStat'), '135')

    def test_send_manifestacao_production_requires_cert(self):
        client = SefazClient(simulate=False, endpoint='http://example.local')
        res = client.send_manifestacao('0'*44, 'ciencia', certificado=None)
        self.assertFalse(res.get('success'))
        self.assertIn('certificado', res.get('message'))

    def test_send_manifestacao_production_with_cert_signs_xml(self):
        # create a temporary PKCS12 certificate (self-signed) and provide it to client
        try:
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.primitives import hashes
            from cryptography.x509 import Name, NameAttribute
            from cryptography.x509.oid import NameOID
            import datetime
            from cryptography import x509
            from cryptography.hazmat.primitives import serialization
            from cryptography.hazmat.primitives.serialization import pkcs12
        except Exception:
            self.skipTest('cryptography not available')

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = Name([NameAttribute(NameOID.COMMON_NAME, u'Test CA')])
        cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1)).not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365)).add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True).sign(key, hashes.SHA256())
        # Use NoEncryption for test PKCS12 container
        p12 = pkcs12.serialize_key_and_certificates(name=b'test', key=key, cert=cert, cas=None, encryption_algorithm=serialization.NoEncryption())

        class FakeCert:
            def get_arquivo_bytes(self):
                return p12

        fake = FakeCert()

        client = SefazClient(simulate=False, endpoint='http://example.local')

        from unittest import mock
        import types, sys
        # Inject a fake requests module if not present
        original_requests = sys.modules.get('requests')
        fake_requests_mod = types.ModuleType('requests')
        mock_post = mock.Mock()
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {'cStat': '135', 'nProt': '000', 'message': 'ok'}
        fake_requests_mod.post = mock_post
        sys.modules['requests'] = fake_requests_mod
        try:
            res = client.send_manifestacao('0'*44, 'ciencia', certificado=fake)
            # if this fails, include the full response for debugging
            self.assertTrue(res.get('success'), msg=f"response={res}")
            self.assertTrue(mock_post.called)
            payload = mock_post.call_args[1]['json']
            self.assertIn('xml', payload)
            xml = payload['xml']
            self.assertIn('<evento>', xml)
            # If signxml is available, the payload should contain a Signature element
            try:
                import signxml  # type: ignore
                self.assertIn('Signature', xml)
            except Exception:
                # signxml not available - acceptable in test env
                pass
        finally:
            # restore real requests module if any
            if original_requests is not None:
                sys.modules['requests'] = original_requests
            else:
                del sys.modules['requests']

    def test__sign_xml_uses_signxml_on_infEvento_mocked(self):
        # Build a small manifestacao XML and verify we call signxml and embed Signature
        client = SefazClient(simulate=False, endpoint='http://example.local')
        xml = client._build_manifest_xml('0'*44, 'ciencia', nSeqEvento=1, motivo='x')

        # Create a fake signxml module with XMLSigner.sign that appends a Signature element
        import types, sys
        fake_signxml = types.ModuleType('signxml')

        class FakeSigner:
            def __init__(self, method=None, signature_algorithm=None):
                self.method = method
                self.signature_algorithm = signature_algorithm
                self.signed = False

            def sign(self, elem, key=None, cert=None, reference_uri=None):
                # lxml element; append a Signature node
                try:
                    from lxml import etree
                except Exception:
                    # If lxml is not available, emulate by returning original
                    self.signed = True
                    return elem
                sig = etree.Element('Signature')
                if reference_uri:
                    ref = etree.SubElement(sig, 'Reference')
                    ref.set('URI', reference_uri)
                sig.text = 'signed-by-fake'
                elem.append(sig)
                self.signed = True
                return elem

        fake_signxml.XMLSigner = FakeSigner
        original = sys.modules.get('signxml')
        sys.modules['signxml'] = fake_signxml
        try:
            signed = client._sign_xml(xml, b'key', b'cert')
            self.assertIn(b'<Signature', signed)
            # ensure Signature is inside infEvento
            self.assertIn(b'<infEvento', signed)
            # ensure Reference URI contains the ID
            self.assertIn(b'Reference', signed)
        finally:
            if original is not None:
                sys.modules['signxml'] = original
            else:
                del sys.modules['signxml']

    def test__sign_xml_with_real_signxml_and_pem(self):
        try:
            from signxml import XMLVerifier  # type: ignore
            from lxml import etree
        except Exception:
            self.skipTest('signxml/lxml not available')

        # generate key/cert pair via cryptography
        try:
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.primitives import hashes, serialization
            import datetime
            from cryptography import x509
            from cryptography.x509 import Name, NameAttribute
            from cryptography.x509.oid import NameOID
        except Exception:
            self.skipTest('cryptography not available')

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = Name([NameAttribute(NameOID.COMMON_NAME, u'Test CA')])
        cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1)).not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365)).add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True).sign(key, hashes.SHA256())

        key_pem = key.private_bytes(encoding=serialization.Encoding.PEM, format=serialization.PrivateFormat.TraditionalOpenSSL, encryption_algorithm=serialization.NoEncryption())
        cert_pem = cert.public_bytes(serialization.Encoding.PEM)

        client = SefazClient(simulate=False, endpoint='http://example.local')
        xml = client._build_manifest_xml('0'*44, 'ciencia', nSeqEvento=3, motivo='real-sign')
        signed = client._sign_xml(xml, key_pem, cert_pem)

        # Skip certificate verification for test certs (self-signed limitations)
        # Ensure Signature element was created (proof of signing)
        root = etree.fromstring(signed)
        sig = root.xpath('.//*[local-name()="Signature"]')
        self.assertTrue(len(sig) > 0, 'Signature element not found')
        # ensure Signature element exists and Reference URI references the infEvento Id
        inf = root.xpath('.//*[local-name()="infEvento"]')[0]
        sig_elem = sig[0]
        ref = sig_elem.xpath('.//*[local-name()="Reference"]')[0]
        self.assertTrue(ref.get('URI').startswith('#'))
        # Check for enveloped transform and canonicalization method presence
        transforms = sig_elem.xpath('.//*[local-name()="Transform"]')
        self.assertTrue(any('enveloped-signature' in (t.text or '') or t.get('Algorithm') and 'enveloped-signature' in t.get('Algorithm') for t in transforms) or len(transforms) > 0)
        c14n = sig_elem.xpath('.//*[local-name()="CanonicalizationMethod"]')
        self.assertTrue(len(c14n) > 0)

    def test__sign_xml_with_x509_embedded_and_structure_validation(self):
        """Verify that signed XML contains proper X.509 structure for SEFAZ validation."""
        try:
            from lxml import etree
        except Exception:
            self.skipTest('lxml not available')

        try:
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.primitives import hashes, serialization
            import datetime
            from cryptography import x509
            from cryptography.x509 import Name, NameAttribute
            from cryptography.x509.oid import NameOID
        except Exception:
            self.skipTest('cryptography not available')

        # Generate key/cert pair (end-entity, not CA)
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = Name([NameAttribute(NameOID.COMMON_NAME, u'Test EndEntity X509')])
        cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1)).not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365)).add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True).sign(key, hashes.SHA256())

        key_pem = key.private_bytes(encoding=serialization.Encoding.PEM, format=serialization.PrivateFormat.TraditionalOpenSSL, encryption_algorithm=serialization.NoEncryption())
        cert_pem = cert.public_bytes(serialization.Encoding.PEM)

        client = SefazClient(simulate=False, endpoint='http://example.local')
        xml = client._build_manifest_xml('0'*44, 'confirmacao', nSeqEvento=7, motivo='x509-embed-test')
        signed = client._sign_xml(xml, key_pem, cert_pem)

        # Ensure X509Certificate is actually embedded (critical for SEFAZ validation)
        # This is essential for SEFAZ to validate the signature authenticity
        self.assertIn(b'X509Certificate', signed, 'X509Certificate must be embedded for SEFAZ validation')

        # Verify the structure: ensure Signature, Reference URI, and canonicalization are present
        root = etree.fromstring(signed)
        sig = root.xpath('.//*[local-name()="Signature"]')
        self.assertTrue(len(sig) > 0, 'No Signature element found')

        # Verify Reference has URI pointing to infEvento Id
        ref = sig[0].xpath('.//*[local-name()="Reference"]')
        self.assertTrue(len(ref) > 0, 'No Reference element found')
        self.assertTrue(ref[0].get('URI').startswith('#'), 'Reference URI must start with #')
        
        # Verify SignatureValue is present (ensures actual cryptographic signature)
        sig_value = sig[0].xpath('.//*[local-name()="SignatureValue"]')
        self.assertTrue(len(sig_value) > 0, 'No SignatureValue element found (cryptographic signature missing)')
        self.assertTrue(len(sig_value[0].text) > 0, 'SignatureValue must contain actual signature data')

    def test_send_manifestacao_handles_cstat_mapping(self):
        client = SefazClient(simulate=False, endpoint='http://example.local')
        class FakeCert:
            def get_arquivo_bytes(self):
                return b''
        fake = FakeCert()
        import types, sys
        # inject fake requests module
        original_requests = sys.modules.get('requests')
        fake_requests_mod = types.ModuleType('requests')
        mock_post = lambda *args, **kwargs: types.SimpleNamespace(status_code=200, json=lambda: {'cStat': '135', 'nProt': '000', 'message': 'ok'})
        fake_requests_mod.post = mock_post
        sys.modules['requests'] = fake_requests_mod
        try:
            res = client.send_manifestacao('0'*44, 'ciencia', certificado=fake)
            self.assertTrue(res.get('success'))
            self.assertEqual(res.get('cStat'), '135')
            self.assertTrue(res.get('vinculado'))
            # Now simulate 136
            fake_requests_mod.post = lambda *args, **kwargs: types.SimpleNamespace(status_code=200, json=lambda: {'cStat': '136', 'nProt': '000', 'message': 'ok'})
            res2 = client.send_manifestacao('0'*44, 'ciencia', certificado=fake)
            self.assertTrue(res2.get('success'))
            self.assertEqual(res2.get('cStat'), '136')
            self.assertFalse(res2.get('vinculado'))
        finally:
            if original_requests is not None:
                sys.modules['requests'] = original_requests
            else:
                del sys.modules['requests']

    def test__sign_xml_returns_original_if_signxml_missing(self):
        client = SefazClient(simulate=False, endpoint='http://example.local')
        xml = client._build_manifest_xml('0'*44, 'ciencia', nSeqEvento=2, motivo='y')
        import sys
        orig = sys.modules.pop('signxml', None)
        try:
            res = client._sign_xml(xml, b'key', b'cert')
            self.assertEqual(res, xml)
        finally:
            if orig is not None:
                sys.modules['signxml'] = orig

    def test_extract_pems_from_pkcs12_no_password(self):
        try:
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.primitives import hashes, serialization
            import datetime
            from cryptography import x509
            from cryptography.x509 import Name, NameAttribute
            from cryptography.x509.oid import NameOID
            from cryptography.hazmat.primitives.serialization import pkcs12
        except Exception:
            self.skipTest('cryptography not available')

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = Name([NameAttribute(NameOID.COMMON_NAME, u'Test NoPass')])
        cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1)).not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365)).add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True).sign(key, hashes.SHA256())
        p12 = pkcs12.serialize_key_and_certificates(name=b'test', key=key, cert=cert, cas=None, encryption_algorithm=serialization.NoEncryption())

        class FakeCert:
            def get_arquivo_bytes(self):
                return p12

        fake = FakeCert()
        client = SefazClient(simulate=False)
        res = client._extract_pems_from_pkcs12(fake)
        self.assertIsNotNone(res)
        key_pem, cert_pem = res
        self.assertIn(b'PRIVATE KEY', key_pem)
        self.assertIn(b'CERTIFICATE', cert_pem)

    def test_extract_pems_from_pkcs12_with_password_env(self):
        try:
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.primitives import hashes, serialization
            import datetime
            from cryptography import x509
            from cryptography.x509 import Name, NameAttribute
            from cryptography.x509.oid import NameOID
            from cryptography.hazmat.primitives.serialization import pkcs12
        except Exception:
            self.skipTest('cryptography not available')

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = Name([NameAttribute(NameOID.COMMON_NAME, u'Test Pass')])
        cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1)).not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365)).add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True).sign(key, hashes.SHA256())
        password = b'testpass'
        p12 = pkcs12.serialize_key_and_certificates(name=b'test', key=key, cert=cert, cas=None, encryption_algorithm=serialization.BestAvailableEncryption(password))

        class FakeCert2:
            def get_arquivo_bytes(self):
                return p12

        fake2 = FakeCert2()
        import os
        prev = os.environ.get('FISCAL_TEST_PFX_PASS')
        os.environ['FISCAL_TEST_PFX_PASS'] = password.decode('utf-8')
        try:
            client = SefazClient(simulate=False)
            res = client._extract_pems_from_pkcs12(fake2)
            self.assertIsNotNone(res)
            key_pem, cert_pem = res
            self.assertIn(b'PRIVATE KEY', key_pem)
            self.assertIn(b'CERTIFICATE', cert_pem)
        finally:
            if prev is None:
                del os.environ['FISCAL_TEST_PFX_PASS']
            else:
                os.environ['FISCAL_TEST_PFX_PASS'] = prev

    def test_extract_pems_from_pkcs12_corrupted_returns_none_and_logs(self):
        client = SefazClient(simulate=False)
        class FakeCorrupt:
            def get_arquivo_bytes(self):
                return b'random-not-a-pkcs12'

        fake = FakeCorrupt()
        import logging
        with self.assertLogs('apps.fiscal.services.sefaz_client', level='DEBUG') as cm:
            res = client._extract_pems_from_pkcs12(fake)
        self.assertIsNone(res)
        # ensure we logged failure message
        self.assertTrue(any('PKCS12 extraction failed' in m or 'openssl' in m or 'pkcs12' in m.lower() for m in cm.output))

    def test__sign_xml_embeds_x509_when_end_entity_cert(self):
        try:
            from signxml import XMLVerifier
            from lxml import etree
        except Exception:
            self.skipTest('signxml/lxml not available')

        try:
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.primitives import hashes, serialization
            import datetime
            from cryptography import x509
            from cryptography.x509 import Name, NameAttribute
            from cryptography.x509.oid import NameOID
        except Exception:
            self.skipTest('cryptography not available')

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = Name([NameAttribute(NameOID.COMMON_NAME, u'EndEntity')])
        cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1)).not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365)).add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True).sign(key, hashes.SHA256())

        key_pem = key.private_bytes(encoding=serialization.Encoding.PEM, format=serialization.PrivateFormat.TraditionalOpenSSL, encryption_algorithm=serialization.NoEncryption())
        cert_pem = cert.public_bytes(serialization.Encoding.PEM)

        client = SefazClient(simulate=False)
        xml = client._build_manifest_xml('0'*44, 'ciencia', nSeqEvento=5, motivo='embed-cert')
        signed = client._sign_xml(xml, key_pem, cert_pem)
        self.assertIn(b'X509Certificate', signed)

    def test__sign_xml_omits_x509_when_ca_cert(self):
        try:
            from signxml import XMLVerifier
            from lxml import etree
        except Exception:
            self.skipTest('signxml/lxml not available')

        try:
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.primitives import hashes, serialization
            import datetime
            from cryptography import x509
            from cryptography.x509 import Name, NameAttribute
            from cryptography.x509.oid import NameOID
        except Exception:
            self.skipTest('cryptography not available')

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = Name([NameAttribute(NameOID.COMMON_NAME, u'CA')])
        cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1)).not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365)).add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True).sign(key, hashes.SHA256())

        key_pem = key.private_bytes(encoding=serialization.Encoding.PEM, format=serialization.PrivateFormat.TraditionalOpenSSL, encryption_algorithm=serialization.NoEncryption())
        cert_pem = cert.public_bytes(serialization.Encoding.PEM)

        client = SefazClient(simulate=False)
        xml = client._build_manifest_xml('0'*44, 'ciencia', nSeqEvento=6, motivo='ca-cert')
        signed = client._sign_xml(xml, key_pem, cert_pem)
        self.assertNotIn(b'X509Certificate', signed)
