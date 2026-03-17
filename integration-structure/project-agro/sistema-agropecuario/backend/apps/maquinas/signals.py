from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.db import transaction
import logging

from .models import OrdemServico, Abastecimento
from apps.estoque.services import create_movimentacao
from apps.estoque.models import Produto

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Abastecimento)
def abastecimento_create_saida(sender, instance, created, **kwargs):
    """Cria uma MovimentacaoEstoque de tipo 'saida' quando há produto_estoque vinculado ao abastecimento."""
    if not created:
        return

    if not instance.produto_estoque:
        logger.debug("Abastecimento %s sem produto_estoque; ignorando criação de movimentacao.", getattr(instance, 'pk', None))
        return

    try:
        # A quantidade no estoque é em litros; assumimos que o produto do estoque usa mesma unidade
        create_movimentacao(
            produto=instance.produto_estoque,
            tipo='saida',
            quantidade=instance.quantidade_litros,
            valor_unitario=instance.valor_unitario,
            criado_por=instance.criado_por,
            origem='abastecimento',
            documento_referencia=f'Abastecimento #{instance.pk}',
            motivo=f'Abastecimento do equipamento {instance.equipamento.nome if instance.equipamento else ""}',
        )
        logger.info("Movimentacao de saida criada para Abastecimento %s", instance.pk)
    except ValidationError as e:
        logger.warning("Falha ao criar movimentacao para abastecimento %s: %s", instance.pk, str(e))
        # Não propagar — abastecimento já está salvo; registra aviso
        # A movimentação de estoque pode ser feita manualmente se necessário
    except Exception:
        logger.exception("Erro inesperado ao criar movimentacao para abastecimento %s", instance.pk)
        # Não propagar — evita 500; erro ficará registrado nos logs


@receiver(pre_save, sender=OrdemServico)
def ordem_pre_save(sender, instance, **kwargs):
    """Guarda status anterior antes do save para detectar transição."""
    logger.info('═══════════════════════════════════════════════════════════════')
    logger.info(f'🔵 [orden_pre_save] DISPARADO para OS id={instance.pk}')
    logger.info(f'   pk existe? {bool(instance.pk)}')
    logger.info(f'   status atual (memória): {instance.status}')
    
    if instance.pk:
        try:
            old = OrdemServico.objects.get(pk=instance.pk)
            instance._old_status = old.status
            logger.info(f'   status anterior (banco): {old.status}')
            logger.info(f'   TRANSIÇÃO? {old.status} → {instance.status}')
        except OrdemServico.DoesNotExist:
            instance._old_status = None
            logger.warning(f'   ⚠️ OS não encontrada no banco!')
    else:
        instance._old_status = None
        logger.info(f'   Criação nova (sem pk anterior)')
    logger.info('═══════════════════════════════════════════════════════════════')


