from django.core.management.base import BaseCommand
from apps.fiscal.tasks import reconcile_manifestacoes_task


class Command(BaseCommand):
    help = 'Run reconcile manifestacoes (for transient cStat=136) immediately'

    def handle(self, *args, **options):
        # Call the task synchronously (useful for cron/management)
        result = reconcile_manifestacoes_task.__wrapped__()
        self.stdout.write(str(result))
