from django.db import models
from apps.core.models import TenantModel
from django.contrib.gis.db import models as gis_models
from apps.fazendas.models import Talhao, Fazenda
from apps.estoque.models import Produto
from apps.core.models import CustomUser


class Cultura(TenantModel):
    TIPO_CHOICES = [
        ('graos', 'Grãos'),
        ('hortalicas', 'Hortaliças'),
        ('fruticultura', 'Fruticultura'),
        ('outros', 'Outros'),
    ]

    UNIDADE_PRODUCAO_CHOICES = [
        ('saca_60kg', 'Saca de 60 kg (grãos)'),
        ('tonelada', 'Tonelada (t)'),
        ('kg', 'Quilograma (kg)'),
        ('caixa', 'Caixa / Unidade'),
    ]

    nome = models.CharField(max_length=100)
    descricao = models.TextField(null=True, blank=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='graos', verbose_name="Tipo")
    ciclo_dias = models.PositiveIntegerField(null=True, blank=True, verbose_name="Ciclo em dias")  # Dias para colheita
    zoneamento_apto = models.BooleanField(default=True, verbose_name="Zoneamento Apto")
    ativo = models.BooleanField(default=True)
    unidade_producao = models.CharField(
        max_length=20,
        choices=UNIDADE_PRODUCAO_CHOICES,
        default='tonelada',
        verbose_name="Unidade de Produção",
        help_text="Unidade usada para medir a produção (sacas, toneladas, etc.)",
    )
    variedades = models.TextField(
        null=True,
        blank=True,
        verbose_name="Variedades",
        help_text="Lista de variedades cultivadas, separadas por vírgula. Ex: M6210, B2801, Nidera 5909",
    )

    class Meta:
        verbose_name = "Cultura"
        verbose_name_plural = "Culturas"
        ordering = ['nome']
        unique_together = [('tenant', 'nome')]

    def __str__(self):
        return self.nome


class Plantio(TenantModel):
    STATUS_CHOICES = [
        ('planejado', 'Planejado'),
        ('em_andamento', 'Em Andamento'),
        ('colhido', 'Colhido'),
        ('perdido', 'Perdido'),
    ]

    # FLEXÍVEL: Um plantio pode ter múltiplos talhões (Safra de Cultura)
    fazenda = models.ForeignKey(Fazenda, on_delete=models.CASCADE, related_name='plantios', verbose_name="Fazenda", null=True, blank=True)
    talhoes = models.ManyToManyField(Talhao, through='PlantioTalhao', related_name='plantios', verbose_name="Talhões")
    cultura = models.ForeignKey(Cultura, on_delete=models.CASCADE, verbose_name="Cultura")
    data_plantio = models.DateField(verbose_name="Data do Plantio")
    quantidade_sementes = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Quantidade de Sementes")
    produto_semente = models.ForeignKey(Produto, on_delete=models.SET_NULL, null=True, blank=True, related_name='plantios', verbose_name="Produto Semente")
    observacoes = models.TextField(null=True, blank=True, verbose_name="Observações")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planejado', verbose_name="Status")

    # Metadata
    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    # Custos do plantio (agregados sobre talhões / safra)
    custo_mao_obra = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_maquinas = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_insumos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_outros = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    contabilizado = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Plantio"
        verbose_name_plural = "Plantios"
        ordering = ['-data_plantio']

    def calcular_custo_total(self):
        self.custo_total = (self.custo_mao_obra or 0) + (self.custo_maquinas or 0) + (self.custo_insumos or 0) + (self.custo_outros or 0)
        return self.custo_total

    def save(self, *args, **kwargs):
        self.calcular_custo_total()
        super().save(*args, **kwargs)

    def __str__(self):
        talhoes_count = self.talhoes.count()
        return f"Safra {self.cultura.nome} - {talhoes_count} talhão/talhões ({self.fazenda.name})"

    @property
    def area_total_ha(self):
        """Calcula área total somando todos os talhões. Retorna float arredondado a 2 casas.

        Normaliza tipos para evitar somar Decimal com float (causava TypeError em alguns ambientes).
        """
        from decimal import Decimal, ROUND_HALF_UP

        total = Decimal('0')
        for talhao in self.talhoes.all():
            area = talhao.area_hectares if talhao.area_hectares is not None else (talhao.area_size if talhao.area_size is not None else 0)
            if isinstance(area, Decimal):
                total += area
            else:
                # area can be float or int; convert via string to avoid floating-point issues
                total += Decimal(str(area))

        # Quantize to 2 decimal places and return as float for API consistency
        return float(total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

    @property
    def nome_safra(self):
        """Retorna nome amigável: 'Safra Soja'"""
        return f"Safra {self.cultura.nome}"


class PlantioTalhao(models.Model):
    """Tabela M2M explícita entre Plantio (Safra) e Talhão, com variedade por talhão."""
    plantio = models.ForeignKey(Plantio, on_delete=models.CASCADE, related_name='plantio_talhoes')
    talhao = models.ForeignKey(Talhao, on_delete=models.CASCADE, related_name='plantio_talhoes')
    variedade = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name="Variedade",
        help_text="Variedade cultivada neste talhão nesta safra",
    )

    class Meta:
        unique_together = ('plantio', 'talhao')
        verbose_name = "Talhão do Plantio"
        verbose_name_plural = "Talhões do Plantio"

    def __str__(self):
        return f"{self.plantio} — {self.talhao.name} ({self.variedade or 'sem variedade'})"


