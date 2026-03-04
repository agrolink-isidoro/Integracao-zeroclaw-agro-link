from rest_framework import serializers

from .models import Language


class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ["id", "code", "name", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {
            "code": {"help_text": "ISO code for the language, ex: pt-BR"},
            "name": {"help_text": "Human readable language name"},
        }
