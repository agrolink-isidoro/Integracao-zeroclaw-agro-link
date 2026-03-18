from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.db import transaction
import logging

from .models import OrdemServico, Manejo, Plantio, Colheita, Operacao, OperacaoProduto, MovimentacaoCarga, HarvestSession

logger = logging.getLogger(__name__)


# ============================================
# OPERAÇÃO AGRÍCOLA — INTEGRAÇÃO COM ESTOQUE
# ============================================

@receiver(pre_save, sender=Operacao)
def operacao_pre_save(sender, instance, **kwargs):
    """Guarda status anterior para detectar transições."""
    if instance.pk:
        try:
            old = Operacao.objects.get(pk=instance.pk)
            instance._old_status = old.status
        except Operacao.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=Operacao)
def operacao_stock_signal(sender, instance, created, **kwargs):
    """
    Integra Operacao agrícola com estoque:
    - Ao criar com status 'planejada': reserva insumos
    - Ao transitar para 'concluida': libera reservas + gera saídas
    - Ao transitar para 'cancelada': libera reservas
    """
    from apps.estoque.services import (
        reserve_operacao_stock,
        commit_reservations_for_operacao,
        release_reservations_for_operacao,
    )

    # Obter info de quem criou para auditoria
    criado_por = getattr(instance, 'criado_por', None) or getattr(instance, 'operador', None)

    # 1) Ao criar com produtos: reservar estoque
    if created:
        # Verificar se há produtos associados (pode ainda não ter sido salvo via M2M)
        # A reserva será feita via sinal post_save do OperacaoProduto se necessário
        # Mas se criadas em bulk (ex.: wizard), tentamos reservar agora
        try:
            if instance.produtos_operacao.exists() and instance.status == 'planejada':
                reserve_operacao_stock(instance, criado_por=criado_por)
                logger.info("Reserva de estoque criada para operacao %s", instance.pk)
        except ValidationError as e:
            logger.warning("Falha ao reservar estoque para operacao %s: %s", instance.pk, str(e))
            # Não propagar para evitar impedir criação; reserva pode ser feita manualmente
        except Exception:
            logger.exception("Erro inesperado na reserva de estoque para operacao %s", instance.pk)
        return

    # 2) Detectar transição de status
    old = getattr(instance, '_old_status', None)
    new = instance.status

    if old == new:
        return

    # Transição para 'concluida': libera reservas e gera saídas
    if new == 'concluida' and old in ('planejada', 'em_andamento'):
        try:
            with transaction.atomic():
                commit_reservations_for_operacao(instance, criado_por=criado_por)
            logger.info("Reservas confirmadas (saída gerada) para operacao %s", instance.pk)
        except ValidationError as e:
            logger.warning("Falha ao confirmar reservas para operacao %s: %s", instance.pk, str(e))
        except Exception:
            logger.exception("Erro inesperado ao confirmar reservas da operacao %s", instance.pk)

    # Transição para 'em_andamento' partindo de 'planejada': garantir que reservas existem
    elif new == 'em_andamento' and old == 'planejada':
        try:
            # Verificar se já há reservas; se não, criar
            from apps.estoque.models import MovimentacaoEstoque
            has_reservas = MovimentacaoEstoque.objects.filter(
                operacao=instance, tipo='reserva'
            ).exists()
            if not has_reservas and instance.produtos_operacao.exists():
                reserve_operacao_stock(instance, criado_por=criado_por)
                logger.info("Reserva de estoque criada (em_andamento) para operacao %s", instance.pk)
        except ValidationError as e:
            logger.warning("Falha ao reservar estoque (em_andamento) para operacao %s: %s", instance.pk, str(e))
        except Exception:
            logger.exception("Erro inesperado na reserva (em_andamento) da operacao %s", instance.pk)

    # Transição para 'cancelada': liberar reservas
    elif new == 'cancelada':
        try:
            from apps.estoque.models import MovimentacaoEstoque
            has_reservas = MovimentacaoEstoque.objects.filter(
                operacao=instance, tipo='reserva'
            ).exists()
            if has_reservas:
                release_reservations_for_operacao(instance, criado_por=criado_por)
                logger.info("Reservas liberadas por cancelamento para operacao %s", instance.pk)
        except ValidationError as e:
            logger.warning("Falha ao liberar reservas por cancelamento da operacao %s: %s", instance.pk, str(e))
        except Exception:
            logger.exception("Erro inesperado ao liberar reservas da operacao %s", instance.pk)


# ============================================
# OPERAÇÃO PRODUTO — TRIGGER RESERVA AO ADICIONAR PRODUTO
# ============================================

