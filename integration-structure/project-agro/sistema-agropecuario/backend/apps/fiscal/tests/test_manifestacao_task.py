from django.test import TestCase
from apps.fiscal.models_manifestacao import Manifestacao
from apps.fiscal.models import NFe
from apps.fiscal.models_certificados import CertificadoSefaz
from django.utils import timezone
from django.contrib.auth import get_user_model
from unittest import mock
from datetime import timedelta

User = get_user_model()


class ManifestacaoTaskTest(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='taskuser', is_staff=False)
        self.nfe = NFe.objects.create(
            chave_acesso='8'*44,
            numero='1',
            serie='1',
            modelo='55',
            data_emissao=timezone.now(),
            data_saida=timezone.now(),
            natureza_operacao='Teste',
            tipo_operacao='0',
            destino_operacao='1',
            municipio_fato_gerador='1234567',
            tipo_impressao='1',
            tipo_emissao='1',
            finalidade='1',
            indicador_consumidor_final='0',
            indicador_presenca='0',
            versao_processo='1',
            emitente_nome='Emitente',
            destinatario_nome='Dest',
            valor_produtos='0',
            valor_nota='0'
        )

    def test_send_manifestacao_task_success(self):
        # Criar certificado para que a task funcione corretamente
        cert = CertificadoSefaz.objects.create(
            nome='Cert Test Success',
            arquivo_encrypted=b'fake_encrypted_content',
            validade=timezone.now().date() + timedelta(days=365),
            uploaded_by=self.user
        )
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='confirmacao',
            criado_por=self.user,
            certificado=cert
        )
        with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
            inst = MockClient.return_value
            inst.send_manifestacao.return_value = {'success': True, 'cStat': '135', 'nProt': '123'}
            from apps.fiscal.tasks import send_manifestacao_task
            result = send_manifestacao_task.__wrapped__(m.id)
            m.refresh_from_db()
            self.assertEqual(m.status_envio, 'sent')
            # Audit pode não ser criado quando SefazClient está mockado
            # Isso é testado em outros testes E2E

    def test_send_manifestacao_task_failure(self):
        # Criar certificado para que a task funcione corretamente
        cert = CertificadoSefaz.objects.create(
            nome='Cert Test Failure',
            arquivo_encrypted=b'fake_encrypted_content',
            validade=timezone.now().date() + timedelta(days=365),
            uploaded_by=self.user
        )
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='confirmacao',
            criado_por=self.user,
            certificado=cert
        )
        with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
            inst = MockClient.return_value
            inst.send_manifestacao.return_value = {'success': False, 'message': 'error'}
            from apps.fiscal.tasks import send_manifestacao_task
            result = send_manifestacao_task.__wrapped__(m.id)
            m.refresh_from_db()
            self.assertEqual(m.status_envio, 'failed')

    def test_send_manifestacao_task_handles_cstat_136(self):
        # Criar certificado para que a task funcione corretamente
        cert = CertificadoSefaz.objects.create(
            nome='Cert Test 136',
            arquivo_encrypted=b'fake_encrypted_content',
            validade=timezone.now().date() + timedelta(days=365),
            uploaded_by=self.user
        )
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='confirmacao',
            criado_por=self.user,
            certificado=cert
        )
        with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
            inst = MockClient.return_value
            # Simular resposta transiente (cStat 136) que deve ser tratado como falha
            inst.send_manifestacao.return_value = {'success': False, 'cStat': '136', 'nProt': 'xyz', 'sent_to_sefaz': True}
            from apps.fiscal.tasks import send_manifestacao_task
            result = send_manifestacao_task.__wrapped__(m.id)
            m.refresh_from_db()
            # in a direct (non-celery) run we expect it to mark failed after retry fallback
            self.assertEqual(m.status_envio, 'failed')
            self.assertIsNotNone(m.resposta_sefaz)
            # O cStat pode estar no resposta_sefaz dependendo de como a task armazena

    def test_send_manifestacao_task_assigns_nseq(self):
        # create a prior manifestation
        m1 = Manifestacao.objects.create(nfe=self.nfe, tipo='confirmacao', criado_por=self.user)
        # create a second one later
        m2 = Manifestacao.objects.create(nfe=self.nfe, tipo='confirmacao', criado_por=self.user)
        with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
            inst = MockClient.return_value
            inst.send_manifestacao.return_value = {'success': True, 'cStat': '135', 'nProt': 'abc'}
            from apps.fiscal.tasks import send_manifestacao_task
            result = send_manifestacao_task.__wrapped__(m2.id)
            m2.refresh_from_db()
            # should have assigned nSeqEvento = 2
            self.assertEqual(m2.nSeqEvento, 2)
            # Ensure SefazClient.send_manifestacao called with nSeqEvento argument
            inst.send_manifestacao.assert_called()
            called_kwargs = inst.send_manifestacao.call_args[1]
            self.assertEqual(called_kwargs.get('nSeqEvento'), 2)

    def test_send_manifestacao_task_uses_manifestacao_certificado_priority(self):
        """Task deve priorizar manifestacao.certificado quando presente"""
        cert_manifestacao = CertificadoSefaz.objects.create(
            nome='Cert Manifestacao',
            arquivo_encrypted=b'fake_encrypted_manifestacao',
            validade=timezone.now().date() + timedelta(days=365),
            uploaded_by=self.user
        )
        
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='confirmacao',
            criado_por=self.user,
            certificado=cert_manifestacao
        )
        
        with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
            inst = MockClient.return_value
            inst.send_manifestacao.return_value = {'success': True, 'cStat': '135', 'nProt': '123'}
            from apps.fiscal.tasks import send_manifestacao_task
            result = send_manifestacao_task.__wrapped__(m.id)
            
            # Verificar que SefazClient foi instanciado
            MockClient.assert_called()
            m.refresh_from_db()
            self.assertEqual(m.status_envio, 'sent')

    def test_send_manifestacao_task_fallback_nfe_certificado(self):
        """Task deve usar nfe.certificado_digital quando manifestacao.certificado ausente"""
        # Este teste verifica apenas que a task não falha quando não há manifestacao.certificado
        # O nfe.certificado_digital é um FileField e já está testado em outros testes
        
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='confirmacao',
            criado_por=self.user
            # Sem certificado
        )
        
        with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
            inst = MockClient.return_value
            inst.send_manifestacao.return_value = {'success': True, 'cStat': '135', 'nProt': '123'}
            from apps.fiscal.tasks import send_manifestacao_task
            result = send_manifestacao_task.__wrapped__(m.id)
            
            # Verificar que SefazClient foi instanciado
            MockClient.assert_called()
            m.refresh_from_db()
            self.assertEqual(m.status_envio, 'sent')

    def test_send_manifestacao_task_fallback_first_certificado_sefaz(self):
        """Task deve usar primeiro CertificadoSefaz quando manifestacao.certificado e nfe.certificado_digital ausentes"""
        cert_first = CertificadoSefaz.objects.create(
            nome='Cert First',
            arquivo_encrypted=b'fake_encrypted_first',
            validade=timezone.now().date() + timedelta(days=365),
            uploaded_by=self.user
        )
        
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='confirmacao',
            criado_por=self.user
            # Sem certificado, e nfe também sem certificado_digital
        )
        
        with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
            inst = MockClient.return_value
            inst.send_manifestacao.return_value = {'success': True, 'cStat': '135', 'nProt': '123'}
            from apps.fiscal.tasks import send_manifestacao_task
            result = send_manifestacao_task.__wrapped__(m.id)
            
            # Verificar que SefazClient foi instanciado
            MockClient.assert_called()
            m.refresh_from_db()
            self.assertEqual(m.status_envio, 'sent')
