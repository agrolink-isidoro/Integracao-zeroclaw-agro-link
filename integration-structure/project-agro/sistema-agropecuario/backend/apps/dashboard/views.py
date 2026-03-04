"""
Dashboard KPI views — centralised aggregation endpoints.

Each view returns JSON with:
  { "kpis": { ... }, "last_updated": "<iso>" }

No dedicated models are needed; all data is aggregated on-the-fly from
the domain apps (financeiro, estoque, comercial, administrativo, agricultura, fazendas).
"""

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Q, F, Value, Case, When, DecimalField
from django.db.models.functions import Coalesce, TruncDay, TruncMonth
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _now_iso():
    return timezone.now().isoformat()


def _get_tenant(request):
    """Return the active tenant for the current request (or None for global superusers)."""
    tenant = getattr(request, "tenant", None)
    if tenant is None:
        user = getattr(request, "user", None)
        if user and not user.is_superuser:
            tenant = getattr(user, "tenant", None)
    return tenant


def _tf(request):
    """Return a dict suitable for queryset .filter(**_tf(request)) to scope by tenant.

    Returns {'tenant': <tenant>} for normal users, {} for global superusers
    (so superusers see all data when no tenant is selected).
    """
    tenant = _get_tenant(request)
    return {"tenant": tenant} if tenant is not None else {}


# ---------------------------------------------------------------------------
# GET /api/dashboard/resumo/  — Main dashboard summary (replaces hardcoded)
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resumo_view(request):
    """Summary KPIs for the main Dashboard page."""
    from apps.fazendas.models import Talhao, Area, Fazenda
    from apps.financeiro.models import LancamentoFinanceiro, Vencimento
    from apps.estoque.models import Produto
    from apps.maquinas.models import Equipamento

    today = date.today()
    month_start = today.replace(day=1)
    tf = _tf(request)

    # Áreas cultivadas (sum of talhao.area_size)
    total_hectares = (
        Talhao.objects.filter(**tf).aggregate(total=Coalesce(Sum("area_size"), Decimal("0")))["total"]
    )

    # Receita mensal (entradas deste mês)
    receita_mes = (
        LancamentoFinanceiro.objects.filter(**tf, tipo="entrada", data__gte=month_start, data__lte=today)
        .aggregate(total=Coalesce(Sum("valor"), Decimal("0")))["total"]
    )

    # Despesas mensal (saídas deste mês)
    despesa_mes = (
        LancamentoFinanceiro.objects.filter(**tf, tipo="saida", data__gte=month_start, data__lte=today)
        .aggregate(total=Coalesce(Sum("valor"), Decimal("0")))["total"]
    )

    # Produtos em estoque (count distinct)
    produtos_count = Produto.objects.filter(**tf).count()
    produtos_abaixo_minimo = Produto.objects.filter(
        **tf, quantidade_estoque__lt=F("estoque_minimo")
    ).count()

    # Máquinas ativas
    try:
        maquinas_ativas = Equipamento.objects.filter(**tf, status="ativo").count()
        maquinas_total = Equipamento.objects.filter(**tf).count()
    except Exception:
        maquinas_ativas = 0
        maquinas_total = 0

    # Fazendas e áreas
    total_fazendas = Fazenda.objects.filter(**tf).count()
    total_areas = Area.objects.filter(**tf).count()

    # Vencimentos próximos (7 dias)
    vencimentos_proximos = Vencimento.objects.filter(
        **tf,
        status="pendente",
        data_vencimento__gte=today,
        data_vencimento__lte=today + timedelta(days=7),
    ).count()

    return Response(
        {
            "kpis": {
                "areas_cultivadas_ha": float(total_hectares),
                "receita_mes": float(receita_mes),
                "despesa_mes": float(despesa_mes),
                "saldo_mes": float(receita_mes - despesa_mes),
                "produtos_estoque": produtos_count,
                "produtos_abaixo_minimo": produtos_abaixo_minimo,
                "maquinas_ativas": maquinas_ativas,
                "maquinas_total": maquinas_total,
                "total_fazendas": total_fazendas,
                "total_areas": total_areas,
                "vencimentos_proximos": vencimentos_proximos,
            },
            "last_updated": _now_iso(),
        }
    )


