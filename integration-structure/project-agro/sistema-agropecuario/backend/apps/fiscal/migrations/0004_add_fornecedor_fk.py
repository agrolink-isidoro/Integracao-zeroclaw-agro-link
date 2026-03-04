# Generated manually: add fornecedor FK to NFe
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0002_add_xml_and_certificado'),
    ]

    operations = [
        migrations.AddField(
            model_name='nfe',
            name='fornecedor',
            field=models.ForeignKey(to='comercial.fornecedor', null=True, blank=True, on_delete=models.SET_NULL, related_name='nfes'),
        ),
    ]
