from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('maquinas', '0006_add_insumos_to_ordemservico'),
        ('comercial', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordemservico',
            name='insumos_reservados',
            field=models.BooleanField(default=False, verbose_name='Insumos Reservados'),
        ),
        migrations.AddField(
            model_name='ordemservico',
            name='prestador_servico',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordens_servico', to='comercial.prestadorservico', verbose_name='Prestador de Serviço'),
        ),
        migrations.AddField(
            model_name='ordemservico',
            name='fornecedor',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordens_servico_fornecedor', to='comercial.fornecedor', verbose_name='Fornecedor (Peças)'),
        ),
    ]
