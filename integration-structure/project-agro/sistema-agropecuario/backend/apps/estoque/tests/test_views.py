from django.urls import reverse
from rest_framework.test import APITestCase
from django.test import override_settings
from apps.estoque.models import Produto
from apps.core.models import CustomUser
from apps.core.models import Tenant


class ProdutoListPaginationTests(APITestCase):
    def setUp(self):
        # create tenant first
        self.tenant = Tenant.objects.create(
            nome='test_tenant_produtopagination',
            slug='test-tenant-produtopagination'
        )
        # create a user to be the creator
        self.user = CustomUser.objects.create_user(username='testuser', password='testpass', tenant=self.tenant)
        self.client.force_authenticate(user=self.user)
        # create multiple products
        for i in range(3):
            Produto.objects.create(
                codigo=f'TEST{i}',
                nome=f'Produto Teste {i}',
                unidade='kg',
                quantidade_estoque=10,
                estoque_minimo=0,
                tenant=self.tenant
            )

    def test_list_returns_all_objects(self):
        url = '/api/estoque/produtos/'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # Should return all objects as a list
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 3)

