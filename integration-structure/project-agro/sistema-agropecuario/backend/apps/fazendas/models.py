from django.db import models
from apps.core.models import TenantModel
from django.contrib.gis.db import models as gis_models
from django.conf import settings


class Proprietario(TenantModel):
    nome = models.CharField(max_length=200)
    cpf_cnpj = models.CharField(max_length=20, unique=True)
    telefone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    endereco = models.TextField(blank=True)

    class Meta:
        verbose_name = "Proprietário"
        verbose_name_plural = "Proprietários"

    def __str__(self):
        return f"{self.nome} ({self.cpf_cnpj})"


class Fazenda(TenantModel):
    proprietario = models.ForeignKey(Proprietario, related_name="fazendas", on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    matricula = models.CharField(
        max_length=100, unique=True, help_text="Registro/matrícula da fazenda"
    )

    class Meta:
        verbose_name = "Fazenda"
        verbose_name_plural = "Fazendas"

    def __str__(self) -> str:
        return f"{self.name} ({self.matricula}) - {self.proprietario.nome}"


class Area(models.Model):
    TIPO_CHOICES = [
        ('propria', 'Própria'),
        ('arrendada', 'Arrendada'),
    ]

    proprietario = models.ForeignKey(Proprietario, related_name="areas", on_delete=models.CASCADE)
    fazenda = models.ForeignKey(Fazenda, related_name="areas", on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, default='propria')
    geom = models.TextField(
        blank=True,
        null=True,
        help_text="Geometria da área em formato poligonal (JSON) - agrupamento/matrícula",
    )
    custo_arrendamento = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Custo geral de arrendamento em sacas/hectare (para áreas arrendadas)"
    )

    class Meta:
        verbose_name = "Área"
        verbose_name_plural = "Áreas"

    def __str__(self) -> str:
        return f"{self.name} - {self.fazenda.name} ({self.tipo})"

    @property
    def area_hectares(self):
        """Calcula a área em hectares usando PostGIS se houver geometria"""
        if not self.geom:
            return 0
        try:
            from django.contrib.gis.geos import GEOSGeometry
            from django.db import connection
            
            # Parse geometry
            geom_obj = GEOSGeometry(self.geom, srid=4326)
            
            # Calculate area in hectares using PostGIS
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT ST_Area(ST_Transform(ST_GeomFromText(%s, 4326), 3857)) / 10000",
                    [geom_obj.wkt]
                )
                result = cursor.fetchone()
                return round(result[0], 2) if result and result[0] else 0
        except Exception:
            return 0


class Talhao(models.Model):
    area = models.ForeignKey(Area, related_name="talhoes", on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    geom = models.TextField(
        blank=True,
        null=True,
        help_text="Geometria do talhão em formato poligonal (JSON) - área de trabalho agrícola",
    )
    area_size = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Área em hectares (calculada automaticamente se houver geometria)"
    )
    custo_arrendamento = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Custo de arrendamento em sacas/hectare (se aplicável)"
    )

    class Meta:
        verbose_name = "Talhão"
        verbose_name_plural = "Talhões"

    def __str__(self) -> str:
        return f"{self.name} ({self.area.name})"

    @property
    def area_hectares(self):
        """Calcula a área em hectares usando PostGIS se houver geometria do TALHÃO"""
        if self.geom:
            try:
                from django.contrib.gis.geos import GEOSGeometry
                from django.db import connection
                
                # Parse geometry
                geom_obj = GEOSGeometry(self.geom, srid=4326)
                
                # Calculate area in hectares using PostGIS
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT ST_Area(ST_Transform(ST_GeomFromText(%s, 4326), 3857)) / 10000",
                        [geom_obj.wkt]
                    )
                    result = cursor.fetchone()
                    return round(result[0], 2) if result and result[0] else 0
            except Exception:
                return self.area_size or 0
        return self.area_size or 0


class Arrendamento(TenantModel):
    arrendador = models.ForeignKey(
        Proprietario, related_name="arrendamentos_como_arrendador", on_delete=models.CASCADE,
        help_text="Proprietário que CEDE/empresta a terra (dono original)"
    )
    arrendatario = models.ForeignKey(
        Proprietario, related_name="arrendamentos_como_arrendatario", on_delete=models.CASCADE,
        help_text="Produtor rural que PAGA para usar a terra"
    )
    fazenda = models.ForeignKey(
        Fazenda, related_name="arrendamentos", on_delete=models.CASCADE,
        help_text="Fazenda onde estão as áreas arrendadas (deve pertencer ao arrendador)"
    )
    areas = models.ManyToManyField(
        Area, related_name="arrendamentos", blank=True,
        help_text="Áreas específicas da fazenda que estão sendo arrendadas"
    )
    start_date = models.DateField(help_text="Data de início do arrendamento")
    end_date = models.DateField(
        null=True, blank=True,
        help_text="Data de fim do arrendamento (deixe vazio para arrendamento sem prazo)"
    )
    custo_sacas_hectare = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text="Custo que o arrendatário paga em sacas de soja por hectare"
    )

    class Meta:
        verbose_name = "Arrendamento"
        verbose_name_plural = "Arrendamentos"

    def __str__(self):
        return f"Arrendamento: {self.arrendador.nome} → {self.arrendatario.nome} ({self.fazenda.name})"

    @property
    def custo_total_atual(self):
        """Calcula custo total baseado na cotação mais recente de saca de soja."""
        from decimal import Decimal
        cotacao = CotacaoSaca.objects.filter(cultura='soja').order_by('-data').first()
        if cotacao:
            area_total = sum(area.area_hectares for area in self.areas.all())
            return float(self.custo_sacas_hectare * cotacao.preco_por_saca * Decimal(str(area_total)))
        return 0