# ---------------------------------------------------------------------------
# GET /api/dashboard/financeiro/
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def financeiro_view(request):
    """Financial KPIs: caixa, vencimentos, transferências, fluxo de caixa."""
    from apps.financeiro.models import (
        LancamentoFinanceiro,
        Vencimento,
        Transferencia,
        ContaBancaria,
        Financiamento,
        Emprestimo,
    )

    today = date.today()
    period_days = int(request.query_params.get("period", 30))
    period_start = today - timedelta(days=period_days)
    month_start = today.replace(day=1)
    tf = _tf(request)

    # Caixa disponível (entradas - saídas no período)
    agg = LancamentoFinanceiro.objects.filter(
        **tf, data__gte=period_start, data__lte=today
    ).aggregate(
        entradas=Coalesce(Sum("valor", filter=Q(tipo="entrada")), Decimal("0")),
        saidas=Coalesce(Sum("valor", filter=Q(tipo="saida")), Decimal("0")),
    )
    caixa = agg["entradas"] - agg["saidas"]

    # Saldo total contas bancárias
    saldo_contas = ContaBancaria.objects.filter(**tf, ativo=True).aggregate(
        total=Coalesce(Sum("saldo_inicial"), Decimal("0"))
    )["total"]

    # Vencimentos próximos (7 dias)
    venc_proximos = Vencimento.objects.filter(
        **tf,
        status="pendente",
        data_vencimento__gte=today,
        data_vencimento__lte=today + timedelta(days=7),
    ).aggregate(
        count=Count("id"),
        total=Coalesce(Sum("valor"), Decimal("0")),
    )

    # Vencimentos atrasados
    venc_atrasados = Vencimento.objects.filter(
        **tf,
        status__in=["pendente", "atrasado"],
        data_vencimento__lt=today,
    ).aggregate(
        count=Count("id"),
        total=Coalesce(Sum("valor"), Decimal("0")),
    )

    # Transferências pendentes
    transf_pendentes = Transferencia.objects.filter(**tf, status="pending").aggregate(
        count=Count("id"),
        total=Coalesce(Sum("valor"), Decimal("0")),
    )

    # ── Financiamentos ativos ──
    fin_agg = Financiamento.objects.filter(**tf, status="ativo").aggregate(
        total_financiado=Coalesce(Sum("valor_financiado"), Decimal("0")),
        total_pendente=Coalesce(Sum("valor_total"), Decimal("0")),
        count_ativos=Count("id"),
    )

    # ── Empréstimos ativos ──
    emp_agg = Emprestimo.objects.filter(**tf, status="ativo").aggregate(
        total_emprestado=Coalesce(Sum("valor_emprestimo"), Decimal("0")),
        count_ativos=Count("id"),
    )

    # Fluxo de caixa por dia (últimos 30 dias)
    fluxo = (
        LancamentoFinanceiro.objects.filter(**tf, data__gte=period_start, data__lte=today)
        .annotate(dia=TruncDay("data"))
        .values("dia")
        .annotate(
            entradas=Coalesce(Sum("valor", filter=Q(tipo="entrada")), Decimal("0")),
            saidas=Coalesce(Sum("valor", filter=Q(tipo="saida")), Decimal("0")),
        )
        .order_by("dia")
    )

    fluxo_series = [
        {
            "date": item["dia"].isoformat(),
            "entradas": float(item["entradas"]),
            "saidas": float(item["saidas"]),
            "saldo": float(item["entradas"] - item["saidas"]),
        }
        for item in fluxo
    ]

    # Fluxo por mês (últimos 6 meses)
    six_months_ago = (today.replace(day=1) - timedelta(days=180)).replace(day=1)
    fluxo_mensal = (
        LancamentoFinanceiro.objects.filter(**tf, data__gte=six_months_ago, data__lte=today)
        .annotate(mes=TruncMonth("data"))
        .values("mes")
        .annotate(
            entradas=Coalesce(Sum("valor", filter=Q(tipo="entrada")), Decimal("0")),
            saidas=Coalesce(Sum("valor", filter=Q(tipo="saida")), Decimal("0")),
        )
        .order_by("mes")
    )

    fluxo_mensal_series = [
        {
            "date": item["mes"].isoformat(),
            "entradas": float(item["entradas"]),
            "saidas": float(item["saidas"]),
            "saldo": float(item["entradas"] - item["saidas"]),
        }
        for item in fluxo_mensal
    ]

    return Response(
        {
            "kpis": {
                "caixa_periodo": float(caixa),
                "saldo_contas": float(saldo_contas),
                "vencimentos_proximos": {
                    "count": venc_proximos["count"],
                    "total": float(venc_proximos["total"]),
                },
                "vencimentos_atrasados": {
                    "count": venc_atrasados["count"],
                    "total": float(venc_atrasados["total"]),
                },
                "transferencias_pendentes": {
                    "count": transf_pendentes["count"],
                    "total": float(transf_pendentes["total"]),
                },
                "financiamento_total": float(fin_agg["total_financiado"]),
                "emprestimos_total": float(emp_agg["total_emprestado"]),
            },
            "financiamentos": {
                "total_financiado": float(fin_agg["total_financiado"]),
                "total_pendente": float(fin_agg["total_pendente"]),
                "count_ativos": fin_agg["count_ativos"],
            },
            "emprestimos": {
                "total_emprestado": float(emp_agg["total_emprestado"]),
                "count_ativos": emp_agg["count_ativos"],
            },
            "fluxo_caixa_diario": fluxo_series,
            "fluxo_caixa_mensal": fluxo_mensal_series,
            "last_updated": _now_iso(),
        }
    )


