"""
Tests for ItemEmprestimo model, serializer, and ViewSet
"""
import pytest
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient, APITestCase
from rest_framework import status

from apps.core.models import Tenant
from apps.financeiro.models import Emprestimo, ItemEmprestimo, ParcelaEmprestimo
from apps.estoque.models import Produto
from apps.financeiro.serializers import ItemEmprestimoSerializer, EmprestimoSerializer


@pytest.mark.django_db
class ItemEmprestimoModelTests(TestCase):
    """Tests for ItemEmprestimo model"""

    def setUp(self):
        """Set up test data"""
        # Create tenant
        self.tenant = Tenant.objects.create(name="Test Tenant")
        
        # Create user
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        # Create produto
        self.produto = Produto.objects.create(
            tenant=self.tenant,
            nome='Fertilizante NPK',
            unidade='kg',
            preco_venda=Decimal('150.00'),
            quantidade_estoque=Decimal('1000.00'),
            quantidade_reservada=Decimal('0.00'),
            criado_por=self.user
        )
        
        # Create emprestimo
        self.emprestimo = Emprestimo.objects.create(
            tenant=self.tenant,
            titulo='Emprestimo Safra 2024',
            descricao='Financiamento para insumos',
            valor_emprestimo=Decimal('10000.00'),
            valor_entrada=Decimal('0.00'),
            taxa_juros=Decimal('7.5'),
            frequencia_taxa='mensal',
            metodo_calculo='simples',
            numero_parcelas=12,
            prazo_meses=12,
            status='ativo',
            tipo_emprestimo='rural',
            cliente=None,
            criado_por=self.user
        )

    def test_item_emprestimo_creation(self):
        """Test creating ItemEmprestimo"""
        item = ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
            criado_por=self.user
        )
        
        assert item.id is not None
        assert item.emprestimo == self.emprestimo
        assert item.produto == self.produto
        assert item.quantidade == Decimal('50.00')
        assert item.unidade == 'kg'
        # valor_total should be auto-calculated
        assert item.valor_total == Decimal('7500.00')  # 50 * 150

    def test_item_emprestimo_valor_total_calculation(self):
        """Test automatic valor_total calculation"""
        item = ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('25.5'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
            criado_por=self.user
        )
        
        # valor_total should be calculated automatically
        expected_valor_total = Decimal('25.5') * Decimal('150.00')
        assert item.valor_total == expected_valor_total

    def test_unique_constraint_product_per_emprestimo(self):
        """Test that only one ItemEmprestimo per product per emprestimo is allowed"""
        # Create first item
        ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
            criado_por=self.user
        )
        
        # Try to create another item with same emprestimo and produto
        with pytest.raises(Exception):  # IntegrityError
            ItemEmprestimo.objects.create(
                tenant=self.tenant,
                emprestimo=self.emprestimo,
                produto=self.produto,
                quantidade=Decimal('30.00'),
                unidade='kg',
                valor_unitario=Decimal('150.00'),
                criado_por=self.user
            )

    def test_stock_validation_on_clean(self):
        """Test that validation checks available stock"""
        item = ItemEmprestimo(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('2000.00'),  # More than available
            unidade='kg',
            valor_unitario=Decimal('150.00'),
            criado_por=self.user
        )
        
        # clean() should raise ValidationError
        with pytest.raises(Exception):  # ValidationError
            item.clean()

    def test_emprestimo_valor_updated_on_item_creation(self):
        """Test that emprestimo valor_emprestimo is updated when item is created"""
        # Initial valor_emprestimo
        initial_valor = self.emprestimo.valor_emprestimo
        
        # Create multiple items
        ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
            criado_por=self.user
        )
        
        # Refresh emprestimo from database
        self.emprestimo.refresh_from_db()
        
        # valor_emprestimo should be updated via signals
        expected_valor = Decimal('7500.00')  # 50 * 150
        assert self.emprestimo.valor_emprestimo == expected_valor

    def test_emprestimo_valor_updated_on_item_deletion(self):
        """Test that emprestimo valor_emprestimo is updated when item is deleted"""
        # Create item
        item = ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
            criado_por=self.user
        )
        
        # Delete item
        item.delete()
        
        # Refresh emprestimo
        self.emprestimo.refresh_from_db()
        
        # valor_emprestimo should be back to 0 (or initial value if there were other items)
        assert self.emprestimo.valor_emprestimo == Decimal('0.00')

    def test_multiple_items_emprestimo_valor_summation(self):
        """Test that emprestimo valor is sum of all items"""
        produto2 = Produto.objects.create(
            tenant=self.tenant,
            nome='Sementes Milho',
            unidade='kg',
            preco_venda=Decimal('50.00'),
            quantidade_estoque=Decimal('500.00'),
            quantidade_reservada=Decimal('0.00'),
            criado_por=self.user
        )
        
        # Create two items
        ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
            criado_por=self.user
        )
        
        ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=produto2,
            quantidade=Decimal('100.00'),
            unidade='kg',
            valor_unitario=Decimal('50.00'),
            criado_por=self.user
        )
        
        # Refresh emprestimo
        self.emprestimo.refresh_from_db()
        
        # valor_emprestimo should be sum of both items
        # (50 * 150) + (100 * 50) = 7500 + 5000 = 12500
        expected_valor = Decimal('12500.00')
        assert self.emprestimo.valor_emprestimo == expected_valor


