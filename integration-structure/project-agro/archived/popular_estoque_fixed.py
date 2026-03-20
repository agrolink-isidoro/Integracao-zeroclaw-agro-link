from backend.apps.estoque.models import LocalArmazenamento, Produto, Lote, MovimentacaoEstoque
from django.contrib.auth import get_user_model
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

User = get_user_model()
user = User.objects.first()

print('='*80)
print('POPULANDO ESTOQUE COM PRODUTOS')
print('='*80)

# Verificar locais existentes
locais = {local.nome: local for local in LocalArmazenamento.objects.all()}
print(f'\n✓ Encontrados {len(locais)} locais de armazenamento')

produtos_criados = []

# ===========================
# 1. ALMOXERIFADO - Produtos Químicos
# ===========================
print('\n📦 Criando produtos para ALMOXERIFADO (Produtos Químicos)...')
local_almoxarifado = locais.get('Almoxerifado')

produtos_quimicos = [
    {
        'codigo': 'HERB-001',
        'nome': 'Glifosato 480g/L',
        'categoria': 'herbicida',
        'principio_ativo': 'Glifosato',
        'unidade_medida': 'litros',
        'preco_unitario': Decimal('35.00'),
        'estoque_minimo': Decimal('50.0'),
        'quantidade_inicial': Decimal('200.0'),
    },
    {
        'codigo': 'HERB-002',
        'nome': 'Atrazina 500 SC',
        'categoria': 'herbicida',
        'principio_ativo': 'Atrazina',
        'unidade_medida': 'litros',
        'preco_unitario': Decimal('28.00'),
        'estoque_minimo': Decimal('40.0'),
        'quantidade_inicial': Decimal('150.0'),
    },
    {
        'codigo': 'FUNG-001',
        'nome': 'Tebuconazol 200 EC',
        'categoria': 'fungicida',
        'principio_ativo': 'Tebuconazol',
        'unidade_medida': 'litros',
        'preco_unitario': Decimal('65.00'),
        'estoque_minimo': Decimal('30.0'),
        'quantidade_inicial': Decimal('80.0'),
    },
    {
        'codigo': 'INSE-001',
        'nome': 'Lambda-Cialotrina 50g/L',
        'categoria': 'inseticida',
        'principio_ativo': 'Lambda-Cialotrina',
        'unidade_medida': 'litros',
        'preco_unitario': Decimal('45.00'),
        'estoque_minimo': Decimal('25.0'),
        'quantidade_inicial': Decimal('100.0'),
    },
    {
        'codigo': 'ADJ-001',
        'nome': 'Adjuvante Óleo Mineral',
        'categoria': 'adjuvante',
        'principio_ativo': 'Óleo Mineral',
        'unidade_medida': 'litros',
        'preco_unitario': Decimal('18.00'),
        'estoque_minimo': Decimal('50.0'),
        'quantidade_inicial': Decimal('300.0'),
    },
]

for p in produtos_quimicos:
    qtd_inicial = p.pop('quantidade_inicial')
    produto, criado = Produto.objects.get_or_create(
        codigo=p['codigo'],
        defaults={
            **p,
            'quantidade_estoque': qtd_inicial,
            'criado_por': user,
        }
    )
    if criado:
        produtos_criados.append(produto)
        print(f'  ✓ {produto.codigo} - {produto.nome} ({qtd_inicial} {produto.unidade_medida})')
        
        # Criar lote e movimentação inicial
        if local_almoxarifado:
            lote = Lote.objects.create(
                produto=produto,
                numero_lote=f'LOTE-{produto.codigo}-001',
                data_fabricacao=timezone.now().date() - timedelta(days=60),
                data_validade=timezone.now().date() + timedelta(days=730),
                quantidade=qtd_inicial,
                preco_unitario=produto.preco_unitario,
                local_armazenamento=local_almoxarifado,
            )
            MovimentacaoEstoque.objects.create(
                lote=lote,
                tipo='entrada',
                quantidade=qtd_inicial,
                local_origem=local_almoxarifado,
                motivo='Estoque inicial',
                criado_por=user,
            )

