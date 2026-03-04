from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import Group
from decimal import Decimal

from .models import RateioCusto, RateioApproval, Emprestimo
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError

from apps.administrativo.models import Notificacao


@receiver(post_save, sender=RateioCusto)
def create_rateio_approval(sender, instance: RateioCusto, created, **kwargs):
    """Auto-create RateioApproval for newly created RateioCusto.

    If the creator belongs to the `financeiro.rateio_approver` group, auto-approve.
    Also create per-user notifications for approvers so they get alerted in the UI.
    """
    if not created:
        return

    # Avoid creating if approval already exists
    try:
        if hasattr(instance, 'approval') and instance.approval is not None:
            return
    except Exception:
        pass

    approval = RateioApproval.objects.create(
        rateio=instance, 
        criado_por=getattr(instance, 'criado_por', None),
        tenant=getattr(instance, 'tenant', None)  # FIX: Ensure tenant isolation from RateioCusto
    )

    # Notify approvers (group members) about the new pending approval
    try:
        approver_group = Group.objects.filter(name='financeiro.rateio_approver').first()
        notified = False
        if approver_group:
            for u in approver_group.user_set.all():
                Notificacao.objects.create(
                    titulo=f'Rateio pendente #{instance.id}',
                    mensagem=f'Um novo rateio (#{instance.id}) aguarda sua aprovação.',
                    tipo='info',
                    prioridade='high',
                    usuario=u
                )
                notified = True
        if not notified:
            # fallback: notify superusers (first 3)
            from django.contrib.auth import get_user_model
            User = get_user_model()
            admins = User.objects.filter(is_superuser=True)[:3]
            for u in admins:
                Notificacao.objects.create(
                    titulo=f'Rateio pendente #{instance.id}',
                    mensagem=f'Um novo rateio (#{instance.id}) aguarda aprovação (nenhum aprovador configurado).',
                    tipo='info',
                    prioridade='high',
                    usuario=u
                )
    except Exception:
        # Do not block the signal if notification fails
        pass

    # Auto-approve if creator is in approver group
    creator = getattr(instance, 'criado_por', None)
    if creator:
        if creator.groups.filter(name='financeiro.rateio_approver').exists():
            approval.approve(creator, comentario='Auto-approved: creator in financeiro.rateio_approver')


@receiver(post_save, sender=RateioCusto)
def invalidate_safra_kpis_on_rateio(sender, instance: RateioCusto, **kwargs):
    """Invalida cache de KPIs quando um rateio vinculado a uma safra é criado/atualizado."""
    try:
        from apps.agricultura.kpis import invalidate_safra_kpis_cache
        safra_id = getattr(instance, 'safra_id', None)
        invalidate_safra_kpis_cache(safra_id)
    except Exception:
        pass


@receiver(post_save, sender=RateioApproval)
def invalidate_safra_kpis_on_approval(sender, instance: RateioApproval, **kwargs):
    """Invalida cache de KPIs quando status de aprovação muda."""
    try:
        from apps.agricultura.kpis import invalidate_safra_kpis_cache
        safra_id = getattr(instance.rateio, 'safra_id', None)
        invalidate_safra_kpis_cache(safra_id)
    except Exception:
        pass


# Validation handler to ensure Emprestimo cannot be created without cliente or instituicao
@receiver(pre_save, sender=Emprestimo)
def validate_emprestimo(sender, instance: Emprestimo, **kwargs):
    if not instance.cliente and not instance.instituicao_financeira:
        raise ValidationError('É necessário informar uma Instituição financeira ou um Cliente para criar um Empréstimo.')


# ============ SIGNALS PARA ITENS DE EMPRÉSTIMO ============

@receiver(post_save, sender='financeiro.ItemEmprestimo')
@receiver(post_delete, sender='financeiro.ItemEmprestimo')
def atualizar_valor_emprestimo_de_itens(sender, instance, **kwargs):
    """
    Atualiza automaticamente o valor_emprestimo quando itens de produto são
    adicionados, modificados ou removidos. Isso permite que o valor seja
    calculado dinamicamente com base na soma dos itens.
    """
    from .models import ItemEmprestimo
    from django.db.models import Sum, F, DecimalField
    
    emprestimo = instance.emprestimo
    
    # Calcular soma de todos os itens do empréstimo
    resultado = ItemEmprestimo.objects.filter(
        emprestimo=emprestimo
    ).aggregate(
        total=Sum(
            F('quantidade') * F('valor_unitario'),
            output_field=DecimalField(max_digits=15, decimal_places=2)
        )
    )
    
    novo_valor = resultado.get('total') or Decimal('0.00')
    
    # Se há itens, o valor foi calculado automaticamente
    # Se não há itens, respeitar o valor atual (permite criar empréstimo sem produtos)
    if emprestimo.valor_emprestimo != novo_valor:
        # Usar update() para evitar disparar signals novamente
        Emprestimo.objects.filter(id=emprestimo.id).update(
            valor_emprestimo=novo_valor
        )