@pytest.mark.django_db
class ItemEmprestimoSerializerTests(TestCase):
    """Tests for ItemEmprestimoSerializer"""

    def setUp(self):
        """Set up test data"""
        self.tenant = Tenant.objects.create(name="Test Tenant")
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        self.produto = Produto.objects.create(
            tenant=self.tenant,
            nome='Fertilizante NPK',
            unidade='kg',
            preco_venda=Decimal('150.00'),
            quantidade_estoque=Decimal('1000.00'),
            quantidade_reservada=Decimal('0.00'),
            criado_por=self.user
        )
        
        self.emprestimo = Emprestimo.objects.create(
            tenant=self.tenant,
            titulo='Emprestimo Safra 2024',
            descricao='Financiamento para insumos',
            valor_emprestimo=Decimal('10000.00'),
            valor_entrada=Decimal('0.00'),
            taxa_juros=Decimal('7.5'),
            frequencia_taxa='mensal',
            metodo_calculo='simples',
            numero_parcelas=12,
            prazo_meses=12,
            status='ativo',
            tipo_emprestimo='rural',
            cliente=None,
            criado_por=self.user
        )

    def test_item_emprestimo_serializer_create(self):
        """Test serializer can create ItemEmprestimo"""
        data = {
            'emprestimo': self.emprestimo.id,
            'produto': self.produto.id,
            'quantidade': '50.00',
            'unidade': 'kg',
            'valor_unitario': '150.00',
            'observacoes': 'Insumo para safra'
        }
        
        serializer = ItemEmprestimoSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        
        item = serializer.save(
            tenant=self.tenant,
            criado_por=self.user
        )
        
        assert item.id is not None
        assert item.emprestimo == self.emprestimo
        assert item.produto == self.produto
        assert item.quantidade == Decimal('50.00')

    def test_item_emprestimo_serializer_validation_stock(self):
        """Test serializer validates stock availability"""
        data = {
            'emprestimo': self.emprestimo.id,
            'produto': self.produto.id,
            'quantidade': '2000.00',  # More than available
            'unidade': 'kg',
            'valor_unitario': '150.00'
        }
        
        serializer = ItemEmprestimoSerializer(data=data)
        assert not serializer.is_valid()
        assert 'quantidade' in serializer.errors

    def test_item_emprestimo_serializer_validation_positive_quantity(self):
        """Test serializer validates positive quantity"""
        data = {
            'emprestimo': self.emprestimo.id,
            'produto': self.produto.id,
            'quantidade': '0.00',  # Invalid
            'unidade': 'kg',
            'valor_unitario': '150.00'
        }
        
        serializer = ItemEmprestimoSerializer(data=data)
        assert not serializer.is_valid()
        assert 'quantidade' in serializer.errors

    def test_item_emprestimo_serializer_read_only_fields(self):
        """Test that certain fields are read-only"""
        item = ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
            criado_por=self.user
        )
        
        serializer = ItemEmprestimoSerializer(item)
        
        # Check that read-only fields are present and calculated
        assert 'valor_total' in serializer.data
        assert serializer.data['valor_total'] == '7500.00'
        assert 'produto_nome' in serializer.data
        assert serializer.data['produto_nome'] == 'Fertilizante NPK'
        assert 'produto_unidade' in serializer.data
        assert serializer.data['produto_unidade'] == 'kg'


