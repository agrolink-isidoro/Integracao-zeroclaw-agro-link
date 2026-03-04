# Generated migration for FASE 1 - Estoque: Create ProdutoArmazenado
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('estoque', '0012_create_localizacao'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProdutoArmazenado',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('produto', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='produtos_armazenados',
                    to='estoque.produto',
                    verbose_name='Produto'
                )),
                ('localizacao', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='produtos_armazenados',
                    to='estoque.localizacao',
                    verbose_name='Localização'
                )),
                ('lote', models.CharField(max_length=100, verbose_name='Lote')),
                ('quantidade', models.DecimalField(
                    max_digits=15,
                    decimal_places=2,
                    default=0,
                    verbose_name='Quantidade'
                )),
                ('data_entrada', models.DateField(verbose_name='Data de Entrada')),
                ('status', models.CharField(
                    max_length=20,
                    choices=[
                        ('disponivel', 'Disponível'),
                        ('reservado', 'Reservado'),
                        ('bloqueado', 'Bloqueado'),
                    ],
                    default='disponivel',
                    verbose_name='Status'
                )),
                ('observacoes', models.TextField(blank=True, null=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Produto Armazenado',
                'verbose_name_plural': 'Produtos Armazenados',
                'ordering': ['-data_entrada'],
                'indexes': [
                    models.Index(fields=['localizacao', 'produto'], name='estoque_pa_loc_prod_idx'),
                    models.Index(fields=['status'], name='estoque_pa_status_idx'),
                ],
            },
        ),
        migrations.AddConstraint(
            model_name='produtoarmazenado',
            constraint=models.UniqueConstraint(
                fields=['produto', 'localizacao', 'lote'],
                name='unique_produto_localizacao_lote'
            ),
        ),
    ]
