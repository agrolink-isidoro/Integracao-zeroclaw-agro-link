from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0006_bankstatements'),
    ]

    operations = [
        migrations.AddField(
            model_name='financiamento',
            name='numero_contrato',
            field=models.CharField(max_length=100, null=True, blank=True, verbose_name='Número do Contrato'),
        ),
    ]
