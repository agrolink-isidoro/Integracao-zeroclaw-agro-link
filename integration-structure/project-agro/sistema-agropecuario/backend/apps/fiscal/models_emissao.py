from django.db import models
from apps.core.models import TenantModel


class EmissaoJob(TenantModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]

    nfe = models.ForeignKey('fiscal.NFe', on_delete=models.CASCADE, related_name='emission_jobs')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    protocolo = models.CharField(max_length=50, null=True, blank=True)
    tentativa_count = models.PositiveIntegerField(default=0)
    last_error = models.TextField(null=True, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Emissão Job'
        verbose_name_plural = 'Emissão Jobs'

    def mark_processing(self):
        self.status = 'processing'
        self.save(update_fields=['status', 'updated_at'])

    def mark_success(self, protocolo, data_autorizacao):
        self.status = 'success'
        self.protocolo = protocolo
        self.save(update_fields=['status', 'protocolo', 'updated_at'])

    def mark_failed(self, message):
        self.status = 'failed'
        self.last_error = str(message)
        self.save(update_fields=['status', 'last_error', 'updated_at'])
