from django.core.management.base import BaseCommand
from django.apps import apps
from datetime import date


class Command(BaseCommand):
    help = 'Cria cotações de exemplo para soja, milho, sorgo e trigo'

    def handle(self, *args, **options):
        CotacaoSaca = apps.get_model('fazendas', 'CotacaoSaca')
        
        # Deletar cotações antigas
        deleted = CotacaoSaca.objects.all().delete()
        if deleted[0] > 0:
            self.stdout.write(self.style.WARNING(f'🗑️  Removidas {deleted[0]} cotações antigas'))
        
        # Criar novas cotações (valores aproximados de dez/2024)
        cotacoes_data = [
            {'cultura': 'soja', 'data': date(2024, 12, 23), 'preco_por_saca': 142.50, 'fonte': 'Notícias Agrícolas'},
            {'cultura': 'milho', 'data': date(2024, 12, 23), 'preco_por_saca': 67.80, 'fonte': 'B3'},
            {'cultura': 'sorgo', 'data': date(2024, 12, 23), 'preco_por_saca': 52.00, 'fonte': 'Mercado Físico'},
            {'cultura': 'trigo', 'data': date(2024, 12, 23), 'preco_por_saca': 85.30, 'fonte': 'Agrolink'},
        ]
        
        for data in cotacoes_data:
            cotacao = CotacaoSaca.objects.create(**data)
            self.stdout.write(self.style.SUCCESS(f'✓ Criada: {cotacao}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ {len(cotacoes_data)} cotações criadas com sucesso!'))
