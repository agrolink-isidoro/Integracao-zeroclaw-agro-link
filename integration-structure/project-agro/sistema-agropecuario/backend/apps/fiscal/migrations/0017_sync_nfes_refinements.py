# Migration: Add sync_nfes_task refinement fields (coordination, batching, idempotency)
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0016_add_manifestacao_tentativa_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='arquivoxml',
            name='sync_trace_id',
            field=models.CharField(max_length=64, null=True, blank=True, help_text='SHA256 hash of raw XML for idempotency'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='arquivoxml',
            name='certificado_checkpoint',
            field=models.ForeignKey('fiscal.NsuCheckpoint', null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, help_text='Reference to NsuCheckpoint for coordination'),
            preserve_default=True,
        ),
        migrations.AddIndex(
            model_name='arquivoxml',
            index=models.Index(fields=['sync_trace_id'], name='fiscal_arqu_sync_tr_idx'),
        ),
        migrations.AddIndex(
            model_name='arquivoxml',
            index=models.Index(fields=['certificado_checkpoint'], name='fiscal_arqu_cert_cp_idx'),
        ),
    ]
