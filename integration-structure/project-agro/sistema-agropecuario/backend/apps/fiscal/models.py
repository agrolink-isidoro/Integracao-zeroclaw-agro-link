from django.db import models
from apps.core.models import TenantModel
from django.contrib.gis.db import models as gis_models
from apps.core.models import CustomUser


class NFe(TenantModel):
    # Identificação da NFe
    chave_acesso = models.CharField(max_length=44, unique=True)
    numero = models.CharField(max_length=9)
    serie = models.CharField(max_length=3)
    modelo = models.CharField(max_length=2, default='55')  # 55=NFe
    data_emissao = models.DateTimeField()
    data_saida = models.DateTimeField(null=True, blank=True)
    natureza_operacao = models.CharField(max_length=60)
    tipo_operacao = models.CharField(max_length=1)  # 0=Entrada, 1=Saída
    destino_operacao = models.CharField(max_length=1)  # 1=Interna, 2=Interestadual, 3=Exterior
    municipio_fato_gerador = models.CharField(max_length=7)
    tipo_impressao = models.CharField(max_length=1)
    tipo_emissao = models.CharField(max_length=1)
    finalidade = models.CharField(max_length=1)  # 1=Normal, 2=Complementar, etc.
    indicador_consumidor_final = models.CharField(max_length=1)
    indicador_presenca = models.CharField(max_length=1)
    versao_processo = models.CharField(max_length=20)

    # Emitente
    emitente_cnpj = models.CharField(max_length=14, null=True, blank=True)
    emitente_cpf = models.CharField(max_length=11, null=True, blank=True)
    emitente_nome = models.CharField(max_length=60)
    emitente_fantasia = models.CharField(max_length=60, null=True, blank=True)
    emitente_inscricao_estadual = models.CharField(max_length=14, null=True, blank=True)
    emitente_crt = models.CharField(max_length=1, null=True, blank=True)  # Regime tributário

    # Destinatário
    destinatario_cnpj = models.CharField(max_length=14, null=True, blank=True)
    destinatario_cpf = models.CharField(max_length=11, null=True, blank=True)
    destinatario_nome = models.CharField(max_length=60)
    destinatario_inscricao_estadual = models.CharField(max_length=14, null=True, blank=True)
    destinatario_email = models.EmailField(null=True, blank=True)

    # Totais
    valor_produtos = models.DecimalField(max_digits=13, decimal_places=2)
    valor_nota = models.DecimalField(max_digits=13, decimal_places=2)
    valor_icms = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    valor_pis = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    valor_cofins = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    valor_ipi = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    valor_icms_st = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    valor_frete = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    valor_seguro = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    valor_desconto = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # Protocolo
    protocolo_autorizacao = models.CharField(max_length=15, null=True, blank=True)
    data_autorizacao = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=3, default='100')  # 100=Autorizado

    # Armazenar o XML original e quem processou
    xml_content = models.TextField(null=True, blank=True)
    processado_por = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    # Estoque: flag para evitar reprocessamento de confirmação
    estoque_confirmado = models.BooleanField(default=False)

    # Fornecedor vinculado (opcional)
    fornecedor = models.ForeignKey('comercial.Fornecedor', null=True, blank=True, on_delete=models.SET_NULL, related_name='nfes')

    # Sincronização SEFAZ: timestamp da última sincronização de manifestações
    ultima_sincronizacao = models.DateTimeField(null=True, blank=True, help_text='Timestamp da última sincronização com SEFAZ (NFeDistribuicaoDFe)')

    # SEFAZ - Preparação para integração futura
    ambiente_sefaz = models.CharField(max_length=1, default='2', choices=[('1', 'Produção'), ('2', 'Homologação')])
    certificado_digital = models.FileField(upload_to='certificados/', null=True, blank=True)
    senha_certificado = models.CharField(max_length=255, null=True, blank=True)
    csc_token = models.CharField(max_length=36, null=True, blank=True)  # Token CSC para NFCe
    csc_id = models.CharField(max_length=6, null=True, blank=True)  # ID CSC para NFCe

    class Meta:
        app_label = 'fiscal'
        verbose_name = "NFe"
        verbose_name_plural = "NFes"
        ordering = ['-data_emissao']

    def __str__(self):
        return f"NFe {self.numero}/{self.serie} - {self.emitente_nome}"


# Import Emissao models here so migrations and apps can find them via app registry
try:  # pragma: no cover - import in module context
    from .models_emissao import EmissaoJob  # noqa: F401
except Exception:
    # Silently ignore import errors. This can happen during migrations when the
    # EmissaoJob table doesn't exist yet, or during initial app setup. The import
    # is only needed to register the model with Django's app registry.
    pass

# Ensure imposto models are registered by importing them (keeps models.py smaller)
try:
    from . import models_impostos  # noqa: F401
except Exception:
    pass

