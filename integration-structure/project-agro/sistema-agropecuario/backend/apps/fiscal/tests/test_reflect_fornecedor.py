from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.fiscal.models import NFe
from apps.comercial.models import Fornecedor


class ReflectFornecedorTests(TestCase):
    def setUp(self):
        User = get_user_model()
        # create superuser for permission checks in endpoint
        self.user = User.objects.create_user(username='tester', password='pass', is_superuser=True, is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        # Ensure deterministic environment: disconnect signals that may create fornecedores
        # (none expected, but keep parity with other fiscal tests)

    def _create_nfe_emitente(self, nome='Fornecedor A', cnpj='12345678000199'):
        nfe = NFe.objects.create(
            chave_acesso='ACESSO123',
            numero='1',
            serie='1',
            data_emissao='2025-01-01T00:00:00Z',
            emitente_nome=nome,
            emitente_cnpj=cnpj,
            destinatario_nome='Dest',
            valor_produtos='100.00',
            valor_nota='100.00'
        )
        return nfe

    def test_reflect_fornecedor_creates_fornecedor_happy_path(self):
        """Se NFe não tem fornecedor relacionado, ao refletir deve criar fornecedor."""
        # Use a valid 14-digit CNPJ for model field length
        nfe = self._create_nfe_emitente(nome='Fornecedor Teste', cnpj='11122233300019')

        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/reflect_fornecedor/', {}, format='json')
        self.assertEqual(resp.status_code, 200)

        data = resp.data
        self.assertTrue(data.get('created') is True)
        fornecedor_id = data.get('fornecedor_id')
        self.assertIsNotNone(fornecedor_id)

        fornecedor = Fornecedor.objects.filter(id=fornecedor_id).first()
        self.assertIsNotNone(fornecedor)
        self.assertEqual(fornecedor.nome, 'Fornecedor Teste')
        # Field in model is cpf_cnpj (normalized digits)
        self.assertEqual(fornecedor.cpf_cnpj, '11122233300019')
