"""Script para criar dados de teste de conciliação bancária"""
from apps.financeiro.models import ContaBancaria, Vencimento, InstituicaoFinanceira
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from decimal import Decimal

User = get_user_model()

# 1. Buscar usuário
user = User.objects.first()
if not user:
    print("ERRO: Crie um superusuário primeiro:")
    print("docker exec -it sistema-agropecuario-backend-1 python manage.py createsuperuser")
    exit(1)

print(f"Usuario: {user.username}")

# 2. Criar instituição
instituicao, _ = InstituicaoFinanceira.objects.get_or_create(
    codigo_bacen='001',
    defaults={'nome': 'Banco do Brasil', 'nome_reduzido': 'BB'}
)
print(f"Instituicao: {instituicao.nome}")

# 3. Criar conta bancária
conta, created = ContaBancaria.objects.get_or_create(
    agencia='1234',
    conta='12345-6',
    defaults={
        'banco': 'Banco do Brasil',
        'tipo_conta': 'corrente',
        'saldo_inicial': Decimal('5000.00'),
        'data_saldo_inicial': date.today() - timedelta(days=30),
        'instituicao': instituicao
    }
)
print(f"Conta ID: {conta.id} | {conta.banco} Ag {conta.agencia} Conta {conta.conta}")

# 4. Criar vencimentos
hoje = date.today()
vencimentos = [
    ('Pagamento Fornecedor ABC - Sementes', Decimal('1250.00'), hoje - timedelta(days=2), 'despesa'),
    ('Venda de Grãos - Cliente XYZ', Decimal('3500.00'), hoje - timedelta(days=1), 'receita'),
    ('Pagamento Aluguel Galpão', Decimal('800.00'), hoje, 'despesa'),
    ('Pagamento Funcionários', Decimal('2200.00'), hoje - timedelta(days=3), 'despesa'),
    ('Venda Equipamento Usado', Decimal('1500.00'), hoje - timedelta(days=4), 'receita'),
]

for titulo, valor, data_venc, tipo in vencimentos:
    v, created = Vencimento.objects.get_or_create(
        titulo=titulo,
        data_vencimento=data_venc,
        defaults={
            'valor': valor,
            'status': 'pendente',
            'tipo': tipo,
            'conta_bancaria': conta,
            'criado_por': user
        }
    )
    print(f"Vencimento: {v.id} | R$ {valor} | {data_venc} | {titulo[:30]}")

print(f"\n✓ DADOS CRIADOS COM SUCESSO!")
print(f"✓ Use Conta ID: {conta.id} no upload do extrato")
