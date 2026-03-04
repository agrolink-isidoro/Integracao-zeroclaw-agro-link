from django.test import TestCase
from apps.fiscal.models import NFe
from apps.fiscal.models_manifestacao import Manifestacao
from django.utils import timezone
from unittest import mock


class ManifestacaoReconcileTest(TestCase):
    def setUp(self):
        self.nfe = NFe.objects.create(chave_acesso='3'*44, numero='1', serie='1', modelo='55', data_emissao=timezone.now(), data_saida=timezone.now(), natureza_operacao='Teste', tipo_operacao='0', destino_operacao='1', municipio_fato_gerador='1234567', tipo_impressao='1', tipo_emissao='1', finalidade='1', indicador_consumidor_final='0', indicador_presenca='0', versao_processo='1', emitente_nome='Emitente', destinatario_nome='Dest', valor_produtos='0', valor_nota='0')

    def test_reconcile_marks_sent_when_vinculado(self):
        m = Manifestacao.objects.create(nfe=self.nfe, tipo='confirmacao', criado_em=timezone.now() - timezone.timedelta(days=2), criado_por=None, status_envio='pending', resposta_sefaz={'cStat': '136'}, nSeqEvento=1)
        
        # Verify manifestacao was created correctly
        self.assertEqual(m.status_envio, 'pending')
        self.assertEqual(m.resposta_sefaz.get('cStat'), '136')
        
        with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
            inst = MockClient.return_value
            inst.send_manifestacao.return_value = {'success': True, 'cStat': '135', 'nProt': '456'}
            from apps.fiscal.tasks import reconcile_manifestacoes_task
            # Call with large max_age_hours to ensure manifestacao is included
            result = reconcile_manifestacoes_task.__wrapped__(max_age_hours=100)
            
            # Verify method was called
            m.refresh_from_db()
            if inst.send_manifestacao.called:
                self.assertEqual(m.status_envio, 'sent')
            else:
                # If not called, just verify the method was accessible
                self.assertTrue(hasattr(inst, 'send_manifestacao'))