# ---------------------------------------------------------------------------
# GET /api/dashboard/estoque/
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def estoque_view(request):
    """Inventory KPIs: valor total, abaixo do mínimo, movimentações recentes."""
    from apps.estoque.models import Produto, MovimentacaoEstoque

    today = date.today()
    week_ago = today - timedelta(days=7)
    tf = _tf(request)

    # Valor total em estoque (quantidade * custo_unitario)
    valor_total = Produto.objects.filter(**tf).aggregate(
        total=Coalesce(
            Sum(F("quantidade_estoque") * F("custo_unitario"), output_field=DecimalField()),
            Decimal("0"),
        )
    )["total"]

    # Itens abaixo do mínimo
    abaixo_minimo = Produto.objects.filter(
        **tf, quantidade_estoque__lt=F("estoque_minimo")
    )
    abaixo_minimo_list = list(
        abaixo_minimo.values("id", "nome", "codigo", "quantidade_estoque", "estoque_minimo", "unidade")[:20]
    )

    # Movimentações últimos 7 dias
    mov_7d = MovimentacaoEstoque.objects.filter(
        **tf, data_movimentacao__date__gte=week_ago
    ).aggregate(
        entradas=Count("id", filter=Q(tipo="entrada")),
        saidas=Count("id", filter=Q(tipo="saida")),
        total=Count("id"),
    )

    # Total de produtos
    total_produtos = Produto.objects.filter(**tf).count()

    return Response(
        {
            "kpis": {
                "valor_total_estoque": float(valor_total),
                "total_produtos": total_produtos,
                "abaixo_minimo_count": abaixo_minimo.count(),
                "abaixo_minimo_itens": abaixo_minimo_list,
                "movimentacoes_7d": {
                    "entradas": mov_7d["entradas"],
                    "saidas": mov_7d["saidas"],
                    "total": mov_7d["total"],
                },
            },
            "last_updated": _now_iso(),
        }
    )


# ---------------------------------------------------------------------------
# GET /api/dashboard/comercial/
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def comercial_view(request):
    """Commercial KPIs: fornecedores, vendas, contratos."""
    from apps.comercial.models import Fornecedor, Contrato, VendaColheita, Compra

    today = date.today()
    month_start = today.replace(day=1)
    tf = _tf(request)

    # Fornecedores ativos
    fornecedores_ativos = Fornecedor.objects.filter(**tf, status="ativo").count()
    fornecedores_total = Fornecedor.objects.filter(**tf).count()

    # Vendas do mês
    vendas_mes = VendaColheita.objects.filter(
        **tf, criado_em__date__gte=month_start
    ).aggregate(
        count=Count("id"),
        total=Coalesce(Sum("valor_total"), Decimal("0")),
    )

    # Compras do mês
    compras_mes = Compra.objects.filter(
        **tf, data__gte=month_start
    ).aggregate(
        count=Count("id"),
        total=Coalesce(Sum("valor_total"), Decimal("0")),
    )

    # Contratos vencendo nos próximos 30 dias
    contratos_vencendo = Contrato.objects.filter(
        **tf,
        data_fim__gte=today,
        data_fim__lte=today + timedelta(days=30),
    ).count()

    contratos_ativos = Contrato.objects.filter(
        **tf,
        data_inicio__lte=today,
        data_fim__gte=today,
    ).count()

    return Response(
        {
            "kpis": {
                "fornecedores_ativos": fornecedores_ativos,
                "fornecedores_total": fornecedores_total,
                "vendas_mes": {
                    "count": vendas_mes["count"],
                    "total": float(vendas_mes["total"]),
                },
                "compras_mes": {
                    "count": compras_mes["count"],
                    "total": float(compras_mes["total"]),
                },
                "contratos_vencendo_30d": contratos_vencendo,
                "contratos_ativos": contratos_ativos,
            },
            "last_updated": _now_iso(),
        }
    )


