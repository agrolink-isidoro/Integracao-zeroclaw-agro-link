from django.test import TestCase
from apps.comercial.models import Cliente
from apps.financeiro.models import Emprestimo
from django.contrib.auth import get_user_model

User = get_user_model()

class EmprestimoClienteTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser('u','u@example.com','u')
        self.cliente = Cliente.objects.create(nome='Cliente Test', tipo_pessoa='PF', cpf_cnpj='000')

    def test_create_emprestimo_with_cliente(self):
        e = Emprestimo.objects.create(
            titulo='Emp com cliente',
            valor_emprestimo=1000,
            taxa_juros=1.0,
            numero_parcelas=1,
            prazo_meses=1,
            data_contratacao='2025-01-01',
            data_primeiro_vencimento='2025-02-01',
            cliente=self.cliente,
            criado_por=self.user
        )
        self.assertEqual(e.cliente, self.cliente)

    def test_cannot_create_emprestimo_without_cliente_or_instituicao(self):
        with self.assertRaises(Exception):
            Emprestimo.objects.create(
                titulo='Invalid',
                valor_emprestimo=1000,
                taxa_juros=1.0,
                numero_parcelas=1,
                prazo_meses=1,
                data_contratacao='2025-01-01',
                data_primeiro_vencimento='2025-02-01',
                criado_por=self.user
            )
