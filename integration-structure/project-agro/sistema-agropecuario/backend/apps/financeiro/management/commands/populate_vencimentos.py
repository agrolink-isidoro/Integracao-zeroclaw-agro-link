from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta, datetime
from decimal import Decimal
from django.db.models import Q
import random

from apps.financeiro.models import Vencimento, ContaBancaria


class Command(BaseCommand):
    help = 'Popula vencimentos de teste (datas entre 2026-01-20 e 2026-01-30) e limpa vencimentos sem descrição.'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=10, help='Número total de vencimentos a criar')
        parser.add_argument('--start', type=str, default='2026-01-20', help='Data inicial (YYYY-MM-DD)')
        parser.add_argument('--end', type=str, default='2026-01-30', help='Data final (YYYY-MM-DD)')
        parser.add_argument('--overdue', type=int, default=3, help='Quantidade de vencimentos atrasados (datas antes de hoje)')
        parser.add_argument('--dry-run', action='store_true', help='Mostrar o que seria feito sem alterar o banco')

    def handle(self, *args, **options):
        count = options['count']
        start_str = options['start']
        end_str = options['end']
        overdue_count = options['overdue']
        dry_run = options['dry_run']

        start_dt = date.fromisoformat(start_str)
        end_dt = date.fromisoformat(end_str)
        today = timezone.now().date()

        self.stdout.write(self.style.SUCCESS(f'Iniciando população de vencimentos ({count}) entre {start_str} e {end_str}, com {overdue_count} atrasados.'))

        # Limpando vencimentos sem descrição (descricao em branco ou nula)
        to_clean_qs = Vencimento.objects.filter(Q(descricao__isnull=True) | Q(descricao__exact=''))
        clean_count = to_clean_qs.count()
        if clean_count:
            self.stdout.write(f'Encontrados {clean_count} vencimentos sem descrição.' + (' (dry-run)' if dry_run else ' Deletando...'))
            if not dry_run:
                to_clean_qs.delete()
                self.stdout.write(self.style.SUCCESS(f'Deletados {clean_count} vencimentos sem descrição.'))
        else:
            self.stdout.write('Nenhum vencimento sem descrição encontrado.')

        # Criar contas bancárias de teste (se não existirem suficientes)
        existing_contas = list(ContaBancaria.objects.all()[:count])
        contas = existing_contas.copy()
        i = 1
        while len(contas) < count:
            banco_name = f'Banco Teste {i}'
            c = ContaBancaria.objects.create(banco=banco_name, agencia=f'000{i}', conta=f'1234{i}', saldo_inicial=Decimal(random.randrange(1000, 100000))/100)
            contas.append(c)
            i += 1

        self.stdout.write(self.style.SUCCESS(f'Usando {len(contas)} contas para criar vencimentos.'))

        # Build possible dates list
        delta = (end_dt - start_dt).days
        possible_dates = [start_dt + timedelta(days=d) for d in range(delta + 1)]

        created = []

        # Ensure first `overdue_count` are before today (choose earliest possible dates)
        overdue_dates = [d for d in possible_dates if d < today]
        overdue_dates = overdue_dates[:overdue_count]

        # If not enough past dates in the range (e.g., date window entirely >= today), force some early dates
        if len(overdue_dates) < overdue_count:
            # Create dates before start_dt
            extra_needed = overdue_count - len(overdue_dates)
            for j in range(extra_needed):
                overdue_dates.append(start_dt - timedelta(days=(j + 1)))

        # Remaining dates random from possible_dates
        remaining = count - len(overdue_dates)
        remaining_dates = []
        if remaining > 0:
            remaining_dates = random.choices(possible_dates, k=remaining)

        all_dates = overdue_dates + remaining_dates

        for idx in range(count):
            dt = all_dates[idx]
            conta = contas[idx % len(contas)]
            valor = Decimal(random.randrange(5000, 250000)) / Decimal(100)  # R$50.00 - R$2500.00
            titulo = f'Teste Vencimento Conta {conta.id} - {idx+1}'
            descricao = f'Vencimento gerado automaticamente para testes. Conta: {conta.banco} / {conta.conta} (id={conta.id}). Detalhes: pagamento de fornecedores.'
            status = 'atrasado' if dt < today else 'pendente'
            tipo = random.choice(['despesa', 'receita'])

            if dry_run:
                self.stdout.write(f'[DRY-RUN] Criar: {titulo} | {valor} | {dt} | status={status}')
                created.append({'titulo': titulo, 'valor': valor, 'data_vencimento': dt, 'status': status})
            else:
                v = Vencimento.objects.create(titulo=titulo, descricao=descricao, valor=valor, data_vencimento=dt, status=status, tipo=tipo)
                created.append(v)

        self.stdout.write(self.style.SUCCESS(f'Criados {len(created)} vencimentos de teste.'))
        for v in created[:10]:
            if dry_run:
                continue
            self.stdout.write(f' - id={v.id} titulo="{v.titulo}" data={v.data_vencimento} valor={v.valor} status={v.status}')

        self.stdout.write(self.style.SUCCESS('População finalizada.'))