# Manifestação: model separado para manter coesão do módulo
try:
    from . import models_manifestacao  # noqa: F401
    from . import models_sync  # noqa: F401
    # Force import of models_sync via absolute import to avoid namespace conflicts
    import apps.fiscal.models_sync  # noqa: F401
except Exception:
    pass

# Ensure overrides model is registered so migrations discover it
try:
    from . import models_overrides  # noqa:F401
except Exception:
    pass


class ItemNFe(TenantModel):
    nfe = models.ForeignKey(NFe, on_delete=models.CASCADE, related_name='itens')
    numero_item = models.PositiveIntegerField()

    # Produto
    codigo_produto = models.CharField(max_length=60)
    ean = models.CharField(max_length=14, null=True, blank=True)
    descricao = models.CharField(max_length=120)
    ncm = models.CharField(max_length=8, null=True, blank=True)
    cest = models.CharField(max_length=7, null=True, blank=True)
    cfop = models.CharField(max_length=4)
    unidade_comercial = models.CharField(max_length=6)
    quantidade_comercial = models.DecimalField(max_digits=11, decimal_places=4)
    # Unit prices should be stored with 2 decimal places (currency precision)
    valor_unitario_comercial = models.DecimalField(max_digits=13, decimal_places=2)
    valor_produto = models.DecimalField(max_digits=13, decimal_places=2)
    unidade_tributaria = models.CharField(max_length=6, null=True, blank=True)
    quantidade_tributaria = models.DecimalField(max_digits=11, decimal_places=4, null=True, blank=True)
    valor_unitario_tributario = models.DecimalField(max_digits=13, decimal_places=2, null=True, blank=True)

    # Combustível (se aplicável)
    codigo_anp = models.CharField(max_length=9, null=True, blank=True)
    descricao_anp = models.CharField(max_length=95, null=True, blank=True)
    percentual_biodiesel = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    uf_consumo = models.CharField(max_length=2, null=True, blank=True)

    class Meta:
        app_label = 'fiscal'
        verbose_name = "Item NFe"
        verbose_name_plural = "Itens NFe"
        unique_together = ('nfe', 'numero_item')

    def __str__(self):
        return f"Item {self.numero_item} - {self.descricao}"

    def _get_most_relevant_override(self):
        """Retorna o override mais relevante para exibição no UI.

        Retorna o override mais recentemente criado, seja aplicado ou não,
        para que alterações salvas pelo usuário sejam imediatamente visíveis na Nota Fiscal.
        """
        return self.overrides.order_by('-criado_em').first()

    def get_active_override(self):
        """Compatibilidade: método utilizado em views/tests para obter override aplicado.

        Retorna o override aplicado mais recente, ou None.
        """
        return self.overrides.filter(aplicado=True).order_by('-criado_em').first()

    def effective_quantidade(self):
        """Quantidade que deve ser usada para exibição/integrações (override > original).

        Nota: exibimos o override mais recente mesmo que ainda não esteja aplicado,
        para que alterações salvas pelo usuário apareçam na Nota Fiscal imediatamente.
        Outros módulos (estoque, financeiro) só devem refletir alterações quando o
        usuário explicitamente optar por aplicar a alteração ('Refletir no Estoque').
        """
        ov = self._get_most_relevant_override()
        return ov.quantidade if ov and ov.quantidade is not None else self.quantidade_comercial

    def effective_valor_unitario(self):
        """Valor unitário efetivo (override > original).

        Mesma regra de prioridade de overrides aplicados, depois últimos não-aplicados.
        """
        ov = self._get_most_relevant_override()
        return ov.valor_unitario if ov and ov.valor_unitario is not None else self.valor_unitario_comercial


class Imposto(TenantModel):
    item_nfe = models.OneToOneField(ItemNFe, on_delete=models.CASCADE, related_name='imposto')

    # ICMS
    icms_origem = models.CharField(max_length=1, null=True, blank=True)
    icms_cst = models.CharField(max_length=3, null=True, blank=True)
    icms_base_calculo = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    icms_aliquota = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    icms_valor = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    icms_st_base_calculo = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    icms_st_aliquota = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    icms_st_valor = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # PIS
    pis_cst = models.CharField(max_length=2, null=True, blank=True)
    pis_base_calculo = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    pis_aliquota = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    pis_valor = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # COFINS
    cofins_cst = models.CharField(max_length=2, null=True, blank=True)
    cofins_base_calculo = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    cofins_aliquota = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    cofins_valor = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # IPI
    ipi_cst = models.CharField(max_length=2, null=True, blank=True)
    ipi_base_calculo = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    ipi_aliquota = models.DecimalField(max_digits=7, decimal_places=4, null=True, blank=True)
    ipi_valor = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    class Meta:
        app_label = 'fiscal'
        verbose_name = "Imposto"
        verbose_name_plural = "Impostos"

    def __str__(self):
        return f"Imposto do Item {self.item_nfe.numero_item}"