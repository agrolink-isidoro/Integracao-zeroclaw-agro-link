from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('comercial', '0006_remove_legacy_fk_columns'),
    ]

    operations = [
        migrations.AlterField(
            model_name='despesaprestadora',
            name='centro_custo',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='despesas_prestadoras', to='administrativo.centrocusto'),
        ),
    ]
