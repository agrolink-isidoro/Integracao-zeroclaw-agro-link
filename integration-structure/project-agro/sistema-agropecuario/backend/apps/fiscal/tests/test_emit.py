from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.fiscal.models import NFe


class EmitEndpointTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='user', password='pw')
        self.staff = User.objects.create_user(username='staff', password='pw', is_staff=True)
        self.client = APIClient()

    def test_emit_requires_xml_and_staff(self):
        nfe = NFe.objects.create(chave_acesso='0001', numero='1', serie='1', data_emissao='2025-01-01T00:00:00Z', emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)

        # unauthenticated or non-staff should get 403
        self.client.force_authenticate(self.user)
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/emit/')
        self.assertEqual(resp.status_code, 403)

        # staff but missing XML -> 400
        self.client.force_authenticate(self.staff)
        resp2 = self.client.post(f'/api/fiscal/nfes/{nfe.id}/emit/')
        self.assertEqual(resp2.status_code, 400)

        # with XML and staff -> 202 enqueued (async)
        nfe.xml_content = '<xml></xml>'
        nfe.save()
        resp3 = self.client.post(f'/api/fiscal/nfes/{nfe.id}/emit/')
        self.assertEqual(resp3.status_code, 202)
        self.assertIn('job_id', resp3.data)
        # Job created
        from apps.fiscal.models_emissao import EmissaoJob
        job = EmissaoJob.objects.get(pk=resp3.data['job_id'])
        self.assertEqual(job.status, 'pending')
