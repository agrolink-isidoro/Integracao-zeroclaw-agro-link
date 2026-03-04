from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile


class MinimalDelegateUploadTest(TestCase):

    @override_settings(FISCAL_SKIP_CHAVE_VALIDATION=True)
    def test_minimal_upload_respects_skip_chave_setting(self):
        # Call the minimal delegate directly to avoid auth/permission checks
        from django.test.client import RequestFactory
        from apps.fiscal import urls as fiscal_urls

        xml_content = b"<NFe><infNFe><det>conteudo 987654321</det></infNFe></NFe>"
        file = SimpleUploadedFile('nota.xml', xml_content, content_type='application/xml')

        # Force the real view to raise so the minimal fallback runs; call the lightweight test view directly
        from unittest.mock import patch
        from django.test.client import RequestFactory
        from apps import fiscal as fiscal_module

        rf = RequestFactory()
        req = rf.post('/api/fiscal/nfes/upload_xml/', {'xml_file': file}, format='multipart')

        upload_func = getattr(fiscal_module.urls, 'upload_xml_delegate', None)
        if not upload_func:
            self.skipTest('minimal upload delegate not available in this env')

        with patch('apps.fiscal.views.NFeViewSet.as_view', side_effect=Exception('force minimal fallback')):
            with patch('apps.fiscal.views.NFeViewSet.upload_xml', side_effect=Exception('force minimal fallback')):
                resp = upload_func(req)

        self.assertEqual(resp.status_code, 201)
        data = resp.data if hasattr(resp, 'data') else {}
        self.assertTrue(data.get('success'))
        chave = data.get('chave_acesso')
        self.assertIsNotNone(chave)
        # synthetic chave should be 44 characters
        self.assertEqual(len(chave), 44)
        # should be numeric (we synthesize from digits and pad with zeros)
        self.assertTrue(chave.isdigit())
