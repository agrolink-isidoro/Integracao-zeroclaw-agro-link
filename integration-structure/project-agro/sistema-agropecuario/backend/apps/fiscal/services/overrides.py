import logging
from decimal import Decimal
from django.db import transaction
from apps.estoque.services import create_movimentacao
from apps.estoque.models import MovimentacaoEstoque, ProdutoAuditoria, Produto

logger = logging.getLogger(__name__)


def recalcular_custo_medio_produto(produto):
    """
    Recalcula o custo médio do produto baseado em todas as movimentações de entrada.
    Usa custo médio ponderado.
    """
    # Get all entrada movements with valor_unitario
    entradas = MovimentacaoEstoque.objects.filter(
        produto=produto, 
        tipo='entrada', 
        valor_unitario__isnull=False
    ).order_by('data_movimentacao', 'id')
    
    if not entradas:
        return
    
    total_custo = Decimal('0')
    total_quantidade = Decimal('0')
    
    for mov in entradas:
        quantidade = Decimal(str(mov.quantidade))
        valor_unitario = Decimal(str(mov.valor_unitario))
        custo_entrada = quantidade * valor_unitario
        
        total_custo += custo_entrada
        total_quantidade += quantidade
    
    if total_quantidade > 0:
        from decimal import ROUND_HALF_UP
        custo_medio = total_custo / total_quantidade
        # Quantize to 2 decimal places (currency precision)
        custo_medio = custo_medio.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        produto.custo_unitario = custo_medio
        produto.save(update_fields=['custo_unitario'])
        logger.debug('Recalculated produto %s custo_unitario to %s based on %d entradas', produto.id, custo_medio, len(entradas))


def apply_item_override(override, user=None, force=False):
    """Apply an ItemNFeOverride by adjusting stock to match the override values.

    Design principle:
      After applying, the product stock and cost should reflect the CURRENT state
      of the note (as corrected by the override). For a single NFe, the product
      quantity should equal the override quantity and the cost should equal the
      override valor_unitario.

    Strategy:
      1. Find the original MovimentacaoEstoque (origem='nfe') for the NFe/product.
         Its quantidade is the initial NFe quantity (never mutated).
      2. Delete ALL previous adjustment movements (origem='ajuste') for this
         NFe/product, reverting their stock effects.
      3. Compute delta = desired_qty - original_nfe_qty.
      4. If delta != 0, create ONE new adjustment movement.
      5. Update original_mov.valor_unitario to the new value (via queryset.update
         to avoid save() side-effects).
      6. Recalculate weighted-average cost from all entrada movements.
    """
    item = override.item
    nfe = item.nfe

    # Guard: skip if not applied and not forced
    if not getattr(override, 'aplicado', False) and not force:
        return

    # Guard: skip if NFe not confirmed
    if not getattr(nfe, 'estoque_confirmado', False):
        return

    # Resolve product
    try:
        produto = Produto.objects.get(codigo=item.codigo_produto)
    except Produto.DoesNotExist:
        raise ValueError(f'Produto with codigo {item.codigo_produto} not found')

    # Find original movimentacao (the one created by confirmar_estoque)
    original_mov = MovimentacaoEstoque.objects.filter(
        documento_referencia=nfe.chave_acesso,
        produto=produto,
        origem='nfe'
    ).order_by('id').first()

    if not original_mov:
        raise ValueError(
            f'No original MovimentacaoEstoque found for NFe {nfe.chave_acesso} '
            f'and produto {produto.id}'
        )

    # The original NFe quantity — we NEVER mutate this field
    original_nfe_qty = Decimal(original_mov.quantidade or 0)

    # Desired values from the override
    new_qty = (Decimal(override.quantidade)
               if override.quantidade is not None
               else Decimal(item.quantidade_comercial))
    new_val = (override.valor_unitario
               if override.valor_unitario is not None
               else (original_mov.valor_unitario or item.valor_unitario_comercial))

    # Lock product row for consistent stock updates
    produto = Produto.objects.select_for_update().get(pk=produto.pk)

    # ── Step 1: Delete ALL previous adjustments for this NFe/product ──
    # Their documento_referencia starts with the NFe chave_acesso + '#override-'
    prev_adjustments = MovimentacaoEstoque.objects.filter(
        produto=produto,
        origem='ajuste',
        documento_referencia__startswith=f"{nfe.chave_acesso}#override-"
    )
    for adj in prev_adjustments:
        # Reverse the stock effect manually (since delete() doesn't trigger save())
        if adj.tipo == 'entrada':
            produto.quantidade_estoque -= adj.quantidade
        elif adj.tipo == 'saida':
            produto.quantidade_estoque += adj.quantidade
    # Save reverted stock
    produto.save(update_fields=['quantidade_estoque'])
    # Now delete them (and their statements/audits cascade)
    prev_adjustments.delete()

    # ── Step 2: Update original_mov.valor_unitario if override provides one ──
    if override.valor_unitario is not None:
        MovimentacaoEstoque.objects.filter(pk=original_mov.pk).update(
            valor_unitario=Decimal(str(override.valor_unitario))
        )

    # ── Step 3: Create new adjustment if quantity differs from original NFe ──
    delta = new_qty - original_nfe_qty
    adjustments = []
    if delta != 0:
        tipo = 'entrada' if delta > 0 else 'saida'
        quantidade = abs(delta)
        mov = create_movimentacao(
            produto=produto,
            tipo=tipo,
            quantidade=quantidade,
            valor_unitario=new_val,
            criado_por=user,
            origem='ajuste',
            documento_referencia=f"{nfe.chave_acesso}#override-{override.id}",
            motivo=f"ajuste_por_override_{override.id}"
        )
        adjustments.append(mov)

    # ── Step 4: Recalculate product cost ──
    # Refresh produto after create_movimentacao may have changed it
    produto.refresh_from_db()
    recalcular_custo_medio_produto(produto)

    # If only valor changed (delta == 0) and recalcular didn't set it correctly
    # for a single-nfe scenario, set it directly
    if delta == 0 and override.valor_unitario is not None:
        from decimal import ROUND_HALF_UP
        produto.custo_unitario = Decimal(str(override.valor_unitario)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        produto.save(update_fields=['custo_unitario'])
        ProdutoAuditoria.objects.create(
            produto=produto,
            acao='atualizado',
            origem='nfe-override',
            nfe_numero=nfe.numero,
            nfe_serie=nfe.serie,
            nfe_chave_acesso=nfe.chave_acesso,
            produto_codigo=produto.codigo,
            produto_nome=produto.nome,
            produto_categoria=produto.categoria,
            produto_unidade=produto.unidade,
            quantidade=Decimal('0'),
            valor_unitario=override.valor_unitario,
            documento_referencia=f"{nfe.chave_acesso}#override-{override.id}",
            observacoes=f"Custo unitário definido via override fiscal: {override.motivo or ''}"[:200],
            criado_por=user
        )

    # Audit trail
    try:
        ProdutoAuditoria.objects.create(
            produto=produto,
            acao='aplicar_override',
            origem='nfe-override-apply',
            produto_codigo=produto.codigo,
            produto_nome=produto.nome,
            produto_categoria=produto.categoria,
            produto_unidade=produto.unidade,
            quantidade=abs(delta) if delta != 0 else Decimal('0'),
            valor_unitario=new_val,
            documento_referencia=f"{nfe.chave_acesso}#override-{override.id}",
            observacoes=(override.motivo or '')[:200],
            criado_por=user
        )
    except Exception:
        pass

    # Mark override as applied
    if not override.aplicado:
        override.aplicado = True
        override.save(update_fields=['aplicado'])

    return adjustments
