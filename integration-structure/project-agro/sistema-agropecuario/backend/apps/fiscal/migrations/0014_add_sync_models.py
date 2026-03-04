# Generated migration: add sync models (NFeResumo, EventoManifestacao, NsuCheckpoint, ArquivoXml, ProcessamentoWs)
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0013_add_manifestacao_nseq'),
    ]

    operations = [
        migrations.CreateModel(
            name='NFeResumo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('chave_acesso', models.CharField(max_length=44, unique=True)),
                ('numero', models.CharField(max_length=50, null=True, blank=True)),
                ('emitente_nome', models.CharField(max_length=255, null=True, blank=True)),
                ('destinatario_nome', models.CharField(max_length=255, null=True, blank=True)),
                ('data_recebida', models.DateTimeField(null=True, blank=True)),
                ('raw', models.JSONField(null=True, blank=True)),
            ],
        ),
        migrations.AddIndex(
            model_name='nferesumo',
            index=models.Index(fields=['chave_acesso'], name='fiscal_nferes_chave_5d1e2_idx'),
        ),
        migrations.CreateModel(
            name='EventoManifestacao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(max_length=20)),
                ('cStat', models.CharField(max_length=10, null=True, blank=True)),
                ('nProt', models.CharField(max_length=50, null=True, blank=True)),
                ('dhEvento', models.DateTimeField(null=True, blank=True)),
                ('raw_xml', models.TextField(null=True, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('nfe', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='eventos_manifestacao', to='fiscal.nfe')),
            ],
        ),
        migrations.AddIndex(
            model_name='eventomanifestacao',
            index=models.Index(fields=['nfe', 'tipo', 'created_at'], name='fiscal_eventomanif_nf_ti_22b8e_idx'),
        ),
        migrations.CreateModel(
            name='NsuCheckpoint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('last_nsu', models.CharField(max_length=50, null=True, blank=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('certificado', models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, to='fiscal.certificadosefaz')),
            ],
        ),
        migrations.CreateModel(
            name='ArquivoXml',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('content', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('nfe', models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='arquivos_xml', to='fiscal.nfe')),
            ],
        ),
        migrations.CreateModel(
            name='ProcessamentoWs',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('job_type', models.CharField(max_length=100)),
                ('status', models.CharField(max_length=20, default='pending')),
                ('details', models.JSONField(null=True, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
