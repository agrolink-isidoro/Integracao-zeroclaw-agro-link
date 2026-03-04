from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('estoque', '0020_add_agricultura_venda_origem_choices'),
        ('comercial', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='localarmazenamento',
            name='tipo_local',
            field=models.CharField(
                choices=[('interno', 'Interno'), ('externo', 'Externo')],
                default='interno',
                max_length=10,
                verbose_name='Interno / Externo',
            ),
        ),
        migrations.AddField(
            model_name='localarmazenamento',
            name='fornecedor',
            field=models.ForeignKey(
                blank=True,
                help_text='Obrigatório para locais externos',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='locais_armazenamento',
                to='comercial.fornecedor',
            ),
        ),
        migrations.AlterField(
            model_name='localarmazenamento',
            name='fazenda',
            field=models.ForeignKey(
                blank=True,
                help_text='Obrigatório para locais internos',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='locais_armazenamento',
                to='fazendas.fazenda',
            ),
        ),
    ]
