"""
Executors para o módulo Agricultura.

Converte Actions aprovados em registros reais:
  criar_safra           → agricultura.Plantio  (via Cultura)
  colheita              → agricultura.Colheita  (+  MovimentacaoCarga se houver dados de transporte)
  movimentacao_carga    → agricultura.MovimentacaoCarga
  operacao_agricola     → agricultura.Operacao
  registrar_manejo      → agricultura.Manejo
  ordem_servico_agricola → agricultura.OrdemServico
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
    """Busca Talhão por nome, opcionalmente dentro de um plantio. Filtra por tenant."""
    from apps.fazendas.models import Talhao

    if not talhao_nome:
        return None

    qs = Talhao.objects.filter(area__fazenda__tenant=tenant)

    # Se o plantio possui talhões associados, priorizar dentro dele
    if plantio is not None:
        t = plantio.talhoes.filter(name__iexact=talhao_nome).first()
        if t:
            return t
        t = plantio.talhoes.filter(name__icontains=talhao_nome).first()
        if t:
            return t

    # Fallback: qualquer talhão do tenant com esse nome
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
            custo_transporte_unidade=data.get("custo_transporte_unidade", "tonelada"),
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


# ─── Criar Safra (Plantio) ────────────────────────────────────────────────────

def execute_criar_safra(action) -> None:
    """
    Cria um Plantio (safra) a partir de criar_safra draft_data.
    Resolve Cultura por nome (busca ou cria) e vincula talhões opcionais.
    """
    from apps.agricultura.models import Cultura, Plantio, PlantioTalhao
    from apps.fazendas.models import Fazenda

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    cultura_nome = (data.get("cultura") or data.get("nome_cultura", "")).strip()
    if not cultura_nome:
        raise ValueError("Nome da cultura é obrigatório (ex: 'Soja', 'Milho').")

    with transaction.atomic():
        # Resolve ou cria Cultura
        cultura = Cultura.objects.filter(nome__iexact=cultura_nome).first()
        if not cultura:
            cultura = Cultura.objects.filter(nome__icontains=cultura_nome).first()
        if not cultura:
            cultura = Cultura.objects.create(nome=cultura_nome.title())

        # Resolve fazenda (opcional)
        fazenda = None
        fazenda_nome = data.get("fazenda", "").strip()
        if fazenda_nome:
            fazenda = Fazenda.objects.filter(tenant=tenant, name__icontains=fazenda_nome).first()

        data_plantio = _parse_date(data.get("data_plantio", ""))
        data_plantio_date = data_plantio.date() if hasattr(data_plantio, "date") else data_plantio

        status = data.get("status", "em_andamento").lower()
        if status not in ("planejado", "em_andamento", "colhido", "perdido"):
            status = "em_andamento"

        plantio = Plantio(
            tenant=tenant,
            fazenda=fazenda,
            cultura=cultura,
            data_plantio=data_plantio_date,
            quantidade_sementes=_parse_decimal(data.get("quantidade_sementes"), "0") or None,
            observacoes=data.get("observacoes", ""),
            status=status,
            criado_por=criado_por,
        )
        plantio.save()

        # Vincular talhões se informados
        talhoes_list = data.get("talhoes", [])
        if isinstance(talhoes_list, str):
            talhoes_list = [t.strip() for t in talhoes_list.split(",") if t.strip()]

        talhoes_vinculados = []
        for t_nome in talhoes_list:
            talhao = _resolve_talhao(tenant, t_nome)
            if talhao:
                PlantioTalhao.objects.get_or_create(
                    plantio=plantio,
                    talhao=talhao,
                    defaults={"variedade": data.get("variedade", "")},
                )
                talhoes_vinculados.append(talhao.name)

    action.mark_executed({
        "plantio_id": plantio.pk,
        "cultura": cultura.nome,
        "fazenda": fazenda.name if fazenda else None,
        "data_plantio": str(data_plantio_date),
        "status": plantio.status,
        "talhoes_vinculados": talhoes_vinculados,
    })
    logger.info("execute_criar_safra OK: action=%s plantio=%s cultura=%s", action.id, plantio.pk, cultura.nome)


# ─── Operação Agrícola ────────────────────────────────────────────────────────

def execute_operacao_agricola(action) -> None:
    """
    Cria uma Operação agrícola a partir de registrar_operacao_agricola draft_data.
    Usa o modelo Operacao (sistema unificado).
    """
    from apps.agricultura.models import Operacao, OperacaoProduto
    from apps.maquinas.models import Equipamento

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    with transaction.atomic():
        # Resolve safra/plantio (opcional)
        plantio = None
        safra_nome = data.get("safra", "").strip()
        if safra_nome:
            try:
                plantio = _resolve_plantio(tenant, safra_nome)
            except ValueError:
                logger.warning("execute_operacao_agricola: safra '%s' não encontrada", safra_nome)

        # Resolve fazenda
        from apps.fazendas.models import Fazenda
        fazenda = None
        fazenda_nome = data.get("fazenda", "").strip()
        if fazenda_nome:
            fazenda = Fazenda.objects.filter(tenant=tenant, name__icontains=fazenda_nome).first()
        elif plantio and plantio.fazenda:
            fazenda = plantio.fazenda

        # Mapear tipo e categoria — aceita tanto "tipo_operacao" quanto "atividade" (legado)
        tipo_raw = (
            data.get("tipo_operacao")
            or data.get("atividade")
            or data.get("tipo")
            or "prep_limpeza"
        ).lower().strip()
        # Map de nomes amigáveis para keys
        _tipo_map = {
            "aracao": "prep_aracao", "gradagem": "prep_gradagem",
            "subsolagem": "prep_subsolagem", "correcao": "prep_correcao",
            "limpeza": "prep_limpeza", "adubacao_base": "adub_base",
            "adubacao_cobertura": "adub_cobertura", "adubacao_foliar": "adub_foliar",
            "dessecacao": "plant_dessecacao", "plantio_direto": "plant_direto",
            "plantio_convencional": "plant_convencional",
            "irrigacao": "trato_irrigacao", "poda": "trato_poda",
            "desbaste": "trato_desbaste", "amontoa": "trato_amontoa",
            "herbicida": "pulv_herbicida", "fungicida": "pulv_fungicida",
            "inseticida": "pulv_inseticida", "pulverizacao": "pulv_herbicida",
            "pragas": "pulv_pragas", "doencas": "pulv_doencas",
            "daninhas": "pulv_daninhas",
            "rocada": "mec_rocada", "cultivo_mecanico": "mec_cultivo",
        }
        tipo = _tipo_map.get(tipo_raw, tipo_raw)

        # Derivar categoria do prefixo do tipo
        _cat_map = {
            "prep": "preparacao", "adub": "adubacao", "plant": "plantio",
            "trato": "tratos", "pulv": "pulverizacao", "mec": "mecanicas",
        }
        prefix = tipo.split("_")[0] if "_" in tipo else tipo[:4]
        categoria = _cat_map.get(prefix, "preparacao")

        # Parse datas — suporta tanto (data_operacao) quanto (data_inicio + data_fim)
        # Legado: "data_operacao" e "data"
        data_inicio_input = data.get("data_inicio") or data.get("data_operacao") or data.get("data", "")
        data_fim_input = data.get("data_fim", "")
        
        data_inicio = _parse_date(data_inicio_input)
        data_inicio_dt = data_inicio if isinstance(data_inicio, datetime) else datetime.combine(data_inicio, datetime.min.time())
        data_inicio_date = data_inicio.date() if hasattr(data_inicio, "date") else data_inicio
        
        data_fim = None
        data_fim_dt = None
        if data_fim_input:
            data_fim = _parse_date(data_fim_input)
            data_fim_dt = data_fim if isinstance(data_fim, datetime) else datetime.combine(data_fim, datetime.min.time())
        
        # ── Inferir status pela data (futuro=planejada, passado/hoje=concluida) ─
        from datetime import date as _date
        status_draft = (data.get("status") or "").strip().lower()
        if status_draft and status_draft in ("planejada", "em_andamento", "concluida", "cancelada"):
            status_final = status_draft
        elif data_inicio_date and data_inicio_date > _date.today():
            status_final = "planejada"
        else:
            status_final = "concluida"

        # ── Resolve trator (equipamento autopropelido) ────────────────────
        trator_obj = None
        trator_nome = (data.get("trator") or "").strip()
        if trator_nome:
            trator_obj = (
                Equipamento.objects.filter(tenant=tenant, nome__iexact=trator_nome).first()
                or Equipamento.objects.filter(tenant=tenant, nome__icontains=trator_nome).first()
            )
            if not trator_obj:
                logger.warning("execute_operacao_agricola: trator '%s' não encontrado", trator_nome)

        # ── Resolve implemento (equipamento rebocado) ─────────────────────
        implemento_obj = None
        implemento_nome = (data.get("implemento") or "").strip()
        if implemento_nome:
            implemento_obj = (
                Equipamento.objects.filter(tenant=tenant, nome__iexact=implemento_nome).first()
                or Equipamento.objects.filter(tenant=tenant, nome__icontains=implemento_nome).first()
            )
            if not implemento_obj:
                logger.warning("execute_operacao_agricola: implemento '%s' não encontrado", implemento_nome)

        operacao = Operacao(
            tenant=tenant,
            categoria=categoria,
            tipo=tipo,
            plantio=plantio,
            fazenda=fazenda,
            data_operacao=data_inicio_date,
            data_inicio=data_inicio_dt,
            data_fim=data_fim_dt,
            trator=trator_obj,
            implemento=implemento_obj,
            custo_mao_obra=_parse_decimal(data.get("custo_mao_obra"), "0"),
            custo_maquina=_parse_decimal(data.get("custo_maquina"), "0"),
            custo_insumos=_parse_decimal(data.get("custo_insumos"), "0"),
            status=status_final,
            observacoes=data.get("observacoes", ""),
            criado_por=criado_por,
        )
        operacao.save()

        # Vincular talhões
        talhoes_info = data.get("talhoes", [])
        if isinstance(talhoes_info, str):
            talhoes_info = [t.strip() for t in talhoes_info.split(",") if t.strip()]
        talhao_nome = data.get("talhao", "").strip()
        if talhao_nome and talhao_nome not in talhoes_info:
            talhoes_info.append(talhao_nome)

        for t_nome in talhoes_info:
            talhao = _resolve_talhao(tenant, t_nome, plantio)
            if talhao:
                operacao.talhoes.add(talhao)

        # ── Vincular produto/insumo ───────────────────────────────────────
        produto_nome = (data.get("produto_insumo") or data.get("insumo") or "").strip()
        quantidade_insumo = data.get("quantidade_insumo") or data.get("quantidade") or 0
        if produto_nome:
            from apps.estoque.models import Produto as EstoqueProduto
            produto_obj = (
                EstoqueProduto.objects.filter(tenant=tenant, nome__iexact=produto_nome).first()
                or EstoqueProduto.objects.filter(tenant=tenant, nome__icontains=produto_nome).first()
            )
            if produto_obj:
                OperacaoProduto.objects.create(
                    operacao=operacao,
                    produto=produto_obj,
                    dosagem=_parse_decimal(quantidade_insumo, "0"),
                    unidade_dosagem=data.get("unidade", ""),
                )
            else:
                logger.warning("execute_operacao_agricola: produto '%s' não encontrado no estoque", produto_nome)

    action.mark_executed({
        "operacao_id": operacao.pk,
        "tipo": operacao.tipo,
        "categoria": operacao.categoria,
        "data_inicio": data_inicio_dt.isoformat() if data_inicio_dt else None,
        "data_fim": data_fim_dt.isoformat() if data_fim_dt else None,
        "safra": plantio.nome_safra if plantio else None,
        "trator": trator_nome or None,
        "implemento": implemento_nome or None,
    })
    logger.info(
        "execute_operacao_agricola OK: action=%s operacao=%s tipo=%s data_inicio=%s data_fim=%s",
        action.id, operacao.pk, operacao.tipo, data_inicio_dt, data_fim_dt
    )


# ─── Registrar Manejo ─────────────────────────────────────────────────────────

def execute_registrar_manejo(action) -> None:
    """
    Cria um Manejo a partir de registrar_manejo draft_data.
    """
    from apps.agricultura.models import Manejo

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    with transaction.atomic():
        # Resolve safra/plantio (opcional)
        plantio = None
        safra_nome = data.get("safra", "").strip()
        if safra_nome:
            try:
                plantio = _resolve_plantio(tenant, safra_nome)
            except ValueError:
                logger.warning("execute_registrar_manejo: safra '%s' não encontrada", safra_nome)

        # Resolve fazenda
        from apps.fazendas.models import Fazenda
        fazenda = None
        fazenda_nome = data.get("fazenda", "").strip()
        if fazenda_nome:
            fazenda = Fazenda.objects.filter(tenant=tenant, name__icontains=fazenda_nome).first()
        elif plantio and plantio.fazenda:
            fazenda = plantio.fazenda

        tipo = (data.get("tipo_manejo") or data.get("tipo") or "outro").lower()
        # Validar contra Manejo.TIPO_CHOICES
        valid_tipos = [c[0] for c in Manejo.TIPO_CHOICES]
        if tipo not in valid_tipos:
            tipo = "outro"

        data_manejo = _parse_date(data.get("data", ""))
        data_manejo_date = data_manejo.date() if hasattr(data_manejo, "date") else data_manejo

        manejo = Manejo(
            tenant=tenant,
            plantio=plantio,
            fazenda=fazenda,
            tipo=tipo,
            data_manejo=data_manejo_date,
            descricao=data.get("descricao", ""),
            custo=_parse_decimal(data.get("custo"), "0"),
            custo_mao_obra=_parse_decimal(data.get("custo_mao_obra"), "0"),
            custo_maquinas=_parse_decimal(data.get("custo_maquinas"), "0"),
            custo_insumos=_parse_decimal(data.get("custo_insumos"), "0"),
            equipamento=data.get("equipamento", ""),
            observacoes=data.get("observacoes", ""),
            criado_por=criado_por,
        )
        manejo.save()

        # Vincular talhões
        talhao_nome = data.get("talhao", "").strip()
        if talhao_nome:
            talhao = _resolve_talhao(tenant, talhao_nome, plantio)
            if talhao:
                manejo.talhoes.add(talhao)

    action.mark_executed({
        "manejo_id": manejo.pk,
        "tipo": manejo.tipo,
        "data": str(data_manejo_date),
        "safra": plantio.nome_safra if plantio else None,
        "fazenda": fazenda.name if fazenda else None,
    })
    logger.info("execute_registrar_manejo OK: action=%s manejo=%s", action.id, manejo.pk)


# ─── Ordem de Serviço Agrícola ────────────────────────────────────────────────

def execute_ordem_servico_agricola(action) -> None:
    """
    Cria uma OrdemServico agrícola a partir de ordem_servico_agricola draft_data.
    """
    from apps.agricultura.models import OrdemServico as OSAgricola

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    tarefa = data.get("tarefa", "").strip()
    if not tarefa:
        tarefa = data.get("descricao", "Ordem de serviço agrícola").strip()

    with transaction.atomic():
        # Resolve fazenda (opcional)
        from apps.fazendas.models import Fazenda
        fazenda = None
        fazenda_nome = data.get("fazenda", "").strip()
        if fazenda_nome:
            fazenda = Fazenda.objects.filter(tenant=tenant, name__icontains=fazenda_nome).first()

        data_inicio = _parse_date(data.get("data_inicio") or data.get("data", ""))

        os_agr = OSAgricola(
            tenant=tenant,
            fazenda=fazenda,
            tarefa=tarefa,
            maquina=data.get("maquina", ""),
            insumos=data.get("insumos", []),
            data_inicio=data_inicio,
            status=data.get("status", "pendente"),
            custo_total=_parse_decimal(data.get("custo_total"), "0"),
            criado_por=criado_por,
        )
        os_agr.save()

        # Vincular talhões
        talhao_nome = data.get("talhao", "").strip()
        if talhao_nome:
            talhao = _resolve_talhao(tenant, talhao_nome)
            if talhao:
                os_agr.talhoes.add(talhao)

    action.mark_executed({
        "ordem_servico_id": os_agr.pk,
        "tarefa": os_agr.tarefa,
        "status": os_agr.status,
        "fazenda": fazenda.name if fazenda else None,
    })
    logger.info("execute_ordem_servico_agricola OK: action=%s os=%s", action.id, os_agr.pk)
