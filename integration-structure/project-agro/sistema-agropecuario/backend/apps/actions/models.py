"""
apps/actions/models.py
======================

Action Queue — fila de ações propostas pelo Isidoro (ZeroClaw/Gemini).
Nenhuma ação é executada diretamente pelo bot; o usuário sempre aprova primeiro.

Fluxo de estados:
  pending_approval → approved   → executed
                   → rejected
                   → archived
"""

import uuid

from django.db import models
from django.utils import timezone

from apps.core.models import TenantModel, CustomUser


# ============================================================
# CHOICES
# ============================================================

class ActionStatus(models.TextChoices):
    PENDING_APPROVAL = "pending_approval", "Aguardando Aprovação"
    APPROVED         = "approved",         "Aprovado"
    REJECTED         = "rejected",         "Rejeitado"
    EXECUTED         = "executed",         "Executado"
    FAILED           = "failed",           "Falhou na Execução"
    ARCHIVED         = "archived",         "Arquivado"


class ActionModule(models.TextChoices):
    AGRICULTURA    = "agricultura",    "Agricultura"
    MAQUINAS       = "maquinas",       "Máquinas"
    ESTOQUE        = "estoque",        "Estoque"
    FAZENDAS       = "fazendas",       "Fazendas"
    FINANCEIRO     = "financeiro",     "Financeiro"
    COMERCIAL      = "comercial",      "Comercial"
    FISCAL         = "fiscal",         "Fiscal"
    ADMINISTRATIVO = "administrativo", "Administrativo"


class ActionType(models.TextChoices):
    # Agricultura
    OPERACAO_AGRICOLA   = "operacao_agricola",   "Operação Agrícola"
    COLHEITA            = "colheita",            "Colheita"
    # Máquinas
    MANUTENCAO_MAQUINA  = "manutencao_maquina",  "Manutenção de Máquina"
    ABASTECIMENTO       = "abastecimento",       "Abastecimento"
    PARADA_MAQUINA      = "parada_maquina",      "Parada de Máquina"
    # Estoque
    ENTRADA_ESTOQUE     = "entrada_estoque",     "Entrada de Estoque"
    SAIDA_ESTOQUE       = "saida_estoque",       "Saída de Estoque"
    AJUSTE_ESTOQUE      = "ajuste_estoque",      "Ajuste de Estoque"
    CRIAR_ITEM_ESTOQUE  = "criar_item_estoque",  "Criar Item de Estoque"
    # Fazendas
    CRIAR_TALHAO        = "criar_talhao",        "Criar Talhão"
    ATUALIZAR_TALHAO    = "atualizar_talhao",    "Atualizar Talhão"


class UploadStatus(models.TextChoices):
    UPLOADED       = "uploaded",       "Enviado"
    PROCESSING     = "processing",     "Processando"
    PARSED         = "parsed",         "Analisado"
    DRAFTS_CREATED = "drafts_created", "Drafts Criados"
    COMPLETED      = "completed",      "Concluído"
    FAILED         = "failed",         "Falhou"
    ERROR          = "error",          "Erro"


class UploadModule(models.TextChoices):
    AGRICULTURA    = "agricultura",    "Agricultura"
    MAQUINAS       = "maquinas",       "Máquinas"
    ESTOQUE        = "estoque",        "Estoque"
    FAZENDAS       = "fazendas",       "Fazendas"
    FINANCEIRO     = "financeiro",     "Financeiro"
    COMERCIAL      = "comercial",      "Comercial"
    FISCAL         = "fiscal",         "Fiscal"
    ADMINISTRATIVO = "administrativo", "Administrativo"


# ============================================================
# ACTION — modelo principal
# ============================================================

