import re
import os

files = [
    'apps/financeiro/tests/test_parcelas_generation.py',
    'apps/financeiro/tests/test_financiamento_tipo_choices.py',
    'apps/financeiro/tests/test_vencimento_api.py'
]

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Revert the sed get_or_create change just in case
    content = content.replace('InstituicaoFinanceira.objects.get_or_create', 'InstituicaoFinanceira.objects.create')
    
    # Now replace properly:
    # self.instituicao = InstituicaoFinanceira.objects.create(...)
    # with
    # self.instituicao, _ = InstituicaoFinanceira.objects.get_or_create(...)
    content = re.sub(r'self\.instituicao\s*=\s*InstituicaoFinanceira\.objects\.create', 'self.instituicao, _ = InstituicaoFinanceira.objects.get_or_create', content)
    
    # instituicao = InstituicaoFinanceira.objects.create(...)
    # with
    # instituicao, _ = InstituicaoFinanceira.objects.get_or_create(...)
    content = re.sub(r'(?<!self\.)instituicao\s*=\s*InstituicaoFinanceira\.objects\.create', 'instituicao, _ = InstituicaoFinanceira.objects.get_or_create', content)

    with open(filepath, 'w') as f:
        f.write(content)

