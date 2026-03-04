from django.core.management.base import BaseCommand
import csv
from pathlib import Path
from django.utils.dateparse import parse_date

from apps.comercial.models import InstituicaoFinanceira

SEGMENTO_MAP = {
    'banco comercial': 'banco_comercial',
    'banco múltiplo': 'banco_multiplo',
    'banco multiplo': 'banco_multiplo',
    'banco de investimento': 'banco_investimento',
    'sociedade de crédito': 'soc_credito',
    'financeira de desenvolvimento': 'financ_desenvolvimento',
    'caixa econômica': 'caixa_economica',
    'banco central': 'banco_central',
    'conglomerado': 'conglomerado',
    'outros': 'outros',
}


def map_segmento(s: str):
    if not s:
        return 'outros'
    key = s.lower().strip()
    return SEGMENTO_MAP.get(key, 'outros')


class Command(BaseCommand):
    help = 'Importa instituições do BACEN a partir de data/bacen_instituicoes.csv e atualiza/insere registros.'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default='data/bacen_instituicoes.csv', help='Path to CSV file')
        parser.add_argument('--dry-run', action='store_true', help='Do not write to DB; just report')
        parser.add_argument('--deactivate-missing', action='store_true', help='Mark as inativo institutions missing from CSV')

    def handle(self, *args, **options):
        path = Path(options['file'])
        if not path.exists():
            self.stderr.write(self.style.ERROR(f'File not found: {path}'))
            return

        rows = list(csv.DictReader(path.open(encoding='utf-8')))
        self.stdout.write(f'Reading {len(rows)} rows from {path}')

        seen = set()
        created = 0
        updated = 0

        for r in rows:
            codigo = (r.get('codigo_bacen') or r.get('Codigo') or r.get('codigo') or '').strip()
            if not codigo:
                continue
            seen.add(codigo)
            nome = r.get('nome') or r.get('Nome') or ''
            nome_reduz = r.get('nome_reduzido') or r.get('nome_reduzido') or ''
            segmento = map_segmento(r.get('segmento') or '')
            municipio = r.get('municipio') or ''
            uf = (r.get('uf') or r.get('UF') or '').strip()
            data_inicio = r.get('data_inicio_operacao') or r.get('DataInicioOperacao') or ''
            situacao = (r.get('situacao') or '').strip().lower()

            defaults = {
                'nome': nome,
                'nome_reduzido': nome_reduz,
                'segmento': segmento,
                'cidade': municipio,
                'estado': uf,
                'status': 'ativo' if situacao in ('ativo', 'ativa', 'operando') or situacao == '' else 'inativo'
            }
            if data_inicio:
                try:
                    defaults['data_inicio_operacao'] = parse_date(data_inicio)
                except Exception:
                    pass

            obj, was_created = InstituicaoFinanceira.objects.update_or_create(codigo_bacen=codigo, defaults=defaults)
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(f'Created: {created}, Updated: {updated}'))

        if options['deactivate_missing']:
            # mark as inativo institutions not in CSV
            qs = InstituicaoFinanceira.objects.exclude(codigo_bacen__in=seen).filter(status='ativo')
            count = qs.update(status='inativo')
            self.stdout.write(self.style.WARNING(f'Deactivated {count} institutions not present in CSV'))

        if options['dry_run']:
            self.stdout.write(self.style.WARNING('Dry run - no database changes were made'))
