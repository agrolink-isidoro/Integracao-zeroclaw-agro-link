#!/usr/bin/env python3
"""
Script para popular dados de teste rapidamente
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, '/app/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sistema_agropecuario.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from backend.apps.fazendas.models import Proprietario, Fazenda, Area, Talhao
from backend.apps.agricultura.models import Cultura, Plantio, HarvestSession, HarvestSessionItem
from backend.apps.estoque.models import LocalArmazenamento
from datetime import date, timedelta

User = get_user_model()

def criar_dados_teste():
    print("🔄 Criando dados de teste...")
    
    # 1. Usuário admin
    user, created = User.objects.get_or_create(
        username='admin',
        defaults={'email': 'admin@example.com', 'is_staff': True, 'is_superuser': True}
    )
    if created:
        user.set_password('admin123')
        user.save()
        print("✅ Usuário admin criado")
    else:
        print("ℹ️  Usuário admin já existe")
    
    # 2. Proprietário
    proprietario, created = Proprietario.objects.get_or_create(
        cpf_cnpj='12345678901',
        defaults={
            'nome': 'João Silva',
            'tipo': 'pf',
            'telefone': '(11) 98765-4321',
            'email': 'joao@example.com'
        }
    )
    print(f"{'✅ Proprietário criado' if created else 'ℹ️  Proprietário já existe'}")
    
    # 3. Fazenda
    fazenda, created = Fazenda.objects.get_or_create(
        nome='Fazenda São João',
        defaults={
            'proprietario': proprietario,
            'area_total': 1000.00,
            'endereco': 'Zona Rural',
            'cidade': 'São Paulo',
            'estado': 'SP'
        }
    )
    print(f"{'✅ Fazenda criada' if created else 'ℹ️  Fazenda já existe'}")
    
    # 4. Área
    area, created = Area.objects.get_or_create(
        nome='Área A',
        defaults={
            'fazenda': fazenda,
            'area_hectares': 100.00,
            'tipo_solo': 'Latossolo Vermelho'
        }
    )
    print(f"{'✅ Área criada' if created else 'ℹ️  Área já existe'}")
    
    # 5. Talhão
    talhao, created = Talhao.objects.get_or_create(
        nome='Talhão 1',
        defaults={
            'area': area,
            'area_plantada': 50.00
        }
    )
    print(f"{'✅ Talhão criado' if created else 'ℹ️  Talhão já existe'}")
    
    # 6. Cultura
    cultura, created = Cultura.objects.get_or_create(
        nome='Soja',
        defaults={
            'ciclo_dias': 120,
            'tipo': 'grão'
        }
    )
    print(f"{'✅ Cultura (Soja) criada' if created else 'ℹ️  Cultura já existe'}")
    
    # 7. Plantio (Safra)
    plantio, created = Plantio.objects.get_or_create(
        nome_safra='Safra Soja - 2026-01-21',
        defaults={
            'fazenda': fazenda,
            'cultura': cultura,
            'data_plantio': date.today(),
            'status': 'em_andamento'
        }
    )
    if created:
        plantio.talhoes.add(talhao)
        print("✅ Plantio (Safra) criado")
    else:
        print("ℹ️  Plantio já existe")
    
    # 8. Sessão de Colheita
    session, created = HarvestSession.objects.get_or_create(
        plantio=plantio,
        data_inicio=date.today(),
        defaults={
            'status': 'em_andamento',
            'criado_por': user
        }
    )
    print(f"{'✅ Sessão de colheita criada' if created else 'ℹ️  Sessão já existe'}")
    
    # 9. Item da Sessão (talhão na sessão)
    item, created = HarvestSessionItem.objects.get_or_create(
        session=session,
        talhao=talhao,
        defaults={
            'quantidade_colhida': 5000.00,
            'status': 'pendente'
        }
    )
    print(f"{'✅ Item da sessão criado' if created else 'ℹ️  Item já existe'}")
    
    # 10. Local de Armazenamento
    local, created = LocalArmazenamento.objects.get_or_create(
        nome='Armazém 1 (silo)',
        defaults={
            'fazenda': fazenda,
            'tipo': 'silo_bolsa',
            'capacidade': 10000.00
        }
    )
    print(f"{'✅ Local de armazenamento criado' if created else 'ℹ️  Local já existe'}")
    
    print("\n" + "="*50)
    print("✅ DADOS DE TESTE CRIADOS COM SUCESSO!")
    print("="*50)
    print(f"\n📋 Resumo:")
    print(f"   Proprietário: {proprietario.nome} (CPF: {proprietario.cpf_cnpj})")
    print(f"   Fazenda: {fazenda.nome}")
    print(f"   Área: {area.nome} ({area.area_hectares} ha)")
    print(f"   Talhão: {talhao.nome} ({talhao.area_plantada} ha)")
    print(f"   Cultura: {cultura.nome}")
    print(f"   Plantio: {plantio.nome_safra}")
    print(f"   Sessão: ID {session.id} - Status: {session.status}")
    print(f"   Item Sessão: ID {item.id} - Talhão: {item.talhao.nome} - Status: {item.status}")
    print(f"   Local Armazenamento: {local.nome}")
    print(f"\n🔑 Login: admin / admin123")
    print(f"🌐 Frontend: http://localhost:5173")
    print(f"🔧 Backend: http://localhost:8001")

if __name__ == '__main__':
    try:
        criar_dados_teste()
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
