from backend.apps.estoque.models import LocalArmazenamento, Produto, Lote, MovimentacaoEstoque
from django.contrib.auth import get_user_model
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

User = get_user_model()
user = User.objects.first()

print('='*60)
print('POPULANDO ESTOQUE COM PRODUTOS')
print('='*60)

locais = {local.nome: local for local in LocalArmazenamento.objects.all()}
print(f'\n✓ {len(locais)} locais encontrados')

produtos_criados = []

# 1. ALMOXERIFADO - Produtos Químicos
print('\n📦 ALMOXERIFADO (Produtos Químicos)...')
local_alm = locais.get('Almoxerifado')

quimicos = [
    ('HERB-001', 'Glifosato 480g/L', 'herbicida', 'Glifosato', 'litros', 35.00, 50, 200),
    ('HERB-002', 'Atrazina 500 SC', 'herbicida', 'Atrazina', 'litros', 28.00, 40, 150),
    ('FUNG-001', 'Tebuconazol 200 EC', 'fungicida', 'Tebuconazol', 'litros', 65.00, 30, 80),
    ('INSE-001', 'Lambda-Cialotrina 50g/L', 'inseticida', 'Lambda-Cialotrina', 'litros', 45.00, 25, 100),
    ('ADJ-001', 'Adjuvante Óleo Mineral', 'adjuvante', 'Óleo Mineral', 'litros', 18.00, 50, 300),
]

for codigo, nome, cat, princ_ativo, unid, custo, est_min, qtd in quimicos:
    p, criado = Produto.objects.get_or_create(
        codigo=codigo,
        defaults={
            'nome': nome,
            'categoria': cat,
            'principio_ativo': princ_ativo,
            'unidade': unid,
            'custo_unitario': Decimal(str(custo)),
            'estoque_minimo': Decimal(str(est_min)),
            'quantidade_estoque': Decimal(str(qtd)),
            'local_armazenamento': local_alm,
            'criado_por': user,
        }
    )
    if criado:
        produtos_criados.append(p)
        print(f'  ✓ {codigo} - {nome} ({qtd} {unid})')
        
# 2. BARRACÃO - Adubos
print('\n📦 BARRACÃO (Adubos e Fertilizantes)...')
local_bar = locais.get('Barracão')

adubos = [
    ('FERT-001', 'NPK 04-14-08', 'fertilizante', 'N:4%, P2O5:14%, K2O:8%', 'kg', 2.50, 1000, 5000),
    ('FERT-002', 'Ureia 45% N', 'fertilizante', 'N: 45%', 'kg', 2.80, 1000, 8000),
    ('FERT-003', 'MAP (Mono-Amônio-Fosfato)', 'fertilizante', 'N:11%, P2O5:52%', 'kg', 3.20, 800, 4000),
    ('FERT-004', 'Cloreto de Potássio (KCl)', 'fertilizante', 'K2O: 60%', 'kg', 2.90, 800, 3500),
]

for codigo, nome, cat, comp, unid, custo, est_min, qtd in adubos:
    p, criado = Produto.objects.get_or_create(
        codigo=codigo,
        defaults={
            'nome': nome,
            'categoria': cat,
            'composicao_quimica': comp,
            'unidade': unid,
            'custo_unitario': Decimal(str(custo)),
            'estoque_minimo': Decimal(str(est_min)),
            'quantidade_estoque': Decimal(str(qtd)),
            'local_armazenamento': local_bar,
            'criado_por': user,
        }
    )
    if criado:
        produtos_criados.append(p)
        print(f'  ✓ {codigo} - {nome} ({qtd} {unid})')

# 3. PÁTIO - Materiais de Construção
print('\n📦 PÁTIO (Materiais de Construção)...')
local_pat = locais.get('Pátio')

materiais = [
    ('CORR-001', 'Calcário Dolomítico', 'correcao_solo', 'CaO:30%, MgO:12%', 'ton', 85.00, 10, 50),
    ('CORR-002', 'Gesso Agrícola', 'correcao_solo', 'CaSO4·2H2O', 'ton', 120.00, 5, 25),
    ('CONS-001', 'Areia Média', 'construcao', '', 'm3', 80.00, 5, 30),
    ('CONS-002', 'Brita Graduada', 'construcao', '', 'm3', 90.00, 5, 25),
]

