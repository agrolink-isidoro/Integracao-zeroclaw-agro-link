from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from typing import Optional

from apps.administrativo.models import DespesaAdministrativa, LogAuditoria
from apps.financeiro.services import generate_rateio_from_despesa, create_rateio_from_despesa


class Command(BaseCommand):
    help = 'Backfill historical DespesaAdministrativa -> RateioCusto. Default: dry-run (no DB changes).'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='Actually create rateios (otherwise dry-run)')
        parser.add_argument('--batch-size', type=int, default=100, help='Number of despesas to process per batch')
        parser.add_argument('--limit', type=int, default=0, help='Limit total number of despesas to touch (0=no limit)')
        parser.add_argument('--date-from', type=str, help='ISO date (YYYY-MM-DD) filter: despesas >= date')
        parser.add_argument('--date-to', type=str, help='ISO date (YYYY-MM-DD) filter: despesas <= date')
        parser.add_argument('--only-auto-candidates', action='store_true', help='Only consider despesas that are likely to be auto-rateio candidates (have safra or centro category maintenance/transport/freight or auto_rateio=True)')

    def handle(self, *args, **options):
        apply_mode = options['apply']
        batch_size = options['batch_size']
        limit = options['limit']
        date_from = options.get('date_from')
        date_to = options.get('date_to')
        only_auto = options['only_auto_candidates']

        queryset = DespesaAdministrativa.objects.filter(rateio__isnull=True)

        if date_from:
            queryset = queryset.filter(data__gte=date_from)
        if date_to:
            queryset = queryset.filter(data__lte=date_to)

        if only_auto:
            queryset = queryset.filter(
                Q(auto_rateio=True) | Q(safra__isnull=False) | Q(centro__categoria__in=['manutencao', 'transporte', 'frete'])
            )

        total = queryset.count()
        self.stdout.write(f'Found {total} despesas without rateio to consider')

        processed = 0
        created = 0
        skipped = 0

        start_time = timezone.now()

        iterator = queryset.order_by('id').iterator()

        batch = []
        for despesa in iterator:
            if limit and processed >= limit:
                break
            batch.append(despesa)
            if len(batch) >= batch_size:
                p, c, s = self._process_batch(batch, apply_mode)
                processed += p
                created += c
                skipped += s
                batch = []

        if batch:
            p, c, s = self._process_batch(batch, apply_mode)
            processed += p
            created += c
            skipped += s

        elapsed = timezone.now() - start_time
        self.stdout.write(self.style.SUCCESS(f'Done: processed={processed}, created_rateios={created}, skipped={skipped}, elapsed={elapsed}'))

    def _process_batch(self, batch, apply_mode):
        processed = 0
        created = 0
        skipped = 0

        for despesa in batch:
            processed += 1
            # double-check idempotency
            if getattr(despesa, 'rateio', None) is not None:
                skipped += 1
                continue

            # Generate preview
            preview = generate_rateio_from_despesa(despesa)
            if not preview:
                skipped += 1
                continue

            if not apply_mode:
                self.stdout.write(f'[DRY] Despesa {despesa.id} would create rateio with {len(preview)} talhoes; total: {despesa.valor}')
                continue

            try:
                with transaction.atomic():
                    rateio = create_rateio_from_despesa(despesa, created_by=despesa.criado_por)
                    created += 1 if rateio else 0

                    # Log an audit entry
                    try:
                        LogAuditoria.objects.create(
                            usuario=despesa.criado_por,
                            acao='update',
                            modelo='DespesaAdministrativa',
                            objeto_id=despesa.id,
                            descricao=f'Backfilled rateio {rateio.id} para Despesa {despesa.id} by management command',
                            dados_anteriores={'rateio': None},
                            dados_novos={'rateio': rateio.id if rateio else None}
                        )
                    except Exception:
                        pass

                    self.stdout.write(self.style.SUCCESS(f'Created rateio {rateio.id} for Despesa {despesa.id}'))
            except Exception as exc:
                self.stderr.write(self.style.ERROR(f'Error creating rateio for Despesa {despesa.id}: {exc}'))

        return processed, created, skipped