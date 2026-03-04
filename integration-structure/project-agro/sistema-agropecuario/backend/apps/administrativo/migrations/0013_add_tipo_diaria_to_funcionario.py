from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('administrativo', '0014_add_inss_ir_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='funcionario',
            name='tipo',
            field=models.CharField(choices=[('registrado', 'Registrado'), ('temporario', 'Temporário')], default='registrado', max_length=20),
        ),
        migrations.AddField(
            model_name='funcionario',
            name='diaria_valor',
            field=models.DecimalField(help_text='Valor diário para temporários', max_digits=12, decimal_places=2, null=True, blank=True),
        ),
    ]
