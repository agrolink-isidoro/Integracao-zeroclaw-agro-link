# Generated migration for FASE 1 - Estoque: Create Localizacao
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('estoque', '0011_remove_movimentacaostatement_statement_prod_criado_idx'),
    ]

    operations = [
        migrations.CreateModel(
            name='Localizacao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=200, verbose_name='Nome')),
                ('tipo', models.CharField(
                    max_length=20,
                    choices=[
                        ('interna', 'Interna (Própria)'),
                        ('externa', 'Externa (Terceiros)'),
                    ],
                    verbose_name='Tipo'
                )),
                ('endereco', models.TextField(blank=True, null=True, verbose_name='Endereço')),
                ('latitude', models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)),
                ('longitude', models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)),
                ('capacidade_total', models.DecimalField(
                    max_digits=15,
                    decimal_places=2,
                    default=0,
                    verbose_name='Capacidade Total (kg)'
                )),
                ('capacidade_ocupada', models.DecimalField(
                    max_digits=15,
                    decimal_places=2,
                    default=0,
                    verbose_name='Capacidade Ocupada (kg)'
                )),
                ('ativa', models.BooleanField(default=True, verbose_name='Ativa')),
                ('observacoes', models.TextField(blank=True, null=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Localização',
                'verbose_name_plural': 'Localizações',
                'ordering': ['nome'],
                'indexes': [
                    models.Index(fields=['tipo', 'ativa'], name='estoque_loc_tipo_ativa_idx'),
                ],
            },
        ),
    ]
