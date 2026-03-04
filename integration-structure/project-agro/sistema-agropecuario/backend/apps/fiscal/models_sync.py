from django.db import models
from apps.core.models import TenantModel
from django.conf import settings


class NFeResumo(TenantModel):
    chave_acesso = models.CharField(max_length=44, unique=True)
    numero = models.CharField(max_length=50, null=True, blank=True)
    emitente_nome = models.CharField(max_length=255, null=True, blank=True)
    destinatario_nome = models.CharField(max_length=255, null=True, blank=True)
    data_recebida = models.DateTimeField(null=True, blank=True)
    raw = models.JSONField(null=True, blank=True)

    class Meta:
        app_label = 'fiscal'
        indexes = [models.Index(fields=['chave_acesso'])]


class EventoManifestacao(TenantModel):
    nfe = models.ForeignKey('NFe', on_delete=models.CASCADE, related_name='eventos_manifestacao')
    tipo = models.CharField(max_length=20)
    cStat = models.CharField(max_length=10, null=True, blank=True)
    nProt = models.CharField(max_length=50, null=True, blank=True)
    dhEvento = models.DateTimeField(null=True, blank=True)
    raw_xml = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'fiscal'
        indexes = [models.Index(fields=['nfe', 'tipo', 'created_at'])]


class NsuCheckpoint(TenantModel):
    certificado = models.ForeignKey('CertificadoSefaz', null=True, blank=True, on_delete=models.SET_NULL)
    last_nsu = models.CharField(max_length=50, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'fiscal'


class ArquivoXml(TenantModel):
    nfe = models.ForeignKey('NFe', null=True, blank=True, on_delete=models.SET_NULL, related_name='arquivos_xml')
    name = models.CharField(max_length=255)
    content = models.TextField()
    # Refinement fields for sync_nfes_task
    sync_trace_id = models.CharField(max_length=64, null=True, blank=True, help_text='SHA256 hash of raw XML for idempotency')
    certificado_checkpoint = models.ForeignKey('NsuCheckpoint', null=True, blank=True, on_delete=models.SET_NULL, help_text='Reference to NsuCheckpoint for coordination')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'fiscal'
        indexes = [
            models.Index(fields=['sync_trace_id']),
            models.Index(fields=['certificado_checkpoint']),
        ]


class NFeRemote(TenantModel):
    chave_acesso = models.CharField(max_length=44, null=True, blank=True)
    raw_xml = models.TextField(null=True, blank=True)
    certificado = models.ForeignKey('CertificadoSefaz', null=True, blank=True, on_delete=models.SET_NULL)
    received_at = models.DateTimeField(null=True, blank=True)
    import_status = models.CharField(max_length=20, default='pending')
    imported_nfe = models.ForeignKey('NFe', null=True, blank=True, on_delete=models.SET_NULL, related_name='remote_source')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'fiscal'


class ProcessamentoWs(TenantModel):
    job_type = models.CharField(max_length=100)
    status = models.CharField(max_length=20, default='pending')
    details = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'fiscal'