class Colheita(TenantModel):
    plantio = models.ForeignKey(Plantio, on_delete=models.CASCADE, related_name='colheitas')
    data_colheita = models.DateField()
    quantidade_colhida = models.DecimalField(max_digits=10, decimal_places=2)  # Kg ou unidades
    unidade = models.CharField(max_length=20, default='kg')
    # Indica se a colheita é uma estimativa (valores podem ser reconciliados posteriormente)
    is_estimada = models.BooleanField(default=True, verbose_name='Estimativa')
    qualidade = models.CharField(max_length=50, null=True, blank=True)  # Ex.: boa, média
    observacoes = models.TextField(null=True, blank=True)

    # NOVO: Status para integração com comercial
    STATUS_CHOICES = [
        ('colhida', 'Colhida'),
        ('armazenada', 'Armazenada em Estoque'),
        ('comercializada', 'Enviada para Comercial'),
        ('vendida', 'Vendida'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='colhida', verbose_name="Status")

    # NOVO: Referência opcional para movimentação de estoque (quando armazenada)
    movimentacao_estoque = models.OneToOneField('estoque.MovimentacaoEstoque', null=True, blank=True, on_delete=models.SET_NULL, verbose_name="Movimentação de Estoque")

    # NOVO: Referência opcional para carga comercial (quando enviada para comercial)
    carga_comercial = models.OneToOneField('comercial.CargaViagem', null=True, blank=True, on_delete=models.SET_NULL, verbose_name="Carga Comercial")

    # Custos básicos (por colheita)
    custo_mao_obra = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_maquina = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_combustivel = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_insumos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_outros = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    contabilizado = models.BooleanField(default=False)

    # Metadata
    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Colheita"
        verbose_name_plural = "Colheitas"
        ordering = ['-data_colheita']

    def __str__(self):
        return f"Colheita {self.quantidade_colhida} {self.unidade} de {self.plantio.cultura.nome}"

    def calcular_custo_total(self):
        self.custo_total = (self.custo_mao_obra or 0) + (self.custo_maquina or 0) + (self.custo_combustivel or 0) + (self.custo_insumos or 0) + (self.custo_outros or 0)
        return self.custo_total

    def save(self, *args, **kwargs):
        # Recalcular custo_total antes de salvar
        self.calcular_custo_total()
        super().save(*args, **kwargs)

    def armazenar_em_estoque(self, local_armazenamento, lote_numero=None):
        """Armazena a colheita em um local de estoque e marca como não estimada"""
        from apps.estoque.models import Produto, Lote
        from apps.estoque.services import create_movimentacao

        # Allow storing even if marked as estimated: storing confirms the quantity
        if self.status not in ['colhida', 'armazenada']:
            return False, "Colheita deve estar no status 'colhida' ou 'armazenada'"

        # Verificar se há produto correspondente à cultura
        try:
            produto = Produto.objects.get(nome__icontains=self.plantio.cultura.nome)
        except Produto.DoesNotExist:
            return False, f"Produto para cultura {self.plantio.cultura.nome} não encontrado"

        # Criar lote se não especificado
        if not lote_numero:
            lote_numero = f"COL-{self.id}-{self.data_colheita.strftime('%Y%m%d')}"

        lote, created = Lote.objects.get_or_create(
            produto=produto,
            numero_lote=lote_numero,
            defaults={
                'quantidade_inicial': self.quantidade_colhida,
                'quantidade_atual': self.quantidade_colhida,
                'local_armazenamento': local_armazenamento.nome if local_armazenamento else None,
                'data_fabricacao': self.data_colheita,
            }
        )

        if not created:
            lote.quantidade_atual += self.quantidade_colhida
            lote.save()

        # Criar movimentação de entrada usando service transacional
        first_talhao = self.plantio.talhoes.first() if self.plantio.talhoes.exists() else None
        movimentacao = create_movimentacao(
            produto=produto,
            tipo='entrada',
            quantidade=self.quantidade_colhida,
            criado_por=self.criado_por,
            origem='colheita',
            lote=lote,
            fazenda=first_talhao.area.fazenda if first_talhao and hasattr(first_talhao, 'area') else None,
            talhao=first_talhao,
            local_armazenamento=local_armazenamento,
            documento_referencia=f"Colheita #{self.id}",
            motivo=f"Entrada da colheita de {self.plantio.cultura.nome}",
        )

        # Atualizar status e marcar como confirmado (não estimada)
        self.status = 'armazenada'
        self.is_estimada = False
        self.movimentacao_estoque = movimentacao
        self.save()

        return True, f"Colheita armazenada com sucesso em {local_armazenamento.nome if local_armazenamento else 'estoque geral'}"

# ------------------------------------------------------------------
# Novos modelos para suportar o fluxo em dois passos da colheita
# ------------------------------------------------------------------

class ColheitaItem(models.Model):
    """Representa a colheita em um talhão específico (unidade operacional).

    Cada item corresponde à operação da colheitadeira > trator (transferências em campo).
    """
    colheita = models.ForeignKey(Colheita, on_delete=models.CASCADE, related_name='itens')
    talhao = models.ForeignKey(Talhao, on_delete=models.CASCADE, related_name='colheitas_itens')
    maquina = models.CharField(max_length=100, null=True, blank=True, help_text='Colheitadeira')
    trator = models.CharField(max_length=100, null=True, blank=True)
    basuca = models.CharField(max_length=100, null=True, blank=True, help_text='Veículo que recebe do colhedor')
    operador = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='colheita_itens')

    quantidade_colhida = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='colhido', choices=[('colhido','Colhido'), ('em_transporte','Em Transporte'), ('descarregado','Descarregado')])

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Colheita Item'
        verbose_name_plural = 'Colheita Itens'

    def __str__(self):
        return f"ColheitaItem {self.colheita.id} - {self.talhao.name} : {self.quantidade_colhida}"


