"""
Executors para o módulo Máquinas.

Converte Actions aprovados em registros reais:
  abastecimento         → maquinas.Abastecimento
  manutencao_maquina    → maquinas.OrdemServico
  ordem_servico_maquina → maquinas.OrdemServico
  criar_equipamento     → maquinas.Equipamento
  parada_maquina        → atualiza status do Equipamento
"""
from __future__ import annotations

import logging
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Optional

from django.db import transaction
from django.db.models import Q

logger = logging.getLogger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_date(value: str, fallback_now: bool = True) -> Optional[datetime]:
    """Tenta vários formatos de data/datetime e retorna datetime ou None."""
    if not value:
        return datetime.now() if fallback_now else None
    for fmt in ("%d/%m/%Y %H:%M", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(value.strip(), fmt)
        except (ValueError, AttributeError):
            continue
    logger.warning("_parse_date: não foi possível interpretar '%s'", value)
    return datetime.now() if fallback_now else None


def _parse_decimal(value, default: str = "0") -> Decimal:
    """Converte valor (str/int/float) em Decimal com segurança."""
    if value is None:
        return Decimal(default)
    try:
        # Remove símbolos monetários e separadores de milhar (vírgula usada como milhar no BR)
        cleaned = str(value).strip().replace("R$", "").replace(" ", "")
        # Se tiver vírgula como decimal (ex: "1.667,25"), troca para ponto
        if "," in cleaned and "." in cleaned:
            cleaned = cleaned.replace(".", "").replace(",", ".")
        elif "," in cleaned and "." not in cleaned:
            cleaned = cleaned.replace(",", ".")
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return Decimal(default)


def _resolve_equipamento(tenant, maquina_nome: str):
    """Busca Equipamento por nome/modelo com tolerância a abreviações."""
    from apps.maquinas.models import Equipamento

    if not maquina_nome:
        raise ValueError("maquina_nome não informado.")

    qs = Equipamento.objects.filter(tenant=tenant)
    # Tentativa 1: match exato
    eq = qs.filter(nome__iexact=maquina_nome).first()
    if eq:
        return eq
    # Tentativa 2: nome ou modelo contém o termo
    eq = qs.filter(
        Q(nome__icontains=maquina_nome) | Q(modelo__icontains=maquina_nome)
    ).first()
    if eq:
        return eq
    # Tentativa 3: o nome contém cada token do termo (ex: "CR5.85" ⊂ "Colheitadeira NH CR5.85")
    tokens = maquina_nome.split()
    if tokens:
        q = Q()
        for t in tokens:
            q &= Q(nome__icontains=t)
        eq = qs.filter(q).first()
    if eq:
        return eq

    raise ValueError(f"Equipamento não encontrado para nome='{maquina_nome}'.")


def _extract_litros_from_descricao(descricao: str) -> Optional[Decimal]:
    """
    Extrai quantidade em litros de uma string como:
    '305 litros de Diesel S500', '305lts', '305 L', etc.
    """
    if not descricao:
        return None
    m = re.search(r"(\d+[\.,]?\d*)\s*(?:litros?|lts?|l\b)", descricao, re.IGNORECASE)
    if m:
        try:
            return Decimal(m.group(1).replace(",", "."))
        except InvalidOperation:
            pass
    return None


# ─── Abastecimento ────────────────────────────────────────────────────────────

def execute_abastecimento(action) -> None:
    """Cria um Abastecimento a partir do draft_data da Action."""
    from apps.maquinas.models import Abastecimento

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    with transaction.atomic():
        equipamento = _resolve_equipamento(tenant, data.get("maquina_nome", ""))

        # ── Quantidade em litros ─────────────────────────────────────────────
        # Suporta campo explícito (novo tool) ou extração da descricao (tool antigo)
        quantidade_litros = _parse_decimal(data.get("quantidade_litros"), "0")
        if quantidade_litros == Decimal("0"):
            quantidade_litros = _extract_litros_from_descricao(data.get("descricao", ""))
        if not quantidade_litros or quantidade_litros <= Decimal("0"):
            raise ValueError(
                "Não foi possível determinar a quantidade de litros. "
                "Informe 'quantidade_litros' no draft_data."
            )

        # ── Valor unitário ───────────────────────────────────────────────────
        valor_unitario = _parse_decimal(data.get("valor_unitario"), "0")
        if valor_unitario == Decimal("0"):
            custo_total = _parse_decimal(data.get("custo"), "0")
            if custo_total > Decimal("0") and quantidade_litros > Decimal("0"):
                valor_unitario = (custo_total / quantidade_litros).quantize(Decimal("0.001"))

        if valor_unitario <= Decimal("0"):
            raise ValueError(
                "Não foi possível determinar o valor unitário. "
                "Informe 'valor_unitario' ou 'custo' (total) no draft_data."
            )

        # ── Outros campos ────────────────────────────────────────────────────
        data_abastecimento = _parse_date(data.get("data", ""))
        horimetro = _parse_decimal(data.get("horimetro") or data.get("horas_trabalhadas"), "0")
        horimetro_km = horimetro if horimetro > Decimal("0") else None

        ab = Abastecimento(
            tenant=tenant,
            equipamento=equipamento,
            data_abastecimento=data_abastecimento,
            quantidade_litros=quantidade_litros,
            valor_unitario=valor_unitario,
            valor_total=(quantidade_litros * valor_unitario).quantize(Decimal("0.01")),
            horimetro_km=horimetro_km,
            local_abastecimento=data.get("local_abastecimento") or data.get("local", ""),
            responsavel=data.get("responsavel") or data.get("tecnico", ""),
            observacoes=data.get("observacoes", ""),
            criado_por=criado_por,
        )
        ab.save()

    action.mark_executed({
        "abastecimento_id": ab.pk,
        "equipamento": equipamento.nome,
        "quantidade_litros": str(quantidade_litros),
        "valor_unitario": str(valor_unitario),
        "valor_total": str(ab.valor_total),
    })
    logger.info(
        "execute_abastecimento OK: action=%s abastecimento=%s equipamento=%s",
        action.id, ab.pk, equipamento.nome,
    )


# ─── Ordem de Serviço (manutenção / OS direta) ────────────────────────────────

def execute_ordem_servico(action) -> None:
    """Cria uma OrdemServico a partir do draft_data."""
    from apps.maquinas.models import OrdemServico

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    # Suporta draft_data de registrar_manutencao_maquina (maquina_nome) e
    # registrar_ordem_servico_maquina (equipamento)
    nome_eq = data.get("maquina_nome") or data.get("equipamento", "")
    with transaction.atomic():
        equipamento = _resolve_equipamento(tenant, nome_eq)

        # ── Tipo de OS ───────────────────────────────────────────────────────
        tipo_registro = (data.get("tipo_registro") or data.get("tipo") or "corretiva").lower()
        tipo_map = {
            "manutencao":  "corretiva",
            "revisao":     "preventiva",
            "reparo":      "corretiva",
            "troca_oleo":  "preventiva",
            "preventiva":  "preventiva",
            "corretiva":   "corretiva",
            "emergencial": "emergencial",
            "melhoria":    "melhoria",
        }
        tipo = tipo_map.get(tipo_registro, "corretiva")

        prioridade_map = {
            "baixa": "baixa", "media": "media", "alta": "alta", "critica": "critica",
        }
        prioridade = prioridade_map.get(
            (data.get("prioridade") or "media").lower(), "media"
        )

        descricao = (
            data.get("descricao_problema")
            or data.get("descricao")
            or f"Registro de {tipo_registro}"
        )

        custo_mao_obra = _parse_decimal(
            data.get("custo_mao_obra") or data.get("custo"), "0"
        )

        # Data prevista (opcional)
        data_previsao_str = data.get("data_previsao") or data.get("data", "")
        data_previsao = _parse_date(data_previsao_str, fallback_now=False)
        data_previsao_date = data_previsao.date() if data_previsao else None

        os = OrdemServico(
            tenant=tenant,
            equipamento=equipamento,
            tipo=tipo,
            prioridade=prioridade,
            status=data.get("status", "concluida"),
            descricao_problema=descricao,
            custo_mao_obra=custo_mao_obra,
            data_previsao=data_previsao_date,
            responsavel_abertura=criado_por,
            observacoes=data.get("observacoes", ""),
        )
        os.save()  # numero_os is auto-generated in save()

    action.mark_executed({
        "ordem_servico_id": os.pk,
        "numero_os": os.numero_os,
        "equipamento": equipamento.nome,
        "tipo": tipo,
    })
    logger.info(
        "execute_ordem_servico OK: action=%s os=%s equipamento=%s",
        action.id, os.numero_os, equipamento.nome,
    )


# ─── Criar Equipamento ────────────────────────────────────────────────────────

def execute_criar_equipamento(action) -> None:
    """Cria um Equipamento a partir do draft_data."""
    from apps.maquinas.models import Equipamento, CategoriaEquipamento

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    with transaction.atomic():
        # Resolve categoria (por nome — usa ou cria)
        cat_nome = data.get("categoria", "Outros")
        categoria, _ = CategoriaEquipamento.objects.get_or_create(
            nome__iexact=cat_nome,
            defaults={"nome": cat_nome, "tipo_mobilidade": "autopropelido"},
        )

        data_aquisicao = _parse_date(data.get("data_aquisicao", ""), fallback_now=False)

        eq = Equipamento(
            tenant=tenant,
            nome=data.get("nome", ""),
            categoria=categoria,
            marca=data.get("marca", ""),
            modelo=data.get("modelo", ""),
            ano_fabricacao=data.get("ano_fabricacao") or None,
            numero_serie=data.get("numero_serie", "") or None,
            potencia_cv=_parse_decimal(data.get("potencia_cv"), "0") or None,
            capacidade_litros=_parse_decimal(data.get("capacidade_litros"), "0") or None,
            horimetro_atual=_parse_decimal(data.get("horimetro_atual"), "0") or None,
            valor_aquisicao=_parse_decimal(data.get("valor_aquisicao"), "0"),
            data_aquisicao=data_aquisicao.date() if data_aquisicao else None,
            status=data.get("status", "ativo"),
            local_instalacao=data.get("local_instalacao", ""),
            observacoes=data.get("observacoes", ""),
        )
        eq.full_clean(exclude=["tenant"])
        eq.save()

    action.mark_executed({"equipamento_id": eq.pk, "nome": eq.nome})
    logger.info("execute_criar_equipamento OK: action=%s equipamento=%s", action.id, eq.pk)


# ─── Parada de Máquina ────────────────────────────────────────────────────────

def execute_parada_maquina(action) -> None:
    """Registra parada atualizando status do Equipamento para 'manutenção'."""
    data = action.draft_data
    tenant = action.tenant

    equipamento = _resolve_equipamento(tenant, data.get("maquina_nome", ""))
    motivo = data.get("descricao", "Parada registrada pelo assistente Isidoro.")

    # Atualiza status do equipamento para manutenção
    equipamento.status = "manutencao"
    equipamento.save(update_fields=["status"])

    action.mark_executed({
        "equipamento_id": equipamento.pk,
        "equipamento": equipamento.nome,
        "novo_status": "manutencao",
        "motivo": motivo,
    })
    logger.info("execute_parada_maquina OK: action=%s equipamento=%s", action.id, equipamento.nome)
