from apps.core.mixins import TenantQuerySetMixin
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .models_certificado_a3 import CertificadoA3
import os

class CertificadoA3Serializer(serializers.ModelSerializer):
    arquivo_certificado = serializers.FileField(required=True)
    senha_certificado = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = CertificadoA3
        fields = ['id', 'nome', 'ativo', 'arquivo_certificado', 'senha_certificado', 
                 'valido_ate', 'cnpj_titular', 'razao_social', 'criado_em']
        read_only_fields = ['valido_ate', 'cnpj_titular', 'razao_social', 'criado_em']

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_certificados(request):
    """Lista todos os certificados A3"""
    certificados = CertificadoA3.objects.all()
    serializer = CertificadoA3Serializer(certificados, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_certificado(request):
    """Upload de novo certificado A3"""
    serializer = CertificadoA3Serializer(data=request.data)
    
    if serializer.is_valid():
        # Criar certificado
        certificado = serializer.save(criado_por=request.user)
        
        # Validar certificado após upload
        resultado_validacao = certificado.validar_certificado()
        
        if not resultado_validacao['valid']:
            # Remover certificado inválido
            certificado.delete()
            return Response({
                'error': 'Certificado inválido',
                'details': resultado_validacao['error']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Salvar metadados extraídos
        certificado.save()
        
        return Response({
            'success': True,
            'message': 'Certificado A3 carregado com sucesso',
            'certificado': CertificadoA3Serializer(certificado).data,
            'validacao': resultado_validacao
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])  
def ativar_certificado(request, certificado_id):
    """Ativa um certificado específico"""
    try:
        certificado = CertificadoA3.objects.get(id=certificado_id)
        
        # Validar antes de ativar
        resultado = certificado.validar_certificado()
        if not resultado['valid']:
            return Response({
                'error': 'Certificado inválido',
                'details': resultado['error']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Ativar certificado (desativa outros automaticamente)
        certificado.ativo = True
        certificado.save()
        
        return Response({
            'success': True,
            'message': f'Certificado "{certificado.nome}" ativado com sucesso'
        })
        
    except CertificadoA3.DoesNotExist:
        return Response({'error': 'Certificado não encontrado'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def deletar_certificado(request, certificado_id):
    """Remove um certificado A3"""
    try:
        certificado = CertificadoA3.objects.get(id=certificado_id)
        nome = certificado.nome
        certificado.delete()
        
        return Response({
            'success': True,
            'message': f'Certificado "{nome}" removido com sucesso'
        })
        
    except CertificadoA3.DoesNotExist:
        return Response({'error': 'Certificado não encontrado'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def status_certificado(request):
    """Retorna status do certificado ativo"""
    certificado = CertificadoA3.get_ativo()
    
    if not certificado:
        return Response({
            'ativo': False,
            'message': 'Nenhum certificado A3 configurado'
        })
    
    # Validar certificado ativo
    resultado = certificado.validar_certificado()
    
    return Response({
        'ativo': True,
        'certificado': {
            'id': certificado.id,
            'nome': certificado.nome,
            'cnpj_titular': certificado.cnpj_titular,
            'razao_social': certificado.razao_social,
            'valido_ate': certificado.valido_ate,
            'criado_em': certificado.criado_em
        },
        'validacao': resultado
    })