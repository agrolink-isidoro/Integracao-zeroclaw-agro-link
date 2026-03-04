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
    if instance.pk:
        try:
            old = OrdemServico.objects.get(pk=instance.pk)
            instance._old_status = old.status
        except OrdemServico.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=OrdemServico)
def ordem_post_save(sender, instance, created, **kwargs):
    """Gere reservas de insumos ao criar e consuma insumos ao finalizar a OS."""

    # 1) Ao criar: reservas de insumos são gerenciadas pelo serializer.create()
    #    (que já tem error handling e rollback).
    #    Aqui apenas fazemos fallback para criações fora da API (admin, shell, etc.)
    if created:
        insumos = instance.insumos or []
        if insumos and not instance.insumos_reservados:
            with transaction.atomic():
                for ins in insumos:
                    try:
                        quantidade = ins.get('quantidade') or ins.get('qtd') or ins.get('quantidade_total')
                        if quantidade is None:
                            logger.warning("Insumo sem quantidade ignorado na reserva da OS %s: %s", instance.pk, ins)
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
                    except Exception:
                        logger.exception("Erro ao criar reserva de insumo na OS %s: %s", instance.pk, ins)
                        # Não propagar exceção para evitar erro 500 na API — reserva já é tratada pela camada de serializers
                        # Em contexto não-API a falha ficará registrada nos logs para investigação.
                        continue

                # Marca insumos como reservados
                instance.insumos_reservados = True
                instance.save(update_fields=['insumos_reservados'])

    # 2) Ao transitar para 'finalizada', consumir os insumos (saida)
    old = getattr(instance, '_old_status', None)
    new = instance.status

    if old == new:
        return

    # Consideramos 'concluida' como o status de conclusão (alinhado com STATUS_CHOICES)
    if new in ('concluida', 'finalizada'):
        # Processar insumos (esperamos lista de dicts com 'produto_id' ou 'codigo' e 'quantidade')
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
                        # Tentativa por nome
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
                        motivo=f"Consumo em OrdemServico #{instance.pk}: {getattr(instance, 'tarefa', getattr(instance, 'descricao_problema', ''))}",
                        ordem_servico=instance,
                    )
                    logger.info("Movimentacao de saida gerada para insumo %s na OS %s", produto.pk, instance.pk)
                except Exception:
                    logger.exception("Erro ao processar insumo na OS %s: %s", instance.pk, ins)
                    # Não propagar para evitar 500; errors serão registrados e podem ser tratados por jobs de reconciliação
                    continue

        return

    # 3) Se transitar para 'cancelada' e havia reservas, liberar reservas
    if new == 'cancelada' and instance.insumos_reservados:
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
                    # Não propagar para evitar 500; registrar e continuar
                    continue

            # Atualiza flag
            instance.insumos_reservados = False
            instance.save(update_fields=['insumos_reservados'])


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
