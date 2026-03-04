from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('administrativo', '0011_remove_backup_criado_por_delete_configuracaosistema_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='folhapagamentoitem',
            name='hora_extra_hours',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8),
        ),
        migrations.AddField(
            model_name='folhapagamentoitem',
            name='hora_extra_type',
            field=models.CharField(default='normal', max_length=20),
        ),
    ]
