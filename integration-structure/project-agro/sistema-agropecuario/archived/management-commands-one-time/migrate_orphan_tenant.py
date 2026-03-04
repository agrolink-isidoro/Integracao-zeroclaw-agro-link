"""
Management command: migrate_orphan_tenant

Atribui todos os registros com tenant=NULL ao tenant especificado por slug.

Uso:
    python manage.py migrate_orphan_tenant --target-slug fazenda-demo
    python manage.py migrate_orphan_tenant --target-slug fazenda-demo --dry-run
"""

from django.core.management.base import BaseCommand, CommandError
from django.apps import apps
from django.db import transaction


class Command(BaseCommand):
    help = "Move all records with tenant=NULL to the specified target tenant."

    def add_arguments(self, parser):
        parser.add_argument(
            "--target-slug",
            required=True,
            help="Slug of the target tenant (e.g. fazenda-demo)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Print what would be changed without actually changing anything.",
        )

    def handle(self, *args, **options):
        from apps.core.models import Tenant, TenantModel

        slug = options["target_slug"]
        dry_run = options["dry_run"]

        try:
            target = Tenant.objects.get(slug=slug)
        except Tenant.DoesNotExist:
            raise CommandError(f"Tenant with slug '{slug}' not found.")

        self.stdout.write(
            self.style.SUCCESS(
                f"\n{'[DRY RUN] ' if dry_run else ''}Target tenant: {target.nome} (id={target.id})\n"
            )
        )

        total_updated = 0
        summary = []

        with transaction.atomic():
            for app_config in sorted(apps.get_app_configs(), key=lambda a: a.label):
                for model in app_config.get_models():
                    if not (issubclass(model, TenantModel) and model is not TenantModel):
                        continue
                    if not hasattr(model, "tenant_id"):
                        continue

                    try:
                        qs = model.objects.filter(tenant__isnull=True)
                        count = qs.count()
                        if count == 0:
                            continue

                        label = f"{app_config.label}.{model.__name__}"
                        summary.append((label, count))
                        total_updated += count

                        if not dry_run:
                            qs.update(tenant=target)

                        self.stdout.write(
                            f"  {'(would update)' if dry_run else 'Updated':>16}  "
                            f"{count:>6} rows  →  {label}"
                        )
                    except Exception as e:
                        self.stderr.write(
                            self.style.ERROR(f"  ERROR on {app_config.label}.{model.__name__}: {e}")
                        )

            if dry_run:
                # Roll back so nothing is actually persisted
                transaction.set_rollback(True)

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"{'[DRY RUN] ' if dry_run else ''}Total: {total_updated} rows across {len(summary)} models "
                f"{'would be' if dry_run else 'were'} assigned to '{target.nome}'."
            )
        )
