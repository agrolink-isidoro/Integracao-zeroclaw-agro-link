from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('actions', '0004_chatmessage'),
    ]

    operations = [
        # No-op: migration 0004 already created the table with correct column names
        # (criado_por, not usuario_id)
    ]
