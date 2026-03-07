"""
Adiciona permissão do módulo 'actions' (Isidoro IA) aos perfis RBAC existentes.

- Gerente Operacional e acima: can_view + can_edit + can_respond
- Funcionário Fixo: can_view apenas
- Temporário/Diarista: sem acesso
"""
from django.db import migrations


# Perfis que recebem acesso total ao módulo actions
FULL_ACCESS_PROFILES = [
    'Gerente Operacional',
    'Agrônomo/Técnico Agrícola',
    'Gerente Geral',
    'Diretor/Financeiro',
    'Proprietário',
    'Inteligencia Artificial',
]

# Perfis que recebem apenas visualização
VIEW_ONLY_PROFILES = [
    'Funcionário Fixo',
]


def add_actions_permission(apps, schema_editor):
    PermissionGroup = apps.get_model('core', 'PermissionGroup')
    GroupPermission = apps.get_model('core', 'GroupPermission')

    for nome in FULL_ACCESS_PROFILES:
        try:
            group = PermissionGroup.objects.get(nome=nome)
            GroupPermission.objects.get_or_create(
                group=group,
                module='actions',
                defaults={
                    'can_view': True,
                    'can_edit': True,
                    'can_respond': True,
                }
            )
        except PermissionGroup.DoesNotExist:
            pass  # Perfil pode não existir em todos os ambientes

    for nome in VIEW_ONLY_PROFILES:
        try:
            group = PermissionGroup.objects.get(nome=nome)
            GroupPermission.objects.get_or_create(
                group=group,
                module='actions',
                defaults={
                    'can_view': True,
                    'can_edit': False,
                    'can_respond': False,
                }
            )
        except PermissionGroup.DoesNotExist:
            pass


def remove_actions_permission(apps, schema_editor):
    GroupPermission = apps.get_model('core', 'GroupPermission')
    GroupPermission.objects.filter(module='actions').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0007_add_item_emprestimo'),
    ]

    operations = [
        migrations.RunPython(add_actions_permission, remove_actions_permission),
    ]
