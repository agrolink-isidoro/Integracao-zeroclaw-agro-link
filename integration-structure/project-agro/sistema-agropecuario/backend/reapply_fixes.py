import re

with open('apps/fiscal/tests/test_manifestacao_api.py', 'r') as f:
    content = f.read()

# Fix Fazenda.objects.get_or_create
content = re.sub(
    r'"localizacao":\s*"POINT\([^)]+\)",\s*"area_total":\s*100\.0,?',
    '',
    content
)

# Fix missing tenants
content = content.replace(
    'Manifestacao.objects.create(nfe',
    'Manifestacao.objects.create(tenant=self.tenant, nfe'
)

# User.objects.create(username -> User.objects.create(tenant=self.tenant, username
content = re.sub(
    r'User\.objects\.create\((?!tenant=)(.*?)\)',
    r'User.objects.create(tenant=self.tenant, \1)',
    content
)
# Make sure NFe gets tenant=self.tenant inside the test's setUp if not already there
# self.nfe = NFe.objects.create(...)
if "tenant=self.tenant" not in content.split("self.nfe = NFe.objects.create")[1].split("def test")[0]:
    content = content.replace("valor_nota='0',", "valor_nota='0',\n            tenant=self.tenant,")

with open('apps/fiscal/tests/test_manifestacao_api.py', 'w') as f:
    f.write(content)
