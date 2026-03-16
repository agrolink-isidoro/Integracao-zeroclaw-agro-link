"""
Tests for ItemEmprestimo model, serializer, and ViewSet
"""
import pytest
from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase
from rest_framework import status

from apps.core.models import Tenant
from apps.comercial.models import Cliente
from apps.financeiro.models import Emprestimo, ItemEmprestimo, ParcelaEmprestimo
from apps.estoque.models import Produto
from apps.financeiro.serializers import ItemEmprestimoSerializer, EmprestimoSerializer

User = get_user_model()


@pytest.mark.django_db
class ItemEmprestimoModelTests(TestCase):
    """Tests for ItemEmprestimo model"""

    def setUp(self):
        """Set up test data"""
        # Create tenant
        self.tenant = Tenant.objects.create(nome="Test Tenant", slug="test-tenant-model")

        # Create user
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            tenant=self.tenant,
        )

        # Create cliente (required for Emprestimo validation)
        self.cliente = Cliente.objects.create(
            tenant=self.tenant,
            nome='Cliente Teste',
            cpf_cnpj='12.345.678/0001-99',
            criado_por=self.user,
        )

        # Create produto
        self.produto = Produto.objects.create(
            tenant=self.tenant,
            codigo='NPK-001',
            nome='Fertilizante NPK',
            unidade='kg',
            preco_venda=Decimal('150.00'),
            quantidade_estoque=Decimal('1000.00'),
            quantidade_reservada=Decimal('0.00'),
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
            metodo_calculo='price',
            numero_parcelas=12,
            prazo_meses=12,
            data_contratacao=date.today(),
            data_primeiro_vencimento=date.today(),
            status='ativo',
            tipo_emprestimo='rural',
            cliente=self.cliente,
            criado_por=self.user,
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
        )

        assert item.id is not None
        assert item.emprestimo == self.emprestimo
        assert item.produto == self.produto
        assert item.quantidade == Decimal('50.00')
        assert item.unidade == 'kg'
        # valor_total is auto-calculated by save()
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
        )

        # valor_total is calculated automatically in save()
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
            )

    def test_stock_validation_on_clean(self):
        """Test that validation checks available stock"""
        item = ItemEmprestimo(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('2000.00'),  # More than available (stock=1000)
            unidade='kg',
            valor_unitario=Decimal('150.00'),
        )

        # clean() should raise ValidationError
        with pytest.raises(Exception):  # ValidationError
            item.clean()

    def test_item_valor_total_persisted_on_create(self):
        """Test that item valor_total is persisted to DB after create"""
        item = ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
        )

        # Refresh from DB to confirm persistence
        item.refresh_from_db()
        assert item.valor_total == Decimal('7500.00')  # 50 * 150

    def test_item_valor_total_recalculates_on_update(self):
        """Test that item valor_total recalculates when updated"""
        item = ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
        )

        # Update quantidade
        item.quantidade = Decimal('100.00')
        item.save()
        item.refresh_from_db()
        assert item.valor_total == Decimal('15000.00')  # 100 * 150

    def test_multiple_items_have_independent_valor_total(self):
        """Test that multiple items each calculate their own valor_total"""
        produto2 = Produto.objects.create(
            tenant=self.tenant,
            codigo='MILHO-001',
            nome='Sementes Milho',
            unidade='kg',
            preco_venda=Decimal('50.00'),
            quantidade_estoque=Decimal('500.00'),
            quantidade_reservada=Decimal('0.00'),
        )

        item1 = ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
        )
        item2 = ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=produto2,
            quantidade=Decimal('100.00'),
            unidade='kg',
            valor_unitario=Decimal('50.00'),
        )

        assert item1.valor_total == Decimal('7500.00')   # 50 * 150
        assert item2.valor_total == Decimal('5000.00')   # 100 * 50


@pytest.mark.django_db
class ItemEmprestimoSerializerTests(TestCase):
    """Tests for ItemEmprestimoSerializer"""

    def setUp(self):
        """Set up test data"""
        self.tenant = Tenant.objects.create(nome="Test Tenant Serializer", slug="test-tenant-serializer")
        self.user = User.objects.create_user(
            username='serializeruser',
            password='testpass123',
            tenant=self.tenant,
        )

        self.cliente = Cliente.objects.create(
            tenant=self.tenant,
            nome='Cliente Serializer',
            cpf_cnpj='98.765.432/0001-11',
            criado_por=self.user,
        )

        self.produto = Produto.objects.create(
            tenant=self.tenant,
            codigo='NPK-SER-001',
            nome='Fertilizante NPK',
            unidade='kg',
            preco_venda=Decimal('150.00'),
            quantidade_estoque=Decimal('1000.00'),
            quantidade_reservada=Decimal('0.00'),
        )

        self.emprestimo = Emprestimo.objects.create(
            tenant=self.tenant,
            titulo='Emprestimo Safra 2024',
            descricao='Financiamento para insumos',
            valor_emprestimo=Decimal('10000.00'),
            valor_entrada=Decimal('0.00'),
            taxa_juros=Decimal('7.5'),
            frequencia_taxa='mensal',
            metodo_calculo='price',
            numero_parcelas=12,
            prazo_meses=12,
            data_contratacao=date.today(),
            data_primeiro_vencimento=date.today(),
            status='ativo',
            tipo_emprestimo='rural',
            cliente=self.cliente,
            criado_por=self.user,
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
        )

        serializer = ItemEmprestimoSerializer(item)

        # Check that read-only fields are present and calculated
        assert 'valor_total' in serializer.data
        assert serializer.data['valor_total'] == Decimal('7500.00')
        assert 'produto_nome' in serializer.data
        assert serializer.data['produto_nome'] == 'Fertilizante NPK'
        assert 'produto_unidade' in serializer.data
        assert serializer.data['produto_unidade'] == 'kg'


