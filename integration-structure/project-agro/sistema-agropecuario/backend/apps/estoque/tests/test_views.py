from django.urls import reverse
from rest_framework.test import APITestCase
from django.test import override_settings
from apps.estoque.models import Produto
from apps.core.models import CustomUser


class ProdutoListPaginationTests(APITestCase):
    def setUp(self):
        # create a user to be the creator
        self.user = CustomUser.objects.create_user(username='testuser', password='testpass')
        # create multiple products
        for i in range(3):
            Produto.objects.create(
                codigo=f'TEST{i}',
                nome=f'Produto Teste {i}',
                unidade='kg',
                quantidade_estoque=10,
                estoque_minimo=0
            )

    def test_list_returns_paginated_object(self):
        url = '/api/estoque/produtos/'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # Should be a paginated object with 'count' and 'results'
        self.assertIn('count', data)
        self.assertIn('results', data)
        self.assertEqual(data['count'], 3)
        self.assertIsInstance(data['results'], list)

    def test_pagination_page_size_applied(self):
        # Create more products to exceed default PAGE_SIZE (25)
        for i in range(30):
            Produto.objects.create(
                codigo=f'BIG{i}',
                nome=f'Produto Big {i}',
                unidade='kg',
                quantidade_estoque=5,
                estoque_minimo=0
            )
        url = '/api/estoque/produtos/'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['count'], 33)  # 3 from setUp + 30 created here
        # Page size from settings should limit the results returned
        from django.conf import settings
        page_size = settings.REST_FRAMEWORK.get('PAGE_SIZE', 25)
        self.assertLessEqual(len(data['results']), page_size)
        # When more items exist than page_size, next should be present
        if data['count'] > page_size:
            self.assertIsNotNone(data['next'])
