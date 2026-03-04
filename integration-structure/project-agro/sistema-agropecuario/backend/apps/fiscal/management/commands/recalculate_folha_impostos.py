from django.core.management.base import BaseCommand, CommandError
from apps.administrativo.models import FolhaPagamento

class Command(BaseCommand):
    help = 'Recalculate INSS/IR/FGTS for executed FolhaPagamento records. Use --dry-run to preview and --force to recompute existing values.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Do not persist changes; show what would be done')
        parser.add_argument('--competencia', type=str, help='Filter by competencia YYYY-MM (e.g., 2025-12)')
        parser.add_argument('--force', action='store_true', help='Force recomputation even if item values already present')
        parser.add_argument('--limit', type=int, help='Limit number of folhas to process')

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        comp = options.get('competencia')
        force = options.get('force', False)
        limit = options.get('limit')

        qs = FolhaPagamento.objects.filter(executado=True)

        if comp:
            try:
                year, month = comp.split('-')
                qs = qs.filter(periodo_ano=int(year), periodo_mes=int(month))
            except Exception:
                raise CommandError('competencia should be in YYYY-MM format')

        qs = qs.order_by('periodo_ano', 'periodo_mes')
        if limit:
            qs = qs[:limit]

        total = qs.count()
        self.stdout.write(self.style.MIGRATE_HEADING(f'Recalculating impostos for {total} folhas (dry_run={dry_run}, force={force})'))

        processed = 0
        from apps.fiscal.signals import process_folha_impostos

        for f in qs:
            res = process_folha_impostos(f, force=force, dry_run=dry_run)
            self.stdout.write(self.style.SQL_FIELD(f'Folha {f.id}: items_updated={res.get("items_updated")}, trabalhista_up={res.get("trabalhista_updated")}, federais_up={res.get("federais_updated")}'))
            processed += 1

        self.stdout.write(self.style.SUCCESS(f'Processed {processed} folhas'))
