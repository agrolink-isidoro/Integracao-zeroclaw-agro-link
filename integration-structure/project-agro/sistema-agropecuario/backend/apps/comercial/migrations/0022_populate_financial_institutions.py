# Generated migration to populate core financial institutions including NuBank

from django.db import migrations
from apps.comercial.institutions_data import INSTITUICOES_FINANCEIRAS


def populate_institutions(apps, schema_editor):
    """Populate core financial institutions on first setup"""
    InstituicaoFinanceira = apps.get_model('comercial', 'InstituicaoFinanceira')
    
    # Skip if already populated
    if InstituicaoFinanceira.objects.filter(nome__icontains='nubank').exists():
        return
    
    for inst_data in INSTITUICOES_FINANCEIRAS:
        # Avoid duplicates
        try:
            InstituicaoFinanceira.objects.get_or_create(
                codigo_bacen=inst_data['codigo_bacen'],
                defaults=inst_data
            )
        except Exception as e:
            print(f"Error creating institution {inst_data['nome']}: {e}")


def reverse_institutions(apps, schema_editor):
    """Reverse - remove seeded institutions"""
    # Don't delete on reverse to avoid data loss if user manually edited
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('comercial', '0021_add_contrato_fields'),  # Adjust to your latest migration
    ]

    operations = [
        migrations.RunPython(populate_institutions, reverse_institutions),
    ]
