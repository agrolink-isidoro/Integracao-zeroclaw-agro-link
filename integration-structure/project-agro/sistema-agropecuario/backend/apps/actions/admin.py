"""Django Admin para Action Queue."""

from django.contrib import admin
from django.utils.html import format_html
from .models import Action, UploadedFile, ActionStatus


@admin.register(UploadedFile)
class UploadedFileAdmin(admin.ModelAdmin):
    list_display = ["id", "nome_original", "module", "status", "tamanho_kb", "criado_em"]
    list_filter = ["module", "status", "criado_em"]
    search_fields = ["nome_original", "mensagem_erro"]
    readonly_fields = [
        "id", "criado_por", "criado_em", "atualizado_em",
        "resultado_parse", "mensagem_erro", "tamanho",
    ]
    ordering = ["-criado_em"]

    def tamanho_kb(self, obj):
        if obj.tamanho:
            return f"{obj.tamanho / 1024:.1f} KB"
        return "-"
    tamanho_kb.short_description = "Tamanho"


class ActionStatusFilter(admin.SimpleListFilter):
    title = "Status"
    parameter_name = "status"

    def lookups(self, request, model_admin):
        return ActionStatus.choices

    def queryset(self, qs, value):
        if value:
            return qs.filter(status=value)
        return qs


@admin.register(Action)
class ActionAdmin(admin.ModelAdmin):
    list_display = [
        "id_curto", "module", "action_type", "status_badge",
        "criado_por", "aprovado_por", "criado_em",
    ]
    list_filter = [ActionStatusFilter, "module", "action_type", "criado_em"]
    search_fields = ["id", "draft_data", "meta", "criado_por__username"]
    readonly_fields = [
        "id", "criado_por", "aprovado_por", "criado_em",
        "resultado_execucao", "upload",
    ]
    ordering = ["-criado_em"]
    fieldsets = (
        ("Identificação", {"fields": ("id", "tenant", "module", "action_type", "status")}),
        ("Dados", {"fields": ("draft_data", "validation", "meta")}),
        ("Aprovação", {"fields": ("criado_por", "aprovado_por", "motivo_rejeicao")}),
        ("Execução", {"fields": ("resultado_execucao", "upload")}),
        ("Timestamps", {"fields": ("criado_em",)}),
    )

    def id_curto(self, obj):
        return str(obj.id)[:8] + "…"
    id_curto.short_description = "ID"

    def status_badge(self, obj):
        colors = {
            ActionStatus.PENDING_APPROVAL: "#f59e0b",
            ActionStatus.APPROVED: "#3b82f6",
            ActionStatus.REJECTED: "#ef4444",
            ActionStatus.EXECUTED: "#10b981",
            ActionStatus.FAILED: "#dc2626",
            ActionStatus.ARCHIVED: "#6b7280",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:4px">{}</span>',
            color, obj.get_status_display(),
        )
    status_badge.short_description = "Status"
    status_badge.allow_tags = True
