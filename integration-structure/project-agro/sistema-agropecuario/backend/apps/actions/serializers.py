"""apps/actions/serializers.py"""

import os
import uuid

from rest_framework import serializers
from .models import Action, ActionStatus, UploadedFile


class ActionSerializer(serializers.ModelSerializer):
    """Serializer completo para leitura — inclui nomes de usuários."""

    criado_por_nome   = serializers.SerializerMethodField()
    aprovado_por_nome = serializers.SerializerMethodField()
    upload_nome       = serializers.SerializerMethodField()

    class Meta:
        model  = Action
        fields = [
            "id", "module", "action_type", "status",
            "draft_data", "validation",
            "criado_por", "criado_por_nome",
            "aprovado_por", "aprovado_por_nome",
            "motivo_rejeicao",
            "upload", "upload_nome",
            "criado_em", "aprovado_em", "executado_em",
            "resultado_execucao", "meta",
        ]
        read_only_fields = [
            "id", "status", "aprovado_por", "aprovado_em",
            "executado_em", "resultado_execucao",
        ]

    def get_criado_por_nome(self, obj):
        if obj.criado_por:
            return obj.criado_por.get_full_name() or obj.criado_por.username
        return "Isidoro (IA)"

    def get_aprovado_por_nome(self, obj):
        if obj.aprovado_por:
            return obj.aprovado_por.get_full_name() or obj.aprovado_por.username
        return None

    def get_upload_nome(self, obj):
        if obj.upload:
            return obj.upload.nome_original
        return None


class ActionCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de draft pelo Isidoro/ZeroClaw."""

    class Meta:
        model  = Action
        fields = ["id", "module", "action_type", "status", "draft_data", "validation", "meta", "upload"]
        read_only_fields = ["id", "status"]

    def validate_module(self, value):
        from .models import ActionModule
        valid = [m.value for m in ActionModule]
        if value not in valid:
            raise serializers.ValidationError(f"Módulo inválido: {value}. Válidos: {valid}")
        return value

    def validate_action_type(self, value):
        from .models import ActionType
        valid = [t.value for t in ActionType]
        if value not in valid:
            raise serializers.ValidationError(f"Tipo inválido: {value}. Válidos: {valid}")
        return value


class ActionApproveSerializer(serializers.Serializer):
    """Payload para aprovar uma ação."""
    # Sem campos obrigatórios — aprovação simples
    pass


class ActionRejectSerializer(serializers.Serializer):
    """Payload para rejeitar uma ação."""
    motivo = serializers.CharField(
        required=False, allow_blank=True, default="",
        help_text="Motivo da rejeição (opcional)",
    )


class BulkApproveSerializer(serializers.Serializer):
    """Aprovar múltiplas ações de uma vez (upload em lote)."""
    action_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=200,
    )


class UploadedFileSerializer(serializers.ModelSerializer):
    """Serializer para UploadedFile."""

    criado_por_nome = serializers.SerializerMethodField()
    drafts_count     = serializers.SerializerMethodField()
    # Write-only: the actual uploaded file binary
    arquivo = serializers.FileField(write_only=True, required=True)
    # Optional: derived from the file when not supplied by client
    nome_original = serializers.CharField(required=False, default="")
    tamanho       = serializers.IntegerField(required=False, default=0)
    mime_type     = serializers.CharField(required=False, default="")

    class Meta:
        model  = UploadedFile
        fields = [
            "id", "nome_original", "tamanho", "mime_type",
            "module", "status",
            "criado_por", "criado_por_nome",
            "resultado_parse", "mensagem_erro",
            "criado_em", "processado_em",
            "drafts_count",
            "arquivo",  # write-only
        ]
        read_only_fields = [
            "id", "status", "resultado_parse", "mensagem_erro",
            "processado_em",
        ]

    def get_criado_por_nome(self, obj):
        if obj.criado_por:
            return obj.criado_por.get_full_name() or obj.criado_por.username
        return None

    def get_drafts_count(self, obj):
        return obj.actions.count()

    def create(self, validated_data):
        arquivo = validated_data.pop("arquivo")
        # Persist file to /tmp with a unique name to avoid collisions
        ext = os.path.splitext(arquivo.name)[1]
        filename = f"{uuid.uuid4()}{ext}"
        tmp_path = os.path.join("/tmp", filename)
        with open(tmp_path, "wb") as fh:
            for chunk in arquivo.chunks():
                fh.write(chunk)
        validated_data["caminho_arquivo"] = tmp_path
        # Always derive these from the actual file (override any empty client-sent defaults)
        validated_data["nome_original"] = validated_data.get("nome_original") or arquivo.name
        validated_data["tamanho"] = validated_data.get("tamanho") or arquivo.size
        validated_data["mime_type"] = (
            validated_data.get("mime_type")
            or arquivo.content_type
            or "application/octet-stream"
        )
        return super().create(validated_data)
