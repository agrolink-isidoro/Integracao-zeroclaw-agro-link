filepath = 'apps/financeiro/tests/test_vencimento_api.py'
with open(filepath, 'r') as f:
    text = f.read()
text = text.replace("self.user = User.objects.create_user(username='vuser', tenant=self.tenant, is_staff=True, is_superuser=True)", "self.user = User.objects.create_user(username='vuser', tenant=self.tenant, is_staff=True, is_superuser=True)\n        self.client.force_authenticate(self.user)")
with open(filepath, 'w') as f:
    f.write(text)