# ===========================
# 2. BARRACÃO - Adubos e Fertilizantes
# ===========================
print('\n📦 Criando produtos para BARRACÃO (Adubos e Fertilizantes)...')
local_barracao = locais.get('Barracão')

adubos = [
    {
        'codigo': 'FERT-001',
        'nome': 'NPK 04-14-08',
        'categoria': 'fertilizante',
        'composicao_quimica': 'N: 4%, P2O5: 14%, K2O: 8%',
        'unidade_medida': 'kg',
        'preco_unitario': Decimal('2.50'),
        'estoque_minimo': Decimal('1000.0'),
        'quantidade_inicial': Decimal('5000.0'),
    },
    {
        'codigo': 'FERT-002',
        'nome': 'Ureia 45% N',
        'categoria': 'fertilizante',
        'composicao_quimica': 'N: 45%',
        'unidade_medida': 'kg',
        'preco_unitario': Decimal('2.80'),
        'estoque_minimo': Decimal('1000.0'),
        'quantidade_inicial': Decimal('8000.0'),
    },
    {
        'codigo': 'FERT-003',
        'nome': 'MAP (Mono-Amônio-Fosfato)',
        'categoria': 'fertilizante',
        'composicao_quimica': 'N: 11%, P2O5: 52%',
        'unidade_medida': 'kg',
        'preco_unitario': Decimal('3.20'),
        'estoque_minimo': Decimal('800.0'),
        'quantidade_inicial': Decimal('4000.0'),
    },
    {
        'codigo': 'FERT-004',
        'nome': 'Cloreto de Potássio (KCl)',
        'categoria': 'fertilizante',
        'composicao_quimica': 'K2O: 60%',
        'unidade_medida': 'kg',
        'preco_unitario': Decimal('2.90'),
        'estoque_minimo': Decimal('800.0'),
        'quantidade_inicial': Decimal('3500.0'),
    },
]

for p in adubos:
    qtd_inicial = p.pop('quantidade_inicial')
    produto, criado = Produto.objects.get_or_create(
        codigo=p['codigo'],
        defaults={
            **p,
            'quantidade_estoque': qtd_inicial,
            'criado_por': user,
        }
    )
    if criado:
        produtos_criados.append(produto)
        print(f'  ✓ {produto.codigo} - {produto.nome} ({qtd_inicial} {produto.unidade_medida})')
        
        if local_barracao:
            lote = Lote.objects.create(
                produto=produto,
                numero_lote=f'LOTE-{produto.codigo}-001',
                data_fabricacao=timezone.now().date() - timedelta(days=90),
                data_validade=timezone.now().date() + timedelta(days=1095),
                quantidade=qtd_inicial,
                preco_unitario=produto.preco_unitario,
                local_armazenamento=local_barracao,
            )
            MovimentacaoEstoque.objects.create(
                lote=lote,
                tipo='entrada',
                quantidade=qtd_inicial,
                local_origem=local_barracao,
                motivo='Estoque inicial',
                criado_por=user,
            )

# ===========================
# 3. PÁTIO - Materiais de Construção e Correção
# ===========================
print('\n📦 Criando produtos para PÁTIO (Materiais de Construção)...')
local_patio = locais.get('Pátio')

materiais_construcao = [
    {
        'codigo': 'CORR-001',
        'nome': 'Calcário Dolomítico',
        'categoria': 'correcao_solo',
        'composicao_quimica': 'CaO: 30%, MgO: 12%',
        'unidade_medida': 'ton',
        'preco_unitario': Decimal('85.00'),
        'estoque_minimo': Decimal('10.0'),
        'quantidade_inicial': Decimal('50.0'),
    },
    {
        'codigo': 'CORR-002',
        'nome': 'Gesso Agrícola',
        'categoria': 'correcao_solo',
        'composicao_quimica': 'CaSO4·2H2O',
        'unidade_medida': 'ton',
        'preco_unitario': Decimal('120.00'),
        'estoque_minimo': Decimal('5.0'),
        'quantidade_inicial': Decimal('25.0'),
    },
    {
        'codigo': 'CONS-001',
        'nome': 'Areia Média',
        'categoria': 'construcao',
        'unidade_medida': 'm3',
        'preco_unitario': Decimal('80.00'),
        'estoque_minimo': Decimal('5.0'),
        'quantidade_inicial': Decimal('30.0'),
    },
    {
        'codigo': 'CONS-002',
        'nome': 'Brita Graduada',
        'categoria': 'construcao',
        'unidade_medida': 'm3',
        'preco_unitario': Decimal('90.00'),
        'estoque_minimo': Decimal('5.0'),
        'quantidade_inicial': Decimal('25.0'),
    },
]