@pytest.mark.django_db
class EmprestimoSerializerWithItemsTests(TestCase):
    """Tests for EmprestimoSerializer with nested ItemEmprestimo"""

    def setUp(self):
        """Set up test data"""
        self.tenant = Tenant.objects.create(nome="Test Tenant Nested", slug="test-tenant-nested")
        self.user = User.objects.create_user(
            username='nesteduser',
            password='testpass123',
            tenant=self.tenant,
        )

        self.cliente = Cliente.objects.create(
            tenant=self.tenant,
            nome='Cliente Nested',
            cpf_cnpj='11.222.333/0001-44',
            criado_por=self.user,
        )

        self.produto = Produto.objects.create(
            tenant=self.tenant,
            codigo='NPK-NEST-001',
            nome='Fertilizante NPK',
            unidade='kg',
            preco_venda=Decimal('150.00'),
            quantidade_estoque=Decimal('1000.00'),
            quantidade_reservada=Decimal('0.00'),
        )

        self.emprestimo = Emprestimo.objects.create(
            tenant=self.tenant,
            titulo='Emprestimo Safra 2024',
            descricao='Financiamento para insumos',
            valor_emprestimo=Decimal('0.00'),
            valor_entrada=Decimal('0.00'),
            taxa_juros=Decimal('7.5'),
            frequencia_taxa='mensal',
            metodo_calculo='price',
            numero_parcelas=12,
            prazo_meses=12,
            data_contratacao=date.today(),
            data_primeiro_vencimento=date.today(),
            status='ativo',
            tipo_emprestimo='rural',
            cliente=self.cliente,
            criado_por=self.user,
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
        assert item_data['valor_total'] == Decimal('7500.00')


@pytest.mark.django_db
class ItemEmprestimoAPIViewSetTests(APITestCase):
    """Tests for ItemEmprestimoViewSet API endpoints"""

    def setUp(self):
        """Set up test data and API client"""
        self.client = APIClient()

        self.tenant = Tenant.objects.create(nome="Test Tenant API", slug="test-tenant-api")
        # is_staff=True so RBACViewPermission passes and middleware step-2 sets request.tenant
        self.user = User.objects.create_user(
            username='apiuser',
            password='testpass123',
            tenant=self.tenant,
            is_staff=True,
        )
        self.client.force_authenticate(user=self.user)

        self.cliente = Cliente.objects.create(
            tenant=self.tenant,
            nome='Cliente API',
            cpf_cnpj='55.666.777/0001-88',
            criado_por=self.user,
        )

        self.produto = Produto.objects.create(
            tenant=self.tenant,
            codigo='NPK-API-001',
            nome='Fertilizante NPK',
            unidade='kg',
            preco_venda=Decimal('150.00'),
            quantidade_estoque=Decimal('1000.00'),
            quantidade_reservada=Decimal('0.00'),
        )

        self.emprestimo = Emprestimo.objects.create(
            tenant=self.tenant,
            titulo='Emprestimo Safra 2024',
            descricao='Financiamento para insumos',
            valor_emprestimo=Decimal('0.00'),
            valor_entrada=Decimal('0.00'),
            taxa_juros=Decimal('7.5'),
            frequencia_taxa='mensal',
            metodo_calculo='price',
            numero_parcelas=12,
            prazo_meses=12,
            data_contratacao=date.today(),
            data_primeiro_vencimento=date.today(),
            status='ativo',
            tipo_emprestimo='rural',
            cliente=self.cliente,
            criado_por=self.user,
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
        assert response.data['valor_total'] == Decimal('7500.00')

    def test_list_items_emprestimo_via_api(self):
        """Test listing ItemEmprestimo via API"""
        # Create item directly in DB (with same tenant as authenticated user)
        ItemEmprestimo.objects.create(
            tenant=self.tenant,
            emprestimo=self.emprestimo,
            produto=self.produto,
            quantidade=Decimal('50.00'),
            unidade='kg',
            valor_unitario=Decimal('150.00'),
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
        )

        response = self.client.delete(
            f'/api/financeiro/itens-emprestimo/{item.id}/',
            format='json'
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify item is deleted
        assert not ItemEmprestimo.objects.filter(id=item.id).exists()
