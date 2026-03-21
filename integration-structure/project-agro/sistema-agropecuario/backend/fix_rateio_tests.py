import re

filepath = 'apps/financeiro/tests/test_rateio_api.py'
with open(filepath, 'r') as f:
    text = f.read()

# Fix RateioUpdateApprovalAPITests inheritance
text = re.sub(r'class RateioUpdateApprovalAPITests\(TestCase\):', 'class RateioUpdateApprovalAPITests(TenantTestCase):', text)

# Inject tenant and proper user creation in RateioUpdateApprovalAPITests setUp
setup_regex = r'(def setUp\(self\):\n\s+self\.client = APIClient\(\)\n\s+self\.user = User\.objects\.create_user\(username=\'updater\'\))'
replacement = """def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='updater', tenant=self.tenant, is_superuser=True)
        self.creator = User.objects.create_user(username='creator2', tenant=self.tenant)"""
text = re.sub(r'def setUp\(self\):\n\s+self.client = APIClient\(\)\n\s+self\.user = User\.objects\.create_user\(username=\'updater\'\)\n\s+self\.creator = User\.objects\.create_user\(username=\'creator2\'\)', replacement, text)

# Fix tenant issues for models in RateioUpdateApprovalAPITests
text = re.sub(r'Proprietario\.objects\.create\(nome=\'P4\', cpf_cnpj=\'444\'\)', r"Proprietario.objects.create(nome='P4', cpf_cnpj='444', tenant=self.tenant)", text)
text = re.sub(r'Fazenda\.objects\.create\(proprietario=prop, name=\'F4\', matricula=\'M4\'\)', r"Fazenda.objects.create(proprietario=prop, name='F4', matricula='M4', tenant=self.tenant)", text)
text = re.sub(r'Area\.objects\.create\(proprietario=prop, fazenda=faz, name=\'A4\', geom=\'POINT\(0 0\)\'\)', r"Area.objects.create(proprietario=prop, fazenda=faz, name='A4', geom='POINT(0 0)', tenant=self.tenant)", text)
text = re.sub(r'Talhao\.objects\.create\(area=self\.area, name=\'T4\', area_size=4\)', r"Talhao.objects.create(area=self.area, name='T4', area_size=4, tenant=self.tenant)", text)
text = re.sub(r'CentroCusto\.objects\.create\(codigo=\'API2\', nome=\'API Centro 2\'\)', r"CentroCusto.objects.create(codigo='API2', nome='API Centro 2', tenant=self.tenant)", text)
text = re.sub(r'Cultura\.objects\.create\(nome=\'Cultura4\'\)', r"Cultura.objects.create(nome='Cultura4', tenant=self.tenant)", text)
text = re.sub(r'Plantio\.objects\.create\(fazenda=faz, cultura=self\.cultura, data_plantio=timezone\.now\(\)\.date\(\)\)', r"Plantio.objects.create(fazenda=faz, cultura=self.cultura, data_plantio=timezone.now().date(), tenant=self.tenant)", text)
text = re.sub(r'RateioCusto\.objects\.create\(titulo=\'To Update\', descricao=\'\', valor_total=100\.00, criado_por=self\.creator\)', r"RateioCusto.objects.create(titulo='To Update', descricao='', valor_total=100.00, criado_por=self.creator, tenant=self.tenant)", text)
text = re.sub(r'DespesaAdministrativa\.objects\.create\(titulo=\'D1\', valor=500\.00, data=timezone\.now\(\)\.date\(\), centro=self\.centro, rateio=self\.rateio\)', r"DespesaAdministrativa.objects.create(titulo='D1', valor=500.00, data=timezone.now().date(), centro=self.centro, rateio=self.rateio, tenant=self.tenant)", text)

# Enforce is_staff=False, is_superuser=False for 'user1', 'approver', 'approver2', 'approver3', 'plain', 'group_approver'
text = re.sub(r'User\.objects\.create_user\(username=\'(user1|approver|approver2|approver3|plain|group_approver)\', tenant=self\.tenant\)', r"User.objects.create_user(username='\1', tenant=self.tenant, is_staff=False, is_superuser=False)", text)
text = re.sub(r'User\.objects\.create_user\(username=\'(user1|approver|approver2|approver3|plain|group_approver)\'\)', r"User.objects.create_user(username='\1', tenant=self.tenant, is_staff=False, is_superuser=False)", text)


with open(filepath, 'w') as f:
    f.write(text)
