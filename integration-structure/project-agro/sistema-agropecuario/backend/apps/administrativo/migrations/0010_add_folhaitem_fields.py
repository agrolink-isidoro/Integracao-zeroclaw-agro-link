from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('administrativo', '0009_seed_centros_custo'),
    ]

    operations = [
        migrations.AddField(
            model_name='folhapagamentoitem',
            name='hora_extra',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='folhapagamentoitem',
            name='dsr',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='folhapagamentoitem',
            name='descontos_outro',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
    ]
