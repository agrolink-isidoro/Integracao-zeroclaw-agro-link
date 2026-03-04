# Migration: add inscricao_estadual to Cliente
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('comercial', '0014_add_contrato_tipo_choices'),
    ]

    operations = [
        migrations.AddField(
            model_name='cliente',
            name='inscricao_estadual',
            field=models.CharField(blank=True, max_length=20, null=True, verbose_name='Inscrição Estadual'),
        ),
    ]
