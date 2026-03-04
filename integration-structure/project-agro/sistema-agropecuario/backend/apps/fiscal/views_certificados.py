from apps.core.mixins import TenantQuerySetMixin
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models_certificados import CertificadoSefaz
from .serializers import CertificadoSefazSerializer
from rest_framework.permissions import IsAdminUser
from django.conf import settings
import os


class CertificadoSefazViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    queryset = CertificadoSefaz.objects.all()
    serializer_class = CertificadoSefazSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    from rest_framework.decorators import action

    @action(detail=True, methods=['post'], url_path='set_password')
    def set_password(self, request, pk=None):
        """Set or update the password for an existing P12 certificate.

        Expects: { 'password': 'the-password' }
        Requires: CERT_ENCRYPTION_KEY configured (for secure storage).
        """
        cert = self.get_object()
        password = request.data.get('password')
        if password is None:
            return Response({'error': 'password_required'}, status=status.HTTP_400_BAD_REQUEST)
        if not getattr(settings, 'CERT_ENCRYPTION_KEY', None):
            return Response({'error': 'encryption_not_configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Validate PKCS12 with the provided password before saving
        try:
            from cryptography.hazmat.primitives.serialization import pkcs12
            pwd_bytes = password.encode('utf-8') if password else None
            p12 = None
            try:
                p12 = pkcs12.load_key_and_certificates(cert.get_arquivo_bytes(), pwd_bytes)
            except Exception:
                # Try with empty password
                try:
                    p12 = pkcs12.load_key_and_certificates(cert.get_arquivo_bytes(), b'')
                except Exception as e:
                    return Response({'error': 'invalid_password_or_p12', 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

            # If validation passed, encrypt and store password
            from .crypto import encrypt_bytes
            cert.senha_encrypted = encrypt_bytes(password.encode('utf-8'))
            cert.save(update_fields=['senha_encrypted'])

            # Audit the password set action
            try:
                from apps.fiscal.models_certificados import CertificadoActionAudit
                performed_by = request.user if getattr(request, 'user', None) and getattr(request.user, 'is_authenticated', False) else None
                CertificadoActionAudit.objects.create(
                    action='set_password',
                    certificado=cert,
                    performed_by=performed_by,
                    performed_by_identifier=getattr(request.user, 'username', None) if performed_by else None,
                    details=f"password_set_by={getattr(request.user, 'username', None)}"
                )
            except Exception:
                pass

            return Response({'status': 'ok'})
        except Exception as e:
            return Response({'error': 'failed_to_set_password', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request, *args, **kwargs):
        """Valida e armazena certificado com medidas básicas de segurança."""
        serializer = self.get_serializer(data=request.data)
        # Standardize serializer validation error payload for client-side handling
        if not serializer.is_valid():
            from .utils import serializer_errors_to_bad_fields
            bad_fields = serializer_errors_to_bad_fields(serializer.errors, data=request.data)
            return Response({'error': 'validation_error', 'detail': 'Dados inválidos', 'bad_fields': bad_fields}, status=status.HTTP_400_BAD_REQUEST)

        arquivo = serializer.validated_data['arquivo']
        nome = serializer.validated_data['nome']

        # Configuráveis via settings
        allowed_exts = getattr(settings, 'CERT_ALLOWED_EXTENSIONS', ['.p12', '.pfx'])
        max_size = getattr(settings, 'CERT_MAX_UPLOAD_SIZE', 1024 * 1024)  # 1MB

        ext = os.path.splitext(arquivo.name)[1].lower()
        if ext not in allowed_exts:
            return Response({'error': 'invalid_file_type', 'allowed': allowed_exts}, status=status.HTTP_400_BAD_REQUEST)

        # Tamanho do arquivo
        size = getattr(arquivo, 'size', None)
        if size is not None and size > max_size:
            return Response({'error': 'file_too_large', 'max_size': max_size}, status=status.HTTP_400_BAD_REQUEST)

        # Read bytes to validate P12 and optionally extract cert metadata
        content = arquivo.read()
        senha = serializer.validated_data.get('password')
        senha_bytes = senha.encode('utf-8') if senha else None

        # Validate PKCS12 using cryptography (if available)
        fingerprint = None
        validade = None
        try:
            from cryptography.hazmat.primitives.serialization import pkcs12
            from cryptography.hazmat.primitives import hashes

            try:
                pkcs = pkcs12.load_key_and_certificates(content, senha_bytes)
            except Exception:
                # Some p12 files expect an empty password bytes rather than None
                if not senha_bytes:
                    try:
                        pkcs = pkcs12.load_key_and_certificates(content, b'')
                    except Exception as e:
                        raise
                else:
                    raise
            # pkcs is a tuple (key, cert, additional_certs)
            cert = pkcs[1]
            if cert is not None:
                fingerprint = cert.fingerprint(hashes.SHA256()).hex()
                validade_dt = getattr(cert, 'not_valid_after', None)
                validade = validade_dt.date() if validade_dt else None
        except Exception as e:
            # If user provided a password and parsing failed, treat as invalid P12/password
            if senha:
                return Response({'error': 'invalid_p12', 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            # Otherwise, continue (backwards-compatible); compute a fallback fingerprint
            try:
                import hashlib
                fingerprint = hashlib.sha256(content).hexdigest()
            except Exception:
                fingerprint = None


        # Save file to model (reconstruct file object since we consumed the stream)
        from django.core.files.base import ContentFile
        # Assign uploaded_by carefully: in minimal test mode auth.User may be used
        # while model FK expects project's CustomUser. Only assign when request.user
        # is an instance of CustomUser to avoid FK type errors in tests.
        try:
            from apps.core.models import CustomUser
            uploaded_by = request.user if getattr(request, 'user', None) and getattr(request.user, 'is_authenticated', False) and isinstance(request.user, CustomUser) else None
        except Exception:
            uploaded_by = None

        certificado = CertificadoSefaz.objects.create(
            nome=nome,
            arquivo=ContentFile(content, name=arquivo.name),
            uploaded_by=uploaded_by,
            validade=validade,
            fingerprint=fingerprint
        )

        # If plaintext file exists on disk (legacy), attempt to set restrictive permissions (600)
        try:
            if certificado.arquivo and hasattr(certificado.arquivo, 'path') and certificado.arquivo.name:
                path = certificado.arquivo.path
                os.chmod(path, 0o600)
        except Exception:
            # não crítico: se chmod falhar em alguns FS, apenas logamos (evita crash em testes)
            pass

        # Populate arquivo_name and, when configured, encrypt at-rest and remove plaintext
        try:
            certificado.arquivo_name = arquivo.name
            if getattr(settings, 'CERT_ENCRYPTION_KEY', None):
                try:
                    from .crypto import encrypt_bytes
                    certificado.arquivo_encrypted = encrypt_bytes(content)
                    
                    # Encrypt password if provided
                    if senha:
                        senha_encrypted = encrypt_bytes(senha.encode('utf-8'))
                        certificado.senha_encrypted = senha_encrypted
                    
                    # Remove plaintext file to avoid storing PII in filesystem
                    try:
                        certificado.arquivo.delete(save=False)
                    except Exception:
                        # Non-critical: file may already be deleted or filesystem may not support deletion
                        pass
                    certificado.arquivo = None
                except Exception:
                    # If encryption fails, surface as server error
                    return Response({'error': 'encryption_failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            certificado.save()
        except Exception:
            # Non-fatal: continue and return what we can
            pass

        # Audit the upload
        try:
            from apps.fiscal.models_certificados import CertificadoActionAudit
            performed_by = request.user if getattr(request, 'user', None) and getattr(request.user, 'is_authenticated', False) and isinstance(request.user, User) else None
            CertificadoActionAudit.objects.create(action='upload', certificado=certificado, performed_by=performed_by, performed_by_identifier=getattr(request.user, 'username', None) if request.user.is_authenticated else None, details=f"arquivo_name={certificado.arquivo_name}")
        except Exception:
            # Non-critical: audit logging failure should not prevent successful upload
            pass

        # Detectar automaticamente tipo de certificado (e-CPF/e-CNPJ, A1/A3)
        try:
            certificado.detectar_tipo_certificado()
        except Exception:
            # Non-critical: detection failure should not prevent successful upload
            pass

        # Return full serialized object (omitting raw file bytes) for consistency
        serializer = CertificadoSefazSerializer(certificado)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='sync_nfes')
    def sync_nfes(self, request, pk=None):
        """
        Sincroniza NF-es da SEFAZ via DistDFeInt (consulta NSU).
        
        Baixa documentos fiscais destinados ao CNPJ do certificado.
        Processo assíncrono via Celery.
        
        Returns:
            task_id para acompanhar progresso
        """
        try:
            certificado = self.get_object()
            
            # Validar que certificado tem senha configurada
            if not certificado.senha_encrypted:
                return Response({
                    'error': 'certificate_password_required',
                    'message': 'Configure a senha do certificado antes de sincronizar'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Disparar task assíncrona
            from .tasks import sync_nfes_from_sefaz_task
            task = sync_nfes_from_sefaz_task.delay(certificado.id)
            
            return Response({
                'success': True,
                'task_id': task.id,
                'message': 'Sincronização iniciada em segundo plano'
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            import logging
            logging.exception(f"Erro ao iniciar sincronização NSU: {e}")
            return Response({
                'error': 'sync_failed',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
