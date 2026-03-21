import re

filepath = 'apps/financeiro/tests/test_rateio_api.py'
with open(filepath, 'r') as f:
    text = f.read()

# Replace all duplicated ModulePermission injections
text = re.sub(
    r'(from apps\.core\.models import ModulePermission\n\s+ModulePermission\.objects\.create[^\n]+\n\s+)+',
    r"from apps.core.models import ModulePermission\n        ModulePermission.objects.get_or_create(user=approver, module='financeiro', defaults={'can_view':True, 'can_edit':True})\n        ",
    text
)

# Replace 'approver = User.objects.create_user(username='approver2', tenant=self.tenant)'
# Oh wait, my earlier regex didn't work because approver2 had is_staff=False already from my previous script!
# Let's just forcefully reset approvers
text = re.sub(
    r'approver2 = User\.objects\.create_user\(username=\'approver2\'.*?\)',
    r"approver2 = User.objects.create_user(username='approver2', tenant=self.tenant)",
    text
)

with open(filepath, 'w') as f:
    f.write(text)
