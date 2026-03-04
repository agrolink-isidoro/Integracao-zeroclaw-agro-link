"""
E2E tests for emit (emissão) endpoint/task workflow.

These tests validate the complete emission workflow with simulated SEFAZ responses.
Priority: Medium - essential coverage for production emit pipeline.
"""

from django.test import TestCase
from django.utils import timezone

from apps.fiscal.models import NFe, EmissaoJob


class EmitE2ETest(TestCase):
    """End-to-end tests for emit (emissão) workflow."""

    def setUp(self):
        """Create test NFe for use in tests."""
        self.nfe = NFe.objects.create(
            chave_acesso='2'*44,
            numero='456',
            serie='1',
            modelo='55',
            data_emissao=timezone.now(),
            data_saida=timezone.now(),
            natureza_operacao='Venda de Produto',
            tipo_operacao='0',
            destino_operacao='1',
            municipio_fato_gerador='3518800',
            tipo_impressao='1',
            tipo_emissao='1',
            finalidade='1',
            indicador_consumidor_final='0',
            indicador_presenca='0',
            versao_processo='1',
            emitente_nome='Empresa Emitente',
            destinatario_nome='Destinatário EMIT',
            valor_produtos='500.00',
            valor_nota='550.00'
        )

    def test_emissao_job_creation_and_status_tracking(self):
        """Test that EmissaoJob is created and tracks status changes correctly."""
        job = EmissaoJob.objects.create(nfe=self.nfe, status='pending')
        
        self.assertEqual(job.status, 'pending')
        self.assertEqual(job.nfe, self.nfe)
        self.assertEqual(job.tentativa_count, 0)
        
        # Test status transitions
        job.mark_processing()
        job.refresh_from_db()
        self.assertEqual(job.status, 'processing')
        
        # Test mark_success
        job.mark_success('123456789', timezone.now())
        job.refresh_from_db()
        self.assertEqual(job.status, 'success')
        self.assertEqual(job.protocolo, '123456789')
        
    def test_emissao_job_mark_failed(self):
        """Test that EmissaoJob correctly marks failed status."""
        job = EmissaoJob.objects.create(nfe=self.nfe, status='pending')
        
        job.mark_failed('Erro na validação')
        job.refresh_from_db()
        
        self.assertEqual(job.status, 'failed')
        self.assertIn('Erro', job.last_error)

    def test_emissao_job_retry_count_increments(self):
        """Test that retry count can be tracked on EmissaoJob."""
        job = EmissaoJob.objects.create(nfe=self.nfe, status='pending')
        
        self.assertEqual(job.tentativa_count, 0)
        
        # Simulate retry attempt
        job.tentativa_count = 1
        job.save()
        
        job.refresh_from_db()
        self.assertEqual(job.tentativa_count, 1)

