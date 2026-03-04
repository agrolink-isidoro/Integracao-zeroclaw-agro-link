# Migration 0012: add Transporte model and reconciliation fields to MovimentacaoCarga
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('agricultura', '0011_alter_harvestsession_status'),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Transporte',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('placa', models.CharField(blank=True, max_length=20, null=True)),
                ('motorista', models.CharField(blank=True, max_length=150, null=True)),
                ('tara', models.DecimalField(blank=True, decimal_places=3, default=0, max_digits=12, null=True)),
                ('peso_bruto', models.DecimalField(blank=True, decimal_places=3, max_digits=12, null=True)),
                ('peso_liquido', models.DecimalField(blank=True, decimal_places=3, max_digits=12, null=True)),
                ('descontos', models.DecimalField(default=0, max_digits=12, decimal_places=2)),
                ('custo_transporte', models.DecimalField(default=0, max_digits=12, decimal_places=2)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('criado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.customuser')),
            ],
            options={
                'verbose_name': 'Transporte',
                'verbose_name_plural': 'Transportes',
            },
        ),
        migrations.AddField(
            model_name='movimentacaocarga',
            name='transporte',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='movimentacoes', to='agricultura.transporte'),
        ),
        migrations.AddField(
            model_name='movimentacaocarga',
            name='reconciled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='movimentacaocarga',
            name='reconciled_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='movimentacaocarga',
            name='reconciled_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='movimentacoes_reconciled', to='core.customuser'),
        ),
    ]
