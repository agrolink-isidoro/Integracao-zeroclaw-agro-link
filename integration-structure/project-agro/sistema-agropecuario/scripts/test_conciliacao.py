#!/usr/bin/env python
"""
Script para testar a conciliação bancária.
Cria dados de teste: conta bancária, vencimentos e extrato CSV.
"""
import os
import sys
import django
from datetime import date, timedelta
from decimal import Decimal

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.financeiro.models import ContaBancaria, Vencimento, InstituicaoFinanceira
from django.contrib.auth import get_user_model

User = get_user_model()

def criar_dados_teste():
    """Cria dados de teste para conciliação."""
    
    print("=" * 60)
    print("CRIANDO DADOS DE TESTE PARA CONCILIAÇÃO BANCÁRIA")
    print("=" * 60)
    
    # 1. Buscar ou criar usuário
    try:
        user = User.objects.first()
        if not user:
            print("\n⚠️  Nenhum usuário encontrado. Crie um superusuário primeiro:")
            print("   docker exec -it sistema-agropecuario-backend-1 python manage.py createsuperuser")
            return
        print(f"\n✓ Usuário: {user.username}")
    except Exception as e:
        print(f"\n✗ Erro ao buscar usuário: {e}")
        return
    
    # 2. Buscar ou criar instituição financeira
    instituicao, created = InstituicaoFinanceira.objects.get_or_create(
        codigo_bacen='001',
        defaults={
            'nome': 'Banco do Brasil',
            'nome_reduzido': 'BB'
        }
    )
    print(f"✓ Instituição: {instituicao.nome} ({'criada' if created else 'existente'})")
    
    # 3. Criar conta bancária de teste
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
    print(f"✓ Conta: {conta.banco} Ag {conta.agencia} Conta {conta.conta} ({'criada' if created else 'existente'})")
    print(f"  ID da conta: {conta.id} (use este ID no upload)")
    
    # 4. Criar vencimentos de teste (que serão conciliados)
    hoje = date.today()
    vencimentos_data = [
        {
            'titulo': 'Pagamento Fornecedor ABC - Sementes',
            'valor': Decimal('1250.00'),
            'data': hoje - timedelta(days=2),
            'tipo': 'despesa'
        },
        {
            'titulo': 'Venda de Grãos - Cliente XYZ',
            'valor': Decimal('3500.00'),
            'data': hoje - timedelta(days=1),
            'tipo': 'receita'
        },
        {
            'titulo': 'Pagamento Aluguel Galpão',
            'valor': Decimal('800.00'),
            'data': hoje,
            'tipo': 'despesa'
        },
        {
            'titulo': 'Pagamento Funcionários',
            'valor': Decimal('2200.00'),
            'data': hoje - timedelta(days=3),
            'tipo': 'despesa'
        },
        {
            'titulo': 'Venda Equipamento Usado',
            'valor': Decimal('1500.00'),
            'data': hoje - timedelta(days=4),
            'tipo': 'receita'
        },
    ]
    
    print(f"\n✓ Criando {len(vencimentos_data)} vencimentos de teste:")
    vencimentos_criados = []
    for v_data in vencimentos_data:
        vencimento, created = Vencimento.objects.get_or_create(
            titulo=v_data['titulo'],
            data_vencimento=v_data['data'],
            defaults={
                'valor': v_data['valor'],
                'status': 'pendente',
                'tipo': v_data['tipo'],
                'conta_bancaria': conta,
                'criado_por': user
            }
        )
        vencimentos_criados.append(vencimento)
        simbolo = 'D' if v_data['tipo'] == 'despesa' else 'C'
        print(f"  [{simbolo}] R$ {v_data['valor']:>8} | {v_data['data']} | {v_data['titulo'][:40]}")
    
    # 5. Criar CSV de extrato bancário de teste
    csv_path = '/tmp/extrato_teste_bb.csv'
    csv_content = """date,amount,description,external_id,balance
{},{},{},{},{}
{},{},{},{},{}
{},{},{},{},{}
{},{},{},{},{}
{},{},{},{},{}
""".format(
        (hoje - timedelta(days=4)).isoformat(), '1500.00', 'DEP VENDA EQUIPAMENTO', 'TRX001', '6500.00',
        (hoje - timedelta(days=3)).isoformat(), '-2200.00', 'PIX PAGTO FUNCIONARIOS', 'TRX002', '4300.00',
        (hoje - timedelta(days=2)).isoformat(), '-1250.00', 'TED FORNEC ABC SEMENTES', 'TRX003', '3050.00',
        (hoje - timedelta(days=1)).isoformat(), '3500.00', 'DEP VENDA GRAOS XYZ', 'TRX004', '6550.00',
        hoje.isoformat(), '-800.00', 'DEB AUTO ALUGUEL GALPAO', 'TRX005', '5750.00'
    )
    
    with open(csv_path, 'w') as f:
        f.write(csv_content)
    
    print(f"\n✓ Extrato CSV criado: {csv_path}")
    print(f"  5 transações que devem combinar com os vencimentos acima")
    
    # 6. Instruções para teste
    print("\n" + "=" * 60)
    print("PRÓXIMOS PASSOS PARA TESTAR:")
    print("=" * 60)
    print(f"""
1. Acesse: http://localhost:5173/financeiro (aba 'Contas Bancárias' > 'Extratos')

2. Clique em 'Novo Extrato'

3. Selecione a conta:
   → Banco do Brasil - Ag 1234 Conta 12345-6 (ID: {conta.id})

4. Faça upload do arquivo:
   → {csv_path}

5. Clique em 'Preview' para ver as transações

6. Clique em 'Importar' para criar o BankStatementImport

7. Após importação bem-sucedida, clique em '🔗 Conciliar'

8. O sistema irá:
   ✓ Converter BankTransaction → ItemExtratoBancario
   ✓ Executar matching automático
   ✓ Mostrar resultado com métricas

9. Verifique:
   • Itens criados: 5
   • Conciliados automaticamente: ~4-5 (score ≥ 90%)
   • Sugestões manuais: 0-1 (se houver pequenas diferenças)

10. Confira os vencimentos:
    → Status deve mudar para 'pago'
    → confirmado_extrato = True
    → data_pagamento preenchida

OPCIONAL - Teste via API direto:
curl -X POST http://localhost:8000/api/financeiro/bank-statements/ \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "conta={conta.id}" \\
  -F "arquivo=@{csv_path}"

Depois:
curl -X POST http://localhost:8000/api/financeiro/bank-statements/{{import_id}}/conciliar/ \\
  -H "Authorization: Bearer YOUR_TOKEN"
""")
    
    print("\n" + "=" * 60)
    print("✅ DADOS DE TESTE CRIADOS COM SUCESSO!")
    print("=" * 60)

if __name__ == '__main__':
    criar_dados_teste()