@receiver(post_save, sender=OperacaoProduto)
def operacao_produto_post_save(sender, instance, created, **kwargs):
    """
    Ao criar um OperacaoProduto, tenta reservar estoque se a operação está 'planejada'
    e ainda não existe reserva para esse produto nesta operação.
    Isso garante que a reserva acontece mesmo quando produtos são adicionados
    após a criação da Operação (ex: wizard que salva sequencialmente).
    """
    if not created:
        return

    operacao = instance.operacao
    if operacao.status != 'planejada':
        return

    # Verifica se já existe reserva para este produto nesta operação
    from apps.estoque.models import MovimentacaoEstoque
    already_reserved = MovimentacaoEstoque.objects.filter(
        operacao=operacao,
        produto=instance.produto,
        tipo='reserva'
    ).exists()

    if already_reserved:
        return

    try:
        from apps.estoque.services import create_movimentacao
        criado_por = getattr(operacao, 'criado_por', None) or getattr(operacao, 'operador', None)
        create_movimentacao(
            produto=instance.produto,
            tipo='reserva',
            quantidade=instance.quantidade_total,
            criado_por=criado_por,
            operacao=operacao,
            origem='agricultura',
            documento_referencia=f'Operação #{operacao.pk}',
            motivo=f'Reserva para Operação #{operacao.pk}: {operacao.get_tipo_display()}',
        )
        logger.info("Reserva de estoque criada via OperacaoProduto post_save para produto %s na operacao %s",
                     instance.produto.pk, operacao.pk)
    except ValidationError as e:
        logger.warning("Falha ao reservar produto %s via OperacaoProduto post_save (operacao %s): %s",
                       instance.produto.pk, operacao.pk, str(e))
    except Exception:
        logger.exception("Erro inesperado ao reservar produto %s via OperacaoProduto post_save (operacao %s)",
                         instance.produto.pk, operacao.pk)


# ============================================
# FINANÇA / RATEIO
# ============================================

@receiver(post_save, sender=Manejo)
def manejo_create_finance(sender, instance, created, **kwargs):
    # Criar rateio e vencimento para manejos com custo
    if instance.custo_total and not instance.contabilizado:
        try:
            from apps.financeiro.services import create_rateio_from_operacao
            user = instance.criado_por or instance.usuario_responsavel
            create_rateio_from_operacao(instance, created_by=user)
            instance.contabilizado = True
            instance.save(update_fields=['contabilizado'])
        except Exception:
            pass


@receiver(post_save, sender=Plantio)
def plantio_create_finance(sender, instance, created, **kwargs):
    # Criar rateio e vencimento para plantios com custo
    if instance.custo_total and not instance.contabilizado:
        try:
            from apps.financeiro.services import create_rateio_from_operacao
            user = instance.criado_por
            create_rateio_from_operacao(instance, created_by=user)
            instance.contabilizado = True
            instance.save(update_fields=['contabilizado'])
        except Exception:
            pass


@receiver(post_save, sender=Colheita)
def colheita_create_finance(sender, instance, created, **kwargs):
    # Criar rateio e vencimento para colheitas com custo
    if instance.custo_total and not instance.contabilizado:
        try:
            from apps.financeiro.services import create_rateio_from_operacao
            user = instance.criado_por
            create_rateio_from_operacao(instance, created_by=user)
            instance.contabilizado = True
            instance.save(update_fields=['contabilizado'])
        except Exception:
            pass


# ============================================
# MOVIMENTAÇÃO DE CARGA — CUSTO DE TRANSPORTE
# ============================================

