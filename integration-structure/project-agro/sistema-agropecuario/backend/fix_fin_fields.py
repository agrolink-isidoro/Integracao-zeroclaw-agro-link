import re
f = 'apps/financeiro/tests/test_financiamento_fields.py'
with open(f, 'r') as file: content = file.read()
content = content.replace('InstituicaoFinanceira.objects.create', 'InstituicaoFinanceira.objects.get_or_create')
content = re.sub(r'self\.instituicao\s*=\s*InstituicaoFinanceira\.objects\.get_or_create', 'self.instituicao, _ = InstituicaoFinanceira.objects.get_or_create', content)
content = re.sub(r'(?<!self\.)instituicao\s*=\s*InstituicaoFinanceira\.objects\.get_or_create', 'instituicao, _ = InstituicaoFinanceira.objects.get_or_create', content)
with open(f, 'w') as file: file.write(content)
