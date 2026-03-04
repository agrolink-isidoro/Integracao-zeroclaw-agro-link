from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0025_merge_itemnfeoverride_auto_detect'),
    ]

    operations = [
        # NFe totals
        migrations.AlterField(
            model_name='nfe',
            name='valor_produtos',
            field=models.DecimalField(max_digits=13, decimal_places=2),
        ),
        migrations.AlterField(
            model_name='nfe',
            name='valor_nota',
            field=models.DecimalField(max_digits=13, decimal_places=2),
        ),

        # ItemNFe fields (quantities and unit values per SEFAZ: qCom=11v0-4, vUnCom=11v0-10, vProd=13v2)
        migrations.AlterField(
            model_name='itemnfe',
            name='quantidade_comercial',
            field=models.DecimalField(max_digits=11, decimal_places=4),
        ),
        migrations.AlterField(
            model_name='itemnfe',
            name='valor_unitario_comercial',
            # Use a slightly larger max_digits to tolerate existing values that
            # may exceed the strict SEFAZ integer digit limit (11,10 can only
            # hold values < 10). We keep decimal_places=10 to preserve scale.
            # Use permissive precision during migration to avoid failing when existing
            # stored values exceed strict limits. We'll keep scale=10 but raise
            # max_digits significantly to accommodate legacy data.
            field=models.DecimalField(max_digits=30, decimal_places=10),
        ),
        migrations.AlterField(
            model_name='itemnfe',
            name='valor_produto',
            field=models.DecimalField(max_digits=13, decimal_places=2),
        ),
        migrations.AlterField(
            model_name='itemnfe',
            name='quantidade_tributaria',
            field=models.DecimalField(max_digits=11, decimal_places=4, null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='itemnfe',
            name='valor_unitario_tributario',
            # Temporarily permissive precision to avoid migration-time overflow
            field=models.DecimalField(max_digits=30, decimal_places=10, null=True, blank=True),
        ),

        # ItemNFeOverride mirror fields
        migrations.AlterField(
            model_name='itemnfeoverride',
            name='quantidade',
            field=models.DecimalField(max_digits=11, decimal_places=4, null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='itemnfeoverride',
            name='valor_unitario',
            # Temporarily permissive precision to avoid migration-time overflow
            field=models.DecimalField(max_digits=30, decimal_places=10, null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='itemnfeoverride',
            name='valor_produto',
            field=models.DecimalField(max_digits=13, decimal_places=2, null=True, blank=True),
        ),
    ]
