from django.db import models
from apps.core.models import TenantModel
from apps.core.models import CustomUser


class CertificadoSefaz(TenantModel):
    TIPO_CHOICES = [
        ('p12', 'PKCS#12 (.p12/.pfx)'),
        ('a3', 'A3 (PKCS#11 - HSM/Token)'),
    ]

    nome = models.CharField(max_length=120)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, default='p12')
    
    # P12 fields
    arquivo = models.FileField(upload_to='certificados_sefaz/', null=True, blank=True)
    # Nome original do arquivo enviado (ex.: test_cert.p12)
    arquivo_name = models.CharField(max_length=255, null=True, blank=True)
    # Bytes cifrados (Fernet token). Use BinaryField para armazenar blob encriptado.
    arquivo_encrypted = models.BinaryField(null=True, blank=True, editable=False)
    # Senha do certificado (encriptada com mesmo método)
    senha_encrypted = models.BinaryField(null=True, blank=True, editable=False)
    
    # A3 fields
    a3_cnpj = models.CharField(max_length=14, null=True, blank=True, help_text='CNPJ for A3 enterprise certificate')
    a3_cpf = models.CharField(max_length=11, null=True, blank=True, help_text='CPF for A3 individual certificate')
    a3_pkcs11_path = models.CharField(max_length=255, null=True, blank=True, help_text='Path to PKCS#11 library (e.g., /usr/lib/libsofthsm2.so)')
    a3_device_serial = models.CharField(max_length=100, null=True, blank=True, help_text='HSM/smartcard device serial number')
    
    uploaded_by = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    validade = models.DateField(null=True, blank=True)
    fingerprint = models.CharField(max_length=128, null=True, blank=True, help_text='SHA256 fingerprint of the certificate in hex')
    
    # Campos detectados automaticamente do certificado
    tipo_certificado = models.CharField(max_length=20, null=True, blank=True, help_text='e-CPF, e-CNPJ, etc. (detectado automaticamente)')
    tipo_armazenamento = models.CharField(max_length=5, null=True, blank=True, help_text='A1 ou A3 (detectado automaticamente)')
    cnpj_titular = models.CharField(max_length=14, null=True, blank=True, help_text='CNPJ do titular (detectado automaticamente)')
    cpf_titular = models.CharField(max_length=11, null=True, blank=True, help_text='CPF do titular (detectado automaticamente)')
    nome_titular = models.CharField(max_length=255, null=True, blank=True, help_text='Nome do titular (detectado automaticamente)')

    class Meta:
        verbose_name = 'Certificado SEFAZ'
        verbose_name_plural = 'Certificados SEFAZ'

    def __str__(self):
        return self.nome

    def get_arquivo_bytes(self):
        """Return the plaintext bytes for the certificate.

        Priority:
        - If `arquivo_encrypted` is present, decrypt it and return plaintext.
        - Else, if `arquivo` FileField has content, return its bytes.
        - Else, return None.
        """
        if self.arquivo_encrypted:
            try:
                from .crypto import decrypt_bytes
                # Django BinaryField may return a memoryview; ensure bytes
                token = bytes(self.arquivo_encrypted)
                return decrypt_bytes(token)
            except Exception:
                # Bubble up for callers who expect exceptions on invalid tokens
                raise
        if self.arquivo:
            try:
                # arquivo may be a FieldFile
                self.arquivo.open(mode='rb')
                data = self.arquivo.read()
                try:
                    self.arquivo.close()
                except Exception:
                    # Best-effort cleanup: ignore errors when closing file
                    # since we already have the data to return
                    pass
                return data
            except Exception:
                return None
        return None
    
    def get_senha(self):
        """Return the decrypted password for the certificate.
        
        Returns:
            str or None: Decrypted password if available
        """
        if self.senha_encrypted:
            try:
                from .crypto import decrypt_bytes
                token = bytes(self.senha_encrypted)
                senha_bytes = decrypt_bytes(token)
                return senha_bytes.decode('utf-8') if senha_bytes else None
            except Exception:
                return None
        return None

    def detectar_tipo_certificado(self):
        """Detecta automaticamente o tipo de certificado (e-CPF/e-CNPJ, A1/A3).
        
        Atualiza os campos:
        - tipo_certificado (e-CPF, e-CNPJ, etc.)
        - tipo_armazenamento (A1, A3)
        - cnpj_titular ou cpf_titular
        - nome_titular
        
        Returns:
            dict: Informações detectadas ou None se falhar
        """
        try:
            import re
            from cryptography.hazmat.primitives.serialization import pkcs12
            from cryptography import x509
            
            # Pegar bytes e senha
            pkcs12_bytes = self.get_arquivo_bytes()
            senha = self.get_senha()
            
            if not pkcs12_bytes:
                return None
            
            # Carregar PKCS12
            senha_bytes = senha.encode('utf-8') if senha else None
            p12 = pkcs12.load_key_and_certificates(pkcs12_bytes, password=senha_bytes)
            
            if not p12 or not p12[1]:
                return None
            
            cert = p12[1]
            subject = cert.subject
            
            # Variáveis para armazenar informações
            cn = None
            ou_lista = []
            tipo_cert = None
            tipo_armaz = None
            cnpj_cpf = None
            titular = None
            
            # Extrair campos do Subject DN
            for attr in subject:
                if attr.oid == x509.oid.NameOID.COMMON_NAME:
                    cn = attr.value
                elif attr.oid == x509.oid.NameOID.ORGANIZATIONAL_UNIT_NAME:
                    ou_lista.append(attr.value)
            
            # Identificar tipo de certificado e armazenamento
            for ou in ou_lista:
                # Detectar e-CPF
                if 'e-CPF' in ou or 'PF A1' in ou or 'PF A3' in ou:
                    tipo_cert = 'e-CPF'
                    if 'A1' in ou:
                        tipo_armaz = 'A1'
                    elif 'A3' in ou:
                        tipo_armaz = 'A3'
                
                # Detectar e-CNPJ
                elif 'e-CNPJ' in ou or 'PJ A1' in ou or 'PJ A3' in ou:
                    tipo_cert = 'e-CNPJ'
                    if 'A1' in ou:
                        tipo_armaz = 'A1'
                    elif 'A3' in ou:
                        tipo_armaz = 'A3'
                
                # Extrair CNPJ (14 dígitos)
                if not cnpj_cpf:
                    match_cnpj = re.search(r'(\d{14})', ou)
                    if match_cnpj:
                        cnpj_cpf = match_cnpj.group(1)
                        continue
                    
                    # Extrair CPF (11 dígitos)
                    match_cpf = re.search(r'(\d{11})', ou)
                    if match_cpf:
                        cnpj_cpf = match_cpf.group(1)
            
            # Extrair titular do CN
            if cn:
                titular = cn.split(':')[0].strip() if ':' in cn else cn.strip()
            
            # Se não detectou tipo de armazenamento, assumir A1 (arquivo)
            if not tipo_armaz:
                tipo_armaz = 'A1'
            
            # Atualizar campos do modelo
            self.tipo_certificado = tipo_cert
            self.tipo_armazenamento = tipo_armaz
            self.nome_titular = titular
            
            # Determinar se é CNPJ ou CPF baseado no tipo e tamanho
            if cnpj_cpf:
                if len(cnpj_cpf) == 14:
                    self.cnpj_titular = cnpj_cpf
                    self.cpf_titular = None
                elif len(cnpj_cpf) == 11:
                    self.cpf_titular = cnpj_cpf
                    self.cnpj_titular = None
            
            # Salvar mudanças
            self.save(update_fields=['tipo_certificado', 'tipo_armazenamento', 
                                    'cnpj_titular', 'cpf_titular', 'nome_titular'])
            
            return {
                'tipo_certificado': tipo_cert,
                'tipo_armazenamento': tipo_armaz,
                'cnpj_titular': self.cnpj_titular,
                'cpf_titular': self.cpf_titular,
                'nome_titular': titular,
            }
            
        except Exception as e:
            # Log error but don't crash
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f'Erro ao detectar tipo de certificado {self.id}: {e}')
            return None


class CertificadoActionAudit(TenantModel):
    ACTION_CHOICES = [
        ('migrate', 'Migrate'),
        ('rotate', 'Rotate'),
        ('upload', 'Upload'),
        ('emit', 'Emit'),
        ('cancel', 'Cancel'),
        ('send', 'Send to SEFAZ'),
        ('callback', 'SEFAZ Callback'),
    ]

    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    certificado = models.ForeignKey(CertificadoSefaz, null=True, blank=True, on_delete=models.SET_NULL, related_name='audits')
    performed_by = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL)
    performed_by_identifier = models.CharField(max_length=255, null=True, blank=True, help_text='human identifier (username or system user)')
    details = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Certificado Action Audit'
        verbose_name_plural = 'Certificado Action Audits'

    def __str__(self):
        return f"{self.action} - {self.certificado_id or 'global'} @ {self.created_at}"
