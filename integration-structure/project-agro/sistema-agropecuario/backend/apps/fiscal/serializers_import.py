"""
serializers_import.py - Serializers for NFe import operations with forma_pagamento validation
"""

from rest_framework import serializers
from datetime import datetime, timedelta, date
from decimal import Decimal


class ImportMetadataSerializer(serializers.Serializer):
    """
    Serializer for import_metadata dictionary in remote NFe import operations.
    Enforces forma_pagamento-specific validations:
    - boleto: requires vencimento (future date) + valor (> 0)
    - avista: no extra requirements
    - cartao: no extra requirements (optional metadata like nsu, bandeira)
    - outra: optional observacao field
    """

    FORMA_PAGAMENTO_CHOICES = [
        ('boleto', 'Boleto'),
        ('avista', 'À Vista'),
        ('cartao', 'Cartão'),
        ('outra', 'Outra'),
    ]

    forma_pagamento = serializers.ChoiceField(choices=FORMA_PAGAMENTO_CHOICES, required=True)
    
    # Optional fields (used by boleto)
    vencimento = serializers.DateField(required=False, allow_null=True)
    valor = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    
    # Optional field (used by outra)
    observacao = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    # Optional metadata fields (for extensibility)
    nsu = serializers.CharField(max_length=50, required=False, allow_blank=True)
    bandeira = serializers.CharField(max_length=50, required=False, allow_blank=True)
    referencia_pagamento = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate(self, data):
        """Cross-field validation based on forma_pagamento choice."""
        forma_pagamento = data.get('forma_pagamento')
        errors = {}
        
        if forma_pagamento == 'boleto':
            # Boleto requires vencimento (future date) and valor (> 0)
            vencimento = data.get('vencimento')
            valor = data.get('valor')
            
            if not vencimento:
                errors['vencimento'] = 'Vencimento é obrigatório para Boleto'
            elif isinstance(vencimento, date):
                # Vencimento must be a future date
                if vencimento <= datetime.now().date():
                    errors['vencimento'] = 'Vencimento deve ser uma data futura'
            
            if valor is None:
                errors['valor'] = 'Valor é obrigatório para Boleto'
            elif valor <= 0:
                errors['valor'] = 'Valor deve ser maior que zero'
            
            if errors:
                raise serializers.ValidationError(errors)
        
        elif forma_pagamento == 'avista':
            # Avista: remove vencimento and valor if present (not needed)
            data.pop('vencimento', None)
            data.pop('valor', None)
        
        elif forma_pagamento == 'cartao':
            # Cartão: optional metadata fields allowed, but no vencimento/valor needed
            data.pop('vencimento', None)
            data.pop('valor', None)
        
        elif forma_pagamento == 'outra':
            # Outra: observacao optional, but no vencimento/valor needed
            data.pop('vencimento', None)
            data.pop('valor', None)
        
        return data


class NFeRemoteImportRequestSerializer(serializers.Serializer):
    """
    Serializer for POST /fiscal/nfes/remotas/{id}/import/ request body.
    """
    centro_custo_id = serializers.IntegerField(required=False, allow_null=True)
    import_metadata = ImportMetadataSerializer(required=True)

    def validate_import_metadata(self, value):
        """Validate import_metadata using ImportMetadataSerializer."""
        if isinstance(value, dict):
            serializer = ImportMetadataSerializer(data=value)
            if not serializer.is_valid():
                raise serializers.ValidationError(serializer.errors)
            return serializer.validated_data
        return value
