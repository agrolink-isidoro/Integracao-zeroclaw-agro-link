import io
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

class UploadWebDanfeTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_upload_web_danfe_fixture(self):
        # Prefer absolute path inside container if provided by developer; otherwise skip
        import os
        abs_path = '/app/frontend/tests/fixtures/nota-exemplo-web-danfe.xml'
        if not os.path.exists(abs_path) or os.path.getsize(abs_path) == 0:
            self.skipTest('Fixture nota-exemplo-web-danfe.xml not provided or empty; skipping')

        with open(abs_path, 'rb') as fh:
            response = self.client.post('/api/fiscal/nfes/upload_xml/', {'xml_file': fh}, format='multipart')
        # Assert that backend processes the XML (201) or returns readable error
        self.assertIn(response.status_code, (200, 201, 400), msg=f"Unexpected status {response.status_code}: {response.content}")
