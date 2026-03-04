from django.test import TestCase
from datetime import timedelta
from django.utils import timezone
from apps.fiscal.models import NFe
from apps.fiscal.models_emissao import EmissaoJob
from apps.fiscal.services.sefaz_client import SefazClient
from types import SimpleNamespace
from unittest import mock
from apps.fiscal.tasks import process_emissao_job


class EmissaoProcessingTest(TestCase):
    def test_retry_schedules_next_attempt_when_not_celery(self):
        nfe = NFe.objects.create(chave_acesso='9001', numero='1', serie='1', data_emissao='2025-01-01T00:00:00Z', emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        nfe.xml_content = '<xml></xml>'
        nfe.save()

        job = EmissaoJob.objects.create(nfe=nfe, status='pending')

        fake_result = SimpleNamespace(success=False, message='Network error')
        with mock.patch.object(SefazClient, 'emit', return_value=fake_result):
            res = process_emissao_job.__wrapped__(job.id)
            job.refresh_from_db()
            self.assertEqual(job.status, 'pending')
            self.assertIsNotNone(job.scheduled_at)
            self.assertEqual(job.tentativa_count, 1)
            self.assertIn('Network error', job.last_error)

    def test_reconcile_marks_stuck_processing_failed(self):
        nfe = NFe.objects.create(chave_acesso='9002', numero='1', serie='1', data_emissao='2025-01-01T00:00:00Z', emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        job = EmissaoJob.objects.create(nfe=nfe, status='processing')
        # set updated_at to far past
        job.updated_at = timezone.now() - timedelta(minutes=120)
        from apps.fiscal.models_emissao import EmissaoJob as EJ
        EJ.objects.filter(pk=job.pk).update(updated_at=job.updated_at)

        from django.core.management import call_command
        call_command('reconcile_emissao_jobs', '--stuck-minutes', '30')
        job.refresh_from_db()
        self.assertEqual(job.status, 'failed')
        self.assertEqual(job.last_error, 'stuck_processing')

    def test_job_marked_failed_after_repeated_failures(self):
        """When SefazClient keeps failing, job should be marked failed after max retries."""
        from types import SimpleNamespace
        nfe = NFe.objects.create(chave_acesso='9900', numero='1', serie='1', data_emissao='2025-01-01T00:00:00Z', emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        nfe.xml_content = '<xml></xml>'
        nfe.save()

        job = EmissaoJob.objects.create(nfe=nfe, status='pending')

        fake_result = SimpleNamespace(success=False, message='permanent failure')
        with mock.patch('apps.fiscal.services.sefaz_client.SefazClient.emit', return_value=fake_result):
            # Repeatedly call the wrapped task as tests do (no Celery retry)
            max_attempts = 3
            for _ in range(max_attempts + 1):
                process_emissao_job.__wrapped__(job.id)
                job.refresh_from_db()
                if job.status == 'failed':
                    break

        job.refresh_from_db()
        self.assertEqual(job.status, 'failed')
        # tentativa_count should be at least the configured max_retries
        self.assertGreaterEqual(job.tentativa_count, max_attempts)
        self.assertEqual(job.last_error, 'max_retries_exceeded')
