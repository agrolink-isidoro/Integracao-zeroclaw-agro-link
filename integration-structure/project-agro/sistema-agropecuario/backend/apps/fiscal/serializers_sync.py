from rest_framework import serializers
from .models_sync import NFeRemote


class NFeRemoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = NFeRemote
        fields = ('id', 'chave_acesso', 'received_at', 'import_status', 'certificado')
        read_only_fields = ('id', 'received_at', 'import_status')
