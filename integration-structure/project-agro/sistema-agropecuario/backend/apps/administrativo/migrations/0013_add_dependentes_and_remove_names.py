from django.db import migrations, models


def remove_names(apps, schema_editor):
    Funcionario = apps.get_model('administrativo', 'Funcionario')
    # Remove Hiasmin and Elielson if present (case-insensitive)
    Funcionario.objects.filter(nome__iexact='Hiasmin').delete()
    Funcionario.objects.filter(nome__iexact='Elielson').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('administrativo', '0012_add_hora_extra_hours_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='funcionario',
            name='dependentes',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(remove_names, migrations.RunPython.noop),
    ]
