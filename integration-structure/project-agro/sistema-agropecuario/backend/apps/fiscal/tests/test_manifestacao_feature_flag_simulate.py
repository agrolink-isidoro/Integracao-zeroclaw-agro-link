from django.test import TestCase, override_settings
from apps.fiscal.models import NFe
from apps.fiscal.models_manifestacao import Manifestacao
from apps.fiscal.tasks import send_manifestacao_task
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


class ManifestacaoSimulateFlagTest(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='flaguser', is_staff=False)
        self.nfe = NFe.objects.create(
            chave_acesso='4'*44,
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

    @override_settings(FISCAL_SIMULATE_SEFAZ_SUCCESS=True)
    def test_send_manifestacao_simulated_success(self):
        m = Manifestacao.objects.create(nfe=self.nfe, tipo='confirmacao', criado_por=self.user)
        # Call the task synchronously (use the wrapped function to run in-process)
        res = send_manifestacao_task(m.id)
        m.refresh_from_db()
        self.assertEqual(m.status_envio, 'sent')
        self.assertTrue(m.enviado)
        self.assertIsInstance(m.resposta_sefaz, dict)
        self.assertIn('Simulated acceptance', m.resposta_sefaz.get('message', m.resposta_sefaz.get('message', '')))
        self.assertEqual(res['status'], 'sent_successfully')
