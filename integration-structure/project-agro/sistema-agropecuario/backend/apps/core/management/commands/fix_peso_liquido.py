#!/usr/bin/env python
"""
Script para recalcular peso_liquido em todos os MovimentacaoCarga indiretamente,
forçando save() para disparar a lógica de cálculo.
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sistema_agropecuario.settings')
django.setup()

from apps.agricultura.models import MovimentacaoCarga
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

print("=" * 80)
print("INICIANDO CORREÇÃO DE PESO_LIQUIDO")
print("=" * 80)

total = MovimentacaoCarga.objects.count()
updated = 0
errors = 0

for i, mov in enumerate(MovimentacaoCarga.objects.all(), 1):
    try:
        old_peso_liquido = mov.peso_liquido
        
        # Força recalculo ao salvar
        mov.save()
        
        new_peso_liquido = mov.peso_liquido
        
        if old_peso_liquido != new_peso_liquido:
            print(f"[{i}/{total}] ✅ Corrigido #{mov.pk}: {old_peso_liquido} → {new_peso_liquido} (bruto={mov.peso_bruto}, tara={mov.tara})")
            updated += 1
        else:
            if new_peso_liquido is None:
                print(f"[{i}/{total}] ⚠️  #{mov.pk}: Ainda NULL (bruto={mov.peso_bruto}, tara={mov.tara})")
            elif i % 5 == 0:  # Print a cada 5 para não spammar logs
                print(f"[{i}/{total}] ✓ #{mov.pk}: peso_liquido={new_peso_liquido}")
    except Exception as e:
        errors += 1
        print(f"[{i}/{total}] ❌ ERRO #{mov.pk}: {str(e)}")

print("=" * 80)
print(f"RESULTADO: {updated}/{total} corrigidos, {errors} erros")
print("=" * 80)