class CotacaoSaca(models.Model):
    CULTURA_CHOICES = [
        ('soja', 'Soja'),
        ('milho', 'Milho'),
        ('sorgo', 'Sorgo'),
        ('trigo', 'Trigo'),
    ]
    
    cultura = models.CharField(max_length=10, choices=CULTURA_CHOICES, default='soja')
    data = models.DateField()
    preco_por_saca = models.DecimalField(max_digits=10, decimal_places=2, help_text="Preço em R$ por saca")
    fonte = models.CharField(max_length=100, default="CEPEA")

    class Meta:
        verbose_name = "Cotação de Saca"
        verbose_name_plural = "Cotações de Saca"
        ordering = ['-data', 'cultura']

    def __str__(self):
        return f"{self.get_cultura_display()} - R$ {self.preco_por_saca} ({self.data})"


class DocumentoArrendamento(TenantModel):
    """Contrato formal de arrendamento com parcelas automáticas."""
    
    STATUS_CHOICES = [
        ('RASCUNHO', 'Rascunho'),
        ('ATIVO', 'Ativo'),
        ('ENCERRADO', 'Encerrado'),
        ('CANCELADO', 'Cancelado'),
    ]
    
    PERIODICIDADE_CHOICES = [
        ('MENSAL', 'Mensal'),
        ('BIMESTRAL', 'Bimestral'),
        ('TRIMESTRAL', 'Trimestral'),
        ('SEMESTRAL', 'Semestral'),
        ('ANUAL', 'Anual'),
    ]
    
    numero_documento = models.CharField(
        max_length=50, 
        unique=True,
        help_text="Número único do documento de arrendamento"
    )
    fazenda = models.ForeignKey(
        Fazenda, 
        on_delete=models.PROTECT, 
        related_name='documentos_arrendamento',
        help_text="Fazenda onde estão os talhões arrendados"
    )
    arrendador = models.ForeignKey(
        Proprietario, 
        on_delete=models.PROTECT, 
        related_name='documentos_como_arrendador',
        help_text="Proprietário que cede a terra"
    )
    arrendatario = models.ForeignKey(
        Proprietario, 
        on_delete=models.PROTECT, 
        related_name='documentos_como_arrendatario',
        help_text="Produtor que paga para usar a terra"
    )
    talhoes = models.ManyToManyField(
        'Talhao',
        related_name='documentos_arrendamento',
        help_text="Talhões incluídos neste arrendamento"
    )
    
    data_inicio = models.DateField(help_text="Data de início do arrendamento")
    data_fim = models.DateField(help_text="Data de término do arrendamento")
    valor_total = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        help_text="Valor total do arrendamento"
    )
    
    numero_parcelas = models.PositiveIntegerField(
        default=1,
        help_text="Quantidade de parcelas"
    )
    periodicidade = models.CharField(
        max_length=20,
        choices=PERIODICIDADE_CHOICES,
        default='ANUAL',
        help_text="Periodicidade das parcelas"
    )
    
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='RASCUNHO'
    )
    observacoes = models.TextField(blank=True, null=True)
    
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documentos_arrendamento_criados'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Documento de Arrendamento"
        verbose_name_plural = "Documentos de Arrendamento"
        ordering = ['-criado_em']

    def __str__(self):
        return f"Doc {self.numero_documento} - {self.arrendador.nome} → {self.arrendatario.nome}"


class ParcelaArrendamento(models.Model):
    """Parcela de documento de arrendamento."""
    
    documento = models.ForeignKey(
        DocumentoArrendamento,
        on_delete=models.CASCADE,
        related_name='parcelas'
    )
    numero_parcela = models.PositiveIntegerField(help_text="Número da parcela")
    valor = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Valor da parcela"
    )
    data_vencimento = models.DateField(help_text="Data de vencimento da parcela")
    
    vencimento = models.ForeignKey(
        'financeiro.Vencimento',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='parcelas_arrendamento',
        help_text="Vencimento criado automaticamente no Financeiro"
    )
    
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Parcela de Arrendamento"
        verbose_name_plural = "Parcelas de Arrendamento"
        unique_together = ['documento', 'numero_parcela']
        ordering = ['documento', 'numero_parcela']

    def __str__(self):
        return f"Parcela {self.numero_parcela}/{self.documento.numero_parcelas} - Doc {self.documento.numero_documento}"
