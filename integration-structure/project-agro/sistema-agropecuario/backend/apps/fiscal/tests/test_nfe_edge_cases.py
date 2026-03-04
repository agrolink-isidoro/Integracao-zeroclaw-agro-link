from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from pathlib import Path


class NFeEdgeCasesTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='u', password='p')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_missing_valor_defaults_to_zero(self):
        # Remove <vNF> and expect upload to succeed with valor_nota == 0
        xml_path = Path(__file__).parent / 'fixtures' / '52251004621697000179550010000100511374580.xml'
        if not xml_path.exists():
            self.skipTest(f"Fixture XML not found: {xml_path}")
        xml = xml_path.read_text(encoding='utf-8')
        xml = xml.replace('<vNF>27250.00</vNF>', '')
        from io import BytesIO
        fh = BytesIO(xml.encode('utf-8'))
        response = self.client.post('/api/fiscal/nfes/upload_xml/', {'xml_file': fh}, format='multipart')
        self.assertIn(response.status_code, (200, 201))
        # Verify stored NFe has valor_nota == 0
        from apps.fiscal.models import NFe
        nfe = NFe.objects.first()
        self.assertIsNotNone(nfe)
        self.assertEqual(str(nfe.valor_nota), '0.00')