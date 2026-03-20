#!/usr/bin/env python3
"""
Script de teste para verificar se Ordem de Serviço é criada corretamente com status='concluida'
e se as movimentações de estoque são geradas.

Uso:
    cd backend
    python ../test_ordem_servico_fix.py
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(__file__) + '/Integracao-zeroclaw-agro-link/integration-structure/project-agro/sistema-agropecuario/backend')
django.setup()

from apps.maquinas.models import OrdemServico, Equipamento
from apps.estoque.models import MovimentacaoEstoque, Produto
from django.db.models import Q
from datetime import datetime

print("=" * 80)
print("TESTE: Criação de Ordem de Serviço com status='concluida'")
print("=" * 80)

# 1. Buscar a última Ordem de Serviço criada nos últimos 10 minutos
from django.utils import timezone
from datetime import timedelta

ten_minutes_ago = timezone.now() - timedelta(minutes=10)
latest_os = OrdemServico.objects.filter(
    criado_em__gte=ten_minutes_ago
).order_by('-criado_em').first()

if not latest_os:
    print("❌ Nenhuma Ordem de Serviço encontrada nos últimos 10 minutos")
    print("   Crie uma nova OS via action executor para testar")
    sys.exit(1)

print(f"\n✅ Ordem de Serviço encontrada:")
print(f"   ID: {latest_os.pk}")
print(f"   Número: {latest_os.numero_os}")
print(f"   Status: {latest_os.status}")
print(f"   Equipamento: {latest_os.equipamento.nome}")
print(f"   Insumos Reservados: {latest_os.insumos_reservados}")
print(f"   Criado em: {latest_os.criado_em}")

# 2. Verificar se há movimentações de estoque relacionadas
movimentacoes = MovimentacaoEstoque.objects.filter(
    documento_referencia__contains=f"OS #{latest_os.pk}"
)

print(f"\n📊 Movimentações de Estoque relacionadas a esta OS:")
if not movimentacoes.exists():
    print(f"   ❌ NENHUMA movimentação encontrada!")
    print(f"      Isso indica que o signal não foi executado corretamente")
else:
    print(f"   ✅ {movimentacoes.count()} movimentação(ões) encontrada(s):")
    for mov in movimentacoes:
        print(f"\n      - Tipo: {mov.tipo.upper()}")
        print(f"        Produto: {mov.produto.nome}")
        print(f"        Quantidade: {mov.quantidade} {mov.produto.unidade_padrao}")
        print(f"        Origem: {mov.origem}")
        print(f"        Data: {mov.criado_em}")

# 3. Verificar se houve RESERVA + SAÍDA (para status='concluida')
if latest_os.status in ('concluida', 'finalizada'):
    movs_reserva = movimentacoes.filter(tipo='reserva')
    movs_saida = movimentacoes.filter(tipo='saida')
    
    print(f"\n🎯 Análise para status='{latest_os.status}':")
    if movs_reserva.exists():
        print(f"   ✅ RESERVA criada ({movs_reserva.count()} item(ns))")
    else:
        print(f"   ⚠️  RESERVA não encontrada")
    
    if movs_saida.exists():
        print(f"   ✅ SAÍDA criada ({movs_saida.count()} item(ns))")
    else:
        print(f"   ⚠️  SAÍDA não encontrada (BUG ainda presente?)")
    
    # Resultado final
    print(f"\n" + "=" * 80)
    if movs_reserva.exists() and movs_saida.exists():
        print("✅ SUCESSO! Problema foi RESOLVIDO")
        print("   - Ordem de Serviço criada com status concluída")
        print("   - RESERVA e SAÍDA ambas foram criadas automaticamente")
    elif movs_reserva.exists() and not movs_saida.exists():
        print("⚠️  PROBLEMA PARCIAL: Apenas RESERVA foi criada, SAÍDA está faltando")
        print("   - Verifique o signal para transição de status")
    else:
        print("❌ NENHUMA movimentação foi criada")
        print("   - O signal pode não ter sido executado")
    print("=" * 80)

# 4. Insumos da OS
print(f"\n📋 Insumos da OS {latest_os.numero_os}:")
if latest_os.insumos:
    print(f"   Quantidade de insumos: {len(latest_os.insumos)}")
    for i, ins in enumerate(latest_os.insumos, 1):
        print(f"   {i}. {ins.get('nome', 'Sem nome')} - Qtd: {ins.get('quantidade', '?')}")
else:
    print(f"   ⚠️  Nenhum insumo na OS (lista vazia)")
    print(f"      O signal deveria criar a OS mesmo assim")
