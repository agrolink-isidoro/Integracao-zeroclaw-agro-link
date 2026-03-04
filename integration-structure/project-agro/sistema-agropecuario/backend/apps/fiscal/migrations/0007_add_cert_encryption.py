from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0006_add_emissao_job'),
    ]

    operations = [
        migrations.AddField(
            model_name='certificadosefaz',
            name='arquivo_name',
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='certificadosefaz',
            name='arquivo_encrypted',
            field=models.BinaryField(null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='certificadosefaz',
            name='arquivo',
            field=models.FileField(upload_to='certificados_sefaz/', null=True, blank=True),
        ),
    ]
