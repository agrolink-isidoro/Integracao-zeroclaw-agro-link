"""
Seed dos 7 perfis padrão RBAC com permissões por módulo.

Hierarquia (do mais restrito ao mais amplo):
1. Temporário/Diarista
2. Funcionário Fixo
3. Gerente Operacional
4. Agrônomo/Técnico Agrícola
5. Gerente Geral
6. Diretor/Financeiro
7. Proprietário (Admin Master)
"""
from django.db import migrations


# Mapeamento de perfis → módulos com permissões
# Formato: (module, can_view, can_edit, can_respond)
PROFILES = {
    'Temporário/Diarista': {
        'descricao': 'Cadastro básico. Visualiza apenas Demandas Operacionais.',
        'permissions': [
            ('dashboard', True, False, False),
        ],
    },
    'Funcionário Fixo': {
        'descricao': 'Visualiza Demandas Operacionais, Estoque e Máquinas.',
        'permissions': [
            ('dashboard', True, False, False),
            ('estoque', True, False, False),
            ('maquinas', True, False, False),
        ],
    },
    'Gerente Operacional': {
        'descricao': 'Acesso total a Fazendas, Máquinas, Agricultura e Estoque.',
        'permissions': [
            ('dashboard', True, True, True),
            ('fazendas', True, True, True),
            ('agricultura', True, True, True),
            ('estoque', True, True, True),
            ('maquinas', True, True, True),
        ],
    },
    'Agrônomo/Técnico Agrícola': {
        'descricao': 'Acesso total a Fazendas, Máquinas, Agricultura e Estoque com foco agrícola.',
        'permissions': [
            ('dashboard', True, True, True),
            ('fazendas', True, True, True),
            ('agricultura', True, True, True),
            ('estoque', True, True, True),
            ('maquinas', True, True, True),
        ],
    },
    'Gerente Geral': {
        'descricao': 'Acesso total a todos os módulos operacionais, Fiscal e Administrativo.',
        'permissions': [
            ('dashboard', True, True, True),
            ('fazendas', True, True, True),
            ('agricultura', True, True, True),
            ('pecuaria', True, True, True),
            ('estoque', True, True, True),
            ('maquinas', True, True, True),
            ('financeiro', True, True, True),
            ('administrativo', True, True, True),
            ('fiscal', True, True, True),
            ('comercial', True, True, True),
        ],
    },
    'Diretor/Financeiro': {
        'descricao': 'Acesso total a todos os módulos. Sem gestão de usuários.',
        'permissions': [
            ('dashboard', True, True, True),
            ('fazendas', True, True, True),
            ('agricultura', True, True, True),
            ('pecuaria', True, True, True),
            ('estoque', True, True, True),
            ('maquinas', True, True, True),
            ('financeiro', True, True, True),
            ('administrativo', True, True, True),
            ('fiscal', True, True, True),
            ('comercial', True, True, True),
        ],
    },
    'Proprietário': {
        'descricao': 'Admin Master — acesso total a todos os módulos, incluindo gestão de usuários.',
        'permissions': [
            ('dashboard', True, True, True),
            ('fazendas', True, True, True),
            ('agricultura', True, True, True),
            ('pecuaria', True, True, True),
            ('estoque', True, True, True),
            ('maquinas', True, True, True),
            ('financeiro', True, True, True),
            ('administrativo', True, True, True),
            ('fiscal', True, True, True),
            ('comercial', True, True, True),
            ('user_management', True, True, True),
        ],
    },
}


def seed_profiles(apps, schema_editor):
    PermissionGroup = apps.get_model('core', 'PermissionGroup')
    GroupPermission = apps.get_model('core', 'GroupPermission')

    for nome, config in PROFILES.items():
        group, _ = PermissionGroup.objects.get_or_create(
            nome=nome,
            defaults={
                'descricao': config['descricao'],
                'is_system': True,
            }
        )
        for module, can_view, can_edit, can_respond in config['permissions']:
            GroupPermission.objects.get_or_create(
                group=group,
                module=module,
                defaults={
                    'can_view': can_view,
                    'can_edit': can_edit,
                    'can_respond': can_respond,
                }
            )


def reverse_seed(apps, schema_editor):
    PermissionGroup = apps.get_model('core', 'PermissionGroup')
    PermissionGroup.objects.filter(is_system=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0002_rbac_models'),
    ]

    operations = [
        migrations.RunPython(seed_profiles, reverse_seed),
    ]
