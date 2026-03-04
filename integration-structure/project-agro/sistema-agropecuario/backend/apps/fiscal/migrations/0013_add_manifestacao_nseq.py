# Generated migration: add nSeqEvento to Manifestacao
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0012_add_manifestacao'),
    ]

    operations = [
        migrations.AddField(
            model_name='manifestacao',
            name='nSeqEvento',
            field=models.IntegerField(default=1),
        ),
    ]