@receiver(post_save, sender=MovimentacaoCarga, dispatch_uid='movimentacao_carga_post_save')
def movimentacao_carga_post_save(sender, instance, created, **kwargs):
    """Processa MovimentacaoCarga ao ser criada:
    1. Cria entrada de estoque (colheita)
    2. Cria rateio de custo de transporte
    """
    if not created:
        return

    # === 1. CRIAR ENTRADA DE ESTOQUE ===
    if instance.peso_liquido and instance.peso_liquido > 0:
        try:
            from decimal import Decimal
            from apps.estoque.services import create_movimentacao
            from apps.estoque.models import Produto, MovimentacaoEstoque
            
            # Extrair informações do plantio via session_item
            plantio = None
            if instance.session_item and instance.session_item.session:
                plantio = instance.session_item.session.plantio
            
            if plantio and plantio.cultura:
                # Procurar o Produto correspondente à Cultura
                try:
                    produto = Produto.objects.get(nome__icontains=plantio.cultura.nome)
                    
                    # Verificar idempotência
                    movimentacao_exists = MovimentacaoEstoque.objects.filter(
                        documento_referencia=f'MovimentacaoCarga #{instance.pk}',
                        tipo='entrada',
                        origem='colheita'
                    ).exists()
                    
                    if not movimentacao_exists:
                        # Determinar talhão
                        talhao = instance.session_item.talhao if instance.session_item else instance.talhao
                        
                        # Criar movimentação de estoque (entrada)
                        movimentacao = create_movimentacao(
                            produto=produto,
                            tipo='entrada',
                            quantidade=Decimal(str(instance.peso_liquido)),
                            criado_por=instance.criado_por,
                            origem='colheita',
                            talhao=talhao,
                            local_armazenamento=instance.local_destino,
                            documento_referencia=f'MovimentacaoCarga #{instance.pk}',
                            motivo=f"Entrada de colheita registrada via carga (plantio: {plantio.nome_safra})",
                        )
                        logger.info("Entrada de estoque criada para MovimentacaoCarga %s: %s %s de %s",
                                   instance.pk, instance.peso_liquido, produto.unidade, produto.nome)
                except Produto.DoesNotExist:
                    logger.warning("Produto para cultura %s (MovimentacaoCarga %s) não encontrado", 
                                  plantio.cultura.nome, instance.pk)
        except Exception as e:
            logger.exception("Erro ao criar entrada de estoque para MovimentacaoCarga %s: %s", instance.pk, str(e))

    # === 2. CRIAR RATEIO DE TRANSPORTE ===
    custo = getattr(instance, 'custo_transporte', None)
    if custo and float(custo) > 0:
        try:
            from django.utils import timezone
            from django.contrib.contenttypes.models import ContentType
            from apps.financeiro.models import RateioCusto

            plantio = None
            try:
                if instance.session_item and instance.session_item.session and instance.session_item.session.plantio:
                    plantio = instance.session_item.session.plantio
            except Exception:
                pass

            data_rateio = instance.criado_em.date() if instance.criado_em else timezone.now().date()
            rateio = RateioCusto.objects.create(
                titulo=f"Custo de Transporte - Movimentação #{instance.pk}",
                descricao=(
                    f"Custo de transporte da movimentação de carga #{instance.pk}"
                    f" (placa: {instance.placa or '?'})"
                ),
                valor_total=custo,
                data_rateio=data_rateio,
                criado_por=instance.criado_por,
                safra=plantio,
                destino='operacional',
            )
            ct = ContentType.objects.get_for_model(instance)
            RateioCusto.objects.filter(pk=rateio.pk).update(
                origem_content_type=ct,
                origem_object_id=instance.pk,
            )
            rateio.refresh_from_db()
            if instance.talhao:
                rateio.talhoes.add(instance.talhao)
            elif plantio:
                for t in plantio.talhoes.all():
                    rateio.talhoes.add(t)
            logger.info("Rateio de transporte criado para MovimentacaoCarga %s", instance.pk)
        except Exception:
            logger.exception("Erro ao criar rateio de transporte para MovimentacaoCarga %s", instance.pk)


# ============================================
# SESSÃO DE COLHEITA — FINALIZAÇÃO E KPI
# ============================================

@receiver(post_save, sender=HarvestSession)
def harvest_session_finalize_plantio(sender, instance, **kwargs):
    """Ao finalizar uma sessão de colheita, tenta finalizar o Plantio se todas as sessões estiverem encerradas."""
    if instance.status != 'finalizada':
        return
    try:
        plantio = instance.plantio
        # Verifica se ainda há sessões ativas para este plantio
        has_active = HarvestSession.objects.filter(
            plantio=plantio
        ).exclude(status__in=['finalizada', 'cancelada']).exists()
        if not has_active and plantio.status not in ('finalizada', 'colhida'):
            plantio.status = 'colhida'
            plantio.save(update_fields=['status'])
            logger.info("Plantio %s marcado como 'colhida' após finalização de todas as sessões", plantio.pk)
    except Exception:
        logger.exception("Erro ao tentar finalizar Plantio após sessão %s", instance.pk)

    # Invalida cache de KPIs do plantio
    try:
        from apps.agricultura.kpis import invalidate_safra_kpis_cache
        invalidate_safra_kpis_cache(instance.plantio_id)
    except Exception:
        pass


# ============================================
# OPERAÇÃO AGRÍCOLA — INVALIDAÇÃO DE CACHE KPI
# ============================================

@receiver(post_save, sender=Operacao)
def invalidate_kpis_on_operacao_save(sender, instance, **kwargs):
    """Invalida cache de KPIs da safra sempre que uma Operação agrícola é criada
    ou atualizada (ex.: custo_mao_obra, custo_maquina, custo_insumos alterados)."""
    try:
        from apps.agricultura.kpis import invalidate_safra_kpis_cache
        if instance.plantio_id:
            invalidate_safra_kpis_cache(instance.plantio_id)
    except Exception:
        pass