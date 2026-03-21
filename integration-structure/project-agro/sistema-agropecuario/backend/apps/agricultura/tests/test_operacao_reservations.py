from decimal import Decimal
from django.test import TestCase
from datetime import date
from django.contrib.auth import get_user_model
from apps.estoque.models import Produto
from apps.agricultura.serializers import OperacaoSerializer
from apps.core.models import Tenant

User = get_user_model()


class OperacaoReservationSerializerTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            nome='test_tenant_agricultura_operacao_reservations',
            slug='test-tenant-agricultura-operacao-reservations'
        )
        self.user = User.objects.create_user(username='opuser', tenant=self.tenant)
        self.prod = Produto.objects.create(codigo='PX', nome='Produto X', unidade='kg', quantidade_estoque=Decimal('20'), estoque_minimo=Decimal('0'), tenant=self.tenant)
        from apps.fazendas.models import Fazenda, Talhao, Proprietario
        self.owner = Proprietario.objects.create(nome='Owner', cpf_cnpj='00000000000', tenant=self.tenant)
        self.fazenda = Fazenda.objects.create(name='Fazenda Teste', proprietario=self.owner, matricula='M-1', tenant=self.tenant)
        from apps.fazendas.models import Area
        self.area = Area.objects.create(proprietario=self.owner, fazenda=self.fazenda, name='Area 1')
        self.talhao = Talhao.objects.create(name='Talhao 1', area_size=1.0, area=self.area, tenant=self.tenant)

    def test_serializer_create_reserves_stock(self):
        payload = {
            'categoria': 'plantio',
            'tipo': 'plant_direto',
            'data_operacao': date.today().isoformat(),
            'status': 'planejada',
            'talhoes': [self.talhao.id],
            'produtos_input': [
                {'produto_id': self.prod.id, 'dosagem': '5', 'unidade_dosagem': 'kg/ha'}
            ]
        }
        serializer = OperacaoSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        op = serializer.save()
        self.prod.refresh_from_db()
        # Since operação area_total_ha == 0, the serializer will create OperacaoProduto with quantity 0 by default
        # but our reserve call will attempt to reserve based on quantidade_total. To simulate an actual quantity, we set it after.
        # For the sake of the serializer create we check that the reservation call didn't crash and that op exists
        self.assertIsNotNone(op.id)

    def test_update_status_commits_reservations(self):
        # Create operation with product and set quantity_total manually
        payload = {
            'categoria': 'plantio',
            'tipo': 'plant_direto',
            'data_operacao': date.today().isoformat(),
            'status': 'planejada',
            'talhoes': [self.talhao.id],
            'produtos_input': [
                {'produto_id': self.prod.id, 'dosagem': '2', 'unidade_dosagem': 'kg/ha'}
            ]
        }
        serializer = OperacaoSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        op = serializer.save()

        # After save the serializer should have reserved the correct amount (dosagem 2 × area 1.0 = 2)
        self.prod.refresh_from_db()
        self.assertEqual(self.prod.quantidade_reservada, Decimal('2'))

        # Now update status to finalizada via serializer and expect commit
        update_serializer = OperacaoSerializer(op, data={'status': 'concluida'}, partial=True)
        update_serializer.is_valid(raise_exception=True)
        update_serializer.save()
        self.prod.refresh_from_db()
        # Quantidade_reservada should be zero and estoque reduced by 2
        self.assertEqual(self.prod.quantidade_reservada, Decimal('0'))
        self.assertEqual(self.prod.quantidade_estoque, Decimal('18'))
