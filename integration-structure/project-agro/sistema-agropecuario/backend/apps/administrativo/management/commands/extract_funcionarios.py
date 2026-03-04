from django.core.management.base import BaseCommand, CommandError
import csv
import os

try:
    import pdfplumber
except Exception:
    pdfplumber = None

class Command(BaseCommand):
    help = 'Extract a simple table of employees from a PDF and write CSV: name,cpf,cargo,salario_bruto,dependentes'

    def add_arguments(self, parser):
        parser.add_argument('pdf_path', type=str, help='Path to PDF to extract')
        parser.add_argument('--out', type=str, help='Output CSV path (default: funcionarios_extracted.csv)', default='funcionarios_extracted.csv')

    def handle(self, *args, **options):
        pdf_path = options['pdf_path']
        out = options['out']
        if not os.path.exists(pdf_path):
            raise CommandError(f'PDF file not found: {pdf_path}')
        if pdfplumber is None:
            raise CommandError('pdfplumber library not installed. Please install it (pip install pdfplumber) to use this extractor.')

        rows = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                try:
                    table = page.extract_table()
                except Exception:
                    table = None
                if table:
                    for r in table:
                        rows.append(r)
                else:
                    # fallback to text parsing: split lines
                    text = page.extract_text() or ''
                    for line in text.splitlines():
                        parts = [p.strip() for p in line.split() if p.strip()]
                        if len(parts) >= 2:
                            # crude heuristic; write as single column
                            rows.append([line])

        # heuristics to map rows to columns is dataset specific
        # For now, write raw rows to CSV so user can review and edit
        with open(out, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['raw_row'])
            for r in rows:
                w.writerow([" | ".join([str(x) for x in r if x is not None])])

        self.stdout.write(self.style.SUCCESS(f'Wrote {len(rows)} rows to {out}'))
