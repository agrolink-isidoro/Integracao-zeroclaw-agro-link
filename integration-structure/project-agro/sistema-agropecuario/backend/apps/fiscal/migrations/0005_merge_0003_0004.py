# Auto merge migration to resolve conflicting leaf nodes
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0003_add_cert_fingerprint'),
        ('fiscal', '0004_add_fornecedor_fk'),
    ]

    operations = []
