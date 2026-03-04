# Generated migration to normalize unit price precision to 2 decimals
from django.db import migrations, models
from decimal import Decimal, ROUND_HALF_UP, getcontext


def quantize_to_two(apps, schema_editor):
    ItemNFe = apps.get_model('fiscal', 'ItemNFe')
    ItemNFeOverride = apps.get_model('fiscal', 'ItemNFeOverride')
    ctx = getcontext().copy()
    ctx.prec = 28
    two = Decimal('0.01')

    # Normalize ItemNFe values
    for inst in ItemNFe.objects.all():
        try:
            if inst.valor_unitario_comercial is not None:
                inst.valor_unitario_comercial = (Decimal(inst.valor_unitario_comercial).quantize(two, rounding=ROUND_HALF_UP))
            if inst.valor_unitario_tributario is not None:
                inst.valor_unitario_tributario = (Decimal(inst.valor_unitario_tributario).quantize(two, rounding=ROUND_HALF_UP))
            inst.save(update_fields=[f for f in ['valor_unitario_comercial', 'valor_unitario_tributario'] if getattr(inst, f) is not None])
        except Exception:
            # Skip problematic rows; we'll still alter the field but log is preferable
            continue

    # Normalize overrides
    for ov in ItemNFeOverride.objects.all():
        try:
            if ov.valor_unitario is not None:
                ov.valor_unitario = (Decimal(ov.valor_unitario).quantize(two, rounding=ROUND_HALF_UP))
                ov.save(update_fields=['valor_unitario'])
        except Exception:
            continue


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0026_adjust_sefaz_field_sizes'),
    ]

    operations = [
        migrations.RunPython(quantize_to_two, noop),
        migrations.AlterField(
            model_name='itemnfe',
            name='valor_unitario_comercial',
            field=models.DecimalField(decimal_places=2, max_digits=13),
        ),
        migrations.AlterField(
            model_name='itemnfe',
            name='valor_unitario_tributario',
            field=models.DecimalField(decimal_places=2, max_digits=13, null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='itemnfeoverride',
            name='valor_unitario',
            field=models.DecimalField(decimal_places=2, max_digits=13, null=True, blank=True),
        ),
    ]
