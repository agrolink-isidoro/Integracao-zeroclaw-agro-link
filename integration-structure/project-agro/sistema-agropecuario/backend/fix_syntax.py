import re

filepath = 'apps/financeiro/tests/test_rateio_api.py'
with open(filepath, 'r') as f:
    text = f.read()

# remove duplicate combinations
text = re.sub(r'is_superuser=False(?:,\s*is_superuser=False)+', 'is_superuser=False', text)
text = re.sub(r'(?:is_superuser=False,\s*)*(?:is_staff=False,\s*)*(?:is_superuser=False(?:,\s*)?)+', 'is_staff=False, is_superuser=False', text)
text = re.sub(r'is_staff=False, is_superuser=False(?:, is_staff=False, is_superuser=False)+', 'is_staff=False, is_superuser=False', text)
text = text.replace('is_staff=False, is_superuser=False, is_staff=False, is_superuser=False', 'is_staff=False, is_superuser=False')

with open(filepath, 'w') as f:
    f.write(text)
