from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('administrativo', '0003_add_centrocusto_despesa'),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='centrocusto',
            name='criado_por',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.customuser'),
        ),
    ]
