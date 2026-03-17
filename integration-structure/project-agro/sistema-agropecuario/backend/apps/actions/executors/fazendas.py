"""
Executors para o módulo Fazendas.

Converte Actions aprovados em registros reais:
  criar_proprietario      → fazendas.Proprietario
  criar_fazenda           → fazendas.Fazenda
  criar_area              → fazendas.Area
  criar_talhao            → fazendas.Talhao
  atualizar_talhao        → fazendas.Talhao (update)
  registrar_arrendamento  → fazendas.Arrendamento
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
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d/%m/%Y %H:%M", "%Y-%m-%dT%H:%M:%S"):
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


# ─── Criar Proprietário ──────────────────────────────────────────────────────

def execute_criar_proprietario(action) -> None:
    """
    Cria um Proprietario a partir do draft_data.

    Usa ProprietarioSerializer para validar CPF/CNPJ (dígitos verificadores)
    antes de gravar, evitando documentos inválidos no cadastro.
    O campo `tenant` é injetado manualmente porque não faz parte do serializer
    (é uma preocupação de infraestrutura, não de negócio).
    """
    from apps.fazendas.models import Proprietario
    from apps.fazendas.serializers import ProprietarioSerializer
    from ._base import validate_via_serializer

    data = action.draft_data
    tenant = action.tenant

    nome = data.get("nome", "").strip()
    cpf_cnpj = data.get("cpf_cnpj", "").strip()

    if not nome:
        raise ValueError("Nome do proprietário é obrigatório.")
    if not cpf_cnpj:
        raise ValueError("CPF/CNPJ do proprietário é obrigatório.")

    # Verificar duplicata antes de qualquer validação cara
    existing = Proprietario.objects.filter(cpf_cnpj=cpf_cnpj).first()
    if existing:
        action.mark_executed({
            "proprietario_id": existing.pk,
            "nome": existing.nome,
            "mensagem": "Proprietário já existente com esse CPF/CNPJ.",
            "ja_existia": True,
        })
        return

    # Valida CPF/CNPJ via ProprietarioSerializer (dígitos verificadores,
    # tamanho, etc.) — levanta ValueError se inválido.
    s = validate_via_serializer(
        ProprietarioSerializer,
        {
            "nome": nome,
            "cpf_cnpj": cpf_cnpj,
            "telefone": data.get("telefone", ""),
            "email": data.get("email", ""),
            "endereco": data.get("endereco", ""),
        },
        user=None,
        tenant=tenant,
    )

    # ProprietarioSerializer.Meta não inclui `tenant` — injetamos na criação.
    with transaction.atomic():
        prop = Proprietario(tenant=tenant, **s.validated_data)
        prop.save()

    action.mark_executed({
        "proprietario_id": prop.pk,
        "nome": prop.nome,
        "cpf_cnpj": prop.cpf_cnpj,
    })
    logger.info("execute_criar_proprietario OK: action=%s prop=%s", action.id, prop.pk)


# ─── Criar Fazenda ───────────────────────────────────────────────────────────

def execute_criar_fazenda(action) -> None:
    """Cria uma Fazenda a partir do draft_data.
    
    Suporta:
    - matricula: string simples (única)
    - matriculas: lista de strings (múltiplas)
    """
    from apps.fazendas.models import Fazenda, Proprietario, MatriculaFazenda

    data = action.draft_data
    tenant = action.tenant

    # Tenta "name" primeiro (campo real do modelo), depois "nome" (compatibilidade)
    nome = data.get("name") or data.get("nome", "")
    nome = nome.strip() if isinstance(nome, str) else ""

    if not nome:
        raise ValueError("Nome da fazenda é obrigatório.")

    # Processar matrículas (singular ou plural)
    matriculas_list = []
    
    # Tenta campo singular "matricula" (string ou lista)
    matricula = data.get("matricula")
    if matricula:
        if isinstance(matricula, str):
            matriculas_list = [m.strip() for m in matricula.split(",") if m.strip()]
        elif isinstance(matricula, list):
            matriculas_list = [m.strip() for m in matricula if m and isinstance(m, str)]
    
    # Tenta campo "matriculas" (lista)
    matriculas = data.get("matriculas")
    if matriculas and isinstance(matriculas, list):
        matriculas_list.extend([m.strip() for m in matriculas if m and isinstance(m, str)])
    
    # Remove duplicatas
    matriculas_list = list(dict.fromkeys(matriculas_list))
    
    if not matriculas_list:
        raise ValueError("Matrícula da fazenda é obrigatória. Forneça pelo menos uma matrícula.")

    with transaction.atomic():
        # Resolve proprietário
        prop_nome = data.get("proprietario", "").strip()
        if not prop_nome:
            raise ValueError("Nome do proprietário é obrigatório.")

        prop = Proprietario.objects.filter(tenant=tenant, nome__iexact=prop_nome).first()
        if not prop:
            prop = Proprietario.objects.filter(tenant=tenant, nome__icontains=prop_nome).first()
        if not prop:
            raise ValueError(f"Proprietário '{prop_nome}' não encontrado. Cadastre-o primeiro.")

        # Verificar se já existe fazenda com qualquer uma das matrículas
        for mat in matriculas_list:
            from apps.fazendas.models import MatriculaFazenda
            existing_mat = MatriculaFazenda.objects.filter(matricula=mat).first()
            if existing_mat:
                action.mark_executed({
                    "fazenda_id": existing_mat.fazenda.pk,
                    "nome": existing_mat.fazenda.name,
                    "mensagem": f"Matrícula '{mat}' já está associada a outra fazenda.",
                    "ja_existia": True,
                })
                return

        # Criar fazenda com a primeira matrícula como principal
        fazenda = Fazenda(
            tenant=tenant,
            proprietario=prop,
            name=nome,
            matricula=matriculas_list[0],  # Primeira como principal
        )
        fazenda.save()

        # Registrar todas as matrículas na tabela adicional
        for mat in matriculas_list:
            MatriculaFazenda.objects.create(
                tenant=tenant,
                fazenda=fazenda,
                matricula=mat,
                ativa=True,
            )

    action.mark_executed({
        "fazenda_id": fazenda.pk,
        "nome": fazenda.name,
        "proprietario": prop.nome,
        "matricula_principal": fazenda.matricula,
        "todas_matriculas": matriculas_list,
        "quantidade_matriculas": len(matriculas_list),
    })
    logger.info("execute_criar_fazenda OK: action=%s fazenda=%s matriculas=%s", action.id, fazenda.pk, matriculas_list)


# ─── Criar Área ──────────────────────────────────────────────────────────────

def execute_criar_area(action) -> None:
    """Cria uma Area a partir do draft_data."""
    from apps.fazendas.models import Area, Fazenda, Proprietario

    data = action.draft_data
    tenant = action.tenant

    # Aceita tanto "name" (enviado pelo tool) quanto "nome" (backup)
    nome = (data.get("name") or data.get("nome") or "").strip()
    if not nome:
        raise ValueError("Nome da área é obrigatório.")

    with transaction.atomic():
        # Resolve fazenda
        fazenda_nome = data.get("fazenda", "").strip()
        if not fazenda_nome:
            raise ValueError("Nome da fazenda é obrigatório.")

        fazenda = Fazenda.objects.filter(tenant=tenant, name__iexact=fazenda_nome).first()
        if not fazenda:
            fazenda = Fazenda.objects.filter(tenant=tenant, name__icontains=fazenda_nome).first()
        if not fazenda:
            raise ValueError(f"Fazenda '{fazenda_nome}' não encontrada.")

        tipo = data.get("tipo", "propria").lower()
        if tipo not in ("propria", "arrendada"):
            tipo = "propria"

        custo_arrendamento = _parse_decimal(data.get("custo_arrendamento"), "0") or None
        
        # Area hectares processing moved below
        # If user provided area in hectares, create an approximate geometry
        # so the `area_hectares` computed property on Area will report it.
        area_hectares = _parse_decimal(
            data.get("area_hectares") or data.get("area_ha") or data.get("area_size"),
            "0"
        ) or None

        geom_wkt = None
        if area_hectares:
            try:
                from apps.fazendas.serializers import AreaSerializer
                geom_wkt = AreaSerializer()._create_approximate_geometry_from_hectares(area_hectares)
            except Exception:
                geom_wkt = None

        area = Area(
            proprietario=fazenda.proprietario,
            fazenda=fazenda,
            name=nome,
            tipo=tipo,
            geom=geom_wkt,
            custo_arrendamento=custo_arrendamento if tipo == "arrendada" else None,
        )
        area.save()

    action.mark_executed({
        "area_id": area.pk,
        "nome": area.name,
        "fazenda": fazenda.name,
        "area_hectares": float(area_hectares) if area_hectares else 0,
        "tipo": tipo,
    })
    logger.info("execute_criar_area OK: action=%s area=%s area_hectares=%s", action.id, area.pk, area_hectares)


# ─── Criar Talhão ────────────────────────────────────────────────────────────

def execute_criar_talhao(action) -> None:
    """Cria um Talhao a partir do draft_data."""
    from apps.fazendas.models import Talhao, Area, Fazenda

    data = action.draft_data
    tenant = action.tenant

    nome = data.get("nome", "").strip()
    if not nome:
        raise ValueError("Nome do talhão é obrigatório.")

    with transaction.atomic():
        # Resolve área
        area_nome = data.get("area", "").strip()
        fazenda_nome = data.get("fazenda", "").strip()

        area = None
        if area_nome:
            qs = Area.objects.filter(fazenda__tenant=tenant)
            if fazenda_nome:
                qs = qs.filter(fazenda__name__icontains=fazenda_nome)
            area = qs.filter(name__iexact=area_nome).first()
            if not area:
                area = qs.filter(name__icontains=area_nome).first()

        if not area and fazenda_nome:
            # Cria na primeira área da fazenda
            fazenda = Fazenda.objects.filter(tenant=tenant, name__icontains=fazenda_nome).first()
            if fazenda:
                area = fazenda.areas.first()

        if not area:
            raise ValueError(
                "Não foi possível encontrar a Área para o talhão. "
                "Informe 'area' e/ou 'fazenda' no draft_data."
            )

        area_size = _parse_decimal(
            data.get("area_hectares") or data.get("area_size") or data.get("area_ha"), "0"
        ) or None

        talhao = Talhao(
            area=area,
            name=nome,
            area_size=area_size,
            custo_arrendamento=_parse_decimal(data.get("custo_arrendamento"), "0") or None,
        )
        talhao.save()

    action.mark_executed({
        "talhao_id": talhao.pk,
        "nome": talhao.name,
        "area": area.name,
        "fazenda": area.fazenda.name,
        "area_hectares": str(area_size) if area_size else None,
    })
    logger.info("execute_criar_talhao OK: action=%s talhao=%s", action.id, talhao.pk)


# ─── Atualizar Talhão ────────────────────────────────────────────────────────

def execute_atualizar_talhao(action) -> None:
    """Atualiza dados de um Talhao existente."""
    from apps.fazendas.models import Talhao

    data = action.draft_data
    tenant = action.tenant

    nome = data.get("nome", "").strip()
    if not nome:
        raise ValueError("Nome do talhão a atualizar é obrigatório.")

    talhao = Talhao.objects.filter(area__fazenda__tenant=tenant, name__iexact=nome).first()
    if not talhao:
        talhao = Talhao.objects.filter(area__fazenda__tenant=tenant, name__icontains=nome).first()
    if not talhao:
        raise ValueError(f"Talhão '{nome}' não encontrado.")

    updated_fields = []
    with transaction.atomic():
        novo_nome = data.get("novo_nome", "").strip()
        if novo_nome:
            talhao.name = novo_nome
            updated_fields.append("name")

        area_size = data.get("area_hectares") or data.get("area_size")
        if area_size:
            talhao.area_size = _parse_decimal(area_size)
            updated_fields.append("area_size")

        custo = data.get("custo_arrendamento")
        if custo:
            talhao.custo_arrendamento = _parse_decimal(custo)
            updated_fields.append("custo_arrendamento")

        if not updated_fields:
            raise ValueError("Nenhum campo para atualizar foi informado (novo_nome, area_hectares, custo_arrendamento).")

        talhao.save(update_fields=updated_fields)

    action.mark_executed({
        "talhao_id": talhao.pk,
        "nome": talhao.name,
        "campos_atualizados": updated_fields,
    })
    logger.info("execute_atualizar_talhao OK: action=%s talhao=%s fields=%s", action.id, talhao.pk, updated_fields)


# ─── Registrar Arrendamento ──────────────────────────────────────────────────

def execute_registrar_arrendamento(action) -> None:
    """Cria um Arrendamento a partir do draft_data."""
    from apps.fazendas.models import Arrendamento, Fazenda, Proprietario, Area

    data = action.draft_data
    tenant = action.tenant

    with transaction.atomic():
        # Resolve arrendador (dono da terra)
        arrendador_nome = data.get("arrendador", "").strip()
        if not arrendador_nome:
            raise ValueError("Nome do arrendador (dono da terra) é obrigatório.")
        arrendador = Proprietario.objects.filter(tenant=tenant, nome__icontains=arrendador_nome).first()
        if not arrendador:
            raise ValueError(f"Arrendador '{arrendador_nome}' não encontrado.")

        # Resolve arrendatário (quem paga)
        arrendatario_nome = data.get("arrendatario", "").strip()
        if not arrendatario_nome:
            raise ValueError("Nome do arrendatário é obrigatório.")
        arrendatario = Proprietario.objects.filter(tenant=tenant, nome__icontains=arrendatario_nome).first()
        if not arrendatario:
            raise ValueError(f"Arrendatário '{arrendatario_nome}' não encontrado.")

        # Resolve fazenda
        fazenda_nome = data.get("fazenda", "").strip()
        if not fazenda_nome:
            raise ValueError("Nome da fazenda é obrigatório.")
        fazenda = Fazenda.objects.filter(tenant=tenant, name__icontains=fazenda_nome).first()
        if not fazenda:
            raise ValueError(f"Fazenda '{fazenda_nome}' não encontrada.")

        # Datas
        start = _parse_date(data.get("data_inicio", ""), fallback_now=True)
        end = _parse_date(data.get("data_fim", ""), fallback_now=False)

        custo = _parse_decimal(data.get("custo_sacas_hectare", "0"))
        if custo <= 0:
            raise ValueError("Custo em sacas/hectare deve ser maior que zero.")

        arrendamento = Arrendamento(
            tenant=tenant,
            arrendador=arrendador,
            arrendatario=arrendatario,
            fazenda=fazenda,
            start_date=start.date() if hasattr(start, 'date') else start,
            end_date=end.date() if end and hasattr(end, 'date') else end,
            custo_sacas_hectare=custo,
        )
        arrendamento.save()

        # Vincular áreas se especificadas
        areas_nomes = data.get("areas", [])
        if isinstance(areas_nomes, str):
            areas_nomes = [a.strip() for a in areas_nomes.split(",") if a.strip()]
        for area_nome in areas_nomes:
            area = Area.objects.filter(fazenda=fazenda, name__icontains=area_nome).first()
            if area:
                arrendamento.areas.add(area)

    action.mark_executed({
        "arrendamento_id": arrendamento.pk,
        "arrendador": arrendador.nome,
        "arrendatario": arrendatario.nome,
        "fazenda": fazenda.name,
        "custo_sacas_hectare": str(custo),
    })
    logger.info("execute_registrar_arrendamento OK: action=%s arrendamento=%s", action.id, arrendamento.pk)
