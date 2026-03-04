from django.test import TestCase
from apps.fiscal.services.sefaz_distrib import SefazDistribClient
import gzip
import base64


class SefazDistribFetchTest(TestCase):
    def test_fetch_parses_doczip_and_extracts_chave(self):
        xml = '<nfeProc><NFe><infNFe Id="NFe' + '7'*44 + '">OK</infNFe></NFe></nfeProc>'
        gz = gzip.compress(xml.encode('utf-8'))
        b64 = base64.b64encode(gz).decode('utf-8')
        client = SefazDistribClient(simulate=False)

        # patch _request to return a list with a docZip-like structure
        def fake_request(certificado):
            return [{'docZip': b64}]

        client._request = fake_request
        items = client.fetch(certificado=None)
        self.assertEqual(len(items), 1)
        it = items[0]
        self.assertIn('7'*44, it.chave_acesso)
        self.assertIn('<nfeProc', it.raw_xml)
