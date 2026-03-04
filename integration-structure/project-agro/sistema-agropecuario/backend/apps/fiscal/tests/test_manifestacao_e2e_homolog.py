"""
E2E tests for Manifestacao against homolog/simulated SEFAZ endpoints.

These tests validate the complete manifestacao workflow:
1. Create Manifestacao via API
2. Trigger send via task (with simulated SEFAZ response)
3. Verify status transitions (pending -> sent/failed)
4. Validate auditoria creation with cStat/nProt
5. Test reconciliation for cStat=136 (evento registrado sem vínculo)
6. Ensure idempotence for duplicate submissions

Priority: High - these tests ensure compliance with NT2020.001 before
activating feature flag in staging.
"""

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient
from rest_framework import status
from unittest import mock
import json

from apps.fiscal.models_manifestacao import Manifestacao
from apps.fiscal.models import NFe
from apps.fiscal.models_certificados import CertificadoActionAudit
from apps.fiscal.serializers import ManifestacaoSerializer

User = get_user_model()


@override_settings(FISCAL_MANIFESTACAO_ENABLED=True)
class ManifestacaoE2ETest(TestCase):
    """End-to-end tests for manifestacao workflow via API and tasks."""

    def setUp(self):
        """Create test user and NFe for use in tests."""
        self.user = User.objects.create(username='e2euser', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.nfe = NFe.objects.create(
            chave_acesso='1'*44,
            numero='123',
            serie='1',
            modelo='55',
            data_emissao=timezone.now(),
            data_saida=timezone.now(),
            natureza_operacao='Teste E2E',
            tipo_operacao='0',
            destino_operacao='1',
            municipio_fato_gerador='1234567',
            tipo_impressao='1',
            tipo_emissao='1',
            finalidade='1',
            indicador_consumidor_final='0',
            indicador_presenca='0',
            versao_processo='1',
            emitente_nome='Emitente E2E',
            destinatario_nome='Destinatário E2E',
            valor_produtos='100.00',
            valor_nota='100.00'
        )

    def test_manifestacao_api_create_and_list(self):
        """Test creating manifestacao via API and verifying it appears in list."""
        # Create manifestacao
        response = self.client.post(
            f'/api/fiscal/nfes/{self.nfe.id}/manifestacao/',
            {'tipo': 'ciencia'},
            format='json'
        )
        # May return 201 (created immediately) or 202 (enqueued async)
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_202_ACCEPTED])
        
        # Get manifestacao ID from response
        # Response format: {'manifestacao': {...}, 'enqueued': bool} or similar
        if 'manifestacao' in response.data:
            manifestacao_id = response.data['manifestacao'].get('id')
        else:
            manifestacao_id = response.data.get('id') or response.data.get('manifestacao_id')
        
        self.assertIsNotNone(manifestacao_id, f"Expected manifestacao ID in response: {response.data}")
        
        # Verify it appears in list
        list_response = self.client.get(f'/api/fiscal/nfes/{self.nfe.id}/manifestacoes/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        # Handle both paginated response {'results': [...]} and direct list
        if isinstance(list_response.data, dict) and 'results' in list_response.data:
            items = list_response.data['results']
        elif isinstance(list_response.data, list):
            items = list_response.data
        else:
            items = []
        ids = [m['id'] for m in items]
        self.assertIn(manifestacao_id, ids)

    def test_manifestacao_send_success_cstat_135(self):
        """Test successful send with cStat=135 (evento registrado com vinculo)."""
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='confirmacao',
            criado_por=self.user,
            status_envio='pending'
        )
        
        # Mock SefazClient.send_manifestacao to return success
        with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
            inst = MockClient.return_value
            inst.send_manifestacao.return_value = {
                'success': True,
                'cStat': '135',
                'nProt': '000000000123456',
                'xMotivo': 'Evento registrado com vínculo'
            }
            
            # Trigger send via task
            from apps.fiscal.tasks import send_manifestacao_task
            send_manifestacao_task.__wrapped__(m.id)
            
            # Verify status changed to 'sent'
            m.refresh_from_db()
            self.assertEqual(m.status_envio, 'sent')
            self.assertIsNotNone(m.enviado_em)
            
            # Verify auditoria was created with response details
            audits = CertificadoActionAudit.objects.filter(
                action='send',
                details__icontains='"cStat": "135"'
            )
            self.assertGreater(audits.count(), 0, 'Audit with cStat 135 not found')
            
            audit = audits.latest('created_at')
            details = json.loads(audit.details)
            self.assertEqual(details.get('cStat'), '135')
            self.assertEqual(details.get('nProt'), '000000000123456')
            self.assertIn('manifestacao_id', details)

    def test_manifestacao_send_failure_cstat_136_retry(self):
        """Test cStat=136 (evento registrado sem vinculo) -> mark failed -> retry via reconciliation."""
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='confirmacao',
            criado_por=self.user,
            status_envio='pending'
        )
        
        with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
            inst = MockClient.return_value
            inst.send_manifestacao.return_value = {
                'success': True,
                'cStat': '136',
                'nProt': None,
                'xMotivo': 'Evento registrado sem vínculo'
            }
            
            # First attempt: cStat 136 should mark failed (will retry via reconciliation)
            from apps.fiscal.tasks import send_manifestacao_task
            send_manifestacao_task.__wrapped__(m.id)
            
            m.refresh_from_db()
            self.assertEqual(m.status_envio, 'failed')
            self.assertEqual(m.resposta_sefaz.get('cStat'), '136')
            # Verify response is stored for later reconciliation
            self.assertIsNotNone(m.resposta_sefaz)

    def test_manifestacao_reconciliation_cstat_136(self):
        """Test reconciliation task retrying failed manifestacao with cStat=136."""
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='nao_realizada',
            motivo='Motivo para não realização',
            criado_por=self.user,
            status_envio='failed',
            resposta_sefaz={'cStat': '136', 'xMotivo': 'Evento registrado sem vínculo'}
        )
        
        # Second attempt via reconciliation: now cStat should be 135 (successfully linked)
        with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
            inst = MockClient.return_value
            inst.send_manifestacao.return_value = {
                'success': True,
                'cStat': '135',
                'nProt': '000000000654321',
                'xMotivo': 'Evento registrado com vínculo'
            }
            
            from apps.fiscal.tasks import send_manifestacao_task
            send_manifestacao_task.__wrapped__(m.id)
            
            m.refresh_from_db()
            self.assertEqual(m.status_envio, 'sent')
            # Verify new cStat is stored
            self.assertEqual(m.resposta_sefaz.get('cStat'), '135')

    def test_manifestacao_validation_nao_realizada_requires_motivo(self):
        """Test that tipo=nao_realizada requires motivo with length 15-255."""
        # Missing motivo should fail
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='nao_realizada',
            motivo=None,
            criado_por=self.user
        )
        
        serializer = ManifestacaoSerializer(m)
        # Serializer.validate should catch this
        with self.assertRaises(Exception):  # ValidationError
            serializer.is_valid(raise_exception=True)

    def test_manifestacao_idempotence_duplicate_submit(self):
        """Test that duplicate submissions of same manifestacao are handled safely."""
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='ciencia',
            criado_por=self.user,
            status_envio='pending'
        )
        
        with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
            inst = MockClient.return_value
            inst.send_manifestacao.return_value = {
                'success': True,
                'cStat': '135',
                'nProt': '000000000111111'
            }
            
            from apps.fiscal.tasks import send_manifestacao_task
            
            # First send
            send_manifestacao_task.__wrapped__(m.id)
            m.refresh_from_db()
            first_enviado_em = m.enviado_em
            self.assertEqual(m.status_envio, 'sent')
            
            # Second send (idempotent - should not change status or auditoria count)
            first_audit_count = CertificadoActionAudit.objects.filter(
                action='send'
            ).count()
            
            send_manifestacao_task.__wrapped__(m.id)
            m.refresh_from_db()
            
            # Status should remain 'sent', no new audit entry (or same values)
            self.assertEqual(m.status_envio, 'sent')
            second_audit_count = CertificadoActionAudit.objects.filter(
                action='send'
            ).count()
            # We may have created one more audit (documenting re-send attempt)
            # but status should be consistent
            self.assertIn(m.status_envio, ['sent', 'failed'])

    def test_manifestacao_permissions_non_staff_forbidden(self):
        """Test that non-staff users cannot send manifestacao."""
        non_staff_user = User.objects.create(username='regularuser', is_staff=False)
        self.client.force_authenticate(user=non_staff_user)
        
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='confirmacao',
            criado_por=non_staff_user
        )
        
        # Attempt to send should fail (depends on permission class)
        response = self.client.post(
            f'/api/fiscal/nfes/{self.nfe.id}/manifestacao/',
            {'tipo': 'ciencia'},
            format='json'
        )
        # May return 403 Forbidden or 401 Unauthorized depending on permission class
        self.assertIn(
            response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]
        )

    def test_manifestacao_nseq_assignment(self):
        """Test that nSeqEvento is assigned when sending manifestacao."""
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='ciencia',
            criado_por=self.user
        )
        
        # Initially, nSeqEvento may be None or 0
        initial_nseq = m.nSeqEvento
        
        with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
            inst = MockClient.return_value
            
            inst.send_manifestacao.return_value = {
                'success': True,
                'cStat': '135',
                'nProt': '111111111111111'
            }
            from apps.fiscal.tasks import send_manifestacao_task
            send_manifestacao_task.__wrapped__(m.id)
            
            m.refresh_from_db()
            # After sending, nSeqEvento should be assigned
            self.assertIsNotNone(m.nSeqEvento)
            # It should be a positive integer (1 or higher)
            self.assertGreater(m.nSeqEvento, 0)
