from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from apps.fiscal.models_certificados import CertificadoSefaz
from apps.fiscal.crypto import reencrypt_bytes, _normalize_key


class Command(BaseCommand):
    help = 'Re-encrypt all CertificadoSefaz.arquivo_encrypted with a new key. Provide old keys if current key changed.'

    def add_arguments(self, parser):
        parser.add_argument('--new-key', required=True, help='New base64 Fernet key to re-encrypt with')
        parser.add_argument('--old-keys', required=False, help='Comma-separated list of old keys (base64) to try for decryption')
        parser.add_argument('--dry-run', action='store_true', help='Do not persist changes; only report what would change')

    def handle(self, *args, **options):
        new_key = options['new_key']
        old_keys_arg = options.get('old_keys')
        dry_run = options.get('dry_run', False)

        if not new_key:
            raise CommandError('Missing --new-key')

        new_key_b = _normalize_key(new_key)
        old_keys = []
        if old_keys_arg:
            for k in old_keys_arg.split(','):
                if k.strip():
                    old_keys.append(_normalize_key(k.strip()))
        else:
            # If not provided, use the current config key first and fallback list
            current = getattr(settings, 'CERT_ENCRYPTION_KEY', None)
            fallback = getattr(settings, 'CERT_ENCRYPTION_FALLBACK_KEYS', []) or []
            if current:
                old_keys.append(_normalize_key(current))
            for fk in fallback:
                old_keys.append(_normalize_key(fk))

        qs = CertificadoSefaz.objects.exclude(arquivo_encrypted__isnull=True)
        total = qs.count()
        self.stdout.write(f'Found {total} certificates with encrypted data')
        changed = 0
        failed = 0
        for cert in qs:
            try:
                token = bytes(cert.arquivo_encrypted)
                new_token = reencrypt_bytes(token, old_keys, new_key_b)
                if not dry_run:
                    cert.arquivo_encrypted = new_token
                    cert.save()
                changed += 1

                # Audit this rotation
                try:
                    from apps.fiscal.models_certificados import CertificadoActionAudit
                    import os
                    actor_ident = None
                    try:
                        actor_ident = os.getlogin()
                    except Exception:
                        actor_ident = None
                    CertificadoActionAudit.objects.create(action='rotate', certificado=cert, performed_by=None, performed_by_identifier=actor_ident, details=f"rotated_with_old_keys_provided={bool(old_keys_arg)}")
                except Exception:
                    # auditing non-fatal
                    pass
            except Exception as e:
                self.stderr.write(f'Failed to re-encrypt cert id={cert.id}: {e}')
                failed += 1

        self.stdout.write(f'Re-encryption complete. changed={changed} failed={failed} total={total}')
        if failed:
            raise CommandError(f'{failed} certificates failed to re-encrypt')
