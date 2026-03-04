from django.core.management.base import BaseCommand
from apps.estoque.models import Localizacao, ProdutoArmazenado, Produto
from apps.estoque.services import EstoqueLocalizacaoService
from decimal import Decimal


class Command(BaseCommand):
    help = 'Test FASE 1 backend implementation'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== Testing FASE 1 Backend ===\n'))
        
        try:
            # Test 1: Create Localizacao
            self.stdout.write('1. Creating Localizacao...')
            loc = Localizacao.objects.create(
                nome="Test Armazém",
                tipo="interna",
                endereco="Test Address",
                capacidade_total=Decimal("1000.00"),
                capacidade_ocupada=Decimal("0.00"),
                ativa=True
            )
            self.stdout.write(self.style.SUCCESS(f'   ✓ Created: {loc}'))
            self.stdout.write(f'   - Capacidade disponível: {loc.capacidade_disponivel}')
            
            # Test 2: Service
            self.stdout.write('\n2. Testing Service...')
            service = EstoqueLocalizacaoService()
            service.atualizar_capacidade_localizacao(loc, Decimal("250.00"))
            loc.refresh_from_db()
            self.stdout.write(self.style.SUCCESS(f'   ✓ Updated capacity - Ocupada: {loc.capacidade_ocupada}'))
            
            # Test 3: URLs
            self.stdout.write('\n3. Testing URL registration...')
            from django.urls import reverse
            url1 = reverse('localizacao-list')
            url2 = reverse('produtoarmazenado-list')
            self.stdout.write(self.style.SUCCESS(f'   ✓ localizacao-list: {url1}'))
            self.stdout.write(self.style.SUCCESS(f'   ✓ produtoarmazenado-list: {url2}'))
            
            # Cleanup
            self.stdout.write('\n4. Cleaning up...')
            loc.delete()
            self.stdout.write(self.style.SUCCESS('   ✓ Cleanup complete'))
            
            self.stdout.write(self.style.SUCCESS('\n✓ All tests passed!\n'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n✗ Test failed: {e}\n'))
            import traceback
            traceback.print_exc()