for p in materiais_construcao:
    qtd_inicial = p.pop('quantidade_inicial')
    produto, criado = Produto.objects.get_or_create(
        codigo=p['codigo'],
        defaults={
            **p,
            'quantidade_estoque': qtd_inicial,
            'criado_por': user,
        }
    )
    if criado:
        produtos_criados.append(produto)
        print(f'  ✓ {produto.codigo} - {produto.nome} ({qtd_inicial} {produto.unidade_medida})')
        
        if local_patio:
            lote = Lote.objects.create(
                produto=produto,
                numero_lote=f'LOTE-{produto.codigo}-001',
                data_fabricacao=timezone.now().date() - timedelta(days=30),
                data_validade=timezone.now().date() + timedelta(days=1825),
                quantidade=qtd_inicial,
                preco_unitario=produto.preco_unitario,
                local_armazenamento=local_patio,
            )
            MovimentacaoEstoque.objects.create(
                lote=lote,
                tipo='entrada',
                quantidade=qtd_inicial,
                local_origem=local_patio,
                motivo='Estoque inicial',
                criado_por=user,
            )

# ===========================
# 4. POSTO DE COMBUSTÍVEL - Combustíveis e Lubrificantes
# ===========================
print('\n📦 Criando produtos para POSTO DE COMBUSTÍVEL...')
local_posto = locais.get('Posto de Combustível')

combustiveis = [
    {
        'codigo': 'COMB-001',
        'nome': 'Diesel S10',
        'categoria': 'combustiveis_lubrificantes',
        'unidade_medida': 'litros',
        'preco_unitario': Decimal('6.00'),
        'estoque_minimo': Decimal('500.0'),
        'quantidade_inicial': Decimal('5000.0'),
    },
    {
        'codigo': 'COMB-002',
        'nome': 'Óleo Lubrificante 15W40',
        'categoria': 'combustiveis_lubrificantes',
        'unidade_medida': 'litros',
        'preco_unitario': Decimal('35.00'),
        'estoque_minimo': Decimal('50.0'),
        'quantidade_inicial': Decimal('200.0'),
    },
    {
        'codigo': 'COMB-003',
        'nome': 'Graxa Multiuso',
        'categoria': 'combustiveis_lubrificantes',
        'unidade_medida': 'kg',
        'preco_unitario': Decimal('25.00'),
        'estoque_minimo': Decimal('20.0'),
        'quantidade_inicial': Decimal('80.0'),
    },
    {
        'codigo': 'COMB-004',
        'nome': 'Óleo Hidráulico',
        'categoria': 'combustiveis_lubrificantes',
        'unidade_medida': 'litros',
        'preco_unitario': Decimal('42.00'),
        'estoque_minimo': Decimal('30.0'),
        'quantidade_inicial': Decimal('150.0'),
    },
]

for p in combustiveis:
    qtd_inicial = p.pop('quantidade_inicial')
    produto, criado = Produto.objects.get_or_create(
        codigo=p['codigo'],
        defaults={
            **p,
            'quantidade_estoque': qtd_inicial,
            'criado_por': user,
        }
    )
    if criado:
        produtos_criados.append(produto)
        print(f'  ✓ {produto.codigo} - {produto.nome} ({qtd_inicial} {produto.unidade_medida})')
        
        if local_posto:
            lote = Lote.objects.create(
                produto=produto,
                numero_lote=f'LOTE-{produto.codigo}-001',
                data_fabricacao=timezone.now().date() - timedelta(days=15),
                data_validade=timezone.now().date() + timedelta(days=365),
                quantidade=qtd_inicial,
                preco_unitario=produto.preco_unitario,
                local_armazenamento=local_posto,
            )
            MovimentacaoEstoque.objects.create(
                lote=lote,
                tipo='entrada',
                quantidade=qtd_inicial,
                local_origem=local_posto,
                motivo='Estoque inicial',
                criado_por=user,
            )

