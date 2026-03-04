from django.db import models


class Fornecedor(models.Model):
    nome = models.CharField(max_length=200, null=True, blank=True)

    class Meta:
        verbose_name = 'Fornecedor (stub)'
        verbose_name_plural = 'Fornecedores (stub)'

    def __str__(self):
        return self.nome or 'Fornecedor (stub)'
