# Generated manually: add estoque_confirmado to NFe
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0002_add_xml_and_certificado'),
    ]

    operations = [
        migrations.AddField(
            model_name='nfe',
            name='estoque_confirmado',
            field=models.BooleanField(default=False),
        ),
    ]
