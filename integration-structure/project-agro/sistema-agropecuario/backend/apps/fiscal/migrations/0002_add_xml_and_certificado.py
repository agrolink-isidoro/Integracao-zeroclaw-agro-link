# Generated migration adding xml_content and processado_por and certificado model
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='nfe',
            name='xml_content',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='nfe',
            name='processado_por',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='core.customuser'),
        ),
        migrations.CreateModel(
            name='CertificadoSefaz',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=120)),
                ('arquivo', models.FileField(upload_to='certificados_sefaz/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('validade', models.DateField(blank=True, null=True)),
                ('uploaded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.customuser')),
            ],
            options={'verbose_name': 'Certificado SEFAZ', 'verbose_name_plural': 'Certificados SEFAZ'},
        ),
    ]
