from django.db import models
from apps.core.models import TenantModel


class ImpostoFederal(TenantModel):
    """Registra impostos federais relacionados a uma competência (mês)."""
    competencia = models.DateField()
    tipo_imposto = models.CharField(max_length=32)
    valor = models.DecimalField(max_digits=15, decimal_places=2)
    referencia = models.CharField(max_length=64, null=True, blank=True)

    # Vinculo opcional com folha de pagamento ou item de folha
    folha = models.ForeignKey('administrativo.FolhaPagamento', null=True, blank=True, on_delete=models.SET_NULL, related_name='impostos_federais')
    folha_item = models.ForeignKey('administrativo.FolhaPagamentoItem', null=True, blank=True, on_delete=models.SET_NULL, related_name='impostos_federais')

    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Imposto Federal"
        verbose_name_plural = "Impostos Federais"
        ordering = ['-competencia']

    def __str__(self):
        return f"{self.tipo_imposto} - {self.competencia} - {self.valor}"


class ImpostoTrabalhista(TenantModel):
    """Impostos trabalhistas vinculados à folha (INSS, IR, FGTS)."""
    competencia = models.DateField()
    inss = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    ir = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    fgts = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    base_inss = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    base_ir = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    folha = models.ForeignKey('administrativo.FolhaPagamento', null=True, blank=True, on_delete=models.SET_NULL, related_name='impostos_trabalhistas')

    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Imposto Trabalhista"
        verbose_name_plural = "Impostos Trabalhistas"
        ordering = ['-competencia']

    def __str__(self):
        return f"Trabalhista {self.competencia} - INSS {self.inss} IR {self.ir} FGTS {self.fgts}"