class HarvestTransfer(TenantModel):
    """Registro de uma transferência em campo (colheitadeira -> trator, ou trator -> caminhão).

    Usado para reconciliação e auditoria dos pesos.
    """
    item = models.ForeignKey(ColheitaItem, on_delete=models.CASCADE, related_name='transfers')
    from_vehicle = models.CharField(max_length=100)
    to_vehicle = models.CharField(max_length=100)
    quantidade = models.DecimalField(max_digits=12, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        verbose_name = 'Transferência de Colheita'
        verbose_name_plural = 'Transferências de Colheita'

    def __str__(self):
        return f"Transfer {self.item.id}: {self.quantidade} from {self.from_vehicle} to {self.to_vehicle}"

        if self.status != 'colhida':
            return False, "Colheita deve estar no status 'colhida'"

        # Verificar se há produto correspondente à cultura
        try:
            produto = Produto.objects.get(nome__icontains=self.plantio.cultura.nome)
        except Produto.DoesNotExist:
            return False, f"Produto para cultura {self.plantio.cultura.nome} não encontrado"

        # Criar lote se não especificado
        if not lote_numero:
            lote_numero = f"COL-{self.id}-{self.data_colheita.strftime('%Y%m%d')}"

        lote, created = Lote.objects.get_or_create(
            produto=produto,
            numero_lote=lote_numero,
            defaults={
                'quantidade_inicial': self.quantidade_colhida,
                'quantidade_atual': self.quantidade_colhida,
                'local_armazenamento': local_armazenamento.nome if local_armazenamento else None,
                'data_fabricacao': self.data_colheita,
            }
        )

        if not created:
            lote.quantidade_atual += self.quantidade_colhida
            lote.save()

        # Criar movimentação de entrada
        movimentacao = MovimentacaoEstoque.objects.create(
            produto=produto,
            lote=lote,
            tipo='entrada',
            origem='colheita',
            quantidade=self.quantidade_colhida,
            fazenda=self.plantio.talhao.fazenda,
            talhao=self.plantio.talhao,
            local_armazenamento=local_armazenamento,
            documento_referencia=f"Colheita #{self.id}",
            motivo=f"Entrada automática da colheita de {self.plantio.cultura.nome}",
            criado_por=self.criado_por,
        )

        # Atualizar status da colheita
        self.status = 'armazenada'
        self.movimentacao_estoque = movimentacao
        self.save()

        return True, f"Colheita armazenada com sucesso em {local_armazenamento.nome if local_armazenamento else 'estoque geral'}"


class ColheitaTransporte(TenantModel):
    """Informações de transporte associadas a uma colheita (caminhão / comboio)."""
    colheita = models.ForeignKey(Colheita, on_delete=models.CASCADE, related_name='transportes')
    placa = models.CharField(max_length=20, null=True, blank=True)
    tara = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True, default=0)
    peso_bruto = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    peso_liquido = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    custo_transporte = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    criado_em = models.DateTimeField(auto_now_add=True)
    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = 'Transporte de Colheita'
        verbose_name_plural = 'Transportes de Colheita'

    def save(self, *args, **kwargs):
        # Calcula peso líquido quando possível
        try:
            if self.peso_bruto is not None and self.tara is not None:
                self.peso_liquido = (self.peso_bruto or 0) - (self.tara or 0)
        except Exception:
            pass
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Transporte {self.placa or 'N/A'} - bruto={self.peso_bruto} tara={self.tara} líquido={self.peso_liquido}"


