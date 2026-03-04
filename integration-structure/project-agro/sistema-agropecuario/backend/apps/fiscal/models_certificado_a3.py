from django.db import models
from apps.core.models import TenantModel
from django.conf import settings
from django.utils import timezone
from cryptography.hazmat.primitives.serialization import pkcs12
import os

class CertificadoA3(TenantModel):
    """Certificado digital A3 para comunicação com SEFAZ"""
    
    nome = models.CharField(max_length=200, help_text="Nome descritivo do certificado")
    ativo = models.BooleanField(default=True, help_text="Certificado ativo para uso")
    
    # Arquivo do certificado (.p12/.pfx)
    arquivo_certificado = models.FileField(
        upload_to='certificados/',
        help_text="Arquivo .p12 ou .pfx do certificado A3"
    )
    
    # Senha do certificado (será armazenada de forma criptografada em produção)
    senha_certificado = models.CharField(
        max_length=500,
        help_text="Senha do certificado (será criptografada)"
    )
    
    # Metadados do certificado
    valido_ate = models.DateTimeField(null=True, blank=True)
    cnpj_titular = models.CharField(max_length=18, null=True, blank=True)
    razao_social = models.CharField(max_length=200, null=True, blank=True)
    
    # Auditoria
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='certificados_criados'
    )
    
    class Meta:
        verbose_name = 'Certificado A3'
        verbose_name_plural = 'Certificados A3'
        ordering = ['-ativo', '-criado_em']
    
    def __str__(self):
        status = "Ativo" if self.ativo else "Inativo"
        return f"{self.nome} ({status})"
    
    @classmethod
    def get_ativo(cls):
        """Retorna o certificado ativo para uso"""
        return cls.objects.filter(ativo=True).first()
    
    def save(self, *args, **kwargs):
        # Se este certificado está sendo marcado como ativo,
        # desativar todos os outros
        if self.ativo:
            CertificadoA3.objects.exclude(pk=self.pk).update(ativo=False)
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        # Remover arquivo quando certificado for deletado
        if self.arquivo_certificado:
            try:
                if os.path.isfile(self.arquivo_certificado.path):
                    os.remove(self.arquivo_certificado.path)
            except:
                pass
        super().delete(*args, **kwargs)
    
    def validar_certificado(self):
        """Valida se o certificado é válido e carrega metadados"""
        if not self.arquivo_certificado:
            return {'valid': False, 'error': 'Arquivo não encontrado'}
        
        try:
            with open(self.arquivo_certificado.path, 'rb') as f:
                p12_data = f.read()
            
            # Tentar carregar o certificado
            private_key, cert, additional_certificates = pkcs12.load_key_and_certificates(
                p12_data, 
                password=self.senha_certificado.encode('utf-8') if self.senha_certificado else None
            )
            
            if not cert:
                return {'valid': False, 'error': 'Certificado não encontrado no arquivo'}
            
            # Extrair metadados
            from cryptography import x509
            
            # CNPJ do titular
            for attribute in cert.subject:
                if attribute.oid == x509.NameOID.COMMON_NAME:
                    cn = attribute.value
                    # Extrair CNPJ se presente no CN
                    import re
                    cnpj_match = re.search(r'(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})', cn)
                    if cnpj_match:
                        self.cnpj_titular = cnpj_match.group(1)
                    break
            
            # Razão social
            for attribute in cert.subject:
                if attribute.oid == x509.NameOID.ORGANIZATION_NAME:
                    self.razao_social = attribute.value
                    break
            
            # Data de validade
            self.valido_ate = cert.not_valid_after_utc.replace(tzinfo=timezone.utc)
            
            return {
                'valid': True,
                'cnpj': self.cnpj_titular,
                'razao_social': self.razao_social,
                'valido_ate': self.valido_ate
            }
            
        except Exception as e:
            return {'valid': False, 'error': str(e)}
    
    def get_certificado_data(self):
        """Retorna dados do certificado para uso no SEFAZ client"""
        if not self.arquivo_certificado:
            return None
        
        try:
            with open(self.arquivo_certificado.path, 'rb') as f:
                return {
                    'data': f.read(),
                    'password': self.senha_certificado
                }
        except Exception:
            return None