class Action(TenantModel):
    """Ação proposta pelo Isidoro. Aguarda aprovação humana antes de ser executada."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Quem criou / quem aprovou
    criado_por   = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="actions_criadas",
        help_text="Usuário ou 'isidoro' que criou o draft",
    )
    aprovado_por = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="actions_aprovadas",
        help_text="Usuário que aprovou/rejeitou a ação",
    )

    # Classificação
    module      = models.CharField(max_length=50, choices=ActionModule.choices, db_index=True)
    action_type = models.CharField(max_length=50, choices=ActionType.choices)

    # Dados da ação (JSON livre, schema depende do module/action_type)
    draft_data = models.JSONField(
        default=dict,
        help_text="Payload específico da ação (campos variam por tipo)",
    )

    # Validação gerada pelo Isidoro
    validation = models.JSONField(
        default=dict,
        help_text='{"warnings": [...], "errors": [...], "is_valid": bool}',
    )

    # Status do fluxo
    status = models.CharField(
        max_length=30,
        choices=ActionStatus.choices,
        default=ActionStatus.PENDING_APPROVAL,
        db_index=True,
    )
    motivo_rejeicao = models.TextField(blank=True, default="")

    # Upload de origem (se a ação veio de um arquivo)
    upload = models.ForeignKey(
        "UploadedFile", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="actions",
        help_text="Arquivo que originou esta ação (upload em lote)",
    )

    # Timestamps
    criado_em   = models.DateTimeField(auto_now_add=True)
    aprovado_em = models.DateTimeField(null=True, blank=True)
    executado_em = models.DateTimeField(null=True, blank=True)

    # Resultado da execução e metadados
    resultado_execucao = models.JSONField(
        default=dict,
        help_text="Resposta do backend após execução (id criado, status, etc.)",
    )
    meta = models.JSONField(
        default=dict,
        help_text="Metadados: trace_id, versão, canal de origem (whatsapp/web/upload)",
    )

    class Meta:
        verbose_name = "Ação"
        verbose_name_plural = "Ações"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "module", "status"]),
            models.Index(fields=["tenant", "criado_em"]),
            models.Index(fields=["criado_por", "status"]),
        ]

    def __str__(self):
        return f"[{self.module}] {self.action_type} — {self.status} ({self.id})"

    # ── Helpers de estado ──────────────────────────────────────

    @property
    def is_pending(self) -> bool:
        return self.status == ActionStatus.PENDING_APPROVAL

    @property
    def is_editable(self) -> bool:
        return self.status == ActionStatus.PENDING_APPROVAL

    def approve(self, user: "CustomUser") -> None:
        """Marca a ação como aprovada. A execução deve ser disparada separadamente."""
        if not self.is_pending:
            raise ValueError(f"Só é possível aprovar ações em pending_approval. Status atual: {self.status}")
        self.status      = ActionStatus.APPROVED
        self.aprovado_por = user
        self.aprovado_em = timezone.now()
        self.save(update_fields=["status", "aprovado_por", "aprovado_em"])

    def reject(self, user: "CustomUser", motivo: str = "") -> None:
        """Marca a ação como rejeitada."""
        if not self.is_pending:
            raise ValueError(f"Só é possível rejeitar ações em pending_approval. Status atual: {self.status}")
        self.status          = ActionStatus.REJECTED
        self.aprovado_por    = user
        self.aprovado_em     = timezone.now()
        self.motivo_rejeicao = motivo
        self.save(update_fields=["status", "aprovado_por", "aprovado_em", "motivo_rejeicao"])

    def mark_executed(self, resultado: dict = None) -> None:
        """Marca como executada com o resultado do backend."""
        self.status           = ActionStatus.EXECUTED
        self.executado_em     = timezone.now()
        self.resultado_execucao = resultado or {}
        self.save(update_fields=["status", "executado_em", "resultado_execucao"])

    def mark_failed(self, erro: str) -> None:
        """Marca como falha de execução."""
        self.status         = ActionStatus.FAILED
        self.executado_em   = timezone.now()
        self.resultado_execucao = {"error": erro}
        self.save(update_fields=["status", "executado_em", "resultado_execucao"])


# ============================================================
# UPLOADEDFILE — rastreia arquivos enviados pelo chat
# ============================================================

class UploadedFile(TenantModel):
    """Arquivo enviado pelo usuário no chat para análise pelo Isidoro."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    criado_por   = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="uploads",
    )
    nome_original = models.CharField(max_length=255)
    caminho_arquivo = models.CharField(
        max_length=500,
        help_text="Caminho em /tmp/ (dev) ou chave S3 (prod)",
    )
    tamanho       = models.PositiveIntegerField(help_text="Tamanho em bytes")
    mime_type     = models.CharField(max_length=100)

    module = models.CharField(
        max_length=50, choices=UploadModule.choices,
        help_text="Módulo alvo da análise",
    )
    status = models.CharField(
        max_length=30, choices=UploadStatus.choices,
        default=UploadStatus.UPLOADED,
        db_index=True,
    )

    # Resultado do parsing (resumo do que foi extraído)
    resultado_parse = models.JSONField(
        default=dict,
        help_text='{"total_linhas": N, "drafts_gerados": M, "avisos": [...]}',
    )
    mensagem_erro = models.TextField(blank=True, default="")

    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    processado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Arquivo Enviado"
        verbose_name_plural = "Arquivos Enviados"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "module"]),
        ]

    def __str__(self):
        return f"{self.nome_original} [{self.module}] — {self.status}"

    def mark_processing(self) -> None:
        self.status = UploadStatus.PROCESSING
        self.save(update_fields=["status", "atualizado_em"])

    def mark_parsed(self, resultado: dict) -> None:
        self.status          = UploadStatus.PARSED
        self.resultado_parse = resultado
        self.processado_em   = timezone.now()
        self.save(update_fields=["status", "resultado_parse", "processado_em"])

    def mark_drafts_created(self) -> None:
        self.status = UploadStatus.DRAFTS_CREATED
        self.save(update_fields=["status"])

    def mark_error(self, mensagem: str) -> None:
        self.status        = UploadStatus.ERROR
        self.mensagem_erro = mensagem
        self.processado_em = timezone.now()
        self.save(update_fields=["status", "mensagem_erro", "processado_em"])
