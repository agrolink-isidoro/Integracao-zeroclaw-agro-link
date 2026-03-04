# Migration: add NFeRemote model
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0014_add_sync_models'),
    ]

    operations = [
        migrations.CreateModel(
            name='NFeRemote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('chave_acesso', models.CharField(max_length=44, null=True, blank=True)),
                ('raw_xml', models.TextField(null=True, blank=True)),
                ('received_at', models.DateTimeField(null=True, blank=True)),
                ('import_status', models.CharField(default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('certificado', models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, to='fiscal.certificadosefaz')),
                ('imported_nfe', models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='remote_source', to='fiscal.nfe')),
            ],
        ),
    ]
