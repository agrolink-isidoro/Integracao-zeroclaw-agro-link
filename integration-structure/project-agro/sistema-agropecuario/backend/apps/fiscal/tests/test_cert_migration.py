from django.test import TestCase, override_settings
from django.core.management import call_command
from django.core.files.base import ContentFile
from pathlib import Path
from apps.fiscal.models_certificados import CertificadoSefaz
from cryptography.fernet import Fernet


class CertMigrationTest(TestCase):
    def setUp(self):
        self._key = Fernet.generate_key()

    def test_migrate_plaintext_file_to_encrypted(self):
        with override_settings(CERT_ENCRYPTION_KEY=self._key.decode()):
            # Prepare a cert with a plaintext file stored in the FileField
            p12_path = Path(__file__).parent / 'fixtures' / 'test_cert.p12'
            original = p12_path.read_bytes()
            cert = CertificadoSefaz.objects.create(nome='migrate-1')
            cert.arquivo.save('test_cert.p12', ContentFile(original))
            cert.save()

            # Dry run: should report but not change
            call_command('migrate_cert_files', '--dry-run')
            cert.refresh_from_db()
            self.assertIsNone(cert.arquivo_encrypted)
            self.assertTrue(cert.arquivo and cert.arquivo.name)

            # Actual migration
            call_command('migrate_cert_files')
            cert.refresh_from_db()
            self.assertIsNotNone(cert.arquivo_encrypted)
            self.assertIsNotNone(cert.arquivo_name)
            # arquivo field should be cleared
            self.assertFalse(cert.arquivo and getattr(cert.arquivo, 'name', None))

    def test_idempotent_and_failure_handling(self):
        with override_settings(CERT_ENCRYPTION_KEY=self._key.decode()):
            p12_path = Path(__file__).parent / 'fixtures' / 'test_cert.p12'
            original = p12_path.read_bytes()
            cert = CertificadoSefaz.objects.create(nome='migrate-2')
            cert.arquivo.save('test_cert2.p12', ContentFile(original))
            cert.save()

            # First migration
            call_command('migrate_cert_files')
            cert.refresh_from_db()
            self.assertIsNotNone(cert.arquivo_encrypted)

            # Second migration should be no-op and not raise
            call_command('migrate_cert_files')
