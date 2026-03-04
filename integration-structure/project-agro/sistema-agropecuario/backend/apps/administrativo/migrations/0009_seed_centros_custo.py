from django.db import migrations

CENTROS = [
    {"codigo": "ADM", "nome": "Administrativo", "categoria": "administrativo"},
    {"codigo": "AGUA", "nome": "Água", "categoria": "agua"},
    {"codigo": "ALIM", "nome": "Alimentação", "categoria": "alimentacao"},
    {"codigo": "BEN", "nome": "Benfeitoria", "categoria": "benfeitoria"},
    {"codigo": "CONS", "nome": "Consultoria", "categoria": "consultoria"},
    {"codigo": "ENER", "nome": "Energia", "categoria": "energia"},
    {"codigo": "FRET", "nome": "Frete", "categoria": "frete"},
    {"codigo": "MANU", "nome": "Manutenção", "categoria": "manutencao"},
    {"codigo": "SEGU", "nome": "Seguro", "categoria": "seguro"},
    {"codigo": "TRANS", "nome": "Transporte", "categoria": "transporte"},
]


def forwards(apps, schema_editor):
    CentroCusto = apps.get_model('administrativo', 'CentroCusto')
    for c in CENTROS:
        CentroCusto.objects.update_or_create(codigo=c['codigo'], defaults={
            'nome': c['nome'], 'categoria': c['categoria'], 'ativo': True
        })


def backwards(apps, schema_editor):
    CentroCusto = apps.get_model('administrativo', 'CentroCusto')
    for c in CENTROS:
        CentroCusto.objects.filter(codigo=c['codigo']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('administrativo', '0008_add_funcionario_folha'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
