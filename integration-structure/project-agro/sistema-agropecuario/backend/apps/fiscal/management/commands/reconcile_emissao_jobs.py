from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.fiscal.models_emissao import EmissaoJob


class Command(BaseCommand):
    help = 'Reconcilia EmissaoJob estagnados: marca como failed jobs que estão em processing por mais de X minutos'

    def add_arguments(self, parser):
        parser.add_argument('--stuck-minutes', type=int, default=30, help='Consider jobs processing > this minutes as stuck')

    def handle(self, *args, **options):
        stuck_minutes = options['stuck_minutes']
        cutoff = timezone.now() - timezone.timedelta(minutes=stuck_minutes)
        stuck_jobs = EmissaoJob.objects.filter(status='processing', updated_at__lt=cutoff)
        count = 0
        for job in stuck_jobs:
            job.mark_failed('stuck_processing')
            count += 1
        self.stdout.write(f'Reconciled {count} stuck jobs')
