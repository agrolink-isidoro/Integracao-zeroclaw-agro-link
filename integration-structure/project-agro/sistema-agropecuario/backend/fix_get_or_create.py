import os
import re

files = [
    'apps/financeiro/tests/test_parcelas_generation.py',
    'apps/financeiro/tests/test_financiamento_tipo_choices.py',
    'apps/financeiro/tests/test_vencimento_api.py',
    'apps/financeiro/tests/test_financiamento_fields.py'
]

for filepath in files:
    if not os.path.exists(filepath): continue
    with open(filepath, 'r') as f:
        content = f.read()

    # Change codigo_bacen='000', nome='Banco Test' to codigo_bacen='999', defaults={'nome': 'Banco Test'}
    content = re.sub(r'InstituicaoFinanceira\.objects\.get_or_create\(codigo_bacen=\'000\', nome=\'Banco Test\',? \)', 
                     "InstituicaoFinanceira.objects.get_or_create(codigo_bacen='999', defaults={'nome': 'Banco Test'})", content)
    content = re.sub(r'InstituicaoFinanceira\.objects\.create\(codigo_bacen=\'000\', nome=\'Banco Test\',? \)', 
                     "InstituicaoFinanceira.objects.get_or_create(codigo_bacen='999', defaults={'nome': 'Banco Test'})", content)

    # Some might use '001', '002' etc...
    # I'll just regex anything that looks like: InstituicaoFinanceira.objects.get_or_create(codigo_bacen=(.*?), nome=(.*?),? )
    def repl(m):
        code = m.group(1)
        name = m.group(2)
        return f"InstituicaoFinanceira.objects.get_or_create(codigo_bacen={code}, defaults={{'nome': {name}}})"
    
    content = re.sub(r'InstituicaoFinanceira\.objects\.get_or_create\(codigo_bacen=([^,]*), nome=([^,]*),?\s*\)', repl, content)
    
    with open(filepath, 'w') as f:
        f.write(content)

