"""
Executors para o módulo Agricultura.

Converte Actions aprovados em registros reais:
  colheita            → agricultura.Colheita  (+  MovimentacaoCarga se houver dados de transporte)
  movimentacao_carga  → agricultura.MovimentacaoCarga
"""
from __future__ import annotations

import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Optional

from django.db import transaction

logger = logging.getLogger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_date(value: str, fallback_now: bool = True):
    if not value:
        return datetime.now() if fallback_now else None
    for fmt in ("%d/%m/%Y %H:%M", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(value).strip(), fmt)
        except (ValueError, AttributeError):
            continue
    return datetime.now() if fallback_now else None


def _parse_decimal(value, default: str = "0") -> Decimal:
    if value is None:
        return Decimal(default)
    try:
        cleaned = str(value).strip().replace("R$", "").replace(" ", "")
        if "," in cleaned and "." in cleaned:
            cleaned = cleaned.replace(".", "").replace(",", ".")
        elif "," in cleaned and "." not in cleaned:
            cleaned = cleaned.replace(",", ".")
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return Decimal(default)


def _resolve_plantio(tenant, safra_nome: str):
    """Busca Plantio (safra) por nome — tenta em_andamento primeiro, depois qualquer status."""
    from apps.agricultura.models import Plantio

    if not safra_nome:
        raise ValueError("safra não informada.")

    qs = Plantio.objects.filter(tenant=tenant).select_related("cultura")

    # Tentativa 1: cultura.nome exato (case-insensitive)
    p = qs.filter(cultura__nome__iexact=safra_nome, status="em_andamento").first()
    if p:
        return p

    # Tentativa 2: cultura.nome contém
    p = qs.filter(cultura__nome__icontains=safra_nome, status="em_andamento").first()
    if p:
        return p

    # Tentativa 3: nome_safra-like ("Safra Soja")
    normalized = safra_nome.lower().replace("safra", "").strip()
    p = qs.filter(cultura__nome__icontains=normalized, status="em_andamento").first()
    if p:
        return p

    # Tentativa 4: qualquer status
    p = qs.filter(cultura__nome__icontains=safra_nome).order_by(
        "-data_plantio"
    ).first()
    if p:
        return p

    raise ValueError(f"Plantio/Safra não encontrado para safra='{safra_nome}'.")


def _resolve_talhao(tenant, talhao_nome: str, plantio=None):
    """Busca Talhão por nome, opcionalmente dentro de um plantio."""
    from apps.fazendas.models import Talhao

    if not talhao_nome:
        return None

    qs = Talhao.objects.all()

    # Se o plantio possui talhões associados, priorizar dentro dele
    if plantio is not None:
        t = plantio.talhoes.filter(name__iexact=talhao_nome).first()
        if t:
            return t
        t = plantio.talhoes.filter(name__icontains=talhao_nome).first()
        if t:
            return t

    # Fallback: qualquer talhão com esse nome
    t = qs.filter(name__iexact=talhao_nome).first()
    if t:
        return t
    t = qs.filter(name__icontains=talhao_nome).first()
    return t  # pode ser None — talhao é opcional na MovimentacaoCarga


def _resolve_harvest_session(tenant, plantio, safra_nome: str = ""):
    """
    Busca HarvestSession ativa (em_andamento) para o plantio.
    Retorna None se não houver sessão ativa (não lança exceção — o executor cria a carga sem session_item).
    """
    from apps.agricultura.models import HarvestSession

    session = HarvestSession.objects.filter(
        tenant=tenant, plantio=plantio, status="em_andamento"
    ).order_by("-data_inicio").first()
    return session


def _get_or_create_session_item(session, talhao):
    """
    Retorna o HarvestSessionItem para (session, talhao), criando se não existir.
    Retorna None se talhao for None.
    """
    if session is None or talhao is None:
        return None
    from apps.agricultura.models import HarvestSessionItem

    item, _ = HarvestSessionItem.objects.get_or_create(
        session=session,
        talhao=talhao,
        defaults={"quantidade_colhida": 0, "status": "pendente"},
    )
    return item


