from django.core.management.base import BaseCommand
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Processa manifestações com status pending simulando envio bem-sucedido (para desenvolvimento)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Executa sem fazer mudanças no banco, apenas mostra o que seria processado',
        )

    def handle(self, *args, **options):
        from apps.fiscal.models_manifestacao import Manifestacao
        
        dry_run = options['dry_run']
        
        # Buscar manifestações pendentes
        manifestacoes_pendentes = Manifestacao.objects.filter(status_envio='pending').select_related('nfe')
        
        count = manifestacoes_pendentes.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('Nenhuma manifestação pendente encontrada.'))
            return
        
        self.stdout.write(f'Encontradas {count} manifestações pendentes:')
        
        for manifestacao in manifestacoes_pendentes:
            self.stdout.write(
                f'  - ID: {manifestacao.id}, NFe: {manifestacao.nfe.numero}, '
                f'Tipo: {manifestacao.tipo}, Criado em: {manifestacao.criado_em}'
            )
            
            if not dry_run:
                # Simular processamento bem-sucedido
                manifestacao.status_envio = 'sent'
                manifestacao.enviado = True
                manifestacao.enviado_em = timezone.now()
                manifestacao.resposta_sefaz = {
                    'success': True,
                    'cStat': '135',
                    'message': 'Evento registrado e vinculado a NF-e (SIMULADO)',
                    'simulated': True,
                    'processed_by': 'management_command'
                }
                manifestacao.save()
                
                self.stdout.write(
                    self.style.SUCCESS(f'    ✅ Manifestação {manifestacao.id} processada com sucesso')
                )
            else:
                self.stdout.write('    🔄 Seria processada (dry-run)')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'\nDry-run completo. {count} manifestações seriam processadas.')
            )
            self.stdout.write('Execute sem --dry-run para aplicar as mudanças.')
        else:
            self.stdout.write(
                self.style.SUCCESS(f'\n✅ {count} manifestações processadas com sucesso!')
            )