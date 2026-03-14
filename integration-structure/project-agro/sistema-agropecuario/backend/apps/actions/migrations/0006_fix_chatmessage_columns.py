# Generated migration to fix ChatMessage table columns

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('actions', '0005_rename_usuario_to_criado_por'),
    ]

    operations = [
        # No-op: migration 0004 already created the table with correct column names
        # (content, role, criado_por - not conteudo, tipo, usuario_id)
    ]
