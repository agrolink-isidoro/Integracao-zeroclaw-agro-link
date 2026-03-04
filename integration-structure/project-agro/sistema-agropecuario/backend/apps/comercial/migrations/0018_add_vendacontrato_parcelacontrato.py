# Generated manually for FASE 2

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('estoque', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('financeiro', '0001_initial'),
        ('comercial', '0017_compra_valor_cofins_compra_valor_icms_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='VendaContrato',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numero_contrato', models.CharField(max_length=50, unique=True, verbose_name='Número do Contrato')),
                ('quantidade_total', models.DecimalField(decimal_places=2, max_digits=15, verbose_name='Quantidade Total')),
                ('preco_unitario', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Preço Unitário')),
                ('valor_total', models.DecimalField(decimal_places=2, max_digits=15, verbose_name='Valor Total')),
                ('tipo', models.CharField(choices=[('A_VISTA', 'À Vista'), ('PARCELADO', 'Parcelado'), ('ANTECIPADO', 'Antecipado'), ('FUTURO', 'Contrato Futuro')], max_length=20, verbose_name='Tipo')),
                ('status', models.CharField(choices=[('RASCUNHO', 'Rascunho'), ('ATIVO', 'Ativo'), ('ENCERRADO', 'Encerrado'), ('CANCELADO', 'Cancelado')], default='RASCUNHO', max_length=20, verbose_name='Status')),
                ('data_contrato', models.DateField(verbose_name='Data do Contrato')),
                ('data_entrega_prevista', models.DateField(blank=True, null=True, verbose_name='Data de Entrega Prevista')),
                ('numero_parcelas', models.PositiveIntegerField(default=1, verbose_name='Número de Parcelas')),
                ('periodicidade_parcelas', models.CharField(choices=[('MENSAL', 'Mensal'), ('BIMESTRAL', 'Bimestral'), ('TRIMESTRAL', 'Trimestral')], default='MENSAL', max_length=20, verbose_name='Periodicidade das Parcelas')),
                ('observacoes', models.TextField(blank=True, null=True, verbose_name='Observações')),
                ('criado_em', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('atualizado_em', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('cliente', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='comercial.cliente', verbose_name='Cliente')),
                ('criado_por', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='Criado por')),
                ('produto', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='estoque.produto', verbose_name='Produto')),
            ],
            options={
                'verbose_name': 'Contrato de Venda',
                'verbose_name_plural': 'Contratos de Venda',
                'ordering': ['-data_contrato'],
            },
        ),
        migrations.CreateModel(
            name='ParcelaContrato',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numero_parcela', models.PositiveIntegerField(verbose_name='Número da Parcela')),
                ('valor', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Valor')),
                ('data_vencimento', models.DateField(verbose_name='Data de Vencimento')),
                ('criado_em', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('contrato', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='parcelas', to='comercial.vendacontrato', verbose_name='Contrato')),
                ('vencimento', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='parcelas_contrato', to='financeiro.vencimento', verbose_name='Vencimento')),
            ],
            options={
                'verbose_name': 'Parcela de Contrato',
                'verbose_name_plural': 'Parcelas de Contrato',
                'ordering': ['numero_parcela'],
                'unique_together': {('contrato', 'numero_parcela')},
            },
        ),
    ]
