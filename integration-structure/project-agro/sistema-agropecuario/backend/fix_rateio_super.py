import re

filepath = 'apps/financeiro/tests/test_rateio_api.py'
with open(filepath, 'r') as f:
    text = f.read()

# Fix super().setUp()
text = text.replace("def setUp(self):\n        self.client", "def setUp(self):\n        super().setUp()\n        self.client")

# Give module permission in test_approver_can_approve
# and test_permissions_endpoint_approver
text = re.sub(
    r'(approver\.groups\.add\(group\))', 
    r"\1\n        from apps.core.models import ModulePermission\n        ModulePermission.objects.create(user=approver, module='financeiro', can_view=True, can_edit=True)", 
    text
)

text = re.sub(
    r'(approver = User\.objects\.create_user\(username=\'(approver|approver2|approver3|group_approver)\', tenant=self\.tenant)',
    r"\1, is_superuser=False",
    text
)

with open(filepath, 'w') as f:
    f.write(text)
