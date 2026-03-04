from django.test import TestCase
from apps.fiscal.services.sefaz_distrib import SefazDistribClient
import gzip
import base64


class SefazDistribUnitTest(TestCase):
    def test_decode_doczip_base64_gzip(self):
        # prepare a small XML and compress+base64 encode it
        xml = '<nfeProc><NFe><infNFe Id="NFe123">OK</infNFe></NFe></nfeProc>'
        gz = gzip.compress(xml.encode('utf-8'))
        b64 = base64.b64encode(gz).decode('utf-8')

        client = SefazDistribClient(simulate=True)
        decoded = client._decode_doczip(b64)
        self.assertIn('<nfeProc', decoded)
        self.assertIn('NFe123', decoded)
