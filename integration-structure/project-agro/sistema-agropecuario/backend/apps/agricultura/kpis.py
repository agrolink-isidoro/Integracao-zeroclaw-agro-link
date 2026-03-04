"""
Serviço de KPIs agregados por Safra (Plantio).

Calcula custos, produtividade, margem e breakdown por categoria
a partir de RateioCusto, RateioTalhao, Colheita, Vencimento e CentroCusto.
"""
from decimal import Decimal, ROUND_HALF_UP
from django.contrib.contenttypes.models import ContentType
from django.db.models import Sum, Q, Count
from django.utils import timezone
from django.core.cache import cache


CACHE_TTL = 600  # 10 min
CACHE_VERSION = 2  # bump to invalidate old entries


def _cache_key(plantio_id: int) -> str:
    return f'safra_kpis_v{CACHE_VERSION}_{plantio_id}'


def invalidate_safra_kpis_cache(plantio_id: int | None):
    """Invalida o cache de KPIs de uma safra. Se plantio_id for None, ignora."""
    if plantio_id:
        cache.delete(_cache_key(plantio_id))


def calcular_safra_kpis(plantio) -> dict:
    """Calcula todos os KPIs para um Plantio (safra) e retorna dict serializável."""

    from apps.financeiro.models import RateioCusto, RateioTalhao, Vencimento

    plantio_id = plantio.id

    # ---- Área ----
    area_ha = Decimal(str(plantio.area_total_ha or 0))

    # ---- Custos via rateios vinculados à safra ----
    rateios = RateioCusto.objects.filter(safra_id=plantio_id)
    custo_total = rateios.aggregate(total=Sum('valor_total'))['total'] or Decimal('0')

    # ---- Custos via Operações concluídas vinculadas ao plantio ----
    from apps.agricultura.models import Operacao
    ops_agg = Operacao.objects.filter(plantio_id=plantio_id).aggregate(
        mao_obra=Sum('custo_mao_obra'),
        maquina=Sum('custo_maquina'),
        insumos=Sum('custo_insumos'),
        total=Sum('custo_total'),
    )
    ops_custo_total = ops_agg['total'] or Decimal('0')
    ops_custo_mao_obra = ops_agg['mao_obra'] or Decimal('0')
    ops_custo_maquina = ops_agg['maquina'] or Decimal('0')
    ops_custo_insumos = ops_agg['insumos'] or Decimal('0')
    custo_total += ops_custo_total

    # ---- Produção (colheitas antigas) ----
    producao_colheita_kg = plantio.colheitas.aggregate(total=Sum('quantidade_colhida'))['total'] or Decimal('0')

    # ---- Produção (HarvestSessionItems vinculados a este plantio) ----
    from apps.agricultura.models import HarvestSessionItem, MovimentacaoCarga
    producao_session_kg = HarvestSessionItem.objects.filter(
        session__plantio_id=plantio_id
    ).aggregate(total=Sum('quantidade_colhida'))['total'] or Decimal('0')

    # Usar o maior valor disponível: sessões (mais preciso quando preenchido); fallback para colheitas legadas
    producao_kg = producao_session_kg if producao_session_kg else producao_colheita_kg
    producao_t = producao_kg / Decimal('1000')  # kg → toneladas

    # ---- Unidade de produção a partir da cultura ----
    unidade_producao = getattr(getattr(plantio, 'cultura', None), 'unidade_producao', 'tonelada') or 'tonelada'
    SACA_KG = Decimal('60')
    if unidade_producao == 'saca_60kg':
        producao_display = (producao_kg / SACA_KG).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
        unidade_label = 'sc'
    elif unidade_producao == 'kg':
        producao_display = producao_kg.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
        unidade_label = 'kg'
    elif unidade_producao == 'caixa':
        producao_display = producao_kg.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
        unidade_label = 'cx'
    else:  # tonelada (default)
        producao_display = producao_t.quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
        unidade_label = 't'

    producao_sacas = (producao_kg / SACA_KG).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)  # sempre disponível

    # ---- Produtividade ----
    produtividade_t_ha = (producao_t / area_ha).quantize(Decimal('0.001'), rounding=ROUND_HALF_UP) if area_ha else Decimal('0')
    if unidade_producao == 'saca_60kg':
        produtividade_display = (producao_display / area_ha).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP) if area_ha else Decimal('0')
    else:
        produtividade_display = produtividade_t_ha

    # ---- Custo / ha e Custo / ton ----
    custo_por_ha = (custo_total / area_ha).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP) if area_ha else Decimal('0')
    custo_por_ton = (custo_total / producao_t).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP) if producao_t else Decimal('0')

    # ---- Receita (vendas de colheita vinculadas ao plantio) ----
    # VendaColheita não tem FK direta para Plantio; usamos colheitas → carga_comercial → vendas
    # Para v1, receita = 0 (será incrementada quando vendas forem vinculadas)
    receita_total = Decimal('0')
    preco_medio_r_ton = Decimal('0')

    # Tenta buscar vendas via colheitas que têm carga_comercial
    try:
        from apps.comercial.models import VendaColheita
        colheita_ids = list(plantio.colheitas.values_list('id', flat=True))
        if colheita_ids:
            # VendaColheita usa origem_tipo='carga_viagem' com GenericFK
            # Por ora, somamos as vendas cujo CargaViagem está vinculado a colheitas deste plantio
            carga_ids = list(
                plantio.colheitas
                .exclude(carga_comercial__isnull=True)
                .values_list('carga_comercial_id', flat=True)
            )
            if carga_ids:
                vendas_agg = VendaColheita.objects.filter(
                    origem_tipo='carga_viagem',
                    origem_id__in=carga_ids
                ).aggregate(
                    receita=Sum('valor_total'),
                    toneladas=Sum('quantidade')
                )
                receita_total = vendas_agg['receita'] or Decimal('0')
                tons_vendidas = (vendas_agg['toneladas'] or Decimal('0')) / Decimal('1000')
                if tons_vendidas:
                    preco_medio_r_ton = (receita_total / tons_vendidas).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    except Exception:
        pass  # Sem vendas vinculadas

    # ---- Margem Bruta ----
    margem_bruta_pct = Decimal('0')
    if receita_total:
        margem_bruta_pct = ((receita_total - custo_total) / receita_total * 100).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)

    # ---- Vencimentos pendentes vinculados via rateios desta safra ----
    rateio_ids = list(rateios.values_list('id', flat=True))
    vencimentos_pendentes = Decimal('0')
    if rateio_ids:
        ct = ContentType.objects.get_for_model(RateioCusto)
        vencimentos_pendentes = Vencimento.objects.filter(
            content_type=ct,
            object_id__in=rateio_ids,
            status='pendente'
        ).aggregate(total=Sum('valor'))['total'] or Decimal('0')

    # ---- Rateios pendentes (count) ----
    rateios_pendentes = rateios.filter(approval__status='pending').count()

    # ---- Breakdown por categoria (centro_custo.categoria) ----
    # Para rateios sem centro_custo, usa o campo 'destino' como fallback de label.
    DESTINO_LABEL = {
        'manutencao': 'Manutenção',
        'combustivel': 'Combustível',
        'operacional': 'Operacional',
        'despesa_adm': 'Despesa Administrativa',
        'investimento': 'Investimento',
        'benfeitoria': 'Benfeitoria',
        'financeiro': 'Financeiro',
    }
    costs_by_category = []
    cat_agg = (
        rateios
        .values('centro_custo__categoria', 'destino')
        .annotate(total=Sum('valor_total'))
        .order_by('-total')
    )
    for row in cat_agg:
        if row['centro_custo__categoria']:
            cat_name = row['centro_custo__categoria'].capitalize()
        else:
            cat_name = DESTINO_LABEL.get(row['destino'], 'Outros')
        cat_total = row['total'] or Decimal('0')
        cat_per_ha = (cat_total / area_ha).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP) if area_ha else Decimal('0')
        # Merge entradas com mesmo nome (ex.: dois destinos apontando para a mesma label)
        existing = next((c for c in costs_by_category if c['category'].lower() == cat_name.lower()), None)
        if existing:
            existing['total'] = round(existing['total'] + float(cat_total), 2)
            existing['per_ha'] = round(existing['total'] / float(area_ha), 2) if area_ha else 0
        else:
            costs_by_category.append({
                'category': cat_name,
                'total': float(cat_total),
                'per_ha': float(cat_per_ha),
            })

    # Also add plantio's own cost fields (custo_mao_obra, custo_maquinas, custo_insumos) that may not be in rateios
    plantio_fields = [
        ('Mão de obra', plantio.custo_mao_obra),
        ('Máquinas', plantio.custo_maquinas),
        ('Insumos', plantio.custo_insumos),
        ('Outros', plantio.custo_outros),
    ]
    existing_categories = {c['category'].lower() for c in costs_by_category}
    for label, val in plantio_fields:
        if val and val > 0 and label.lower() not in existing_categories:
            per_ha = float((val / area_ha).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)) if area_ha else 0
            costs_by_category.append({
                'category': label,
                'total': float(val),
                'per_ha': per_ha,
            })
            custo_total += val

    # ---- Add Operacao cost breakdown (deduplicating with existing categories) ----
    ops_breakdown = [
        ('Mão de obra', ops_custo_mao_obra),
        ('Máquinas', ops_custo_maquina),
        ('Insumos', ops_custo_insumos),
    ]
    existing_categories = {c['category'].lower() for c in costs_by_category}
    for label, val in ops_breakdown:
        if val and val > 0:
            per_ha = float((val / area_ha).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)) if area_ha else 0
            if label.lower() in existing_categories:
                # Merge into the existing entry
                for cat in costs_by_category:
                    if cat['category'].lower() == label.lower():
                        cat['total'] = round(cat['total'] + float(val), 2)
                        cat['per_ha'] = round(cat['total'] / float(area_ha), 2) if area_ha else 0
                        break
            else:
                costs_by_category.append({
                    'category': label,
                    'total': float(val),
                    'per_ha': per_ha,
                })
                existing_categories.add(label.lower())

    # ---- Custo de Transporte (MovimentacaoCarga vinculadas ao plantio via sessão) ----
    transport_agg = MovimentacaoCarga.objects.filter(
        session_item__session__plantio_id=plantio_id
    ).aggregate(
        custo=Sum('custo_transporte'),
        count=Count('id'),
    )
    custo_transporte_total = Decimal(str(transport_agg['custo'] or 0))
    carregamentos_count = transport_agg['count'] or 0

    if custo_transporte_total:
        # Adicionar à categoria de custo e ao custo_total apenas se não já coberto via rateios
        existing_transport = next((c for c in costs_by_category if c['category'].lower() == 'transporte'), None)
        transport_per_ha = float((custo_transporte_total / area_ha).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)) if area_ha else 0
        if existing_transport:
            existing_transport['total'] = round(existing_transport['total'] + float(custo_transporte_total), 2)
            existing_transport['per_ha'] = round(existing_transport['total'] / float(area_ha), 2) if area_ha else 0
        else:
            costs_by_category.append({
                'category': 'Transporte',
                'total': float(custo_transporte_total),
                'per_ha': transport_per_ha,
            })
        # Only add to custo_total if not already counted via a linked RateioCusto
        has_transport_rateio = rateios.filter(
            origem_content_type__app_label='agricultura',
            origem_content_type__model='movimentacaocarga',
        ).exists()
        if not has_transport_rateio:
            custo_total += custo_transporte_total

    # Recalculate per-unit metrics with updated custo_total
    if custo_total:
        custo_por_ha = (custo_total / area_ha).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP) if area_ha else Decimal('0')
        custo_por_ton = (custo_total / producao_t).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP) if producao_t else Decimal('0')

    result = {
        'safra_id': plantio_id,
        'area_ha': float(area_ha),
        'producao_t': float(producao_t.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
        'producao_sacas': float(producao_sacas),
        'producao_display': float(producao_display),
        'unidade_producao': unidade_producao,
        'unidade_label': unidade_label,
        'produtividade_t_ha': float(produtividade_t_ha),
        'produtividade_display': float(produtividade_display),
        'custo_total': float(custo_total),
        'custo_por_ha': float(custo_por_ha),
        'custo_por_ton': float(custo_por_ton),
        'receita_total': float(receita_total),
        'preco_medio_r_ton': float(preco_medio_r_ton),
        'margem_bruta_pct': float(margem_bruta_pct),
        'vencimentos_pendentes': float(vencimentos_pendentes),
        'rateios_pendentes': rateios_pendentes,
        'costs_by_category': costs_by_category,
        # Dados de colheita / sessões
        'producao_colheita_kg': float(producao_colheita_kg),
        'producao_session_kg': float(producao_session_kg),
        'custo_transporte_total': float(custo_transporte_total),
        'carregamentos_count': carregamentos_count,
        'updated_at': timezone.now().isoformat(),
    }

    # Cache the result
    cache.set(_cache_key(plantio_id), result, CACHE_TTL)

    return result


def get_safra_kpis(plantio) -> dict:
    """Retorna KPIs da safra, usando cache quando disponível."""
    cached = cache.get(_cache_key(plantio.id))
    if cached:
        return cached
    return calcular_safra_kpis(plantio)
