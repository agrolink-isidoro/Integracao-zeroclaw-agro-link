"""
Executors para o módulo Estoque.

Converte Actions aprovados em movimentações de estoque reais.
  criar_produto        → Produto
  criar_item_estoque   → Produto (alias)
  entrada_estoque      → Produto + MovimentacaoEstoque tipo 'entrada'
  saida_estoque        → MovimentacaoEstoque tipo 'saida'
  ajuste_estoque       → MovimentacaoEstoque tipo 'ajuste'
  movimentacao_interna → MovimentacaoEstoque tipo 'transferencia'
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


def _resolve_produto(tenant, nome: str, codigo: str = ""):
    from apps.estoque.models import Produto
    q = Produto.objects.filter(tenant=tenant)
    # 1. busca por código exato
    if codigo:
        p = q.filter(codigo__iexact=codigo).first()
        if p:
            return p
    if not nome:
        raise ValueError(
            "Produto não identificado: nome ou código não informado. "
            "Por favor, verifique se o produto foi cadastrado no módulo Estoque "
            "ou informe o nome/código correto do produto."
        )
    # 2. busca por nome exato
    p = q.filter(nome__iexact=nome).first()
    if not p:
        # 3. busca por nome parcial
        p = q.filter(nome__icontains=nome).first()
    if not p:
        # Listar produtos disponíveis para ajudar o usuário
        produtos_disponiveis = list(q.values_list('nome', flat=True)[:5])
        dica = ""
        if produtos_disponiveis:
            dica = f" Produtos disponíveis: {', '.join(produtos_disponiveis)}"
        raise ValueError(
            f"Produto '{nome}' não encontrado no sistema. "
            f"Verifique o nome do produto ou cadastre-o no módulo Estoque.{dica}"
        )
    return p


def _criar_produto_automatico(tenant, nome: str, unidade: str = "un", criado_por=None):
    """
    Cria um produto automaticamente com valores padrão se não existir.
    Útil para entrada_estoque quando o produto não foi previamente cadastrado.
    """
    from apps.estoque.models import Produto
    
    # Evitar duplicatas mesmo durante auto-criação
    existing = Produto.objects.filter(tenant=tenant, nome__iexact=nome).first()
    if existing:
        return existing
    
    # Gerar código automático
    count = Produto.objects.filter(tenant=tenant).count()
    codigo = f"AUTO-{count + 1:04d}"
    
    # Detectar categoria a partir do nome
    nome_lower = nome.lower()
    categoria = "outro"
    if any(word in nome_lower for word in ["diesel", "gasolina", "álcool", "combustível"]):
        categoria = "combustivel" if hasattr(Produto, 'CATEGORIA_CHOICES') else "outro"
    elif any(word in nome_lower for word in ["adubo", "fertilizante", "nutriente"]):
        categoria = "fertilizante" if hasattr(Produto, 'CATEGORIA_CHOICES') else "outro"
    elif any(word in nome_lower for word in ["agrotóxico", "defensivo", "pesticida", "herbicida"]):
        categoria = "defensivo" if hasattr(Produto, 'CATEGORIA_CHOICES') else "outro"
    
    produto = Produto.objects.create(
        tenant=tenant,
        codigo=codigo,
        nome=nome,
        unidade=unidade,
        categoria=categoria,
        quantidade_estoque=Decimal("0"),
        estoque_minimo=Decimal("0"),
        criado_por=criado_por,
    )
    
    logger.info(
        "Produto criado automaticamente: codigo=%s nome=%s categoria=%s unidade=%s",
        codigo, nome, categoria, unidade
    )
    
    return produto


def execute_entrada_estoque(action) -> None:
    """
    Registra entrada de estoque.
    Se o produto não existir, cria automaticamente com valores padrão (categoria detectada pelo nome).
    """
    from apps.estoque.services import create_movimentacao
    from apps.estoque.models import Produto

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    with transaction.atomic():
        nome_produto = data.get("nome_produto") or data.get("produto", "")
        codigo_produto = data.get("codigo_produto") or data.get("codigo", "")
        unidade = (data.get("unidade") or "un").strip()
        
        # Tentar resolver produto
        try:
            produto = _resolve_produto(tenant, nome_produto, codigo_produto)
        except ValueError:
            # Se não encontrou, criar automaticamente
            logger.info(
                "Produto não encontrado, criando automaticamente: %s", nome_produto
            )
            produto = _criar_produto_automatico(
                tenant=tenant,
                nome=nome_produto,
                unidade=unidade,
                criado_por=criado_por
            )

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
        "produto_criado_automaticamente": produto.codigo.startswith("AUTO-"),
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
        codigo_produto = data.get("codigo_produto") or data.get("codigo", "")
        produto = _resolve_produto(tenant, nome_produto, codigo_produto)

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


# ─── Criar Produto ────────────────────────────────────────────────────────────

def execute_criar_produto(action) -> None:
    """Cria um Produto de estoque a partir do draft_data."""
    from apps.estoque.models import Produto, LocalArmazenamento

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    nome = (data.get("nome") or data.get("nome_produto", "")).strip()
    if not nome:
        raise ValueError("Nome do produto é obrigatório.")

    with transaction.atomic():
        # Verificar duplicata
        existing = Produto.objects.filter(tenant=tenant, nome__iexact=nome).first()
        if existing:
            action.mark_executed({
                "produto_id": existing.pk,
                "nome": existing.nome,
                "mensagem": "Produto já existe com esse nome.",
                "ja_existia": True,
            })
            return

        # Gerar código automático se não informado
        codigo = data.get("codigo", "").strip()
        if not codigo:
            count = Produto.objects.filter(tenant=tenant).count()
            codigo = f"PROD-{count + 1:04d}"

        unidade = (data.get("unidade") or "un").strip()
        categoria = (data.get("categoria") or "outro").lower()

        # Validar categoria
        valid_cats = [c[0] for c in Produto.CATEGORIA_CHOICES]
        if categoria not in valid_cats:
            categoria = "outro"

        # Resolve local de armazenamento (opcional)
        local = None
        local_nome = data.get("local_armazenamento", "").strip()
        if local_nome:
            local = LocalArmazenamento.objects.filter(
                tenant=tenant, nome__icontains=local_nome
            ).first()

        produto = Produto(
            tenant=tenant,
            codigo=codigo,
            nome=nome,
            descricao=data.get("descricao", ""),
            unidade=unidade,
            categoria=categoria,
            quantidade_estoque=_parse_decimal(data.get("quantidade_inicial") or data.get("quantidade_estoque"), "0"),
            estoque_minimo=_parse_decimal(data.get("estoque_minimo"), "0"),
            custo_unitario=_parse_decimal(data.get("custo_unitario") or data.get("valor_unitario"), "0") or None,
            preco_venda=_parse_decimal(data.get("preco_venda"), "0") or None,
            principio_ativo=data.get("principio_ativo", ""),
            local_armazenamento=local,
            criado_por=criado_por,
        )
        produto.save()

    action.mark_executed({
        "produto_id": produto.pk,
        "nome": produto.nome,
        "codigo": produto.codigo,
        "unidade": produto.unidade,
        "categoria": produto.categoria,
    })
    logger.info("execute_criar_produto OK: action=%s produto=%s", action.id, produto.pk)


# Alias — criar_item_estoque usa o mesmo executor que criar_produto
execute_criar_item_estoque = execute_criar_produto


# ─── Ajuste de Estoque ────────────────────────────────────────────────────────

def execute_ajuste_estoque(action) -> None:
    """Registra um ajuste (inventário) de estoque."""
    from apps.estoque.services import create_movimentacao

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    with transaction.atomic():
        nome_produto = data.get("nome_produto") or data.get("produto", "")
        codigo_produto = data.get("codigo_produto") or data.get("codigo", "")
        produto = _resolve_produto(tenant, nome_produto, codigo_produto)

        quantidade = _parse_decimal(data.get("quantidade"), "0")
        if quantidade == Decimal("0"):
            raise ValueError("Quantidade do ajuste deve ser diferente de zero.")

        # Ajuste positivo → entrada, negativo → saída
        tipo = "entrada" if quantidade > Decimal("0") else "saida"
        quantidade_abs = abs(quantidade)

        mov = create_movimentacao(
            produto=produto,
            tipo=tipo,
            quantidade=quantidade_abs,
            criado_por=criado_por,
            origem="ajuste_inventario",
            motivo=data.get("motivo", "Ajuste de inventário via assistente Isidoro."),
            documento_referencia=data.get("documento_referencia", ""),
        )

    action.mark_executed({
        "movimentacao_id": str(getattr(mov, "pk", "?")),
        "produto": produto.nome,
        "tipo_ajuste": tipo,
        "quantidade": str(quantidade_abs),
    })
    logger.info("execute_ajuste_estoque OK: action=%s produto=%s tipo=%s qtd=%s", action.id, produto.nome, tipo, quantidade_abs)


# ─── Movimentação Interna ─────────────────────────────────────────────────────

def execute_movimentacao_interna(action) -> None:
    """Registra uma transferência interna entre locais de armazenamento."""
    from apps.estoque.services import create_movimentacao
    from apps.estoque.models import LocalArmazenamento

    data = action.draft_data
    tenant = action.tenant
    criado_por = action.criado_por

    with transaction.atomic():
        nome_produto = data.get("nome_produto") or data.get("produto", "")
        codigo_produto = data.get("codigo_produto") or data.get("codigo", "")
        produto = _resolve_produto(tenant, nome_produto, codigo_produto)

        quantidade = _parse_decimal(data.get("quantidade"), "0")
        if quantidade <= Decimal("0"):
            raise ValueError("Quantidade deve ser maior que zero.")

        # Registra como saída do local de origem e entrada no destino
        local_origem_nome = data.get("local_origem", "").strip()
        local_destino_nome = data.get("local_destino", "").strip()

        motivo_base = data.get("motivo", "Transferência interna via assistente Isidoro.")

        # Saída do origem
        mov_saida = create_movimentacao(
            produto=produto,
            tipo="saida",
            quantidade=quantidade,
            criado_por=criado_por,
            origem="transferencia_interna",
            motivo=f"[SAÍDA] {motivo_base} → Destino: {local_destino_nome or 'N/A'}",
        )

        # Entrada no destino
        local_destino = None
        if local_destino_nome:
            local_destino = LocalArmazenamento.objects.filter(
                tenant=tenant, nome__icontains=local_destino_nome
            ).first()

        mov_entrada = create_movimentacao(
            produto=produto,
            tipo="entrada",
            quantidade=quantidade,
            criado_por=criado_por,
            origem="transferencia_interna",
            motivo=f"[ENTRADA] {motivo_base} ← Origem: {local_origem_nome or 'N/A'}",
        )

    action.mark_executed({
        "movimentacao_saida_id": str(getattr(mov_saida, "pk", "?")),
        "movimentacao_entrada_id": str(getattr(mov_entrada, "pk", "?")),
        "produto": produto.nome,
        "quantidade": str(quantidade),
        "local_origem": local_origem_nome,
        "local_destino": local_destino_nome,
    })
    logger.info("execute_movimentacao_interna OK: action=%s produto=%s qtd=%s", action.id, produto.nome, quantidade)
