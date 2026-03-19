import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.comercial.models import Cliente, CargaViagem, SiloBolsa, VendaColheita
from apps.fazendas.models import Proprietario, Fazenda
from apps.agricultura.models import Cultura

User = get_user_model()


class ClienteModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='12345', is_staff=False)

    def test_cliente_creation(self):
        cliente = Cliente.objects.create(
            nome="Cliente Teste",
            tipo_pessoa='pj',
            cpf_cnpj="12345678000123",
            criado_por=self.user
        )
        self.assertEqual(cliente.nome, "Cliente Teste")
        self.assertEqual(str(cliente), "Cliente Teste (12345678000123)")


class CargaViagemModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='12345', is_staff=False)
        self.proprietario = Proprietario.objects.create(
            nome="Proprietário Teste",
            cpf_cnpj="12345678901"
        )
        self.fazenda = Fazenda.objects.create(
            proprietario=self.proprietario,
            name="Fazenda Teste",
            matricula="MAT123"
        )
        self.cultura = Cultura.objects.create(
            nome="Soja",
            ciclo_dias=120
        )

    def test_carga_viagem_creation(self):
        carga = CargaViagem.objects.create(
            tipo_colheita='colheita_completa',
            tipo_entrega='contrato_pre_fixado',
            data_colheita='2024-12-01',
            peso_total=1000.00,
            classificacao="Tipo 1",
            fazenda=self.fazenda,
            cultura=self.cultura,
            criado_por=self.user
        )
        self.assertEqual(carga.peso_total, 1000.00)
        self.assertEqual(carga.custo_total_armazem, 0)  # Não é armazém geral

    def test_carga_armazem_geral_custos(self):
        carga = CargaViagem.objects.create(
            tipo_colheita='colheita_completa',
            tipo_entrega='armazem_geral',
            data_colheita='2024-12-01',
            peso_total=1000.00,
            classificacao="Tipo 1",
            fazenda=self.fazenda,
            cultura=self.cultura,
            custo_armazenagem=50.00,
            custo_recepcao=20.00,
            custo_limpeza=10.00,
            criado_por=self.user
        )
        self.assertEqual(carga.custo_total_armazem, 80.00)


class SiloBolsaModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='12345', is_staff=False)
        self.proprietario = Proprietario.objects.create(
            nome="Proprietário Teste",
            cpf_cnpj="12345678901"
        )
        self.fazenda = Fazenda.objects.create(
            proprietario=self.proprietario,
            name="Fazenda Teste",
            matricula="MAT123"
        )
        self.cultura = Cultura.objects.create(
            nome="Soja",
            ciclo_dias=120
        )
        self.carga = CargaViagem.objects.create(
            tipo_colheita='silo_bolsa',
            data_colheita='2024-12-01',
            peso_total=2000.00,
            fazenda=self.fazenda,
            cultura=self.cultura,
            criado_por=self.user
        )

    def test_silo_bolsa_creation(self):
        silo = SiloBolsa.objects.create(
            carga_viagem=self.carga,
            capacidade_total=2000.00,
            estoque_atual=2000.00,
            data_armazenamento='2024-12-01',
            criado_por=self.user
        )
        self.assertEqual(silo.estoque_disponivel, 2000.00)


class VendaColheitaModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='12345', is_staff=False)
        self.proprietario = Proprietario.objects.create(
            nome="Proprietário Teste",
            cpf_cnpj="12345678901"
        )
        self.fazenda = Fazenda.objects.create(
            proprietario=self.proprietario,
            name="Fazenda Teste",
            matricula="MAT123"
        )
        self.cultura = Cultura.objects.create(
            nome="Soja",
            ciclo_dias=120
        )
        self.carga = CargaViagem.objects.create(
            tipo_colheita='colheita_completa',
            tipo_entrega='contrato_pre_fixado',
            data_colheita='2024-12-01',
            peso_total=1000.00,
            fazenda=self.fazenda,
            cultura=self.cultura,
            criado_por=self.user
        )
        self.cliente = Cliente.objects.create(
            nome="Cliente Teste",
            tipo_pessoa='pj',
            cpf_cnpj="12345678000123",
            criado_por=self.user
        )

    def test_venda_colheita_creation(self):
        venda = VendaColheita.objects.create(
            origem_tipo='carga_viagem',
            origem_id=self.carga.id,
            data_venda='2024-12-02',
            quantidade=500.00,
            preco_unitario=2.50,
            cliente=self.cliente,
            criado_por=self.user
        )
        self.assertEqual(venda.valor_total, 1250.00)  # 500 * 2.50
        self.assertEqual(venda.status_emissao, 'pendente')