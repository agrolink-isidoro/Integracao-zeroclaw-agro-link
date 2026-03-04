from django.test import TestCase
from apps.fiscal.models import NFe
from apps.fiscal.models_manifestacao import Manifestacao
from apps.fiscal.models_certificados import CertificadoSefaz
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class ManifestacaoModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='tester')
        self.nfe = NFe.objects.create(
            chave_acesso='0'*44,
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

    def test_create_manifestacao_defaults(self):
        m = Manifestacao.objects.create(nfe=self.nfe, tipo='ciencia', criado_por=self.user)
        self.assertEqual(m.tipo, 'ciencia')
        self.assertFalse(m.enviado)
        self.assertEqual(m.status_envio, 'pending')
        self.assertIsNone(m.resposta_sefaz)

    def test_mark_sent_and_failed(self):
        m = Manifestacao.objects.create(nfe=self.nfe, tipo='confirmacao', criado_por=self.user)
        m.mark_sent({'cStat': '135', 'nProt': '123'})
        m.refresh_from_db()
        self.assertTrue(m.enviado)
        self.assertEqual(m.status_envio, 'sent')
        self.assertEqual(m.resposta_sefaz.get('cStat'), '135')

        m.mark_failed({'error': 'timeout'})
        m.refresh_from_db()
        self.assertFalse(m.enviado)
        self.assertEqual(m.status_envio, 'failed')
        self.assertEqual(m.resposta_sefaz.get('error'), 'timeout')

    def test_manifestacao_certificado_optional(self):
        """Certificado deve ser opcional (backward compatibility)"""
        m = Manifestacao.objects.create(
            nfe=self.nfe, 
            tipo='ciencia', 
            criado_por=self.user
        )
        self.assertIsNone(m.certificado)

    def test_manifestacao_certificado_fk(self):
        """Certificado FK deve funcionar corretamente"""
        cert = CertificadoSefaz.objects.create(
            nome='Certificado Teste',
            arquivo_encrypted=b'fake_encrypted_pfx_content',
            validade=timezone.now().date() + timedelta(days=365),
            uploaded_by=self.user
        )
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='confirmacao',
            criado_por=self.user,
            certificado=cert
        )
        m.refresh_from_db()
        self.assertEqual(m.certificado.id, cert.id)
        self.assertEqual(m.certificado.nome, 'Certificado Teste')

    def test_manifestacao_certificado_deletion_behavior(self):
        """Quando certificado é deletado, Manifestacao não deve ser deletada"""
        cert = CertificadoSefaz.objects.create(
            nome='Certificado Teste',
            arquivo_encrypted=b'fake_encrypted_pfx_content',
            validade=timezone.now().date() + timedelta(days=365),
            uploaded_by=self.user
        )
        m = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='confirmacao',
            criado_por=self.user,
            certificado=cert
        )
        cert_id = cert.id
        cert.delete()
        m.refresh_from_db()
        self.assertIsNone(m.certificado)
        self.assertTrue(Manifestacao.objects.filter(id=m.id).exists())
