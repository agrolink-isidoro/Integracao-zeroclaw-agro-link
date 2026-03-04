from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.fiscal.models import NFe
from apps.fiscal.models_certificados import CertificadoActionAudit


class StatusCancelTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(username='s', password='p', is_staff=True)
        self.client = APIClient()

    def test_status_and_cancel(self):
        nfe = NFe.objects.create(chave_acesso='CHX', numero='2', serie='1', data_emissao='2025-01-01T00:00:00Z', emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        nfe.xml_content = '<xml></xml>'
        # ensure not already authorized (default is '100')
        nfe.status = '0'
        nfe.save()

        # send to sefaz to set protocol
        self.client.force_authenticate(self.staff)
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/send_to_sefaz/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('protocolo_autorizacao', data)

        # status endpoint
        resp2 = self.client.get(f'/api/fiscal/nfes/{nfe.id}/status/')
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.json().get('status'), '100')

        # cancel
        resp3 = self.client.post(f'/api/fiscal/nfes/{nfe.id}/cancel/', {'reason': 'test_cancel'}, format='json')
        self.assertEqual(resp3.status_code, 200)
        self.assertEqual(resp3.json().get('status'), '110')

        # audit entry for cancel should be created
        audits = CertificadoActionAudit.objects.filter(action='cancel')
        self.assertGreater(audits.count(), 0)
        self.assertIn('reason=test_cancel', audits.first().details)