@receiver(post_save, sender=OrdemServico)
def ordem_post_save(sender, instance, created, **kwargs):
    """
    Gerencia o ciclo completo de insumos:
    - Ao CRIAR: reserva insumos
    - Ao FINALIZAR (ou criada já finalizada): consome insumos (saida)
    - Ao CANCELAR: libera reservas
    """
    logger.info('═══════════════════════════════════════════════════════════════')
    logger.info(f'🟢 [ordem_post_save] DISPARADO para OS id={instance.pk}')
    logger.info(f'   created={created}')
    logger.info(f'   status={instance.status}')
    logger.info(f'   insumos_reservados={instance.insumos_reservados}')
    logger.info(f'   insumos count={len(instance.insumos or [])}')
    logger.info('═══════════════════════════════════════════════════════════════')

    if created:
        insumos = instance.insumos or []
        
        logger.info(
            "ordem_post_save CRIAÇÃO: OS %s status=%s insumos_count=%d insumos_reservados=%s",
            instance.pk, instance.status, len(insumos), instance.insumos_reservados
        )
        
        # 1) Reservar insumos (primeira vez que é executado)
        if insumos and not instance.insumos_reservados:
            logger.info("ordem_post_save: Iniciando reserva de insumos para OS %s", instance.pk)
            with transaction.atomic():
                for idx, ins in enumerate(insumos):
                    try:
                        quantidade = ins.get('quantidade') or ins.get('qtd') or ins.get('quantidade_total')
                        if quantidade is None:
                            logger.warning("Insumo #%d sem quantidade ignorado na reserva da OS %s: %s", idx+1, instance.pk, ins)
                            continue

                        produto = None
                        if 'produto_id' in ins:
                            produto = Produto.objects.filter(pk=ins['produto_id']).first()
                        elif 'codigo' in ins:
                            produto = Produto.objects.filter(codigo=ins['codigo']).first()
                        elif 'produto' in ins and isinstance(ins['produto'], dict) and ins['produto'].get('id'):
                            produto = Produto.objects.filter(pk=ins['produto']['id']).first()

                        if not produto:
                            nome = ins.get('nome') or ins.get('produto_nome')
                            if nome:
                                produto = Produto.objects.filter(nome__icontains=nome).first()

                        if not produto:
                            logger.warning("Produto não encontrado para reserva na OS %s: %s", instance.pk, ins)
                            continue

                        criado_por = getattr(instance, 'criado_por', None) or getattr(instance, 'responsavel_abertura', None)

                        logger.debug(
                            "ordem_post_save: Criando RESERVA insumo #%d produto=%s qtd=%s",
                            idx+1, produto.id, quantidade
                        )

                        create_movimentacao(
                            produto=produto,
                            tipo='reserva',
                            quantidade=quantidade,
                            valor_unitario=ins.get('valor_unitario') or produto.custo_unitario,
                            criado_por=criado_por,
                            origem='ordem_servico',
                            documento_referencia=f'OS #{instance.pk}',
                            motivo=f'Reserva para OrdemServico #{instance.pk}',
                            ordem_servico=instance,
                        )
                        logger.info("Movimentacao de reserva criada para insumo %s na OS %s", produto.pk, instance.pk)
                    except Exception as e:
                        logger.exception("Erro ao criar reserva de insumo #%d na OS %s. Detalhes: %s", idx+1, instance.pk, str(e))
                        continue

                # Marcar como reservado usando .update() para não dispara post_save recursivo
                logger.debug("ordem_post_save: Marcando insumos_reservados=True para OS %s", instance.pk)
                OrdemServico.objects.filter(pk=instance.pk).update(insumos_reservados=True)
                instance.insumos_reservados = True
                logger.info("ordem_post_save: Reservas de insumos concluídas para OS %s", instance.pk)
        else:
            # Se não houver insumos ou já foi reservado, marcar como reservado mesmo assim
            # (para evitar tentar reservar novamente)
            if not instance.insumos_reservados:
                logger.debug("ordem_post_save: Nenhum insumo ou já reservado. Apenas marcando flag para OS %s", instance.pk)
                OrdemServico.objects.filter(pk=instance.pk).update(insumos_reservados=True)
                instance.insumos_reservados = True

        # 2) SE foi criada DIRETO com status='concluida', consumir insumos agora
        # (este é o caso do action executor que cria com status final)
        # Agora insumos_reservados SEMPRE é True depois da seção acima
        logger.info(
            "ordem_post_save: Verificando se deve processar saída. "
            "status=%s, insumos_reservados=%s, qtd_insumos=%d",
            instance.status, instance.insumos_reservados, len(insumos)
        )
        
        if instance.status in ('concluida', 'finalizada') and instance.insumos_reservados:
            logger.info(
                "ordem_post_save: PROCESSANDO SAÍDA para OS %s status=%s insumos=%d",
                instance.pk, instance.status, len(insumos)
            )
            # Só processa insumos se houver
            if insumos:
                logger.info("ordem_post_save: Iniciando loop de insumos para saída...")
                with transaction.atomic():
                    for idx, ins in enumerate(insumos):
                        try:
                            quantidade = ins.get('quantidade') or ins.get('qtd') or ins.get('quantidade_total')
                            if quantidade is None:
                                logger.warning("Insumo sem quantidade ignorado na OS %s: %s", instance.pk, ins)
                                continue

                            produto = None
                            if 'produto_id' in ins:
                                produto = Produto.objects.filter(pk=ins['produto_id']).first()
                            elif 'codigo' in ins:
                                produto = Produto.objects.filter(codigo=ins['codigo']).first()
                            elif 'produto' in ins and isinstance(ins['produto'], dict) and ins['produto'].get('id'):
                                produto = Produto.objects.filter(pk=ins['produto']['id']).first()

                            if not produto:
                                nome = ins.get('nome') or ins.get('produto_nome')
                                if nome:
                                    produto = Produto.objects.filter(nome__icontains=nome).first()

                            if not produto:
                                logger.warning("Produto de insumo não encontrado para OS %s: %s", instance.pk, ins)
                                continue

                            criado_por = getattr(instance, 'criado_por', None) or getattr(instance, 'responsavel_abertura', None)

                            logger.debug(
                                "ordem_post_save: Criando saída insumo #%d. produto=%s, qtd=%s",
                                idx+1, produto.id, quantidade
                            )

                            create_movimentacao(
                                produto=produto,
                                tipo='saida',
                                quantidade=quantidade,
                                valor_unitario=ins.get('valor_unitario') or produto.custo_unitario,
                                criado_por=criado_por,
                                origem='manutencao',
                                documento_referencia=f'OS #{instance.pk}',
                                motivo=f"Consumo em OrdemServico #{instance.pk}: {getattr(instance, 'descricao_problema', '')}",
                                ordem_servico=instance,
                            )
                            logger.info("Movimentacao de saida criada para insumo %s na OS %s (criação_concluida)", produto.pk, instance.pk)
                        except Exception as e:
                            logger.exception("Erro ao criar saida de insumo #%d na OS %s. Detalhes: %s", idx+1, instance.pk, str(e))
                            continue
                logger.info("ordem_post_save: Loop de insumos concluído")
            else:
                logger.warning("ordem_post_save: Nenhum insumo para processar saída (lista vazia)")

            logger.info(
                "Ordem de serviço criada com status concluída: OS %s com %d insumos (reserva + saida geradas)",
                instance.pk, len(insumos)
            )
            return
        else:
            logger.debug(
                "ordem_post_save: NÃO processando saída. Condição falhou: status=%s (esperado concluida/finalizada), insumos_reservados=%s (esperado True)",
                instance.status, instance.insumos_reservados
            )

    # 3) Ao TRANSITAR para 'concluida' (transição manual: aberta -> concluida)
    old = getattr(instance, '_old_status', None)
    new = instance.status

    logger.info('🔷 [ordem_post_save] Analisando transições de status:')
    logger.info(f'   _old_status={old}, current status={new}')
    logger.info(f'   Há transição? {old != new}')
    logger.info(f'   É transição para concluida? {old != new and new in ("concluida", "finalizada")}')

    if old != new and new in ('concluida', 'finalizada'):
        logger.info(f'🟡 TRANSIÇÃO PARA CONCLUIDA: {old} → {new}')
        logger.info(f'   Processando saída de {len(instance.insumos or [])} insumos...')
        insumos = instance.insumos or []

        with transaction.atomic():
            for ins in insumos:
                try:
                    quantidade = ins.get('quantidade') or ins.get('qtd') or ins.get('quantidade_total')
                    if quantidade is None:
                        logger.warning("Insumo sem quantidade ignorado na OS %s: %s", instance.pk, ins)
                        continue

                    produto = None
                    if 'produto_id' in ins:
                        produto = Produto.objects.filter(pk=ins['produto_id']).first()
                    elif 'codigo' in ins:
                        produto = Produto.objects.filter(codigo=ins['codigo']).first()
                    elif 'produto' in ins and isinstance(ins['produto'], dict) and ins['produto'].get('id'):
                        produto = Produto.objects.filter(pk=ins['produto']['id']).first()

                    if not produto:
                        nome = ins.get('nome') or ins.get('produto_nome')
                        if nome:
                            produto = Produto.objects.filter(nome__icontains=nome).first()

                    if not produto:
                        logger.warning("Produto de insumo não encontrado para OS %s: %s", instance.pk, ins)
                        continue

                    criado_por = getattr(instance, 'criado_por', None) or getattr(instance, 'responsavel_abertura', None)

                    create_movimentacao(
                        produto=produto,
                        tipo='saida',
                        quantidade=quantidade,
                        valor_unitario=ins.get('valor_unitario') or produto.custo_unitario,
                        criado_por=criado_por,
                        origem='manutencao',
                        documento_referencia=f'OS #{instance.pk}',
                        motivo=f"Consumo em OrdemServico #{instance.pk}: {getattr(instance, 'descricao_problema', '')}",
                        ordem_servico=instance,
                    )
                    logger.info("Movimentacao de saida criada para insumo %s na OS %s (transicao_status)", produto.pk, instance.pk)
                except Exception:
                    logger.exception("Erro ao processar insumo na OS %s: %s", instance.pk, ins)
                    continue

        logger.info(
            "Ordem de serviço finalizada por transição: OS %s com %d insumos consumidos",
            instance.pk, len(insumos)
        )
        return

    # 4) Ao CANCELAR: liberar reservas
    if old != new and new == 'cancelada' and instance.insumos_reservados:
        insumos = instance.insumos or []
        with transaction.atomic():
            for ins in insumos:
                try:
                    quantidade = ins.get('quantidade') or ins.get('qtd') or ins.get('quantidade_total')
                    if quantidade is None:
                        logger.warning("Insumo sem quantidade ignorado na liberação da OS %s: %s", instance.pk, ins)
                        continue

                    produto = None
                    if 'produto_id' in ins:
                        produto = Produto.objects.filter(pk=ins['produto_id']).first()
                    elif 'codigo' in ins:
                        produto = Produto.objects.filter(codigo=ins['codigo']).first()
                    elif 'produto' in ins and isinstance(ins['produto'], dict) and ins['produto'].get('id'):
                        produto = Produto.objects.filter(pk=ins['produto']['id']).first()

                    if not produto:
                        nome = ins.get('nome') or ins.get('produto_nome')
                        if nome:
                            produto = Produto.objects.filter(nome__icontains=nome).first()

                    if not produto:
                        logger.warning("Produto não encontrado para liberação na OS %s: %s", instance.pk, ins)
                        continue

                    criado_por = getattr(instance, 'criado_por', None) or getattr(instance, 'responsavel_abertura', None)

                    create_movimentacao(
                        produto=produto,
                        tipo='liberacao',
                        quantidade=quantidade,
                        valor_unitario=ins.get('valor_unitario') or produto.custo_unitario,
                        criado_por=criado_por,
                        origem='ordem_servico',
                        documento_referencia=f'OS #{instance.pk}',
                        motivo=f'Liberação de reserva por cancelamento OS #{instance.pk}',
                        ordem_servico=instance,
                    )
                    logger.info("Movimentacao de liberacao criada para insumo %s na OS %s", produto.pk, instance.pk)
                except Exception:
                    logger.exception("Erro ao liberar insumo na OS %s: %s", instance.pk, ins)
                    continue

            # Atualiza flag usando update() para evitar post_save recursivo
            OrdemServico.objects.filter(pk=instance.pk).update(insumos_reservados=False)
            instance.insumos_reservados = False
            logger.info("Reservas liberadas para OS %s por cancelamento", instance.pk)


