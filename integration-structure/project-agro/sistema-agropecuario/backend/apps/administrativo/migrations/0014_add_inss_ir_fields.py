from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('administrativo', '0013_add_dependentes_and_remove_names'),
    ]

    operations = [
        migrations.AddField(
            model_name='folhapagamentoitem',
            name='inss',
            field=models.DecimalField(max_digits=12, decimal_places=2, default=0),
        ),
        migrations.AddField(
            model_name='folhapagamentoitem',
            name='ir',
            field=models.DecimalField(max_digits=12, decimal_places=2, default=0),
        ),
    ]