@pytest.mark.django_db
class EmprestimoSerializerWithItemsTests(TestCase):
    """Tests for EmprestimoSerializer with nested ItemEmprestimo"""

    def setUp(self):
        """Set up test data"""
        self.tenant = Tenant.objects.create(name="Test Tenant")
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        self.produto = Produto.objects.create(
            tenant=self.tenant,
            nome='Fertilizante NPK',
            unidade='kg',
            preco_venda=Decimal('150.00'),
            quantidade_estoque=Decimal('1000.00'),
            quantidade_reservada=Decimal('0.00'),
            criado_por=self.user
        )
        
        self.emprestimo = Emprestimo.objects.create(
            tenant=self.tenant,
            titulo='Emprestimo Safra 2024',
            descricao='Financiamento para insumos',
            valor_emprestimo=Decimal('0.00'),
            valor_entrada=Decimal('0.00'),
            taxa_juros=Decimal('7.5'),
            frequencia_taxa='mensal',
            metodo_calculo='simples',
            numero_parcelas=12,
            prazo_meses=12,
            status='ativo',
            tipo_emprestimo='rural',
            cliente=None,
            criado_por=self.user
        )

    def test_emprestimo_serializer_includes_itens_produtos(self):
        """Test that EmprestimoSerializer includes nested itens_produtos"""
        # Create items
        ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
            criado_por=self.user
        )
        
        # Serialize emprestimo
        serializer = EmprestimoSerializer(self.emprestimo)
        
        # Check that itens_produtos is included
        assert 'itens_produtos' in serializer.data
        assert len(serializer.data['itens_produtos']) == 1
        
        item_data = serializer.data['itens_produtos'][0]
        assert item_data['produto'] == self.produto.id
        assert item_data['quantidade'] == '50.00'
        assert item_data['valor_unitario'] == '150.00'
        assert item_data['valor_total'] == '7500.00'


@pytest.mark.django_db
class ItemEmprestimoAPIViewSetTests(APITestCase):
    """Tests for ItemEmprestimoViewSet API endpoints"""

    def setUp(self):
        """Set up test data and API client"""
        self.client = APIClient()
        
        self.tenant = Tenant.objects.create(name="Test Tenant")
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.produto = Produto.objects.create(
            tenant=self.tenant,
            nome='Fertilizante NPK',
            unidade='kg',
            preco_venda=Decimal('150.00'),
            quantidade_estoque=Decimal('1000.00'),
            quantidade_reservada=Decimal('0.00'),
            criado_por=self.user
        )
        
        self.emprestimo = Emprestimo.objects.create(
            tenant=self.tenant,
            titulo='Emprestimo Safra 2024',
            descricao='Financiamento para insumos',
            valor_emprestimo=Decimal('0.00'),
            valor_entrada=Decimal('0.00'),
            taxa_juros=Decimal('7.5'),
            frequencia_taxa='mensal',
            metodo_calculo='simples',
            numero_parcelas=12,
            prazo_meses=12,
            status='ativo',
            tipo_emprestimo='rural',
            cliente=None,
            criado_por=self.user
        )

    def test_create_item_emprestimo_via_api(self):
        """Test creating ItemEmprestimo via API"""
        data = {
            'emprestimo': self.emprestimo.id,
            'produto': self.produto.id,
            'quantidade': '50.00',
            'unidade': 'kg',
            'valor_unitario': '150.00'
        }
        
        response = self.client.post('/api/financeiro/itens-emprestimo/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['quantidade'] == '50.00'
        assert response.data['valor_total'] == '7500.00'

    def test_list_items_emprestimo_via_api(self):
        """Test listing ItemEmprestimo via API"""
        # Create items
        ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
            criado_por=self.user
        )
        
        response = self.client.get('/api/financeiro/itens-emprestimo/', format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_filter_items_by_emprestimo(self):
        """Test filtering ItemEmprestimo by emprestimo"""
        ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
            criado_por=self.user
        )
        
        response = self.client.get(
            f'/api/financeiro/itens-emprestimo/?emprestimo={self.emprestimo.id}',
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_delete_item_emprestimo_via_api(self):
        """Test deleting ItemEmprestimo via API"""
        item = ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
            criado_por=self.user
        )
        
        response = self.client.delete(
            f'/api/financeiro/itens-emprestimo/{item.id}/',
            format='json'
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify item is deleted
        assert not ItemEmprestimo.objects.filter(id=item.id).exists()
