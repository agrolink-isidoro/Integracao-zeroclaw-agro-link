# Generated manual migration: add fingerprint field to CertificadoSefaz
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0002_add_xml_and_certificado'),
    ]

    operations = [
        migrations.AddField(
            model_name='certificadosefaz',
            name='fingerprint',
            field=models.CharField(max_length=128, null=True, blank=True, help_text='SHA256 fingerprint of the certificate in hex'),
        ),
    ]
