# Generated migration to add 'total' as a cost unit option

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('agricultura', '0023_alter_cultura_tenant'),
    ]

    operations = [
        migrations.AlterField(
            model_name='transporte',
            name='custo_transporte_unidade',
            field=models.CharField(
                choices=[
                    ('total', 'R$ Total'),
                    ('tonelada', 'R$ por Tonelada'),
                    ('saca', 'R$ por Saca'),
                    ('unidade', 'R$ por Unidade'),
                ],
                default='total',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='movimentacaocarga',
            name='custo_transporte_unidade',
            field=models.CharField(
                blank=True,
                choices=[
                    ('total', 'R$ Total'),
                    ('tonelada', 'R$ por Tonelada'),
                    ('saca', 'R$ por Saca'),
                    ('unidade', 'R$ por Unidade'),
                ],
                default='total',
                max_length=20,
                null=True,
            ),
        ),
    ]
