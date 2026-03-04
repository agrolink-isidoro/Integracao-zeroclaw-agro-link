from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('comercial', '0005_add_despesaprestadora'),
    ]

    operations = [
        # Use SQL to safely remove columns if present (idempotent)
        migrations.RunSQL(
            sql="""
            ALTER TABLE IF EXISTS comercial_despesaprestadora DROP COLUMN IF EXISTS contrato_id;
            ALTER TABLE IF EXISTS comercial_despesaprestadora DROP COLUMN IF EXISTS nota_fiscal_id;
            """,
            reverse_sql="""-- no-op reverse""",
        ),
    ]