class Transporte(TenantModel):
    """Modelo canônico para registros de transporte (reutilizado entre colheita e movimentações)."""
    COST_UNIT_CHOICES = [
        ('total', 'R$ Total'),
        ('tonelada', 'R$ por Tonelada'),
        ('saca', 'R$ por Saca'),
        ('unidade', 'R$ por Unidade'),
    ]

    placa = models.CharField(max_length=20, null=True, blank=True)
    motorista = models.CharField(max_length=150, null=True, blank=True)
    tara = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True, default=0)
    peso_bruto = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    peso_liquido = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    descontos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_transporte = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Unidade do custo: R$ Total / R$ por unidade/saca/tonelada
    custo_transporte_unidade = models.CharField(max_length=20, choices=COST_UNIT_CHOICES, default='total')
    criado_em = models.DateTimeField(auto_now_add=True)
    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = 'Transporte'
        verbose_name_plural = 'Transportes'

    def save(self, *args, **kwargs):
        try:
            if self.peso_bruto is not None and self.tara is not None:
                self.peso_liquido = (self.peso_bruto or 0) - (self.tara or 0) - (self.descontos or 0)
        except Exception:
            pass
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Transporte {self.placa or 'N/A'} - bruto={self.peso_bruto} tara={self.tara} líquido={self.peso_liquido}"


# --- Extend MovimentacaoCarga to reference Transporte and reconciliation metadata
class MovimentacaoCarga(TenantModel):
    """Registro de carregamento / movimentação de carga."""
    session_item = models.ForeignKey('agricultura.HarvestSessionItem', null=True, blank=True, on_delete=models.SET_NULL, related_name='movimentacoes')
    talhao = models.ForeignKey(Talhao, null=True, blank=True, on_delete=models.SET_NULL)
    # keep legacy fields for compatibility; preferred transport info is in `transporte`
    placa = models.CharField(max_length=20, null=True, blank=True)
    motorista = models.CharField(max_length=150, null=True, blank=True)  # free text
    tara = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True, default=0)
    peso_bruto = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    peso_liquido = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    descontos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    condicoes_graos = models.TextField(null=True, blank=True)
    custo_transporte = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Unidade do custo de transporte associada à movimentação (quando aplicável)
    custo_transporte_unidade = models.CharField(max_length=20, choices=[('total','R$ Total'),('tonelada','R$ por Tonelada'),('saca','R$ por Saca'),('unidade','R$ por Unidade')], null=True, blank=True, default='total')

    # link to canonical Transporte record
    transporte = models.ForeignKey('agricultura.Transporte', null=True, blank=True, on_delete=models.SET_NULL, related_name='movimentacoes')

    # Destination options
    DESTINO_CHOICES = [
        ('armazenagem_interna', 'Armazenagem na Propriedade'),
        ('armazenagem_externa', 'Armazenagem Externa'),
        ('venda_direta', 'Venda Direta')
    ]
    destino_tipo = models.CharField(max_length=30, choices=DESTINO_CHOICES, null=True, blank=True)
    local_destino = models.ForeignKey('estoque.LocalArmazenamento', null=True, blank=True, on_delete=models.SET_NULL)
    empresa_destino = models.ForeignKey('comercial.Empresa', null=True, blank=True, on_delete=models.SET_NULL)
    contrato_ref = models.CharField(max_length=200, null=True, blank=True)

    # Reconciliation metadata
    reconciled = models.BooleanField(default=False)
    reconciled_at = models.DateTimeField(null=True, blank=True)
    reconciled_by = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='movimentacoes_reconciled')

    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Movimentação de Carga'
        verbose_name_plural = 'Movimentações de Carga'

    def save(self, *args, **kwargs):
        import logging
        from decimal import Decimal
        logger = logging.getLogger(__name__)
        
        try:
            if self.transporte and (self.transporte.peso_bruto is not None and self.transporte.tara is not None):
                pb = Decimal(str(self.transporte.peso_bruto or 0))
                ta = Decimal(str(self.transporte.tara or 0))
                desc = Decimal(str(self.descontos or 0))
                self.peso_liquido = pb - ta - desc
                # keep legacy fields in sync for compatibility
                self.placa = self.placa or self.transporte.placa
                self.motorista = self.motorista or self.transporte.motorista
                self.tara = self.tara or self.transporte.tara
                self.peso_bruto = self.peso_bruto or self.transporte.peso_bruto
                # Respect explicit zero values: only assign from 'transporte' when custo_transporte is None
                if self.custo_transporte is None:
                    self.custo_transporte = self.transporte.custo_transporte
                # Propagate unidade de custo from transporte if not provided on moviment
                try:
                    if (not getattr(self, 'custo_transporte_unidade', None)) and getattr(self.transporte, 'custo_transporte_unidade', None):
                        self.custo_transporte_unidade = self.transporte.custo_transporte_unidade
                except Exception:
                    pass
                logger.info(f"MovimentacaoCarga.save: Via transporte - bruto={pb}, tara={ta}, desc={desc}, liquido={self.peso_liquido}")
            elif self.peso_bruto is not None and self.tara is not None:
                from decimal import Decimal
                # Converter para Decimal para operação precisa
                pb = Decimal(str(self.peso_bruto or 0))
                ta = Decimal(str(self.tara or 0))
                desc = Decimal(str(self.descontos or 0))
                self.peso_liquido = pb - ta - desc
                logger.info(f"MovimentacaoCarga.save: Via direto - bruto={pb}, tara={ta}, desc={desc}, liquido={self.peso_liquido}")
            else:
                logger.warning(f"MovimentacaoCarga.save: SEM CALC - bruto={self.peso_bruto}, tara={self.tara}")
        except Exception as e:
            logger.error(f"MovimentacaoCarga.save: ERRO={type(e).__name__}: {str(e)}", exc_info=True)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Carga {self.placa or 'N/A'} - bruto={self.peso_bruto} tara={self.tara} líquido={self.peso_liquido}"



