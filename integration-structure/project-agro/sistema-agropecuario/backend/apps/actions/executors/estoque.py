"""
Executors para o módulo Estoque.

Converte Actions aprovados em movimentações de estoque reais.
  entrada_estoque → Produto + MovimentacaoEstoque tipo 'entrada'
  saida_estoque   → MovimentacaoEstoque tipo 'saida'
"""
from __future__ import annotations

import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Q

logger = logging.getLogger(__name__)


def _parse_decimal(value, default: str = "0") -> Decimal:
    if value is None:
        return Decimal(default)
    try:
        cleaned = str(value).strip().replace("R$", "").replace(" ", "")
        if "," in cleaned and "." in cleaned:
            cleaned = cleaned.replace(".", "").replace(",", ".")
        elif "," in cleaned:
            cleaned = cleaned.replace(",", ".")
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return Decimal(default)


def _parse_date(value: str):
    if not value:
        return datetime.now()
    for fmt in ("%d/%m/%Y %H:%M", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(value.strip(), fmt)
        except (ValueError, AttributeError):
            continue
    return datetime.now()


def _resolve_produto(tenant, nome: str):
    from apps.estoque.models import Produto
    if not nome:
        raise ValueError("nome_produto não informado.")
    q = Produto.objects.filter(tenant=tenant)
    p = q.filter(nome__iexact=nome).first()
    if not p:
        p = q.filter(nome__icontains=nome).first()
    if not p:
        raise ValueError(f"Produto não encontrado: '{nome}'")
    return p


def execute_entrada_estoque(action) -> None:
    """Registra entrada de estoque."""
    from apps.estoque.services import create_movimentacao
    from apps.estoque.models import Produto

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    with transaction.atomic():
        nome_produto = data.get("nome_produto") or data.get("produto", "")
        produto = _resolve_produto(tenant, nome_produto)

        quantidade = _parse_decimal(data.get("quantidade"), "0")
        if quantidade <= Decimal("0"):
            raise ValueError("Quantidade deve ser maior que zero.")

        valor_unitario = _parse_decimal(data.get("valor_unitario") or data.get("custo_unitario"), "0")
        data_mov = _parse_date(data.get("data", ""))

        mov = create_movimentacao(
            produto=produto,
            tipo="entrada",
            quantidade=quantidade,
            valor_unitario=valor_unitario if valor_unitario > Decimal("0") else None,
            criado_por=criado_por,
            origem="acao_isidoro",
            documento_referencia=data.get("numero_nf", "") or data.get("documento_referencia", ""),
            motivo=data.get("motivo", "Entrada registrada pelo assistente Isidoro."),
        )

    action.mark_executed({
        "movimentacao_id": str(getattr(mov, "pk", "?")),
        "produto": produto.nome,
        "quantidade": str(quantidade),
    })
    logger.info("execute_entrada_estoque OK: action=%s produto=%s qtd=%s", action.id, produto.nome, quantidade)


def execute_saida_estoque(action) -> None:
    """Registra saída de estoque."""
    from apps.estoque.services import create_movimentacao

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    with transaction.atomic():
        nome_produto = data.get("nome_produto") or data.get("produto", "")
        produto = _resolve_produto(tenant, nome_produto)

        quantidade = _parse_decimal(data.get("quantidade"), "0")
        if quantidade <= Decimal("0"):
            raise ValueError("Quantidade deve ser maior que zero.")

        valor_unitario = _parse_decimal(data.get("valor_unitario") or data.get("custo_unitario"), "0")

        mov = create_movimentacao(
            produto=produto,
            tipo="saida",
            quantidade=quantidade,
            valor_unitario=valor_unitario if valor_unitario > Decimal("0") else None,
            criado_por=criado_por,
            origem="acao_isidoro",
            documento_referencia=data.get("documento_referencia", ""),
            motivo=data.get("motivo", "Saída registrada pelo assistente Isidoro."),
        )

    action.mark_executed({
        "movimentacao_id": str(getattr(mov, "pk", "?")),
        "produto": produto.nome,
        "quantidade": str(quantidade),
    })
    logger.info("execute_saida_estoque OK: action=%s produto=%s qtd=%s", action.id, produto.nome, quantidade)
