from rest_framework.test import APIClient
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from apps.estoque.models import Produto
from apps.multi_tenancy.models import Tenant

User = get_user_model()


class MovimentacaoAPITests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_estoque_movimentacao',
            slug='test-tenant-estoque-movimentacao'
        )
        self.client = APIClient()
        self.user = User.objects.create_user(username='apiuser', password='pw', is_staff=False, tenant=self.tenant)
        self.client.force_authenticate(self.user)
        self.prod = Produto.objects.create(codigo='API-1', nome='Prod API', unidade='kg', quantidade_estoque=Decimal('10'), tenant=self.tenant)

    def test_create_movimentacao_via_api_uses_helper_and_sets_snapshots(self):
        payload = {
            'produto': self.prod.id,
            'tipo': 'saida',
            'quantidade': '3.00',
            'valor_unitario': '2.50'
        }

        res = self.client.post('/api/estoque/movimentacoes/', data=payload, format='json')
        if res.status_code != 201:
            print('RESPONSE', res.status_code, res.json())
        self.assertEqual(res.status_code, 201)
        data = res.json()
        # saldo_anterior and saldo_posterior are model fields set by helper
        self.assertIn('id', data)

        # Refresh product
        self.prod.refresh_from_db()
        self.assertEqual(self.prod.quantidade_estoque, Decimal('7.00'))
