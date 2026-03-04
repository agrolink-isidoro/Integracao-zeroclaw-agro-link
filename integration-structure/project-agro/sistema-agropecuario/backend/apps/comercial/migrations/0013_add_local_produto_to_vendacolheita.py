# Generated manually: add local_armazenamento and produto to VendaColheita
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('comercial', '0012_update_fornecedor_categories'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendacolheita',
            name='local_armazenamento',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='estoque.localarmazenamento', verbose_name='Local de Armazenamento'),
        ),
        migrations.AddField(
            model_name='vendacolheita',
            name='produto',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='estoque.produto', verbose_name='Produto'),
        ),
    ]
