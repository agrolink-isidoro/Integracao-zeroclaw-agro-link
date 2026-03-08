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
from difflib import SequenceMatcher
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
        raise ValueError(
            "Equipamento não identificado: nome não informado. "
            "Por favor, informe o nome do equipamento/máquina corretamente."
        )

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

    # Tentativa 4: qualquer token bate em nome OU marca OU modelo (OR)
    if tokens:
        q_any = Q()
        for t in tokens:
            q_any |= (
                Q(nome__icontains=t)
                | Q(marca__icontains=t)
                | Q(modelo__icontains=t)
            )
        candidatos = list(qs.filter(q_any))
        if len(candidatos) == 1:
            return candidatos[0]
        if len(candidatos) > 1:
            # Desempate por fuzzy score
            input_lower = maquina_nome.lower()
            best_eq, best_score = None, 0.0
            for c in candidatos:
                full = f"{c.nome} {c.marca} {c.modelo}".lower()
                score = SequenceMatcher(None, input_lower, full).ratio()
                if score > best_score:
                    best_score, best_eq = score, c
            if best_eq:
                return best_eq

    # Tentativa 5: fuzzy matching com difflib em TODOS os equipamentos
    input_lower = maquina_nome.lower()
    input_tokens = input_lower.split()
    best_eq, best_score = None, 0.0
    for eq_item in qs.only("id", "nome", "marca", "modelo"):
        candidatos_txt = [
            eq_item.nome.lower(),
            eq_item.marca.lower() if eq_item.marca else "",
            eq_item.modelo.lower() if eq_item.modelo else "",
            f"{eq_item.marca} {eq_item.modelo}".lower(),
            f"{eq_item.nome} {eq_item.marca} {eq_item.modelo}".lower(),
        ]
        for cand in candidatos_txt:
            if not cand.strip():
                continue
            score = SequenceMatcher(None, input_lower, cand).ratio()
            if score > best_score:
                best_score, best_eq = score, eq_item
        # Token-level matching
        for tok in input_tokens:
            for cand in candidatos_txt:
                if not cand.strip():
                    continue
                score = SequenceMatcher(None, tok, cand).ratio()
                if score > best_score:
                    best_score, best_eq = score, eq_item

    if best_score >= 0.45 and best_eq is not None:
        logger.info(
            "_resolve_equipamento fuzzy match: '%s' → '%s' (score=%.2f)",
            maquina_nome, best_eq.nome, best_score,
        )
        return best_eq

    # Listar equipamentos disponíveis para ajudar o usuário
    equipamentos_disponiveis = list(qs.values_list('nome', flat=True)[:5])
    dica = ""
    if equipamentos_disponiveis:
        dica = f" Equipamentos disponíveis: {', '.join(equipamentos_disponiveis)}"
    
    raise ValueError(
        f"Equipamento/máquina '{maquina_nome}' não encontrado no sistema. "
        f"Verifique o nome ou cadastre o equipamento no módulo Máquinas.{dica}"
    )


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
    """
    Cria um Abastecimento a partir do draft_data da Action.

    Usa AbastecimentoSerializer internamente para garantir que toda a validação
    e lógica de negócio (cálculo de valor_total, sinal de saída de estoque)
    passe pelo mesmo caminho que o formulário do módulo Máquinas.
    """
    from apps.maquinas.serializers import AbastecimentoSerializer
    from ._base import save_via_serializer

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    # ── Resolver equipamento (nome → instância) ──────────────────────────────
    equipamento = _resolve_equipamento(tenant, data.get("maquina_nome", ""))

    # ── Quantidade em litros ─────────────────────────────────────────────────
    # Suporta campo explícito (novo tool) ou extração da descricao (tool antigo)
    quantidade_litros = _parse_decimal(data.get("quantidade_litros"), "0")
    if quantidade_litros == Decimal("0"):
        quantidade_litros = _extract_litros_from_descricao(data.get("descricao", ""))
    if not quantidade_litros or quantidade_litros <= Decimal("0"):
        raise ValueError(
            "Não foi possível determinar a quantidade de litros. "
            "Informe 'quantidade_litros' no draft_data."
        )

    # ── Valor unitário ───────────────────────────────────────────────────────
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

    # ── Produto do estoque (diesel / combustível) ─────────────────────────────
    # 3 estratégias em cascata:
    #  1. produto_estoque_id / produto_id  → busca por PK
    #  2. produto_combustivel / produto_nome / produto → busca por nome
    #  3. fallback: primeiro produto de categoria='combustivel' do tenant
    from apps.estoque.models import Produto as ProdutoEstoque
    produto_combustivel = None
    _produto_id = data.get("produto_estoque_id") or data.get("produto_id")
    if _produto_id:
        produto_combustivel = ProdutoEstoque.objects.filter(
            tenant=tenant, pk=_produto_id
        ).first()
    if not produto_combustivel:
        _produto_nome = (
            data.get("produto_combustivel")
            or data.get("produto_combustivel_nome")
            or data.get("produto_nome")
            or data.get("produto")
            or data.get("combustivel")
        )
        if _produto_nome:
            produto_combustivel = (
                ProdutoEstoque.objects.filter(
                    tenant=tenant, nome__iexact=_produto_nome
                ).first()
                or ProdutoEstoque.objects.filter(
                    tenant=tenant, nome__icontains=_produto_nome
                ).first()
            )
    if not produto_combustivel:
        # Busca por categoria: aceita 'combustivel', 'combustiveis_lubrificantes',
        # ou qualquer categoria que contenha 'combust'
        produto_combustivel = (
            ProdutoEstoque.objects.filter(
                tenant=tenant, categoria="combustivel"
            ).first()
            or ProdutoEstoque.objects.filter(
                tenant=tenant, categoria="combustiveis_lubrificantes"
            ).first()
            or ProdutoEstoque.objects.filter(
                tenant=tenant, categoria__icontains="combust"
            ).first()
        )
    if not produto_combustivel:
        # Último fallback: busca por nome contendo 'diesel' ou 'combustivel'
        produto_combustivel = (
            ProdutoEstoque.objects.filter(
                tenant=tenant, nome__icontains="diesel"
            ).first()
            or ProdutoEstoque.objects.filter(
                tenant=tenant, nome__icontains="combustível"
            ).first()
            or ProdutoEstoque.objects.filter(
                tenant=tenant, nome__icontains="combustivel"
            ).first()
        )
    if not produto_combustivel:
        logger.warning(
            "execute_abastecimento: produto_estoque não encontrado "
            "(tenant=%s). Saída de estoque não será gerada.",
            getattr(tenant, "pk", tenant),
        )

    # ── Outros campos ────────────────────────────────────────────────────────
    data_abastecimento = _parse_date(data.get("data", ""))
    horimetro = _parse_decimal(data.get("horimetro") or data.get("horas_trabalhadas"), "0")
    # Truncar para no máximo 1 casa decimal (AbastecimentoSerializer valida max_decimal_places=1)
    if horimetro:
        horimetro = horimetro.quantize(Decimal("0.1"))

    # ── Montar payload para o serializer (nome de campos conforme o modelo) ──
    serializer_data: dict = {
        "tenant": tenant.pk,
        "equipamento": equipamento.pk,
        "data_abastecimento": (
            data_abastecimento.strftime("%Y-%m-%d") if data_abastecimento else None
        ),
        "quantidade_litros": str(quantidade_litros),
        "valor_unitario": str(valor_unitario),
        "horimetro_km": str(horimetro) if horimetro > Decimal("0") else None,
        "local_abastecimento": data.get("local_abastecimento") or data.get("local", ""),
        "responsavel": data.get("responsavel") or data.get("tecnico", ""),
        "observacoes": data.get("observacoes", ""),
    }
    if produto_combustivel:
        serializer_data["produto_estoque"] = produto_combustivel.pk
    if criado_por:
        serializer_data["criado_por"] = criado_por.pk

    # AbastecimentoSerializer.create() wraps in transaction.atomic() and
    # computes valor_total; the post_save signal then creates the stock saída.
    ab = save_via_serializer(
        AbastecimentoSerializer,
        serializer_data,
        user=criado_por,
        tenant=tenant,
    )

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
    """
    Cria uma OrdemServico a partir do draft_data.

    Usa OrdemServicoSerializer internamente.  O create() desse serializer:
      • Gera número de OS único (via Model.save() com uuid suffix)
      • Valida e resolve insumos (produto_id / codigo / nome)
      • Cria movimentações de reserva de estoque (tipo='reserva') por insumo
      • Marca insumos_reservados=True
    Isso garante que a mesma lógica de negócio usada pelo frontend seja
    executada ao aprovar uma Action de IA.
    """
    from apps.maquinas.serializers import OrdemServicoSerializer
    from ._base import save_via_serializer

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    # Suporta draft_data de registrar_manutencao_maquina (maquina_nome) e
    # registrar_ordem_servico_maquina (equipamento)
    nome_eq = data.get("maquina_nome") or data.get("equipamento", "")
    equipamento = _resolve_equipamento(tenant, nome_eq)

    # ── Tipo de OS ───────────────────────────────────────────────────────────
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

    # ── Data prevista (opcional) ─────────────────────────────────────────────
    data_previsao_str = data.get("data_previsao") or data.get("data", "")
    data_previsao = _parse_date(data_previsao_str, fallback_now=False)

    # ── Status e data de conclusão ───────────────────────────────────────────
    status_os = (data.get("status") or "aberta").lower()
    status_map = {
        "concluida": "concluida", "concluído": "concluida",
        "finalizada": "concluida", "finalizado": "concluida",
        "aberta": "aberta", "em_andamento": "em_andamento",
        "pendente": "aberta", "cancelada": "cancelada",
    }
    status_os = status_map.get(status_os, "aberta")
    data_conclusao_os = None
    if status_os == "concluida":
        dt_conc = _parse_date(
            data.get("data_conclusao") or data.get("data", ""),
            fallback_now=True,
        )
        data_conclusao_os = dt_conc

    # ── Insumos (lista normalizada aceita pelo OrdemServicoSerializer) ───────
    # Cada item: {produto_id|codigo|nome, quantidade, valor_unitario (opcional)}
    insumos_raw = data.get("insumos", [])
    if isinstance(insumos_raw, str):
        import json as _json
        try:
            insumos_raw = _json.loads(insumos_raw)
        except Exception:
            insumos_raw = []
    if not isinstance(insumos_raw, list):
        insumos_raw = []

    # Se o draft_data inclui produto_insumo (campo de busca dinâmica no
    # modal de aprovação), monta um item de insumo a partir dele.
    _produto_insumo = data.get("produto_insumo")
    if _produto_insumo and isinstance(_produto_insumo, str) and _produto_insumo.strip():
        _qtd_insumo = data.get("quantidade_insumo")
        try:
            _qtd_val = float(_qtd_insumo) if _qtd_insumo else 1
        except (TypeError, ValueError):
            _qtd_val = 1
        # Só adiciona se não existir já um insumo com mesmo nome
        nomes_existentes = {
            (i.get("nome") or i.get("produto_nome") or "").lower()
            for i in insumos_raw if isinstance(i, dict)
        }
        if _produto_insumo.strip().lower() not in nomes_existentes:
            insumos_raw.append({
                "nome": _produto_insumo.strip(),
                "quantidade": _qtd_val,
            })

    # ── Montar payload para o serializer ────────────────────────────────────
    serializer_data: dict = {
        "tenant": tenant.pk,
        "equipamento": equipamento.pk,
        "tipo": tipo,
        "prioridade": prioridade,
        "status": status_os,
        "descricao_problema": descricao,
        "custo_mao_obra": str(custo_mao_obra),
        "data_previsao": (
            data_previsao.date().isoformat() if data_previsao else None
        ),
        "data_conclusao": (
            data_conclusao_os.isoformat() if data_conclusao_os else None
        ),
        "insumos": insumos_raw,
        "observacoes": data.get("observacoes", ""),
    }
    if criado_por:
        serializer_data["responsavel_abertura"] = criado_por.pk
        if status_os == "concluida":
            serializer_data["responsavel_execucao"] = criado_por.pk

    # OrdemServicoSerializer.create() handles:
    #  • numero_os generation (via Model.save uuid suffix)
    #  • insumos validation/resolution via validate_insumos()
    #  • stock reservation movements (create_movimentacao tipo='reserva')
    #  • insumos_reservados = True
    with transaction.atomic():
        os_obj = save_via_serializer(
            OrdemServicoSerializer,
            serializer_data,
            user=criado_por,
            tenant=tenant,
        )

    action.mark_executed({
        "ordem_servico_id": os_obj.pk,
        "numero_os": os_obj.numero_os,
        "equipamento": equipamento.nome,
        "tipo": tipo,
        "insumos_reservados": os_obj.insumos_reservados,
    })
    logger.info(
        "execute_ordem_servico OK: action=%s os=%s equipamento=%s insumos_reservados=%s",
        action.id, os_obj.numero_os, equipamento.nome, os_obj.insumos_reservados,
    )


# ─── Criar Equipamento ────────────────────────────────────────────────────────

def execute_criar_equipamento(action) -> None:
    """Cria um Equipamento a partir do draft_data."""
    from apps.maquinas.models import Equipamento, CategoriaEquipamento

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    with transaction.atomic():
        # Resolve categoria (por nome — usa ou cria, com proteção contra duplicatas)
        cat_nome = data.get("categoria", "Outros")
        try:
            categoria = CategoriaEquipamento.objects.filter(nome__iexact=cat_nome).first()
            if not categoria:
                categoria = CategoriaEquipamento.objects.create(
                    nome=cat_nome,
                    tipo_mobilidade="autopropelido",
                )
        except Exception:
            categoria = CategoriaEquipamento.objects.filter(nome__iexact=cat_nome).first()
            if not categoria:
                categoria = CategoriaEquipamento.objects.first()

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

    with transaction.atomic():
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
