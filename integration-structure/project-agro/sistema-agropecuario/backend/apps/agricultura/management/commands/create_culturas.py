from django.core.management.base import BaseCommand
from apps.agricultura.models import Cultura


class Command(BaseCommand):
    help = 'Cria culturas padrão para testes'

    def handle(self, *args, **options):
        culturas_padrao = [
            # Grãos
            {
                'nome': 'Soja',
                'tipo': 'graos',
                'descricao': 'Glycine max - Principal cultura de grãos do Brasil',
                'ciclo_dias': 120,
                'zoneamento_apto': True,
            },
            {
                'nome': 'Milho',
                'tipo': 'graos',
                'descricao': 'Zea mays - Cereal de grande importância econômica',
                'ciclo_dias': 140,
                'zoneamento_apto': True,
            },
            {
                'nome': 'Trigo',
                'tipo': 'graos',
                'descricao': 'Triticum aestivum - Cereal para panificação',
                'ciclo_dias': 130,
                'zoneamento_apto': True,
            },
            {
                'nome': 'Sorgo',
                'tipo': 'graos',
                'descricao': 'Sorghum bicolor - Resistente à seca',
                'ciclo_dias': 110,
                'zoneamento_apto': True,
            },
            {
                'nome': 'Feijão',
                'tipo': 'graos',
                'descricao': 'Phaseolus vulgaris - Leguminosa básica da alimentação',
                'ciclo_dias': 90,
                'zoneamento_apto': True,
            },
            {
                'nome': 'Arroz',
                'tipo': 'graos',
                'descricao': 'Oryza sativa - Cereal de base alimentar',
                'ciclo_dias': 150,
                'zoneamento_apto': True,
            },
            
            # Hortaliças
            {
                'nome': 'Tomate',
                'tipo': 'hortalicas',
                'descricao': 'Solanum lycopersicum - Fruto-hortaliça',
                'ciclo_dias': 120,
                'zoneamento_apto': True,
            },
            {
                'nome': 'Alface',
                'tipo': 'hortalicas',
                'descricao': 'Lactuca sativa - Folhosa',
                'ciclo_dias': 45,
                'zoneamento_apto': True,
            },
            {
                'nome': 'Cenoura',
                'tipo': 'hortalicas',
                'descricao': 'Daucus carota - Raiz tuberosa',
                'ciclo_dias': 90,
                'zoneamento_apto': True,
            },
            {
                'nome': 'Batata',
                'tipo': 'hortalicas',
                'descricao': 'Solanum tuberosum - Tubérculo',
                'ciclo_dias': 120,
                'zoneamento_apto': True,
            },
            
            # Fruticultura
            {
                'nome': 'Café',
                'tipo': 'fruticultura',
                'descricao': 'Coffea arabica - Cultura perene',
                'ciclo_dias': 365,
                'zoneamento_apto': True,
            },
            {
                'nome': 'Laranja',
                'tipo': 'fruticultura',
                'descricao': 'Citrus sinensis - Citricultura',
                'ciclo_dias': 365,
                'zoneamento_apto': True,
            },
            {
                'nome': 'Manga',
                'tipo': 'fruticultura',
                'descricao': 'Mangifera indica - Frutífera tropical',
                'ciclo_dias': 365,
                'zoneamento_apto': True,
            },
            
            # Outros
            {
                'nome': 'Cana-de-açúcar',
                'tipo': 'outros',
                'descricao': 'Saccharum officinarum - Cultura industrial',
                'ciclo_dias': 360,
                'zoneamento_apto': True,
            },
            {
                'nome': 'Algodão',
                'tipo': 'outros',
                'descricao': 'Gossypium hirsutum - Fibra têxtil',
                'ciclo_dias': 180,
                'zoneamento_apto': True,
            },
        ]

        criadas = 0
        existentes = 0

        for cultura_data in culturas_padrao:
            cultura, created = Cultura.objects.get_or_create(
                nome=cultura_data['nome'],
                defaults={
                    'tipo': cultura_data['tipo'],
                    'descricao': cultura_data['descricao'],
                    'ciclo_dias': cultura_data['ciclo_dias'],
                    'zoneamento_apto': cultura_data['zoneamento_apto'],
                }
            )
            
            if created:
                criadas += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Cultura criada: {cultura.nome} ({cultura.tipo})')
                )
            else:
                existentes += 1
                self.stdout.write(
                    self.style.WARNING(f'⊘ Cultura já existe: {cultura.nome}')
                )

        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS(f'Concluído! {criadas} culturas criadas, {existentes} já existiam.')
        )
