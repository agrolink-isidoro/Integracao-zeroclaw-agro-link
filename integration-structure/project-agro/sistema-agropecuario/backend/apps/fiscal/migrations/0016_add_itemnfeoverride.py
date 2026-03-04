# Generated migration for adding ItemNFeOverride
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0015_add_nferemote'),
    ]

    operations = [
        migrations.CreateModel(
            name='ItemNFeOverride',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantidade', models.DecimalField(blank=True, decimal_places=4, max_digits=15, null=True)),
                ('valor_unitario', models.DecimalField(blank=True, decimal_places=10, max_digits=21, null=True)),
                ('valor_produto', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('aplicado', models.BooleanField(default=False)),
                ('motivo', models.CharField(blank=True, max_length=255, null=True)),
                ('observacoes', models.TextField(blank=True, null=True)),
                ('criado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='core.CustomUser')),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='overrides', to='fiscal.ItemNFe')),
            ],
            options={
                'verbose_name': 'Override Item NFe',
                'verbose_name_plural': 'Overrides Itens NFe',
                'ordering': ['-criado_em'],
            },
        ),
    ]
