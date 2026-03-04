"""Migration inicial para apps.actions — Action e UploadedFile."""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("core", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UploadedFile",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("tenant", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="actions_uploadedfile_set",
                    to="core.tenant",
                )),
                ("criado_por", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="uploads",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("nome_original", models.CharField(max_length=255)),
                ("caminho_arquivo", models.CharField(
                    help_text="Caminho em /tmp/ (dev) ou chave S3 (prod)",
                    max_length=500,
                )),
                ("tamanho", models.PositiveIntegerField(help_text="Tamanho em bytes")),
                ("mime_type", models.CharField(max_length=100)),
                ("module", models.CharField(
                    choices=[
                        ("agricultura", "Agricultura"),
                        ("maquinas", "Máquinas"),
                        ("estoque", "Estoque"),
                        ("fazendas", "Fazendas"),
                    ],
                    help_text="Módulo alvo da análise",
                    max_length=50,
                )),
                ("status", models.CharField(
                    choices=[
                        ("uploaded", "Enviado"),
                        ("processing", "Processando"),
                        ("parsed", "Analisado"),
                        ("drafts_created", "Drafts Criados"),
                        ("completed", "Concluído"),
                        ("failed", "Falhou"),
                        ("error", "Erro"),
                    ],
                    db_index=True,
                    default="uploaded",
                    max_length=30,
                )),
                ("resultado_parse", models.JSONField(
                    default=dict,
                    help_text='{"total_linhas": N, "drafts_gerados": M, "avisos": [...]}',
                )),
                ("mensagem_erro", models.TextField(blank=True, default="")),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("processado_em", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "Arquivo Enviado",
                "verbose_name_plural": "Arquivos Enviados",
                "ordering": ["-criado_em"],
            },
        ),
        migrations.CreateModel(
            name="Action",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("tenant", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="actions_action_set",
                    to="core.tenant",
                )),
                ("criado_por", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="actions_criadas",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("aprovado_por", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="actions_aprovadas",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("upload", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="actions",
                    to="actions.uploadedfile",
                )),
                ("module", models.CharField(
                    choices=[
                        ("agricultura", "Agricultura"),
                        ("maquinas", "Máquinas"),
                        ("estoque", "Estoque"),
                        ("fazendas", "Fazendas"),
                        ("financeiro", "Financeiro"),
                        ("comercial", "Comercial"),
                        ("fiscal", "Fiscal"),
                        ("administrativo", "Administrativo"),
                    ],
                    db_index=True,
                    max_length=50,
                )),
                ("action_type", models.CharField(
                    choices=[
                        ("operacao_agricola", "Operação Agrícola"),
                        ("colheita", "Colheita"),
                        ("manutencao_maquina", "Manutenção de Máquina"),
                        ("abastecimento", "Abastecimento"),
                        ("parada_maquina", "Parada de Máquina"),
                        ("entrada_estoque", "Entrada de Estoque"),
                        ("saida_estoque", "Saída de Estoque"),
                        ("ajuste_estoque", "Ajuste de Estoque"),
                        ("criar_item_estoque", "Criar Item de Estoque"),
                        ("criar_talhao", "Criar Talhão"),
                        ("atualizar_talhao", "Atualizar Talhão"),
                    ],
                    max_length=50,
                )),
                ("draft_data", models.JSONField(default=dict)),
                ("validation", models.JSONField(default=dict)),
                ("status", models.CharField(
                    choices=[
                        ("pending_approval", "Aguardando Aprovação"),
                        ("approved", "Aprovado"),
                        ("rejected", "Rejeitado"),
                        ("executed", "Executado"),
                        ("failed", "Falhou na Execução"),
                        ("archived", "Arquivado"),
                    ],
                    db_index=True,
                    default="pending_approval",
                    max_length=30,
                )),
                ("motivo_rejeicao", models.TextField(blank=True, default="")),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("aprovado_em", models.DateTimeField(blank=True, null=True)),
                ("executado_em", models.DateTimeField(blank=True, null=True)),
                ("resultado_execucao", models.JSONField(default=dict)),
                ("meta", models.JSONField(default=dict)),
            ],
            options={
                "verbose_name": "Ação",
                "verbose_name_plural": "Ações",
                "ordering": ["-criado_em"],
            },
        ),
        migrations.AddIndex(
            model_name="uploadedfile",
            index=models.Index(fields=["tenant", "status"], name="actions_up_tenant_status_idx"),
        ),
        migrations.AddIndex(
            model_name="uploadedfile",
            index=models.Index(fields=["tenant", "module"], name="actions_up_tenant_module_idx"),
        ),
        migrations.AddIndex(
            model_name="action",
            index=models.Index(fields=["tenant", "status"], name="actions_ac_tenant_status_idx"),
        ),
        migrations.AddIndex(
            model_name="action",
            index=models.Index(fields=["tenant", "module", "status"], name="actions_ac_tenant_mod_status_idx"),
        ),
        migrations.AddIndex(
            model_name="action",
            index=models.Index(fields=["tenant", "criado_em"], name="actions_ac_tenant_created_idx"),
        ),
        migrations.AddIndex(
            model_name="action",
            index=models.Index(fields=["criado_por", "status"], name="actions_ac_user_status_idx"),
        ),
    ]