# ─── Colheita ─────────────────────────────────────────────────────────────────

def execute_colheita(action) -> None:
    """
    Cria Colheita a partir de registrar_colheita draft_data.
    Se houver dados de transporte (placa/peso_bruto), cria também MovimentacaoCarga.
    """
    from apps.agricultura.models import Colheita, MovimentacaoCarga

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    with transaction.atomic():
        plantio = _resolve_plantio(tenant, data.get("safra", ""))
        talhao = _resolve_talhao(tenant, data.get("talhao", ""), plantio)

        # ── Colheita ─────────────────────────────────────────────────────────
        data_colheita_dt = _parse_date(data.get("data_colheita", ""))
        data_colheita = (
            data_colheita_dt.date()
            if hasattr(data_colheita_dt, "date")
            else data_colheita_dt
        )

        producao_total = _parse_decimal(data.get("producao_total"), "0")
        unidade_raw = (data.get("unidade") or "sc").lower().strip()
        unidade_map = {
            "sc": "sc", "saca": "sc", "sacas": "sc",
            "kg": "kg",
            "t": "t", "ton": "t", "tonelada": "t", "toneladas": "t",
        }
        unidade = unidade_map.get(unidade_raw, unidade_raw[:20])

        colheita = Colheita(
            tenant=tenant,
            plantio=plantio,
            data_colheita=data_colheita,
            quantidade_colhida=producao_total,
            unidade=unidade,
            is_estimada=True,
            qualidade=data.get("qualidade", ""),
            observacoes=data.get("observacoes", ""),
            custo_mao_obra=_parse_decimal(data.get("custo_mao_obra"), "0"),
            custo_maquina=_parse_decimal(data.get("custo_maquina"), "0"),
            custo_combustivel=_parse_decimal(data.get("custo_combustivel"), "0"),
            criado_por=criado_por,
        )
        colheita.save()

        # ── MovimentacaoCarga (opcional — só quando há dados de transporte) ──
        movimentacao = None
        peso_bruto = _parse_decimal(data.get("peso_bruto"), "0")
        placa = data.get("placa", "")
        if peso_bruto > Decimal("0") or placa:
            session = _resolve_harvest_session(tenant, plantio)
            session_item = _get_or_create_session_item(session, talhao)

            destino_tipo = data.get("destino_tipo", "armazenagem_interna")
            local_destino = None
            empresa_destino = None

            if destino_tipo == "armazenagem_interna" and data.get("local_destino"):
                try:
                    from apps.estoque.models import LocalArmazenamento
                    local_destino = LocalArmazenamento.objects.filter(
                        nome__icontains=data["local_destino"]
                    ).first()
                except Exception:
                    pass

            if data.get("empresa_destino"):
                try:
                    from apps.comercial.models import Empresa
                    empresa_destino = Empresa.objects.filter(
                        tenant=tenant, nome__icontains=data["empresa_destino"]
                    ).first()
                except Exception:
                    pass

            tara = _parse_decimal(data.get("tara"), "0")
            custo_transporte = _parse_decimal(data.get("custo_transporte"), "0")

            movimentacao = MovimentacaoCarga(
                tenant=tenant,
                session_item=session_item,
                talhao=talhao,
                placa=placa,
                motorista=data.get("motorista", ""),
                tara=tara,
                peso_bruto=peso_bruto,
                descontos=_parse_decimal(data.get("descontos"), "0"),
                custo_transporte=custo_transporte,
                destino_tipo=destino_tipo,
                local_destino=local_destino,
                empresa_destino=empresa_destino,
                contrato_ref=data.get("nf_provisoria", ""),
                condicoes_graos=data.get("qualidade", ""),
                criado_por=criado_por,
            )
            movimentacao.save()

    result = {
        "colheita_id": colheita.pk,
        "plantio": plantio.nome_safra,
        "quantidade_colhida": str(colheita.quantidade_colhida),
        "unidade": colheita.unidade,
        "data_colheita": str(colheita.data_colheita),
    }
    if movimentacao:
        result["movimentacao_carga_id"] = movimentacao.pk
        result["placa"] = movimentacao.placa
        result["peso_bruto_kg"] = str(movimentacao.peso_bruto)
        result["peso_liquido_kg"] = str(movimentacao.peso_liquido)

    action.mark_executed(result)
    logger.info(
        "execute_colheita OK: action=%s colheita=%s plantio=%s",
        action.id, colheita.pk, plantio.nome_safra,
    )


