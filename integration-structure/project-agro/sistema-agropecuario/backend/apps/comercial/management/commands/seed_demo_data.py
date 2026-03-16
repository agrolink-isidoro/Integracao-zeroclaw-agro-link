from django.core.management.base import BaseCommand
from decimal import Decimal

from apps.comercial.models import Cliente, Fornecedor
from apps.financeiro.models import ContaBancaria


class Command(BaseCommand):
    help = 'Popula dados fictícios: 5 clientes, 5 fornecedores e 2 contas bancárias'

    def handle(self, *args, **options):
        created = {'clientes': 0, 'fornecedores': 0, 'contas': 0}

        clientes = [
            {'nome': 'Cliente Demo A', 'cpf_cnpj': '00000000001'},
            {'nome': 'Cliente Demo B', 'cpf_cnpj': '00000000002'},
            {'nome': 'Cliente Demo C', 'cpf_cnpj': '00000000003'},
            {'nome': 'Cliente Demo D', 'cpf_cnpj': '00000000004'},
            {'nome': 'Cliente Demo E', 'cpf_cnpj': '00000000005'},
        ]

        fornecedores = [
            {'nome': 'Fornecedor Demo 1', 'cpf_cnpj': '10000000001'},
            {'nome': 'Fornecedor Demo 2', 'cpf_cnpj': '10000000002'},
            {'nome': 'Fornecedor Demo 3', 'cpf_cnpj': '10000000003'},
            {'nome': 'Fornecedor Demo 4', 'cpf_cnpj': '10000000004'},
            {'nome': 'Fornecedor Demo 5', 'cpf_cnpj': '10000000005'},
        ]

        contas = [
            {'banco': 'Banco Demo A', 'agencia': '0001', 'conta': '11111-1', 'saldo_inicial': Decimal('1000.00')},
            {'banco': 'Banco Demo B', 'agencia': '0002', 'conta': '22222-2', 'saldo_inicial': Decimal('500.00')},
        ]

        # Criar clientes
        for c in clientes:
            obj, created_flag = Cliente.objects.get_or_create(
                cpf_cnpj=c['cpf_cnpj'],
                defaults={
                    'nome': c['nome'],
                    'tipo_pessoa': 'pj',
                }
            )
            if created_flag:
                created['clientes'] += 1

        # Criar fornecedores
        for f in fornecedores:
            obj, created_flag = Fornecedor.objects.get_or_create(
                cpf_cnpj=f['cpf_cnpj'],
                defaults={
                    'nome': f['nome'],
                    'tipo_pessoa': 'pj',
                }
            )
            if created_flag:
                created['fornecedores'] += 1

        # Criar contas bancárias
        for acc in contas:
            obj, created_flag = ContaBancaria.objects.get_or_create(
                banco=acc['banco'],
                conta=acc['conta'],
                defaults={
                    'agencia': acc['agencia'],
                    'saldo_inicial': acc['saldo_inicial'],
                }
            )
            if created_flag:
                created['contas'] += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seed completa: {created['clientes']} clientes criados, {created['fornecedores']} fornecedores criados, {created['contas']} contas criadas."
        ))
