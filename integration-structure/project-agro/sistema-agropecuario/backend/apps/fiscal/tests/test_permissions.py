from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.fiscal.models import NFe, ItemNFe
from decimal import Decimal


class PermissionsTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='user', password='pass', is_staff=False)
        self.staff = User.objects.create_user(username='staff', password='pass', is_staff=True)
        self.client = APIClient()

    def _create_nfe_with_item(self):
        nfe = NFe.objects.create(chave_acesso='000' * 14 + '00', numero='1', serie='1', data_emissao='2025-01-01T00:00:00Z', emitente_nome='Emitente', destinatario_nome='Dest', valor_produtos=Decimal('100.00'), valor_nota=Decimal('100.00'))
        ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='CODE-123', descricao='Produto Teste', cfop='5102', unidade_comercial='UN', quantidade_comercial=Decimal('10'), valor_unitario_comercial=Decimal('9.00'), valor_produto=Decimal('90.00'))
        return nfe

    def test_confirmar_estoque_requires_staff(self):
        nfe = self._create_nfe_with_item()

        # Non-staff should get 403 (even when authenticated)
        self.client.force_authenticate(self.user)
        response = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/', {'force': True}, format='json')
        self.assertEqual(response.status_code, 403)

        # Staff should be allowed
        self.client.force_authenticate(self.staff)
        response = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/', {'force': True}, format='json')
        # Depending on product mapping the endpoint may return 200 with unmapped items but should not be 403
        self.assertNotEqual(response.status_code, 403)

    def test_send_to_sefaz_requires_staff(self):
        nfe = self._create_nfe_with_item()
        # Non-staff
        self.client.force_authenticate(self.user)
        response = self.client.post(f'/api/fiscal/nfes/{nfe.id}/send_to_sefaz/')
        self.assertEqual(response.status_code, 403)

        # Staff
        self.client.force_authenticate(self.staff)
        response = self.client.post(f'/api/fiscal/nfes/{nfe.id}/send_to_sefaz/')
        self.assertEqual(response.status_code, 200)
