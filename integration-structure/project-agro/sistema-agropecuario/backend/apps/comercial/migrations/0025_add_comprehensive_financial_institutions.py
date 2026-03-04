# Generated migration - comprehensive financial institutions update

from django.db import migrations
from apps.comercial.institutions_data import INSTITUICOES_FINANCEIRAS


def add_comprehensive_institutions(apps, schema_editor):
    """Add comprehensive list of Brazilian financial institutions including cooperatives"""
    InstituicaoFinanceira = apps.get_model('comercial', 'InstituicaoFinanceira')
    
    # Get list of institutions already in database by nome
    existing_nomes = set(
        InstituicaoFinanceira.objects.values_list('nome', flat=True)
    )
    
    # Add new institutions using get_or_create to handle duplicates safely
    added_count = 0
    for inst in INSTITUICOES_FINANCEIRAS:
        if inst['nome'] not in existing_nomes:
            try:
                # Use get_or_create with nome as the unique field since codigo_bacen might have duplicates
                obj, created = InstituicaoFinanceira.objects.get_or_create(
                    nome=inst['nome'],
                    defaults={
                        'codigo_bacen': inst['codigo_bacen'],
                        'nome_reduzido': inst['nome_reduzido'],
                        'segmento': inst['segmento'],
                    }
                )
                if created:
                    added_count += 1
            except Exception as e:
                print(f"Error adding {inst['nome']}: {e}")
    
    if added_count > 0:
        print(f"✓ Added {added_count} new financial institutions")
    else:
        print("No new institutions to add")


def reverse_add_institutions(apps, schema_editor):
    """No-op reverse"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('comercial', '0024_remove_banco_e2e_institutions'),
    ]

    operations = [
        migrations.RunPython(add_comprehensive_institutions, reverse_add_institutions),
    ]
