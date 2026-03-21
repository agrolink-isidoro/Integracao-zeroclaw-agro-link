import re

with open('apps/fiscal/tests/test_manifestacao_api.py', 'r') as f:
    content = f.read()

content = content.replace(
    'Manifestacao.objects.create(nfe',
    'Manifestacao.objects.create(tenant=self.tenant, nfe'
)

# Replace all User.objects.create(username... with tenant inside
content = re.sub(
    r'User.objects.create\((?!tenant=)(.*?)\)',
    r'User.objects.create(tenant=self.tenant, \1)',
    content
)
content = re.sub(
    r'CustomUser.objects.create\((?!tenant=)(.*?)\)',
    r'CustomUser.objects.create(tenant=self.tenant, \1)',
    content
)

# NFe creation in setUp already has tenant=self.tenant, wait! Does it?
# In the original file, did it have tenant=self.tenant? Let's check!
with open('apps/fiscal/tests/test_manifestacao_api.py', 'w') as f:
    f.write(content)
