from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('actions', '0004_chatmessage'),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "ALTER TABLE actions_chatmessage RENAME COLUMN usuario_id TO criado_por_id;"
            ),
            reverse_sql=(
                "ALTER TABLE actions_chatmessage RENAME COLUMN criado_por_id TO usuario_id;"
            ),
        ),
    ]
