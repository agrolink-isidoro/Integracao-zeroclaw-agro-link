# Generated migration: update Fornecedor.categoria choices and remap legacy values
from django.db import migrations, models


def remap_categories_forward(apps, schema_editor):
    Fornecedor = apps.get_model('comercial', 'Fornecedor')
    mapping = {
        'consultoria': 'servicos',
        'servicos': 'servicos',
        'insumos': 'insumos',
        'maquinas': 'maquinas',
        'transporte': 'transporte',
        # no direct legacy values for the new categories (produtos_agricolas, combustiveis, ti, manutencao, prestador_servicos, fabricante)
    }
    for old, new in mapping.items():
        Fornecedor.objects.filter(categoria=old).update(categoria=new)
    # Any remaining values not in the new choices should be set to 'outros'
    allowed = {choice[0] for choice in Fornecedor._meta.get_field('categoria').choices}
    for f in Fornecedor.objects.exclude(categoria__in=list(allowed)):
        f.categoria = 'outros'
        f.save()


def remap_categories_backward(apps, schema_editor):
    # Best-effort reverse mapping: map known new categories back to legacy where possible
    Fornecedor = apps.get_model('comercial', 'Fornecedor')
    reverse_map = {
        'servicos': 'servicos',
        'insumos': 'insumos',
        'maquinas': 'maquinas',
        'transporte': 'transporte',
    }
    for new, old in reverse_map.items():
        Fornecedor.objects.filter(categoria=new).update(categoria=old)
    # Leave other categories as-is


class Migration(migrations.Migration):

    dependencies = [
        ('comercial', '0011_fornecedor_categoria_fornecedor_documentos_pendentes_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='fornecedor',
            name='categoria',
            field=models.CharField(choices=[('insumos', 'Fornecedor de Insumos'), ('servicos', 'Fornecedor de Serviços'), ('maquinas', 'Fornecedor de Equipamentos / Máquinas'), ('transporte', 'Fornecedor de Transporte / Logística'), ('produtos_agricolas', 'Fornecedor de Produtos Agrícolas'), ('combustiveis', 'Fornecedor de Combustíveis'), ('ti', 'Fornecedor de TI / Soluções Digitais'), ('manutencao', 'Fornecedor de Manutenção / Peças'), ('prestador_servicos', 'Prestadores de Serviços'), ('fabricante', 'Fabricante'), ('outros', 'Outros')], default='outros', max_length=20, verbose_name='Categoria'),
        ),
        migrations.RunPython(remap_categories_forward, remap_categories_backward),
    ]
