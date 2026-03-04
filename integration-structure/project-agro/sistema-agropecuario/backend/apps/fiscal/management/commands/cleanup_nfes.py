from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction

try:
    from apps.fiscal.models import NFe
except Exception:
    NFe = None

CONFIRM_TOKEN = 'I CONFIRM DELETE NFES'

class Command(BaseCommand):
    help = 'Remove all NFes from DB (and cascade). Requires --confirm "%s". Only runs when DEBUG=True.' % CONFIRM_TOKEN

    def add_arguments(self, parser):
        parser.add_argument('--confirm', required=True, help='Confirmation token')

    def handle(self, *args, **options):
        # Safety: refuse to run if DEBUG is False
        if not getattr(settings, 'DEBUG', False):
            self.stderr.write('Refusing to run in non-debug environment. Set DEBUG=True to allow this command.')
            raise SystemExit(1)

        token = options.get('confirm')
        if token != CONFIRM_TOKEN:
            self.stderr.write('Confirmation token invalid. Use --confirm "I CONFIRM DELETE NFES"')
            raise SystemExit(1)

        if NFe is None:
            self.stderr.write('NFe model not available; aborting.')
            raise SystemExit(1)

        count = NFe.objects.count()
        if count == 0:
            self.stdout.write('No NFes to delete.')
            return

        self.stdout.write('Creating transaction and deleting %d NFe(s)...' % count)
        with transaction.atomic():
            NFe.objects.all().delete()
        self.stdout.write('Deleted %d NFe(s).' % count)
