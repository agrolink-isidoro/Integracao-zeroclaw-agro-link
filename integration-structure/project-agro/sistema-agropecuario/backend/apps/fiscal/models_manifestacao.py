from django.db import models
from apps.core.models import TenantModel
from django.conf import settings
from django.utils import timezone


class Manifestacao(TenantModel):
    TIPO_CHOICES = [
        ('ciencia', 'Ciência da Operação'),
        ('confirmacao', 'Confirmação da Operação'),
        ('desconhecimento', 'Desconhecimento da Operação'),
        ('nao_realizada', 'Operação não Realizada'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    nfe = models.ForeignKey('NFe', on_delete=models.CASCADE, related_name='manifestacoes')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    motivo = models.TextField(null=True, blank=True)

    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='manifestacoes_criadas')
    # Use default=timezone.now so tests and fixtures can set `criado_em` explicitly when needed
    criado_em = models.DateTimeField(default=timezone.now)
    
    # Certificado usado para enviar esta manifestação (opcional)
    certificado = models.ForeignKey('CertificadoSefaz', null=True, blank=True, on_delete=models.SET_NULL, related_name='manifestacoes')

    enviado = models.BooleanField(default=False)
    enviado_em = models.DateTimeField(null=True, blank=True)

    resposta_sefaz = models.JSONField(null=True, blank=True)
    status_envio = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')

    # Sequence number to be used as nSeqEvento when sending events to SEFAZ
    nSeqEvento = models.IntegerField(default=1)
    # How many reconcile attempts have been made for transient cStat responses
    tentativa_count = models.IntegerField(default=0)

    audit_metadata = models.JSONField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['nfe', 'tipo', 'criado_em']),
        ]
        verbose_name = 'Manifestação'
        verbose_name_plural = 'Manifestações'
        ordering = ['-criado_em']

    def mark_sent(self, resposta: dict | None = None):
        self.enviado = True
        self.enviado_em = timezone.now()
        self.status_envio = 'sent'
        if resposta is not None:
            self.resposta_sefaz = resposta
        self.save(update_fields=['enviado', 'enviado_em', 'status_envio', 'resposta_sefaz'])

    def mark_failed(self, resposta: dict | None = None):
        self.enviado = False
        self.status_envio = 'failed'
        if resposta is not None:
            self.resposta_sefaz = resposta
        self.save(update_fields=['enviado', 'status_envio', 'resposta_sefaz'])
