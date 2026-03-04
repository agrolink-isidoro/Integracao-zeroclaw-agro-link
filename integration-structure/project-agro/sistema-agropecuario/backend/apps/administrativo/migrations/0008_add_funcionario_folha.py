# Generated manually: add Funcionario, FolhaPagamento and FolhaPagamentoItem models
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('administrativo', '0007_rename_administr_cent_data_pend_idx_administrat_centro__c52f84_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Funcionario',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=200)),
                ('cpf', models.CharField(blank=True, max_length=11, null=True)),
                ('cargo', models.CharField(blank=True, max_length=100, null=True)),
                ('conta_bancaria', models.CharField(blank=True, max_length=100, null=True)),
                ('salario_bruto', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('ativo', models.BooleanField(default=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='FolhaPagamento',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('descricao', models.CharField(blank=True, max_length=200, null=True)),
                ('periodo_ano', models.PositiveIntegerField(blank=True, null=True)),
                ('periodo_mes', models.PositiveIntegerField(blank=True, null=True)),
                ('valor_total', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('executado', models.BooleanField(default=False)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('criado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.customuser')),
            ],
        ),
        migrations.CreateModel(
            name='FolhaPagamentoItem',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('salario_bruto', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('descontos', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('liquido', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('funcionario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='administrativo.funcionario')),
                ('folha', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='itens', to='administrativo.folhapagamento')),
            ],
        ),
    ]
