from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('administrativo', '0004_add_criado_por_centrocusto'),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='despesaadministrativa',
            name='criado_por',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.customuser'),
        ),
    ]