# ─── Movimentação de Carga ────────────────────────────────────────────────────

def execute_movimentacao_carga(action) -> None:
    """
    Cria MovimentacaoCarga a partir de registrar_movimentacao_carga draft_data.
    Tenta vincular a HarvestSessionItem ativo para o plantio+talhão informados.
    """
    from apps.agricultura.models import MovimentacaoCarga

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    with transaction.atomic():
        # Resolve plantio via safra_nome
        safra_nome = data.get("safra", "")
        plantio = None
        talhao = None
        session_item = None

        if safra_nome:
            try:
                plantio = _resolve_plantio(tenant, safra_nome)
            except ValueError as exc:
                logger.warning("execute_movimentacao_carga: %s", exc)

        if data.get("talhao"):
            talhao = _resolve_talhao(tenant, data["talhao"], plantio)

        if plantio:
            session = _resolve_harvest_session(tenant, plantio)
            session_item = _get_or_create_session_item(session, talhao)

        # Destino
        destino_tipo = data.get("destino_tipo", "armazenagem_interna")
        local_destino = None
        empresa_destino = None

        if destino_tipo == "armazenagem_interna" and data.get("local_destino"):
            try:
                from apps.estoque.models import LocalArmazenamento
                local_destino = LocalArmazenamento.objects.filter(
                    nome__icontains=data["local_destino"]
                ).first()
            except Exception:
                pass

        if data.get("empresa_destino"):
            try:
                from apps.comercial.models import Empresa
                empresa_destino = Empresa.objects.filter(
                    tenant=tenant, nome__icontains=data["empresa_destino"]
                ).first()
            except Exception:
                pass

        peso_bruto = _parse_decimal(data.get("peso_bruto"), "0")
        tara = _parse_decimal(data.get("tara"), "0")
        custo_transporte = _parse_decimal(data.get("custo_transporte"), "0")

        mov = MovimentacaoCarga(
            tenant=tenant,
            session_item=session_item,
            talhao=talhao,
            placa=data.get("placa", ""),
            motorista=data.get("motorista", ""),
            tara=tara,
            peso_bruto=peso_bruto,
            descontos=_parse_decimal(data.get("descontos"), "0"),
            custo_transporte=custo_transporte,
            destino_tipo=destino_tipo,
            local_destino=local_destino,
            empresa_destino=empresa_destino,
            contrato_ref=data.get("contrato_ref", "") or data.get("nf_provisoria", ""),
            condicoes_graos=data.get("condicoes_graos", ""),
            criado_por=criado_por,
        )
        mov.save()

    result = {
        "movimentacao_carga_id": mov.pk,
        "talhao": talhao.name if talhao else None,
        "placa": mov.placa,
        "peso_bruto_kg": str(mov.peso_bruto),
        "tara_kg": str(mov.tara),
        "peso_liquido_kg": str(mov.peso_liquido),
        "destino_tipo": mov.destino_tipo,
    }
    if session_item:
        result["session_item_id"] = session_item.pk
        result["harvest_session_id"] = session_item.session_id

    action.mark_executed(result)
    logger.info(
        "execute_movimentacao_carga OK: action=%s mov=%s talhao=%s placa=%s",
        action.id, mov.pk, data.get("talhao"), mov.placa,
    )
