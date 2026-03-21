import re

with open('apps/fiscal/tests/test_manifestacao_api.py', 'r') as f:
    content = f.read()

content = content.replace(
    '''        self.client.force_authenticate(user=other)
        url = f'/api/fiscal/nfes/{self.nfe.id}/manifestacao/''' ,
    '''        self.client.force_authenticate(user=other)
        print("OTHER USER IN TEST:", other.username, other.is_staff, other.is_superuser)
        url = f'/api/fiscal/nfes/{self.nfe.id}/manifestacao/'''
)

with open('apps/fiscal/tests/test_manifestacao_api.py', 'w') as f:
    f.write(content)
