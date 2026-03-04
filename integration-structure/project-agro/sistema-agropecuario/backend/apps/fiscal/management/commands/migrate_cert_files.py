from django.core.management.base import BaseCommand, CommandError
from apps.fiscal.models_certificados import CertificadoSefaz
from apps.fiscal.crypto import encrypt_bytes


class Command(BaseCommand):
    help = 'Migrate existing CertificadoSefaz.arquivo files to encrypted storage (`arquivo_encrypted`).'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Do not persist changes; only report what would change')

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        qs = CertificadoSefaz.objects.exclude(arquivo='').filter(arquivo_encrypted__isnull=True)
        total = qs.count()
        self.stdout.write(f'Found {total} certificate files to migrate')
        migrated = 0
        failed = 0
        for cert in qs:
            try:
                # read file bytes
                # In some storages, calling open/read is necessary
                try:
                    cert.arquivo.open('rb')
                    data = cert.arquivo.read()
                finally:
                    try:
                        cert.arquivo.close()
                    except Exception:
                        pass

                token = encrypt_bytes(data)
                if not dry_run:
                    cert.arquivo_encrypted = token
                    cert.arquivo_name = cert.arquivo.name
                    # attempt to remove plaintext file (failure should not break migration, but must be logged)
                    try:
                        cert.arquivo.delete(save=False)
                    except Exception as delete_exc:
                        self.stderr.write(f'Warning: failed to delete plaintext file for cert id={cert.id}: {delete_exc}')
                    cert.arquivo = None
                    cert.save()
                migrated += 1

                # Create audit record for this certificate
                try:
                    from apps.fiscal.models_certificados import CertificadoActionAudit
                    import os
                    actor_ident = None
                    try:
                        actor_ident = os.getlogin()
                    except Exception:
                        actor_ident = None
                    CertificadoActionAudit.objects.create(action='migrate', certificado=cert, performed_by=None, performed_by_identifier=actor_ident, details=f"dry_run={dry_run}")
                except Exception:
                    # auditing should not break migration
                    pass
            except Exception as e:
                self.stderr.write(f'Failed to migrate cert id={cert.id}: {e}')
                failed += 1
        self.stdout.write(f'Migration complete. migrated={migrated} failed={failed} total={total}')
        if failed:
            raise CommandError(f'{failed} certificates failed to migrate')
