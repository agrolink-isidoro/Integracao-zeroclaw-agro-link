import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sistema_agropecuario.settings')
django.setup()

from apps.agricultura.models import MovimentacaoCarga

print("ÚLTIMAS MOVIMENTAÇÕES REGISTRADAS:")
print("-" * 100)
for mov in MovimentacaoCarga.objects.all().order_by('-criado_em')[:3]:
    print(f"\nMovimentação #{mov.pk}:")
    print(f"  Motorista: {mov.motorista}")
    print(f"  Custo Transporte: {mov.custo_transporte}")
    print(f"  Unidade Custo: {mov.custo_transporte_unidade}")
    print(f"  Peso Líquido: {mov.peso_liquido}")
