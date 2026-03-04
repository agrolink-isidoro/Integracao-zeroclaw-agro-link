from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('estoque', '0008_add_cost_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='movimentacaoestoque',
            name='saldo_posterior',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
    ]
