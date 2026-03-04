from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()


def load_sample_xml():
    with open('test_nfe.xml', 'rb') as f:
        return f.read()


class UploadSkipChaveValidationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(username='u')
        # authenticate as staff to bypass permission checks
        self.user.is_staff = True
        self.user.save()
        self.client.force_authenticate(user=self.user)

    @override_settings(FISCAL_SKIP_CHAVE_VALIDATION=True)
    def test_upload_skips_chave_validation_when_flag_on(self):
        xml_content = load_sample_xml()
        file = SimpleUploadedFile('nota.xml', xml_content, content_type='application/xml')
        resp = self.client.post('/api/fiscal/nfes/upload_xml/', {'xml_file': file}, format='multipart')
        # With skip flag, upload should proceed (may still fail on other validations)
        # Accept either 201 (created) or 200/202 depending on internal flows; assert not 400 invalid_chave
        self.assertNotEqual(resp.status_code, 400)

    @override_settings(FISCAL_SKIP_CHAVE_VALIDATION=False)
    def test_upload_fails_chave_validation_by_default(self):
        xml_content = load_sample_xml()
        file = SimpleUploadedFile('nota.xml', xml_content, content_type='application/xml')
        resp = self.client.post('/api/fiscal/nfes/upload_xml/', {'xml_file': file}, format='multipart')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data.get('error'), 'invalid_chave_acesso')
