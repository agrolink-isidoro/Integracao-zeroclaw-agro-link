# Generated manual migration: add Manifestacao model
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0011_impostotrabalhista_impostofederal'),
    ]

    operations = [
        migrations.CreateModel(
            name='Manifestacao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=[('ciencia', 'Ciência da Operação'), ('confirmacao', 'Confirmação da Operação'), ('desconhecimento', 'Desconhecimento da Operação'), ('nao_realizada', 'Operação não Realizada')], max_length=20)),
                ('motivo', models.TextField(blank=True, null=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('enviado', models.BooleanField(default=False)),
                ('enviado_em', models.DateTimeField(blank=True, null=True)),
                ('resposta_sefaz', models.JSONField(blank=True, null=True)),
                ('status_envio', models.CharField(choices=[('pending', 'Pending'), ('sent', 'Sent'), ('failed', 'Failed')], default='pending', max_length=10)),
                ('audit_metadata', models.JSONField(blank=True, null=True)),
                ('criado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='manifestacoes_criadas', to='core.customuser')),
                ('nfe', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='manifestacoes', to='fiscal.nfe')),
            ],
            options={'ordering': ['-criado_em'], 'verbose_name': 'Manifestação', 'verbose_name_plural': 'Manifestações'},
        ),
        migrations.AddIndex(
            model_name='manifestacao',
            index=models.Index(fields=['nfe', 'tipo', 'criado_em'], name='fiscal_manifest_nfe_tipo_6b2f6a_idx'),
        ),
    ]
