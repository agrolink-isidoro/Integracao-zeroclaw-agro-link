from rest_framework.test import APITestCase
from django.urls import reverse
from apps.comercial.models import Fornecedor, DocumentoFornecedor

class FornecedorApiTests(APITestCase):
    def setUp(self):
        from apps.core.models import CustomUser
        self.user = CustomUser.objects.create_user(username='tester', password='pass')
        self.client.force_authenticate(user=self.user)

    def test_create_fornecedor_via_formdata_with_documents(self):
        url = reverse('comercial:fornecedor-list')
        # Simulate frontend FormData payload
        payload = {
            'tipo_pessoa': 'pj',
            'razao_social': 'Empresa Teste Ltda',
            'cpf_cnpj': '12.345.678/0001-90',
            'categoria_fornecedor': 'insumos',
            'status': 'ativo',
            # endereco_* and contato_* as sent by frontend
            'endereco_logradouro': 'Rua A',
            'endereco_numero': '123',
            'endereco_bairro': 'Bairro B',
            'endereco_cidade': 'Cidade',
            'endereco_estado': 'SP',
            'endereco_cep': '00000-000',
            'contato_telefone_principal': '+5511999999999',
            'contato_email_principal': 'contato@teste.com'
        }

        resp = self.client.post(url, payload, format='multipart')
        self.assertEqual(resp.status_code, 201, resp.content)
        data = resp.json()
        self.assertIn('id', data)
        obj = Fornecedor.objects.get(pk=data['id'])
        self.assertEqual(obj.nome, 'Empresa Teste Ltda')
        self.assertEqual(obj.telefone, '+5511999999999')
        self.assertEqual(obj.email, 'contato@teste.com')
        self.assertEqual(obj.endereco, 'Rua A')
        self.assertEqual(obj.numero, '123')

    def test_create_fornecedor_missing_required_fields_fails(self):
        url = reverse('comercial:fornecedor-list')
        resp = self.client.post(url, {'tipo_pessoa': 'pj', 'cpf_cnpj': '00.000.000/0000-00'}, format='multipart')
        self.assertEqual(resp.status_code, 400)
        data = resp.json()
        self.assertTrue('nome' in data or 'razao_social' in data or 'cpf_cnpj' in data)