class HarvestSession(TenantModel):
    STATUS_CHOICES = [
        ('planejada', 'Planejada'),
        ('em_andamento', 'Em Andamento'),
        ('finalizada', 'Finalizada'),
        ('cancelada', 'Cancelada'),
    ]

    plantio = models.ForeignKey(Plantio, on_delete=models.CASCADE, related_name='harvest_sessions')
    data_inicio = models.DateField()
    data_prevista = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planejada')
    equipamentos = models.ManyToManyField('maquinas.Equipamento', blank=True, related_name='harvest_sessions')
    equipe = models.ManyToManyField(CustomUser, blank=True, related_name='harvest_sessions')
    observacoes = models.TextField(null=True, blank=True)
    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='harvest_sessions_criados')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Sessão de Colheita'
        verbose_name_plural = 'Sessões de Colheita'
        ordering = ['-data_inicio']

    def __str__(self):
        return f"Sessão de Colheita {self.plantio.nome_safra} - {self.data_inicio}"

    def check_finalize(self):
        """Marca a sessão como finalizada se todos os items estiverem finalizados."""
        pending = self.itens.filter(status__in=['pendente', 'em_transporte']).exists()
        if not pending:
            self.status = 'finalizada'
            self.save()
            return True
        return False


class HarvestSessionItem(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('colhido', 'Colhido'),
        ('em_transporte', 'Em Transporte'),
        ('carregado', 'Carregado')
    ]

    session = models.ForeignKey(HarvestSession, on_delete=models.CASCADE, related_name='itens')
    talhao = models.ForeignKey(Talhao, on_delete=models.CASCADE, related_name='harvest_items')
    quantidade_colhida = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Item de Sessão de Colheita'
        verbose_name_plural = 'Itens de Sessão de Colheita'

    def __str__(self):
        return f"Sessão {self.session.id} - {self.talhao.name}: {self.quantidade_colhida}"


class Manejo(TenantModel):
    TIPO_CHOICES = [
        # Preparação do Solo
        ('preparo_solo', 'Preparo do Solo'),
        ('aracao', 'Aração'),
        ('gradagem', 'Gradagem'),
        ('subsolagem', 'Subsolagem'),
        ('correcao_solo', 'Correção do Solo'),
        ('calagem', 'Calagem'),
        
        # Adubação
        ('adubacao_base', 'Adubação de Base'),
        ('adubacao_cobertura', 'Adubação de Cobertura'),
        ('adubacao_foliar', 'Adubação Foliar'),
        
        # Plantio
        ('dessecacao', 'Dessecação'),
        ('plantio_direto', 'Plantio Direto'),
        ('plantio_convencional', 'Plantio Convencional'),
        
        # Tratos Culturais
        ('irrigacao', 'Irrigação'),
        ('poda', 'Poda'),
        ('desbaste', 'Desbaste'),
        ('amontoa', 'Amontoa'),
        
        # Controle Fitossanitário
        ('controle_pragas', 'Controle de Pragas'),
        ('controle_doencas', 'Controle de Doenças'),
        ('controle_plantas_daninhas', 'Controle de Plantas Daninhas'),
        ('pulverizacao', 'Pulverização'),
        ('aplicacao_herbicida', 'Aplicação de Herbicida'),
        ('aplicacao_fungicida', 'Aplicação de Fungicida'),
        ('aplicacao_inseticida', 'Aplicação de Inseticida'),
        
        # Operações Mecânicas
        ('capina', 'Capina'),
        ('rocada', 'Roçada'),
        ('cultivo_mecanico', 'Cultivo Mecânico'),
        
        # Outros
        ('outro', 'Outro'),
    ]

    # Plantio agora é opcional (permite operações pré-plantio)
    plantio = models.ForeignKey(Plantio, on_delete=models.CASCADE, related_name='manejos', null=True, blank=True)
    fazenda = models.ForeignKey(Fazenda, on_delete=models.CASCADE, related_name='manejos_fazenda', null=True, blank=True)
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES)
    data_manejo = models.DateField()
    descricao = models.TextField(null=True, blank=True)
    custo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    produtos_utilizados = models.ManyToManyField(Produto, through='ManejoProduto', blank=True)
    usuario_responsavel = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='manejos_responsavel')
    equipamento = models.CharField(max_length=100, null=True, blank=True)
    talhoes = models.ManyToManyField(Talhao, blank=True, related_name='manejos')

    # Custos detalhados
    custo_mao_obra = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_maquinas = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_insumos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_outros = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    contabilizado = models.BooleanField(default=False)

    # Metadata
    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def calcular_custo_total(self):
        self.custo_total = (self.custo_mao_obra or 0) + (self.custo_maquinas or 0) + (self.custo_insumos or 0) + (self.custo_outros or 0) + (self.custo or 0)
        return self.custo_total

    def save(self, *args, **kwargs):
        self.calcular_custo_total()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.tipo} em {self.plantio.cultura.nome}"


