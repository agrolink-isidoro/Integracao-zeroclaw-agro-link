import re

filepath = '/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/project-agro/sistema-agropecuario/backend/apps/financeiro/tests/test_rateio_api.py'
with open(filepath, 'r') as f:
    text = f.read()

# Replace "localizacao" and "area_total" inside defaults dict
text = re.sub(r'"localizacao":\s*".*?",', '"tenant": self.tenant,', text)
text = re.sub(r'"area_total":\s*100\.0,', '', text)
text = re.sub(r'localizacao=\'POINT.*?\',', 'tenant=self.tenant,', text)
text = re.sub(r'area_total=100\.0,?', '', text)

with open(filepath, 'w') as f:
    f.write(text)
