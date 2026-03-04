# Manual migration to add choices metadata (no DB column change)
from django.db import migrations


def noop(apps, schema_editor):
    # No-op migration used to mark the choice update
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('comercial', '0013_add_local_produto_to_vendacolheita'),
    ]

    operations = [
        migrations.RunPython(noop, reverse_code=noop),
    ]
