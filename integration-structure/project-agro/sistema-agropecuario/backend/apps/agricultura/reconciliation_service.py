"""
Serviço de reconciliação de movimentações de carga com estoque.

Responsável por:
- Sincronizar movimentações de carga (colheita) com o módulo de estoque
- Criar entradas de estoque automaticamente
- Gerar lotes e rastrear quantidade
"""

from apps.estoque.models import Produto, Lote
from apps.estoque.services import create_movimentacao
from apps.agricultura.models import Plantio
from django.utils import timezone


def reconcile_movimentacao_carga(movimentacao_carga, user=None):
    """
    Reconcilia uma MovimentacaoCarga com o estoque.
    
    Cria uma entrada no estoque (MovimentacaoEstoque) baseado na movimentação de carga.
    Retorna (sucesso: bool, mensagem: str, movimentacao_estoque_id: int or None)
    """
    if movimentacao_carga.reconciled:
        return False, 'Movimentação já reconciliada', None
    
    # 1) Encontrar o produto associado
    produto = _find_product(movimentacao_carga)
    if not produto:
        return False, 'Produto não encontrado para a movimentação', None
    
    # 2) Verificar peso
    quantidade = movimentacao_carga.peso_liquido or movimentacao_carga.peso_bruto
    if not quantidade:
        return False, 'Peso não informado para criar movimentação de estoque', None
    
    # 3) Encontrar fazenda
    fazenda = _find_fazenda(movimentacao_carga)
    
    # 4) Criar movimento no estoque baseado no destino_tipo
    try:
        if movimentacao_carga.destino_tipo in ['armazenagem_interna', 'armazenagem_externa', None]:
            movimentacao_estoque = _create_entrada_armazenagem(
                movimentacao_carga=movimentacao_carga,
                produto=produto,
                quantidade=quantidade,
                fazenda=fazenda,
                user=user
            )
        elif movimentacao_carga.destino_tipo == 'venda_direta':
            movimentacao_estoque = _create_saida_venda(
                movimentacao_carga=movimentacao_carga,
                produto=produto,
                quantidade=quantidade,
                fazenda=fazenda,
                user=user
            )
        else:
            # Fallback: treat as entrada
            movimentacao_estoque = _create_entrada_armazenagem(
                movimentacao_carga=movimentacao_carga,
                produto=produto,
                quantidade=quantidade,
                fazenda=fazenda,
                user=user
            )
        
        # 5) Marcar como reconciliada
        movimentacao_carga.reconciled = True
        movimentacao_carga.reconciled_at = timezone.now()
        movimentacao_carga.reconciled_by = user
        movimentacao_carga.save()
        
        return True, f'Movimentação reconciliada: {quantidade} kg de {produto.nome}', movimentacao_estoque.id
    
    except Exception as e:
        return False, f'Erro ao reconciliar: {str(e)}', None


def _find_product(movimentacao_carga):
    """Encontra o produto associado à movimentação."""
    produto = None
    
    # 1) Preferir produto via session -> plantio -> cultura
    try:
        if movimentacao_carga.session_item and movimentacao_carga.session_item.session:
            if movimentacao_carga.session_item.session.plantio:
                cultura_nome = movimentacao_carga.session_item.session.plantio.cultura.nome
                produto = Produto.objects.filter(nome__icontains=cultura_nome).first()
    except:
        pass
    
    # 2) Se não encontrou, tentar via talhão -> plantio mais recente -> cultura
    if not produto and movimentacao_carga.talhao:
        try:
            plantio = Plantio.objects.filter(talhoes=movimentacao_carga.talhao).order_by('-data_plantio').first()
            if plantio and plantio.cultura:
                cultura_nome = plantio.cultura.nome
                produto = Produto.objects.filter(nome__icontains=cultura_nome).first()
        except:
            pass
    
    # 3) Última tentativa: matching por nome do talhão
    if not produto and movimentacao_carga.talhao:
        try:
            produto = Produto.objects.filter(nome__icontains=movimentacao_carga.talhao.name).first()
        except:
            pass
    
    return produto


def _find_fazenda(movimentacao_carga):
    """Encontra a fazenda associada à movimentação."""
    fazenda = None
    try:
        if movimentacao_carga.session_item and movimentacao_carga.session_item.session:
            if movimentacao_carga.session_item.session.plantio:
                fazenda = movimentacao_carga.session_item.session.plantio.fazenda
    except:
        pass
    return fazenda


def _create_entrada_armazenagem(movimentacao_carga, produto, quantidade, fazenda, user):
    """Cria uma entrada no estoque para armazenagem."""
    # Determinar local de armazenagem
    local = movimentacao_carga.local_destino
    if not local and hasattr(produto, 'local_armazenamento'):
        local = produto.local_armazenamento
    
    # Criar lote
    lote = None
    if local:
        try:
            lote = Lote.objects.create(
                produto=produto,
                numero_lote=f'COL-{movimentacao_carga.id}',
                quantidade_inicial=quantidade,
                quantidade_atual=quantidade,
                local_armazenamento=local.nome if hasattr(local, 'nome') else str(local)
            )
        except:
            lote = None
    
    # Montar motivo descritivo
    motivo_text = f'Entrada a partir de movimentação de carga (MovimentacaoCarga #{movimentacao_carga.id})'
    try:
        if movimentacao_carga.session_item and movimentacao_carga.session_item.session:
            motivo_text += f' - Safra {movimentacao_carga.session_item.session.id}'
    except:
        pass
    
    if movimentacao_carga.empresa_destino:
        motivo_text += f'; destino: {movimentacao_carga.empresa_destino.nome}'
    
    # Criar movimentação de estoque
    movimentacao_estoque = create_movimentacao(
        produto=produto,
        tipo='entrada',
        quantidade=quantidade,
        criado_por=user,
        origem='colheita',
        lote=lote,
        documento_referencia=f'MovimentacaoCarga #{movimentacao_carga.id}',
        motivo=motivo_text,
        fazenda=fazenda,
        talhao=movimentacao_carga.talhao,
        local_armazenamento=local,
    )
    
    return movimentacao_estoque


def _create_saida_venda(movimentacao_carga, produto, quantidade, fazenda, user):
    """Cria uma saída no estoque para venda direta."""
    motivo = f'Saída por venda direta (MovimentacaoCarga #{movimentacao_carga.id})'
    if movimentacao_carga.empresa_destino:
        motivo += f' - comprador: {movimentacao_carga.empresa_destino.nome}'
    
    movimentacao_estoque = create_movimentacao(
        produto=produto,
        tipo='saida',
        quantidade=quantidade,
        criado_por=user,
        origem='venda',
        documento_referencia=f'MovimentacaoCarga #{movimentacao_carga.id}',
        motivo=motivo,
        fazenda=fazenda,
        talhao=movimentacao_carga.talhao,
    )
    
    return movimentacao_estoque
