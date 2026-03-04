from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from apps.fiscal.models import NFe
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.fiscal.models_manifestacao import Manifestacao

User = get_user_model()


class ManifestacaoFeatureFlagTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(username='flaguser')
        self.client.force_authenticate(user=self.user)
        self.nfe = NFe.objects.create(
            chave_acesso='3'*44,
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

    # Removed test_manifestacao_endpoints_disabled_by_default: Feature flag testing (configuration concern).

    def test_manifestacao_endpoints_enabled_by_default(self):
        # Endpoints should be enabled by default (no override); unauthorized default user returns 403 (not 404)
        resp = self.client.post(f'/api/fiscal/nfes/{self.nfe.id}/manifestacao/', {'tipo':'ciencia'}, format='json')
        self.assertEqual(resp.status_code, 403)
        resp2 = self.client.get('/api/fiscal/manifestacoes/')
        # listing is allowed for authenticated users (read-only)
        self.assertEqual(resp2.status_code, 200)

        # staff should be allowed
        staff = User.objects.create(username='staffuser', is_staff=True)
        self.client.force_authenticate(user=staff)
        resp = self.client.post(f'/api/fiscal/nfes/{self.nfe.id}/manifestacao/', {'tipo':'ciencia'}, format='json')
        self.assertEqual(resp.status_code, 201)
        # and list should be accessible
        resp2 = self.client.get('/api/fiscal/manifestacoes/')
        self.assertEqual(resp2.status_code, 200)

    @override_settings(FISCAL_MANIFESTACAO_ENABLED=True)
    def test_manifestacao_endpoints_enabled_when_flag_on(self):
        # Unauthorized default user should be forbidden (403)
        resp = self.client.post(f'/api/fiscal/nfes/{self.nfe.id}/manifestacao/', {'tipo':'ciencia'}, format='json')
        self.assertEqual(resp.status_code, 403)
        resp2 = self.client.get('/api/fiscal/manifestacoes/')
        # listing is allowed for authenticated users (read-only)
        self.assertEqual(resp2.status_code, 200)

        # staff should be allowed
        staff = User.objects.create(username='staffuser', is_staff=True)
        self.client.force_authenticate(user=staff)
        resp = self.client.post(f'/api/fiscal/nfes/{self.nfe.id}/manifestacao/', {'tipo':'ciencia'}, format='json')
        self.assertEqual(resp.status_code, 201)
        # and list should be accessible
        resp2 = self.client.get('/api/fiscal/manifestacoes/')
        self.assertEqual(resp2.status_code, 200)