class ManejoProduto(models.Model):
    manejo = models.ForeignKey(Manejo, on_delete=models.CASCADE)
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    dosagem = models.DecimalField(max_digits=10, decimal_places=2)
    unidade_dosagem = models.CharField(max_length=20)
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)
    unidade = models.CharField(max_length=20)

    def save(self, *args, **kwargs):
        # Calcular quantidade baseada na área total dos talhões e dosagem
        area_total = 0
        try:
            area_total = sum([talhao.area_hectares or talhao.area_size or 0 for talhao in self.manejo.talhoes.all()])
        except Exception:
            area_total = 0
        self.quantidade = area_total * (self.dosagem or 0)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantidade} {self.unidade} de {self.produto.nome}"


class OrdemServico(TenantModel):
    # FLEXÍVEL: Uma OS pode abranger múltiplos talhões
    fazenda = models.ForeignKey(Fazenda, on_delete=models.CASCADE, related_name='ordens_servico', verbose_name="Fazenda", null=True, blank=True)
    talhoes = models.ManyToManyField(Talhao, related_name='ordens_servico', verbose_name="Talhões")
    tipo_manual = models.BooleanField(default=False, verbose_name="Tipo Manual")
    tarefa = models.CharField(max_length=200, verbose_name="Tarefa")
    maquina = models.CharField(max_length=200, blank=True, verbose_name="Máquina")  # Ou FK para Maquina se existir
    insumos = models.JSONField(default=list, verbose_name="Insumos")  # Lista de insumos
    data_inicio = models.DateTimeField(verbose_name="Data Início")
    data_fim = models.DateTimeField(null=True, blank=True, verbose_name="Data Fim")
    status = models.CharField(max_length=20, default='pendente', verbose_name="Status")  # pendente, aprovada, ativa, finalizada
    aprovacao_ia = models.BooleanField(null=True, verbose_name="Aprovação IA")  # True/False da IA
    custo_total = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Custo Total")

    # Metadata
    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        verbose_name = "Ordem de Serviço"
        verbose_name_plural = "Ordens de Serviço"
        ordering = ['-data_inicio']

    def __str__(self):
        talhoes_count = self.talhoes.count()
        return f"OS #{self.id} - {self.tarefa} ({talhoes_count} talhão/talhões)"

    @property
    def area_total_ha(self):
        """Calcula área total somando todos os talhões. Retorna float arredondado a 2 casas.

        Normaliza tipos para evitar somar Decimal com float (causava TypeError em alguns ambientes).
        """
        from decimal import Decimal, ROUND_HALF_UP

        total = Decimal('0')
        for talhao in self.talhoes.all():
            area = talhao.area_hectares if talhao.area_hectares is not None else (talhao.area_size if talhao.area_size is not None else 0)
            if isinstance(area, Decimal):
                total += area
            else:
                # area can be float or int; convert via string to avoid floating-point issues
                total += Decimal(str(area))

        # Quantize to 2 decimal places and return as float for API consistency
        return float(total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


class Insumo(TenantModel):
    nome = models.CharField(max_length=200)
    quantidade_estoque = models.DecimalField(max_digits=12, decimal_places=2)
    unidade = models.CharField(max_length=20)  # kg, litros, etc.
    vencimento = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.nome

    @property
    def alerta_baixo(self):
        return self.quantidade_estoque < 10  # Exemplo threshold


class DismissAlert(TenantModel):
    user = models.ForeignKey('core.CustomUser', on_delete=models.CASCADE)
    insumo = models.ForeignKey(Insumo, on_delete=models.CASCADE)
    dismissed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'insumo')


# ====================================================================
# NOVO SISTEMA DE OPERAÇÕES UNIFICADO (REFACTOR)
# Substitui: Manejo + OrdemServico
# ====================================================================

