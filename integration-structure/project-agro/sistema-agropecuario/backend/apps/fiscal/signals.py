from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import NFe
from apps.financeiro.models import Vencimento


@receiver(post_save, sender=NFe)
def criar_vencimento_imposto(sender, instance, created, **kwargs):
    """
    Quando uma NFe é salva (created), cria vencimentos para:
    - Duplicatas (<cobr><dup>) extraídas do XML
    - Pagamentos (<pag><detPag>) quando não há duplicatas
    - ICMS retido (quando valor_icms > 0)
    
    Usa o service nfe_integrations.create_vencimentos_from_nfe.
    """
    if created:
        try:
            from .services.nfe_integrations import create_vencimentos_from_nfe
            user = getattr(instance, 'processado_por', None)
            vencimentos = create_vencimentos_from_nfe(instance, user=user)
            if vencimentos:
                import logging
                logging.getLogger(__name__).info(
                    'Created %d vencimentos for NFe %s', len(vencimentos), instance.chave_acesso
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                "Failed to create Vencimentos for NFe %s: %s", instance.chave_acesso, str(e)
            )


@receiver(post_save, sender=NFe)
def auto_create_cliente_from_nfe(sender, instance, created, **kwargs):
    """
    Quando uma NFe de saída (tipo_operacao='1') é criada,
    auto-cadastra o destinatário como Cliente se não existir.
    """
    if created and instance.tipo_operacao == '1':
        try:
            from .services.nfe_integrations import reflect_cliente_from_nfe
            user = getattr(instance, 'processado_por', None)
            cliente, cli_created, cli_updated, divergencias = reflect_cliente_from_nfe(
                instance, user=user
            )
            if cli_created:
                import logging
                logging.getLogger(__name__).info(
                    'Auto-created Cliente "%s" from NFe %s', 
                    cliente.nome, instance.chave_acesso
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                "Failed to auto-create Cliente from NFe %s: %s", instance.chave_acesso, str(e)
            )


@receiver(post_save, sender='fiscal.EmissaoJob')
def emission_stock_exit(sender, instance, **kwargs):
    """
    When an EmissaoJob succeeds (status='success'), create stock exit movements
    for all items in the related NFe (if tipo_operacao='1' = saída).
    """
    if instance.status != 'success':
        return
    try:
        from .services.nfe_integrations import create_stock_exit_from_emission
        nfe = instance.nfe
        movements = create_stock_exit_from_emission(nfe)
        if movements:
            import logging
            logging.getLogger(__name__).info(
                'Created %d stock exit movements from EmissaoJob %s (NFe %s)',
                len(movements), instance.id, nfe.chave_acesso
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(
            "Failed to create stock exits from EmissaoJob %s: %s", instance.id, str(e)
        )


# Signal to create/update ImpostoTrabalhista when a FolhaPagamento is executed
from django.db.models.signals import post_save as post_save2
from django.dispatch import receiver as receiver2
from decimal import Decimal
from django.utils import timezone


def process_folha_impostos(instance, force=False, dry_run=False):
    """Processa cálculo de INSS/IR/FGTS para uma `FolhaPagamento`.

    Args:
        instance: FolhaPagamento instance
        force: if True, recompute even when item fields are non-zero
        dry_run: if True, do not persist changes (used by management commands)

    Returns:
        dict with summary: {'items_updated': n, 'trabalhista_updated': bool, 'federais_updated': n}
    """
    itens = instance.itens.all()
    total_inss = Decimal('0')
    total_ir = Decimal('0')
    total_salario = Decimal('0')

    from apps.administrativo.utils import compute_inss, compute_ir
    items_updated = 0

    for it in itens:
        salario = it.salario_bruto or Decimal('0')
        total_salario += salario

        need_inss = force or (it.inss == Decimal('0'))
        need_ir = force or (it.ir == Decimal('0'))

        computed_inss = None
        computed_ir = None

        if need_inss or need_ir:
            computed_inss, _ = compute_inss(salario)
            dependentes = getattr(it.funcionario, 'dependentes', 0) if getattr(it, 'funcionario', None) else 0
            computed_ir, _ = compute_ir(salario, computed_inss, dependentes)

            if computed_inss is not None:
                computed_inss = computed_inss.quantize(Decimal('0.01'))
            if computed_ir is not None:
                computed_ir = computed_ir.quantize(Decimal('0.01'))

            if not dry_run:
                if need_inss and computed_inss is not None:
                    it.inss = computed_inss
                if need_ir and computed_ir is not None:
                    it.ir = computed_ir
                it.save(update_fields=[f for f in (['inss'] if need_inss and computed_inss is not None else []) + (['ir'] if need_ir and computed_ir is not None else [])])

            items_updated += 1

        total_inss += (it.inss or Decimal('0'))
        total_ir += (it.ir or Decimal('0'))

    total_fgts = (total_salario * Decimal('0.08')).quantize(Decimal('0.01'))

    competencia = None
    try:
        if instance.periodo_ano and instance.periodo_mes:
            competencia = timezone.datetime(year=instance.periodo_ano, month=instance.periodo_mes, day=1).date()
    except Exception:
        competencia = None

    trabal_created = False
    fed_created = 0

    if not dry_run:
        from .models_impostos import ImpostoTrabalhista, ImpostoFederal
        comp_date = competencia or timezone.now().date()
        ImpostoTrabalhista.objects.update_or_create(
            folha=instance,
            defaults={
                'competencia': competencia or timezone.now().date(),
                'inss': total_inss,
                'ir': total_ir,
                'fgts': total_fgts,
                'base_inss': total_salario,
                'base_ir': total_salario,
            }
        )
        # federais
        ImpostoFederal.objects.update_or_create(
            competencia=comp_date,
            tipo_imposto='INSS',
            folha=instance,
            defaults={'valor': total_inss, 'referencia': f'Folha {instance.id}'}
        )
        fed_created += 1
        ImpostoFederal.objects.update_or_create(
            competencia=comp_date,
            tipo_imposto='IR',
            folha=instance,
            defaults={'valor': total_ir, 'referencia': f'Folha {instance.id}'}
        )
        fed_created += 1
        trabal_created = True

    return {'items_updated': items_updated, 'trabalhista_updated': trabal_created, 'federais_updated': fed_created}


@receiver2(post_save2, sender='administrativo.FolhaPagamento')
def criar_imposto_trabalhista_para_folha(sender, instance, created, **kwargs):
    """Cria/atualiza `ImpostoTrabalhista` quando `FolhaPagamento.executado` é True."""
    try:
        if not getattr(instance, 'executado', False):
            return

        # Use helper to do the processing and persist
        process_folha_impostos(instance, force=False, dry_run=False)
    except Exception:
        import logging
        logging.getLogger(__name__).exception('Error creating/updating ImpostoTrabalhista for FolhaPagamento')