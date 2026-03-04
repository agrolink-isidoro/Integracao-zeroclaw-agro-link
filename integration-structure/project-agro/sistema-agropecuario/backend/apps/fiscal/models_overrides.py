from django.db import models
from apps.core.models import TenantModel
from apps.core.models import CustomUser

from .models import ItemNFe


class ItemNFeOverride(TenantModel):
    """Override de valores de ItemNFe criado por usuários para ajustes.

    - Mantém histórico de alterações e permite marcar um override como aplicado
      (campo `aplicado`) para que integrações consumam os valores alterados.
    """
    item = models.ForeignKey(ItemNFe, on_delete=models.CASCADE, related_name='overrides')
    quantidade = models.DecimalField(max_digits=11, decimal_places=4, null=True, blank=True)
    # Unit prices for overrides should use currency precision (2 decimals)
    valor_unitario = models.DecimalField(max_digits=13, decimal_places=2, null=True, blank=True)
    valor_produto = models.DecimalField(max_digits=13, decimal_places=2, null=True, blank=True)
    criado_por = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    criado_em = models.DateTimeField(auto_now_add=True)
    aplicado = models.BooleanField(default=False)
    motivo = models.CharField(max_length=255, null=True, blank=True)
    observacoes = models.TextField(null=True, blank=True)

    class Meta:
        app_label = 'fiscal'
        verbose_name = 'Override Item NFe'
        verbose_name_plural = 'Overrides Itens NFe'
        ordering = ['-criado_em']
        permissions = (
            ('apply_itemnfeoverride', 'Can apply ItemNFe override'),
        )

    def __str__(self):
        nfe_ch = self.item.nfe.chave_acesso if getattr(self.item, 'nfe', None) else 'n/a'
        return f"Override {self.id} - Item {self.item.numero_item} (NFe {nfe_ch})"
