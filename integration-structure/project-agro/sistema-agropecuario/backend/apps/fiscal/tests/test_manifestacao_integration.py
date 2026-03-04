import os
from django.test import SimpleTestCase

from apps.fiscal.services.sefaz_client import SefazClient


class ManifestacaoIntegrationTest(SimpleTestCase):
    def test_sign_with_local_pfx_if_present(self):
        pfx_path = os.environ.get('FISCAL_TEST_PFX_PATH')
        pfx_pass = os.environ.get('FISCAL_TEST_PFX_PASS', None)
        if not pfx_path or not os.path.exists(pfx_path):
            self.skipTest('FISCAL_TEST_PFX_PATH not set or file missing; skipping integration test')

        # need signxml available to fully verify signature
        try:
            from signxml import XMLVerifier  # type: ignore
        except Exception:
            self.skipTest('signxml not available; skipping signature verification')

        client = SefazClient(simulate=False)
        xml = client._build_manifest_xml('0'*44, 'ciencia', nSeqEvento=1, motivo='integration-test')

        class PFX:
            def __init__(self, path):
                self._path = path
            def get_arquivo_bytes(self):
                with open(self._path, 'rb') as f:
                    return f.read()

        pfx_obj = PFX(pfx_path)

        # extract pem pair and sign
        pem_pair = client._extract_pems_from_pkcs12(pfx_obj)
        self.assertIsNotNone(pem_pair, msg='Failed to extract PEMs from provided PKCS12')
        key_pem, cert_pem = pem_pair
        signed = client._sign_xml(xml, key_pem, cert_pem)

        # verify signature (do not require full X.509 chain validation for a self-signed test cert)
        from signxml import SignatureConfiguration
        config = SignatureConfiguration(require_x509=False)
        verified = XMLVerifier().verify(signed, expect_config=config)
        self.assertIsNotNone(verified)
