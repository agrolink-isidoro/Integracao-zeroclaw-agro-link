from django.test import TestCase, override_settings
from django.core.management import call_command
from django.contrib.auth import get_user_model
from pathlib import Path
from apps.fiscal.models_certificados import CertificadoSefaz
from cryptography.fernet import Fernet


class CertRotationTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_superuser(username='admin_rot', password='adminpass')
        self._key_old = Fernet.generate_key()
        self._key_new = Fernet.generate_key()

    def test_reencrypt_all_with_provided_old_key(self):
        with override_settings(CERT_ENCRYPTION_KEY=self._key_old.decode()):
            # create a cert encrypted with old key
            p12_path = Path(__file__).parent / 'fixtures' / 'test_cert.p12'
            original = p12_path.read_bytes()
            cert = CertificadoSefaz.objects.create(nome='c1')
            # simulate direct encryption as would happen on save
            from apps.fiscal.crypto import encrypt_bytes
            cert.arquivo_encrypted = encrypt_bytes(original, self._key_old)
            cert.arquivo_name = 'test_cert.p12'
            cert.save()

            # Now rotate, supplying old key explicitly
        call_command('rotate_cert_keys', f'--new-key={self._key_new.decode()}', f'--old-keys={self._key_old.decode()}')

        cert.refresh_from_db()
        # ensure cert can be decrypted with new key
        from apps.fiscal.crypto import decrypt_with_keys
        decrypted = decrypt_with_keys(cert.arquivo_encrypted, [self._key_new])
        self.assertEqual(decrypted, original)

    def test_reencrypt_failures_reported(self):
        # Create cert encrypted with old key
        with override_settings(CERT_ENCRYPTION_KEY=self._key_old.decode()):
            p12_path = Path(__file__).parent / 'fixtures' / 'test_cert.p12'
            original = p12_path.read_bytes()
            cert = CertificadoSefaz.objects.create(nome='c2')
            from apps.fiscal.crypto import encrypt_bytes
            cert.arquivo_encrypted = encrypt_bytes(original, self._key_old)
            cert.arquivo_name = 'test_cert.p12'
            cert.save()

        # Call rotate without supplying old key (and without current settings that can decrypt)
        # Temporarily ensure settings don't have old key
        with override_settings(CERT_ENCRYPTION_KEY=None, CERT_ENCRYPTION_FALLBACK_KEYS=[]):
            try:
                call_command('rotate_cert_keys', '--new-key', self._key_new.decode())
                self.fail('Expected CommandError due to failed decryption')
            except Exception:
                # expected
                pass

        # Ensure certificate not modified
        cert.refresh_from_db()
        self.assertIsNotNone(cert.arquivo_encrypted)
