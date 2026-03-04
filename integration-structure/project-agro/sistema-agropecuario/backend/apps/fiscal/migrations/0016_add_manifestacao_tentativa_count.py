# Migration: add tentativa_count to Manifestacao
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0015_add_nferemote'),
    ]

    operations = [
        migrations.AddField(
            model_name='manifestacao',
            name='tentativa_count',
            field=models.IntegerField(default=0),
        ),
    ]