# ===========================
# 5. SILO BOLSA e ARMAZÉM GERAL - Grãos
# ===========================
print('\n📦 Criando produtos para SILO BOLSA e ARMAZÉM (Grãos)...')
local_silo = locais.get('Silo Bolsa')
local_armazem = locais.get('Armazem Geral')

graos = [
    {
        'codigo': 'SEME-001',
        'nome': 'Semente de Soja Intacta',
        'categoria': 'semente',
        'unidade_medida': 'kg',
        'preco_unitario': Decimal('15.00'),
        'estoque_minimo': Decimal('500.0'),
        'quantidade_inicial': Decimal('2000.0'),
        'local': local_silo,
    },
    {
        'codigo': 'SEME-002',
        'nome': 'Semente de Milho Híbrido',
        'categoria': 'semente',
        'unidade_medida': 'kg',
        'preco_unitario': Decimal('18.00'),
        'estoque_minimo': Decimal('400.0'),
        'quantidade_inicial': Decimal('1500.0'),
        'local': local_silo,
    },
    {
        'codigo': 'GRAO-001',
        'nome': 'Soja em Grão',
        'categoria': 'outro',
        'descricao': 'Soja colhida para comercialização',
        'unidade_medida': 'kg',
        'preco_unitario': Decimal('1.20'),
        'estoque_minimo': Decimal('10000.0'),
        'quantidade_inicial': Decimal('50000.0'),
        'local': local_armazem,
    },
    {
        'codigo': 'GRAO-002',
        'nome': 'Milho em Grão',
        'categoria': 'outro',
        'descricao': 'Milho colhido para comercialização',
        'unidade_medida': 'kg',
        'preco_unitario': Decimal('0.80'),
        'estoque_minimo': Decimal('8000.0'),
        'quantidade_inicial': Decimal('35000.0'),
        'local': local_armazem,
    },
]

for p in graos:
    qtd_inicial = p.pop('quantidade_inicial')
    local_produto = p.pop('local')
    produto, criado = Produto.objects.get_or_create(
        codigo=p['codigo'],
        defaults={
            **p,
            'quantidade_estoque': qtd_inicial,
            'criado_por': user,
        }
    )
    if criado:
        produtos_criados.append(produto)
        print(f'  ✓ {produto.codigo} - {produto.nome} ({qtd_inicial} {produto.unidade_medida})')
        
        if local_produto:
            lote = Lote.objects.create(
                produto=produto,
                numero_lote=f'LOTE-{produto.codigo}-001',
                data_fabricacao=timezone.now().date() - timedelta(days=45),
                data_validade=timezone.now().date() + timedelta(days=545),
                quantidade=qtd_inicial,
                preco_unitario=produto.preco_unitario,
                local_armazenamento=local_produto,
            )
            MovimentacaoEstoque.objects.create(
                lote=lote,
                tipo='entrada',
                quantidade=qtd_inicial,
                local_origem=local_produto,
                motivo='Estoque inicial',
                criado_por=user,
            )

# ===========================
# RESUMO
# ===========================
print('\n' + '='*80)
print('✅ POPULAÇÃO COMPLETA')
print('='*80)
print(f'\n📊 Total de produtos criados: {len(produtos_criados)}')
print(f'📊 Total de produtos no sistema: {Produto.objects.count()}')
print(f'📦 Total de lotes criados: {Lote.objects.count()}')
print(f'📋 Total de movimentações: {MovimentacaoEstoque.objects.count()}')

print('\n📦 Produtos por categoria:')
for categoria, label in Produto.CATEGORIA_CHOICES:
    count = Produto.objects.filter(categoria=categoria).count()
    if count > 0:
        print(f'  • {label}: {count} produtos')

print('\n📍 Produtos por local de armazenamento:')
for nome, local in locais.items():
    lotes_count = Lote.objects.filter(local_armazenamento=local).count()
    if lotes_count > 0:
        print(f'  • {nome}: {lotes_count} lotes')

print('\n✅ Sistema populado com sucesso!')
print('Você pode agora testar os vínculos com o módulo de estoque.\n')
