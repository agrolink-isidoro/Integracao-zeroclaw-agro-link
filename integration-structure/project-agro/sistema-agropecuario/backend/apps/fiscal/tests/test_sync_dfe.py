from django.test import TestCase
from apps.fiscal.models_sync import ProcessamentoWs, NFeRemote, NFeResumo
from apps.fiscal.models_certificados import CertificadoSefaz
from apps.fiscal.tasks import sync_nfes_task
from django.utils import timezone
from unittest import mock


class SyncDFETest(TestCase):
    def setUp(self):
        # create a dummy certificado for association (optional)
        self.cert = CertificadoSefaz.objects.create(nome='test', arquivo_name='test.pfx')
        self.proc = ProcessamentoWs.objects.create(job_type='sync_nfes', status='pending', details={})

    def test_sync_creates_nferemote_and_resumo(self):
        fake_items = [
            {'chave_acesso': '9'*44, 'raw_xml': '<nfeProc></nfeProc>', 'resumo': {'emitente': 'X'}},
            {'chave_acesso': '8'*44, 'raw_xml': '<nfeProc></nfeProc>', 'resumo': {'emitente': 'Y'}}
        ]

        with mock.patch('apps.fiscal.services.sefaz_distrib.SefazDistribClient') as MockClient:
            inst = MockClient.return_value
            inst.fetch.return_value = fake_items
            res = sync_nfes_task.__wrapped__(self.proc.id)

            # Processamento should be success and records created
            self.proc.refresh_from_db()
            self.assertEqual(self.proc.status, 'success')
            self.assertEqual(NFeRemote.objects.count(), 2)
            self.assertEqual(NFeResumo.objects.count(), 2)

            # ArquivoXml should be persisted for each item with raw_xml
            from apps.fiscal.models_sync import ArquivoXml
            self.assertEqual(ArquivoXml.objects.count(), 2)

    def test_sync_handles_empty_response(self):
        """Test that sync handles empty response gracefully"""
        with mock.patch('apps.fiscal.services.sefaz_distrib.SefazDistribClient') as MockClient:
            inst = MockClient.return_value
            inst.fetch.return_value = []
            res = sync_nfes_task.__wrapped__(self.proc.id)

            self.proc.refresh_from_db()
            self.assertEqual(self.proc.status, 'success')
            self.assertEqual(NFeRemote.objects.count(), 0)
            self.assertEqual(NFeResumo.objects.count(), 0)
            self.assertEqual(res['created'], 0)

    def test_sync_updates_status_on_error(self):
        """Test that sync marks status as error when fetch fails"""
        with mock.patch('apps.fiscal.services.sefaz_distrib.SefazDistribClient') as MockClient:
            inst = MockClient.return_value
            inst.fetch.side_effect = Exception('Connection error')
            
            res = sync_nfes_task.__wrapped__(self.proc.id)

            self.proc.refresh_from_db()
            self.assertEqual(self.proc.status, 'failed')
            self.assertFalse(res.get('success', False))

    def test_resumo_mapeado_corretamente(self):
        """Test that resumo fields are mapped correctly to NFeResumo"""
        fake_items = [
            {
                'chave_acesso': '1'*44,
                'raw_xml': '<nfeProc></nfeProc>',
                'resumo': {
                    'emitente': 'EMPRESA XYZ LTDA',
                    'serie': 1,
                    'numero': 1234,
                    'data_emissao': '2025-01-15',
                    'valor': '1500.00'
                }
            }
        ]

        with mock.patch('apps.fiscal.services.sefaz_distrib.SefazDistribClient') as MockClient:
            inst = MockClient.return_value
            inst.fetch.return_value = fake_items
            sync_nfes_task.__wrapped__(self.proc.id)

            resumo = NFeResumo.objects.first()
            self.assertIsNotNone(resumo)
            self.assertEqual(resumo.chave_acesso, '1'*44)
            # Verify resumo data is stored in raw field
            self.assertIsNotNone(resumo.raw)
            self.assertIn('emitente', resumo.raw)

    def test_arquivo_xml_criado_corretamente(self):
        """Test that XML files are persisted correctly"""
        xml_content = '<nfeProc><NFe></NFe></nfeProc>'
        fake_items = [
            {
                'chave_acesso': '2'*44,
                'raw_xml': xml_content,
                'resumo': {'emitente': 'TEST'}
            }
        ]

        with mock.patch('apps.fiscal.services.sefaz_distrib.SefazDistribClient') as MockClient:
            inst = MockClient.return_value
            inst.fetch.return_value = fake_items
            sync_nfes_task.__wrapped__(self.proc.id)

            from apps.fiscal.models_sync import ArquivoXml
            arquivo = ArquivoXml.objects.first()
            self.assertIsNotNone(arquivo)
            self.assertEqual(arquivo.content, xml_content)