class Operacao(TenantModel):
    """
    Modelo ÚNICO para todas operações agrícolas.
    Unifica Manejo e OrdemServico em uma estrutura hierárquica flexível.
    """
    
    # Categorias principais (6 categorias)
    CATEGORIA_CHOICES = [
        ('preparacao', 'Preparação do Solo'),
        ('adubacao', 'Adubação'),
        ('plantio', 'Plantio'),
        ('tratos', 'Tratos Culturais'),
        ('pulverizacao', 'Pulverização (Fitossanitário)'),
        ('mecanicas', 'Operações Mecânicas'),
    ]
    
    # Tipos hierarquizados por categoria (23 tipos)
    TIPO_CHOICES = [
        # Preparação do Solo (5)
        ('prep_limpeza', 'Limpeza de Área'),
        ('prep_aracao', 'Aração'),
        ('prep_gradagem', 'Gradagem'),
        ('prep_subsolagem', 'Subsolagem'),
        ('prep_correcao', 'Correção do Solo'),
        
        # Adubação (3)
        ('adub_base', 'Adubação de Base'),
        ('adub_cobertura', 'Adubação de Cobertura'),
        ('adub_foliar', 'Adubação Foliar'),
        
        # Plantio (3)
        ('plant_dessecacao', 'Dessecação'),
        ('plant_direto', 'Plantio Direto'),
        ('plant_convencional', 'Plantio Convencional'),
        
        # Tratos Culturais (4)
        ('trato_irrigacao', 'Irrigação'),
        ('trato_poda', 'Poda'),
        ('trato_desbaste', 'Desbaste'),
        ('trato_amontoa', 'Amontoa'),
        
        # Pulverização (6) - Aplicações primeiro
        ('pulv_herbicida', 'Aplicação de Herbicida'),
        ('pulv_fungicida', 'Aplicação de Fungicida'),
        ('pulv_inseticida', 'Aplicação de Inseticida'),
        ('pulv_pragas', 'Controle de Pragas'),
        ('pulv_doencas', 'Controle de Doenças'),
        ('pulv_daninhas', 'Controle de Plantas Daninhas'),
        
        # Operações Mecânicas (2)
        ('mec_rocada', 'Roçada'),
        ('mec_cultivo', 'Cultivo Mecânico'),
    ]
    
    STATUS_CHOICES = [
        ('planejada', 'Planejada'),
        ('em_andamento', 'Em Andamento'),
        ('concluida', 'Concluída'),
        ('cancelada', 'Cancelada'),
    ]
    
    # ===== Campos Base =====
    categoria = models.CharField('Categoria', max_length=20, choices=CATEGORIA_CHOICES)
    tipo = models.CharField('Tipo de Operação', max_length=30, choices=TIPO_CHOICES)
    
    # Relacionamentos (safra opcional para operações avulsas)
    plantio = models.ForeignKey(Plantio, on_delete=models.CASCADE, 
                                related_name='operacoes', 
                                null=True, blank=True,
                                verbose_name='Safra')
    fazenda = models.ForeignKey(Fazenda, on_delete=models.CASCADE, 
                                related_name='operacoes',
                                null=True, blank=True,
                                verbose_name='Fazenda')
    talhoes = models.ManyToManyField(Talhao, related_name='operacoes', 
                                    verbose_name='Talhões')
    
    # Datas
    data_operacao = models.DateField('Data da Operação')
    data_inicio = models.DateTimeField('Data/Hora Início', null=True, blank=True)
    data_fim = models.DateTimeField('Data/Hora Fim', null=True, blank=True)
    
    # ===== Equipamentos =====
    trator = models.ForeignKey('maquinas.Equipamento', 
                              on_delete=models.SET_NULL,
                              null=True, blank=True,
                              related_name='operacoes_trator',
                              verbose_name='Trator')
    implemento = models.ForeignKey('maquinas.Equipamento',
                                  on_delete=models.SET_NULL,
                                  null=True, blank=True,
                                  related_name='operacoes_implemento',
                                  verbose_name='Implemento')
    
    # ===== Produtos/Insumos (via tabela intermediária) =====
    produtos = models.ManyToManyField(Produto, 
                                     through='OperacaoProduto',
                                     blank=True,
                                     verbose_name='Produtos Utilizados')
    
    # ===== Dados Específicos (JSON flexível para wizard) =====
    dados_especificos = models.JSONField(
        'Dados Específicos',
        default=dict,
        blank=True,
        help_text='Campos dinâmicos conforme tipo de operação'
    )
    # Exemplos de estrutura:
    # Pulverização: {"volume_calda": 200, "tipo_bico": "leque", "temperatura": 25, "umidade": 60}
    # Plantio: {"populacao": 65000, "espacamento": 45, "profundidade": 5, "variedade": "M6210"}
    # Colheita: {"plataforma": "drapper", "umidade_graos": 14}
    
    # ===== Custos (calculados automaticamente) =====
    custo_mao_obra = models.DecimalField('Custo Mão de Obra',
                                        max_digits=12, decimal_places=2,
                                        default=0)
    custo_maquina = models.DecimalField('Custo Máquina',
                                       max_digits=12, decimal_places=2,
                                       default=0)
    custo_insumos = models.DecimalField('Custo Insumos',
                                       max_digits=12, decimal_places=2,
                                       default=0)
    custo_total = models.DecimalField('Custo Total', 
                                     max_digits=12, decimal_places=2, 
                                     default=0)

    def calcular_custo_total(self):
        self.custo_total = (
            (self.custo_mao_obra or 0)
            + (self.custo_maquina or 0)
            + (self.custo_insumos or 0)
        )
        return self.custo_total

    def save(self, *args, **kwargs):
        # Recalculate custo_total unless caller already set it via explicit update_fields
        update_fields = kwargs.get('update_fields')
        if update_fields is None or 'custo_total' not in update_fields:
            self.calcular_custo_total()
        super().save(*args, **kwargs)

    # ===== Operacional =====
    operador = models.ForeignKey(CustomUser, 
                                on_delete=models.SET_NULL,
                                null=True, blank=True,
                                related_name='operacoes_operador',
                                verbose_name='Operador')
    status = models.CharField('Status', max_length=20, 
                             choices=STATUS_CHOICES, 
                             default='planejada')
    observacoes = models.TextField('Observações', null=True, blank=True)
    
    # ===== Metadata =====
    criado_por = models.ForeignKey(CustomUser, 
                                   on_delete=models.SET_NULL,
                                   null=True, blank=True,
                                   related_name='operacoes_criadas')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Operação'
        verbose_name_plural = 'Operações'
        ordering = ['-data_operacao', '-criado_em']
        indexes = [
            models.Index(fields=['categoria', 'tipo']),
            models.Index(fields=['data_operacao']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        plantio_info = f" - {self.plantio.cultura.nome}" if self.plantio else ""
        return f"{self.get_tipo_display()} em {self.data_operacao}{plantio_info}"
    
    @property
    def area_total_ha(self):
        """Calcula área total somando todos os talhões"""
        from decimal import Decimal
        total = Decimal('0')
        for talhao in self.talhoes.all():
            area = talhao.area_hectares or talhao.area_size or Decimal('0')
            total += Decimal(str(area))
        return float(round(total, 2))
    
    @property
    def duracao_horas(self):
        """Calcula duração em horas se houver data_inicio e data_fim"""
        if self.data_inicio and self.data_fim:
            delta = self.data_fim - self.data_inicio
            return round(delta.total_seconds() / 3600, 2)
        return None
    
    def clean(self):
        """Validações customizadas"""
        from django.core.exceptions import ValidationError
        
        # Validar que tipo pertence à categoria
        if self.categoria and self.tipo:
            prefixo_categoria = self.categoria[:4]  # 'prep', 'adub', etc
            prefixo_tipo = self.tipo.split('_')[0]  # 'prep', 'adub', etc
            if prefixo_categoria != prefixo_tipo:
                raise ValidationError({
                    'tipo': f'Tipo "{self.get_tipo_display()}" não pertence à categoria "{self.get_categoria_display()}"'
                })
        
        # Se não tem plantio, fazenda é obrigatória
        if not self.plantio and not self.fazenda:
            raise ValidationError({
                'fazenda': 'Fazenda é obrigatória para operações avulsas (sem safra)'
            })


class OperacaoProduto(models.Model):
    """
    Tabela intermediária para produtos com dosagem automática.
    Calcula quantidade total baseada em dosagem × área dos talhões.
    """
    operacao = models.ForeignKey(Operacao, on_delete=models.CASCADE,
                                related_name='produtos_operacao')
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE,
                               verbose_name='Produto')
    
    # Dosagem por hectare
    dosagem = models.DecimalField('Dosagem', max_digits=10, decimal_places=3)
    unidade_dosagem = models.CharField('Unidade', max_length=20,
                                      help_text='Ex: L/ha, kg/ha, g/ha')
    
    # Quantidade total (calculada automaticamente)
    quantidade_total = models.DecimalField('Quantidade Total', 
                                          max_digits=10, decimal_places=3,
                                          editable=False)
    
    # Metadata
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Produto da Operação'
        verbose_name_plural = 'Produtos das Operações'
        unique_together = ['operacao', 'produto']
    
    def __str__(self):
        return f"{self.quantidade_total:.2f} {self.unidade_dosagem.split('/')[0]} de {self.produto.nome}"
    
    def save(self, *args, **kwargs):
        """Calcula quantidade total automaticamente antes de salvar"""
        if self.operacao_id:
            # Calcula: dosagem × área total dos talhões
            try:
                from decimal import Decimal
                area = Decimal(str(self.operacao.area_total_ha or 0))
                self.quantidade_total = Decimal(self.dosagem) * area
            except Exception:
                # Fallback para evitar TypeErrors
                self.quantidade_total = float(self.dosagem) * (self.operacao.area_total_ha or 0)
        super().save(*args, **kwargs)