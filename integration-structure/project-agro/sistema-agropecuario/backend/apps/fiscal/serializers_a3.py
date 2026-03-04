"""
serializers_a3.py - Serializers for A3 (PKCS#11) certificate support
"""

from rest_framework import serializers
from .models_certificados import CertificadoSefaz
import re


class CertificadoA3ValidationSerializer(serializers.Serializer):
    """
    Serializer for validating A3 (PKCS#11) certificate registration.
    Enforces:
    - Must have either a3_cnpj OR a3_cpf (not both, not neither)
    - a3_pkcs11_path must be valid path
    - CNPJ/CPF format validation
    """

    tipo = serializers.ChoiceField(choices=['a3', 'p12'])
    a3_cnpj = serializers.CharField(max_length=14, required=False, allow_blank=True)
    a3_cpf = serializers.CharField(max_length=11, required=False, allow_blank=True)
    a3_pkcs11_path = serializers.CharField(max_length=255, required=False, allow_blank=True)
    a3_device_serial = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate(self, data):
        """Cross-field validation for A3 fields."""
        tipo = data.get('tipo')
        
        if tipo == 'a3':
            # A3 requires pkcs11_path
            a3_path = data.get('a3_pkcs11_path', '').strip()
            if not a3_path:
                raise serializers.ValidationError({
                    'a3_pkcs11_path': 'a3_pkcs11_path é obrigatório para certificados A3'
                })
            
            # A3 requires either CNPJ or CPF (but not both)
            a3_cnpj = data.get('a3_cnpj', '').strip()
            a3_cpf = data.get('a3_cpf', '').strip()
            
            has_cnpj = bool(a3_cnpj)
            has_cpf = bool(a3_cpf)
            
            if not has_cnpj and not has_cpf:
                raise serializers.ValidationError({
                    'non_field_errors': 'A3 requer CNPJ ou CPF (pelo menos um)'
                })
            
            if has_cnpj and has_cpf:
                raise serializers.ValidationError({
                    'non_field_errors': 'A3 não pode ter tanto CNPJ quanto CPF (escolha um)'
                })
            
            # Validate CNPJ format if provided
            if has_cnpj and not self._is_valid_cnpj(a3_cnpj):
                raise serializers.ValidationError({
                    'a3_cnpj': 'CNPJ inválido (deve ter 14 dígitos)'
                })
            
            # Validate CPF format if provided
            if has_cpf and not self._is_valid_cpf(a3_cpf):
                raise serializers.ValidationError({
                    'a3_cpf': 'CPF inválido (deve ter 11 dígitos)'
                })
        
        else:  # tipo == 'p12'
            # P12 should not have A3 fields
            if data.get('a3_pkcs11_path'):
                raise serializers.ValidationError({
                    'a3_pkcs11_path': 'a3_pkcs11_path não é aplicável para P12'
                })
            if data.get('a3_cnpj') or data.get('a3_cpf'):
                raise serializers.ValidationError({
                    'non_field_errors': 'A3 fields não são aplicáveis para P12'
                })
        
        return data

    @staticmethod
    def _is_valid_cnpj(cnpj: str) -> bool:
        """Validate CNPJ format (14 digits)."""
        return bool(re.match(r'^\d{14}$', cnpj))

    @staticmethod
    def _is_valid_cpf(cpf: str) -> bool:
        """Validate CPF format (11 digits)."""
        return bool(re.match(r'^\d{11}$', cpf))


class CertificadoA3Serializer(serializers.ModelSerializer):
    """
    Serializer for CertificadoSefaz with A3 support.
    """
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    arquivo = serializers.FileField(write_only=True, required=False)
    arquivo_name = serializers.CharField(read_only=True)
    uploaded_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = CertificadoSefaz
        fields = (
            'id',
            'nome',
            'tipo',
            'arquivo',
            'arquivo_name',
            'password',
            'uploaded_by',
            'created_at',
            'validade',
            'fingerprint',
            # A3 fields
            'a3_cnpj',
            'a3_cpf',
            'a3_pkcs11_path',
            'a3_device_serial'
        )
        read_only_fields = ('id', 'uploaded_by', 'created_at', 'validade', 'fingerprint', 'arquivo_name')

    def validate(self, attrs):
        """Validate using CertificadoA3ValidationSerializer."""
        validation_data = {
            'tipo': attrs.get('tipo'),
            'a3_cnpj': attrs.get('a3_cnpj'),
            'a3_cpf': attrs.get('a3_cpf'),
            'a3_pkcs11_path': attrs.get('a3_pkcs11_path'),
            'a3_device_serial': attrs.get('a3_device_serial')
        }
        
        validator = CertificadoA3ValidationSerializer(data=validation_data)
        if not validator.is_valid():
            raise serializers.ValidationError(validator.errors)
        
        return attrs
