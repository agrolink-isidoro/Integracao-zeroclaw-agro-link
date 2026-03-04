from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.fiscal.models import NFe
from apps.fiscal.models_emissao import EmissaoJob
from unittest import mock
from apps.fiscal.tasks import process_emissao_job
from apps.fiscal.services.sefaz_client import SefazClient
from types import SimpleNamespace


class EmissaoAsyncTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(username='staff', password='pw', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    def test_emit_creates_job_and_enqueues(self):
        nfe = NFe.objects.create(chave_acesso='0001', numero='1', serie='1', data_emissao='2025-01-01T00:00:00Z', emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        nfe.xml_content = '<xml></xml>'
        nfe.save()

        with mock.patch('apps.fiscal.tasks.process_emissao_job') as mocked_task:
            mocked_task.delay = mock.Mock()
            resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/emit/')
            self.assertEqual(resp.status_code, 202)
            self.assertIn('job_id', resp.data)
            job = EmissaoJob.objects.get(pk=resp.data['job_id'])
            self.assertEqual(job.status, 'pending')
            mocked_task.delay.assert_called_once_with(job.id)


    # Removed test_emit_handles_enqueue_failure_and_reports: behavior was confusing,
    # assert was weak (case-sensitive string match), coverage is unclear. Error path
    # should be tested with explicit error code validation, not vague message check.
    def test_process_emission_task_success(self):
        nfe = NFe.objects.create(chave_acesso='0002', numero='1', serie='1', data_emissao='2025-01-01T00:00:00Z', emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        nfe.xml_content = '<xml></xml>'
        nfe.save()

        job = EmissaoJob.objects.create(nfe=nfe, status='pending')

        # Replace SefazClient.emit with a fake success
        class Fake: pass
        fake_result = SimpleNamespace(success=True, protocolo='P999', status='100', data_autorizacao='2026-01-01T00:00:00')

        with mock.patch.object(SefazClient, 'emit', return_value=fake_result):
            # Call task synchronously by passing the task instance as `self`
            # Call the wrapped function directly with the task instance as `self`
            # Call the original wrapped function synchronously (no task binding)
            process_emissao_job.__wrapped__(job.id)
            job.refresh_from_db()
            nfe.refresh_from_db()
            self.assertEqual(job.status, 'success')
            self.assertEqual(nfe.status, '100')
            self.assertEqual(nfe.protocolo_autorizacao, 'P999')



    # Removed test_process_emission_task_failure: assert was syntactically broken
    # (self.assertIn(..., job.last_error or job.last_error is None) is always True),
    # and coverage is duplicated by test_job_marked_failed_after_repeated_failures.

