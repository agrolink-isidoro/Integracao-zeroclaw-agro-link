from django.core.management.base import BaseCommand, CommandError
import csv
from administrativo.models import Funcionario

class Command(BaseCommand):
    help = 'Import funcionarios from CSV with headers: nome,cpf,cargo,salario_bruto,dependentes'

    def add_arguments(self, parser):
        parser.add_argument('csv_path', type=str, help='Path to CSV')

    def handle(self, *args, **options):
        csv_path = options['csv_path']
        try:
            with open(csv_path, newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                created = 0
                skipped = 0
                for row in reader:
                    nome = (row.get('nome') or '').strip()
                    if not nome:
                        continue
                    if nome.lower() in ('hiasmin', 'elielson'):
                        self.stdout.write(self.style.WARNING(f'Skipping excluded name: {nome}'))
                        skipped += 1
                        continue
                    cpf = (row.get('cpf') or '').strip()
                    cargo = (row.get('cargo') or '').strip()
                    salario = row.get('salario_bruto') or '0'
                    dependentes = int(row.get('dependentes') or 0)

                    # prevent duplicates by cpf if provided, else by exact name
                    q = Funcionario.objects.filter(cpf=cpf) if cpf else Funcionario.objects.filter(nome__iexact=nome)
                    if q.exists():
                        self.stdout.write(self.style.WARNING(f'Exists, skipping: {nome}'))
                        skipped += 1
                        continue

                    Funcionario.objects.create(nome=nome, cpf=cpf or None, cargo=cargo or None, salario_bruto=salario, dependentes=dependentes)
                    created += 1
                self.stdout.write(self.style.SUCCESS(f'Imported {created} funcionarios, skipped {skipped} rows'))
        except FileNotFoundError:
            raise CommandError(f'CSV file not found: {csv_path}')
