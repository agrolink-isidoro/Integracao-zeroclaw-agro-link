from django.test import TestCase
from rest_framework.test import APIClient
from apps.fiscal.models import NFe

class SEFAZCallbackTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Minimal NFe to be updated by callback
        self.nfe = NFe.objects.create(
            chave_acesso='52251004621697000179550010000100511374580195',
            numero='1', serie='1', data_emissao='2025-01-01T00:00:00Z',
            natureza_operacao='V', tipo_operacao='1', destino_operacao='1',
            municipio_fato_gerador='5201108', tipo_impressao='1', tipo_emissao='1',
            finalidade='1', indicador_consumidor_final='1', indicador_presenca='1',
            versao_processo='1.0', emitente_nome='E', destinatario_nome='D',
            valor_produtos=0, valor_nota=0, status='100'
        )

    def test_callback_rejects_invalid_signature(self):
        """Deve rejeitar callback sem assinatura válida quando SEFAZ_CALLBACK_SECRET está definido."""
        from django.conf import settings
        from unittest import mock
        secret = 'testsecret'
        with mock.patch.object(settings, 'SEFAZ_CALLBACK_SECRET', secret, create=True):
            payload = {
                'chave_acesso': self.nfe.chave_acesso,
                'protocolo': '9999999999',
                'status': '100',
                'dhRecbto': '2025-01-02T12:00:00Z'
            }
            # Envia sem header X-Signature
            resp = self.client.post('/api/fiscal/nfes/sefaz_callback/', payload, format='json')
            self.assertEqual(resp.status_code, 401)
            self.assertIn('invalid_signature', resp.json().get('error', ''))

    def test_callback_accepts_valid_signature(self):
        """Deve aceitar callback com assinatura HMAC válida quando SEFAZ_CALLBACK_SECRET está definido."""
        import hmac, hashlib, json
        from django.conf import settings
        from unittest import mock
        secret = 'testsecret'
        with mock.patch.object(settings, 'SEFAZ_CALLBACK_SECRET', secret, create=True):
            payload = {
                'chave_acesso': self.nfe.chave_acesso,
                'protocolo': '8888888888',
                'status': '100',
                'dhRecbto': '2025-01-02T12:00:00Z'
            }
            raw = json.dumps(payload).encode()
            sig = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
            resp = self.client.post('/api/fiscal/nfes/sefaz_callback/', raw, content_type='application/json', HTTP_X_SIGNATURE=sig)
            self.assertEqual(resp.status_code, 200)
            self.nfe.refresh_from_db()
            self.assertEqual(self.nfe.protocolo_autorizacao, '8888888888')

    def test_callback_updates_nfe_and_creates_audit(self):
        payload = {
            'chave_acesso': self.nfe.chave_acesso,
            'protocolo': '1234567890',
            'status': '100',
            'dhRecbto': '2025-01-02T12:00:00Z'
        }
        resp = self.client.post('/api/fiscal/nfes/sefaz_callback/', payload, format='json')
        self.assertEqual(resp.status_code, 200)
        self.nfe.refresh_from_db()
        self.assertEqual(self.nfe.protocolo_autorizacao, '1234567890')
        self.assertIsNotNone(self.nfe.data_autorizacao)
        # Verify audit record exists
        from apps.fiscal.models_certificados import CertificadoActionAudit
        audits = CertificadoActionAudit.objects.filter(action='callback')
        self.assertGreater(audits.count(), 0)