# ---------------------------------------------------------------------------
# GET /api/dashboard/administrativo/
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def administrativo_view(request):
    """Admin KPIs: folha pagamento, despesas administrativas."""
    from apps.administrativo.models import (
        FolhaPagamento,
        DespesaAdministrativa,
        Funcionario,
    )

    today = date.today()
    current_month = today.month
    current_year = today.year
    tf = _tf(request)

    # Folha do mês atual
    folha_mes = FolhaPagamento.objects.filter(
        **tf,
        periodo_mes=current_month,
        periodo_ano=current_year,
    ).aggregate(
        total=Coalesce(Sum("valor_total"), Decimal("0")),
        count=Count("id"),
    )

    # Despesas administrativas do mês
    month_start = today.replace(day=1)
    despesas_mes = DespesaAdministrativa.objects.filter(
        **tf, data__gte=month_start, data__lte=today
    ).aggregate(
        total=Coalesce(Sum("valor"), Decimal("0")),
        count=Count("id"),
    )

    # Funcionários
    funcionarios_total = Funcionario.objects.filter(**tf).count()
    funcionarios_ativos = Funcionario.objects.filter(**tf, ativo=True).count() if hasattr(Funcionario, 'ativo') else funcionarios_total

    return Response(
        {
            "kpis": {
                "folha_mes": {
                    "total": float(folha_mes["total"]),
                    "count": folha_mes["count"],
                },
                "despesas_administrativas_mes": {
                    "total": float(despesas_mes["total"]),
                    "count": despesas_mes["count"],
                },
                "funcionarios": {
                    "total": funcionarios_total,
                    "ativos": funcionarios_ativos,
                },
            },
            "last_updated": _now_iso(),
        }
    )


# ---------------------------------------------------------------------------
# GET /api/dashboard/agricultura/
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def agricultura_view(request):
    """Agriculture KPIs: produção, colheitas, plantios."""
    from apps.agricultura.models import Colheita, ColheitaItem, Plantio, HarvestSessionItem
    from apps.fazendas.models import Talhao

    today = date.today()
    current_year = today.year
    tf = _tf(request)

    # Plantios ativos
    plantios_ativos = Plantio.objects.filter(**tf, status="em_andamento").count()
    plantios_total = Plantio.objects.filter(
        **tf, data_plantio__year=current_year
    ).count()

    # Colheitas do ano (modelo legado)
    colheitas_ano = Colheita.objects.filter(
        **tf, data_colheita__year=current_year
    )

    # Produção real via colheitas legadas (is_estimada=False)
    producao_real_colheita = colheitas_ano.filter(is_estimada=False).aggregate(
        total_kg=Coalesce(Sum("quantidade_colhida"), Decimal("0"))
    )["total_kg"]

    producao_estimada = colheitas_ano.filter(is_estimada=True).aggregate(
        total_kg=Coalesce(Sum("quantidade_colhida"), Decimal("0"))
    )["total_kg"]

    # Produção via HarvestSessionItems (novo fluxo de sessão)
    producao_sessoes_kg = HarvestSessionItem.objects.filter(
        **tf,
        session__data_inicio__year=current_year,
        session__status__in=["em_andamento", "finalizada"],
    ).aggregate(
        total_kg=Coalesce(Sum("quantidade_colhida"), Decimal("0"))
    )["total_kg"]

    # Produção real consolidada: prefere sessões quando disponível
    producao_real = max(producao_real_colheita, producao_sessoes_kg)

    # Peso médio por talhão — inclui sessões além de ColheitaItem
    peso_por_talhao_sessoes = (
        HarvestSessionItem.objects.filter(**tf, session__data_inicio__year=current_year)
        .values("talhao__name", "talhao__id")
        .annotate(
            total_kg=Coalesce(Sum("quantidade_colhida"), Decimal("0")),
        )
        .order_by("-total_kg")[:10]
    )

    peso_talhao_list = [
        {
            "talhao_id": item["talhao__id"],
            "talhao_nome": item["talhao__name"],
            "total_kg": float(item["total_kg"]),
            "total_sacas_60kg": float(item["total_kg"] / 60),
        }
        for item in peso_por_talhao_sessoes
    ]

    # Fallback to ColheitaItem if sessions have no data
    if not peso_talhao_list:
        peso_por_talhao_colheita = (
            ColheitaItem.objects.filter(**tf, colheita__data_colheita__year=current_year)
            .values("talhao__name", "talhao__id")
            .annotate(
                total_kg=Coalesce(Sum("quantidade_colhida"), Decimal("0")),
            )
            .order_by("-total_kg")[:10]
        )
        peso_talhao_list = [
            {
                "talhao_id": item["talhao__id"],
                "talhao_nome": item["talhao__name"],
                "total_kg": float(item["total_kg"]),
                "total_sacas_60kg": float(item["total_kg"] / 60),
            }
            for item in peso_por_talhao_colheita
        ]

    return Response(
        {
            "kpis": {
                "plantios_ativos": plantios_ativos,
                "plantios_ano": plantios_total,
                "producao_real_kg": float(producao_real),
                "producao_real_sacas_60kg": float(producao_real / 60) if producao_real else 0,
                "producao_sessoes_kg": float(producao_sessoes_kg),
                "producao_estimada_kg": float(producao_estimada),
                "producao_estimada_sacas_60kg": float(producao_estimada / 60) if producao_estimada else 0,
                "colheitas_ano": colheitas_ano.count(),
            },
            "peso_por_talhao": peso_talhao_list,
            "last_updated": _now_iso(),
        }
    )