for codigo, nome, cat, comp, unid, custo, est_min, qtd in materiais:
    p, criado = Produto.objects.get_or_create(
        codigo=codigo,
        defaults={
            'nome': nome,
            'categoria': cat,
            'composicao_quimica': comp if comp else None,
            'unidade': unid,
            'custo_unitario': Decimal(str(custo)),
            'estoque_minimo': Decimal(str(est_min)),
            'quantidade_estoque': Decimal(str(qtd)),
            'local_armazenamento': local_pat,
            'criado_por': user,
        }
    )
    if criado:
        produtos_criados.append(p)
        print(f'  ✓ {codigo} - {nome} ({qtd} {unid})')

# 4. POSTO - Combustíveis
print('\n📦 POSTO DE COMBUSTÍVEL...')
local_pos = locais.get('Posto de Combustível')

combustiveis = [
    ('COMB-001', 'Diesel S10', 'combustiveis_lubrificantes', 'litros', 6.00, 500, 5000),
    ('COMB-002', 'Óleo Lubrificante 15W40', 'combustiveis_lubrificantes', 'litros', 35.00, 50, 200),
    ('COMB-003', 'Graxa Multiuso', 'combustiveis_lubrificantes', 'kg', 25.00, 20, 80),
    ('COMB-004', 'Óleo Hidráulico', 'combustiveis_lubrificantes', 'litros', 42.00, 30, 150),
]

for codigo, nome, cat, unid, custo, est_min, qtd in combustiveis:
    p, criado = Produto.objects.get_or_create(
        codigo=codigo,
        defaults={
            'nome': nome,
            'categoria': cat,
            'unidade': unid,
            'custo_unitario': Decimal(str(custo)),
            'estoque_minimo': Decimal(str(est_min)),
            'quantidade_estoque': Decimal(str(qtd)),
            'local_armazenamento': local_pos,
            'criado_por': user,
        }
    )
    if criado:
        produtos_criados.append(p)
        print(f'  ✓ {codigo} - {nome} ({qtd} {unid})')

# 5. SILO e ARMAZÉM - Grãos
print('\n📦 SILO BOLSA e ARMAZÉM (Grãos)...')
local_silo = locais.get('Silo Bolsa')
local_armz = locais.get('Armazem Geral')

graos = [
    ('SEME-001', 'Semente de Soja Intacta', 'semente', 'kg', 15.00, 500, 2000, local_silo),
    ('SEME-002', 'Semente de Milho Híbrido', 'semente', 'kg', 18.00, 400, 1500, local_silo),
    ('GRAO-001', 'Soja em Grão', 'outro', 'kg', 1.20, 10000, 50000, local_armz),
    ('GRAO-002', 'Milho em Grão', 'outro', 'kg', 0.80, 8000, 35000, local_armz),
]

for codigo, nome, cat, unid, custo, est_min, qtd, local in graos:
    p, criado = Produto.objects.get_or_create(
        codigo=codigo,
        defaults={
            'nome': nome,
            'categoria': cat,
            'unidade': unid,
            'custo_unitario': Decimal(str(custo)),
            'estoque_minimo': Decimal(str(est_min)),
            'quantidade_estoque': Decimal(str(qtd)),
            'local_armazenamento': local,
            'criado_por': user,
        }
    )
    if criado:
        produtos_criados.append(p)
        print(f'  ✓ {codigo} - {nome} ({qtd} {unid})')

# RESUMO
print('\n' + '='*60)
print('✅ POPULAÇÃO COMPLETA')
print('='*60)
print(f'\n📊 Produtos criados: {len(produtos_criados)}')
print(f'📊 Total no sistema: {Produto.objects.count()}')

print('\n📦 Produtos por categoria:')
for cat, label in Produto.CATEGORIA_CHOICES:
    count = Produto.objects.filter(categoria=cat).count()
    if count > 0:
        print(f'  • {label}: {count}')

print('\n📍 Produtos por local:')
for nome, local in locais.items():
    count = Produto.objects.filter(local_armazenamento=local).count()
    if count > 0:
        print(f'  • {nome}: {count} produtos')

print('\n✅ Sistema populado! Teste os vínculos com estoque.\n')
