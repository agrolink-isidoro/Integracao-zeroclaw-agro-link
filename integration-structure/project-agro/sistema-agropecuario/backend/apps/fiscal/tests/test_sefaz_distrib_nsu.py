from django.test import TestCase
from apps.fiscal.services.sefaz_distrib import SefazDistribClient
import gzip
import base64


class SefazDistribNSUTest(TestCase):
    def test_fetch_returns_nsu_when_present(self):
        xml = '<nfeProc><NFe><infNFe Id="NFe' + '4'*44 + '">OK</infNFe></NFe></nfeProc>'
        gz = gzip.compress(xml.encode('utf-8'))
        b64 = base64.b64encode(gz).decode('utf-8')

        client = SefazDistribClient(simulate=False)

        # Mock _request to return items only once (avoid infinite loop in fetch)
        call_count = [0]
        def fake_request(certificado=None, last_nsu=None):
            call_count[0] += 1
            # Return items only on first call, empty on second to stop loop
            if call_count[0] == 1:
                return [{'nsu': '00042', 'docZip': b64}]
            return []

        client._request = fake_request
        items = client.fetch(certificado=None)
        self.assertEqual(len(items), 1)
        it = items[0]
        # nsu should be accessible as attribute
        self.assertEqual(it.__dict__.get('nsu'), '00042')
        self.assertIn('<nfeProc', it.raw_xml)
        self.assertTrue(len(it.chave_acesso) == 44)
