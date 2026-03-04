# Placeholder migration to restore missing dependency
# This migration intentionally has no operations and exists only to satisfy
# historical migration dependencies after a branch that removed the
# original migration was merged.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("administrativo", "0005_add_criado_por_to_despesa"),
    ]

    operations = []
