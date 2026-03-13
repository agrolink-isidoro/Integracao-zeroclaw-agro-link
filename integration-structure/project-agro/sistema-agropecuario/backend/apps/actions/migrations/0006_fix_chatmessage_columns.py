# Generated migration to fix ChatMessage table columns

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('actions', '0005_rename_usuario_to_criado_por'),
    ]

    operations = [
        migrations.RunSQL(
            # Forward migrations
            [
                # Rename 'conteudo' to 'content'
                "ALTER TABLE actions_chatmessage RENAME COLUMN conteudo TO content;",
                # Rename 'tipo' to 'role'
                "ALTER TABLE actions_chatmessage RENAME COLUMN tipo TO role;",
            ],
            # Reverse migrations
            [
                "ALTER TABLE actions_chatmessage RENAME COLUMN content TO conteudo;",
                "ALTER TABLE actions_chatmessage RENAME COLUMN role TO tipo;",
            ]
        ),
    ]