# ============================================
# MAQUINAS — RATEIO FINANCEIRO AUTOMÁTICO
# ============================================

@receiver(post_save, sender=Abastecimento)
def abastecimento_create_rateio(sender, instance, created, **kwargs):
    """
    Ao criar um abastecimento, distribui o custo proporcionalmente entre todas as
    safras em andamento (por área) criando um RateioCusto auto-aprovado por safra.
    """
    if not created:
        return
    if not instance.valor_total or instance.valor_total <= 0:
        return
    try:
        from apps.financeiro.services import create_rateios_proporcional_safras
        equip_nome = instance.equipamento.nome if instance.equipamento_id else 'Equipamento'
        data_ref = instance.data_abastecimento.date() if hasattr(instance.data_abastecimento, 'date') else instance.data_abastecimento
        create_rateios_proporcional_safras(
            valor=instance.valor_total,
            titulo='Combustivel - ' + equip_nome + ' #' + str(instance.pk),
            data=data_ref,
            source_obj=instance,
            destino='combustivel',
            created_by=instance.criado_por,
        )
        logger.info("Rateios de combustível criados para Abastecimento %s", instance.pk)
    except Exception:
        logger.exception("Erro ao criar rateios para Abastecimento %s", instance.pk)


@receiver(post_save, sender=OrdemServico)
def ordem_create_rateio(sender, instance, **kwargs):
    """
    Ao concluir uma OS, distribui o custo_total proporcionalmente entre todas as
    safras em andamento (por área) criando um RateioCusto auto-aprovado por safra.
    """
    old = getattr(instance, '_old_status', None)
    new = instance.status
    if old == new:
        return
    if new not in ('concluida', 'finalizada'):
        return
    if not instance.custo_total or instance.custo_total <= 0:
        return
    try:
        from apps.financeiro.services import create_rateios_proporcional_safras
        equip_nome = ''
        try:
            if instance.equipamento_id:
                equip_nome = f" - {instance.equipamento.nome}"
        except Exception:
            pass
        data_ref = None
        if instance.data_conclusao:
            data_ref = instance.data_conclusao.date() if hasattr(instance.data_conclusao, 'date') else instance.data_conclusao
        criado_por = getattr(instance, 'criado_por', None) or getattr(instance, 'responsavel_abertura', None)
        create_rateios_proporcional_safras(
            valor=instance.custo_total,
            titulo=f"Manutenção{equip_nome} OS#{instance.pk}",
            data=data_ref,
            source_obj=instance,
            destino='manutencao',
            created_by=criado_por,
        )
        logger.info("Rateios de manutenção criados para OS %s", instance.pk)
    except Exception:
        logger.exception("Erro ao criar rateios para OS %s", instance.pk)
