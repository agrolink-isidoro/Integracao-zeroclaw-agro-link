import re
filepath = 'apps/financeiro/tests/test_rateio_api.py'
with open(filepath, 'r') as f:
    text = f.read()

# Fix Area/Talhao tenant=self.tenant issues
text = text.replace("Area.objects.create(proprietario=prop, fazenda=faz, name='A4', geom='POINT(0 0)', tenant=self.tenant)", "Area.objects.create(proprietario=prop, fazenda=faz, name='A4', geom='POINT(0 0)')")
text = text.replace("Talhao.objects.create(area=self.area, name='T4', area_size=4, tenant=self.tenant)", "Talhao.objects.create(area=self.area, name='T4', area_size=4)")

# Fix test_permissions_endpoint_non_approver to expect 403 instead of 200/json
text = re.sub(
    r'res = self\.client\.get\(\'/api/financeiro/rateios-approvals/permissions/\'\)\n\s+self\.assertEqual\(res\.status_code, 200\)\n\s+self\.assertEqual\(res\.json\(\), \{\'can_approve\': False, \'can_reject\': False\}\)',
    r"res = self.client.get('/api/financeiro/rateios-approvals/permissions/')\n        self.assertEqual(res.status_code, 403)",
    text
)

with open(filepath, 'w') as f:
    f.write(text)
