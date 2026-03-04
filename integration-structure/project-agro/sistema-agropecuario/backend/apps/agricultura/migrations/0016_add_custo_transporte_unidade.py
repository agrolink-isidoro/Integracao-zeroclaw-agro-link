# Generated manual migration to add custo_transporte_unidade fields
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('agricultura', '0015_manejo_contabilizado_manejo_custo_insumos_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='transporte',
            name='custo_transporte_unidade',
            field=models.CharField(choices=[('unidade','R$ por Unidade'),('saca','R$ por Saca'),('tonelada','R$ por Tonelada')], default='unidade', max_length=20),
        ),
        migrations.AddField(
            model_name='movimentacaocarga',
            name='custo_transporte_unidade',
            field=models.CharField(choices=[('unidade','R$ por Unidade'),('saca','R$ por Saca'),('tonelada','R$ por Tonelada')], default='unidade', max_length=20),
        ),
    ]
