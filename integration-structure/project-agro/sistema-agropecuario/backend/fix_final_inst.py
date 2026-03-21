import re

f1 = 'apps/financeiro/tests/test_financiamento_fields.py'
with open(f1, 'r') as f: text = f.read()
text = re.sub(r'self\.inst = InstituicaoFinanceira\.objects\.get_or_create\(nome=\'Inst Test\', codigo_bacen=\'\d+\',? \)', 
              "self.inst, _ = InstituicaoFinanceira.objects.get_or_create(codigo_bacen='998', defaults={'nome': 'Inst Test'})", 
              text)
with open(f1, 'w') as f: f.write(text)

f2 = 'apps/financeiro/tests/test_vencimento_api.py'
with open(f2, 'r') as f: text = f.read()
text = re.sub(r'inst = InstituicaoFinanceira\.objects\.create\(nome=\'Inst Test\', codigo_bacen=\'(?:000|\d+)\'\)', 
              "inst, _ = InstituicaoFinanceira.objects.get_or_create(codigo_bacen='997', defaults={'nome': 'Inst Test'})", 
              text)
# if getting tuple, unpack it properly or maybe it's just 'inst'
# Let's double check if it's already get_or_create
text = re.sub(r'inst = InstituicaoFinanceira\.objects\.get_or_create\(nome=\'Inst Test\', codigo_bacen=\'(?:000|\d+)\'\)', 
              "inst, _ = InstituicaoFinanceira.objects.get_or_create(codigo_bacen='997', defaults={'nome': 'Inst Test'})", 
              text)
with open(f2, 'w') as f: f.write(text)
