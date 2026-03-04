# Generated migration for FASE 1 - Estoque: Expand MovimentacaoEstoque
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('estoque', '0013_create_produto_armazenado'),
    ]

    operations = [
        migrations.AddField(
            model_name='movimentacaoestoque',
            name='localizacao_origem',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='movimentacoes_origem',
                to='estoque.localizacao',
                verbose_name='Localização de Origem'
            ),
        ),
        migrations.AddField(
            model_name='movimentacaoestoque',
            name='localizacao_destino',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='movimentacoes_destino',
                to='estoque.localizacao',
                verbose_name='Localização de Destino'
            ),
        ),
        migrations.AlterField(
            model_name='movimentacaoestoque',
            name='tipo',
            field=models.CharField(
                max_length=15,
                choices=[
                    ('entrada', 'Entrada'),
                    ('saida', 'Saída'),
                    ('transferencia', 'Transferência'),
                    ('reserva', 'Reserva'),
                    ('liberacao', 'Liberação'),
                    ('reversao', 'Reversão'),
                ],
            ),
        ),
        migrations.AddIndex(
            model_name='movimentacaoestoque',
            index=models.Index(
                fields=['localizacao_origem', 'localizacao_destino'],
                name='estoque_mov_loc_origem_destino_idx'
            ),
        ),
    ]
