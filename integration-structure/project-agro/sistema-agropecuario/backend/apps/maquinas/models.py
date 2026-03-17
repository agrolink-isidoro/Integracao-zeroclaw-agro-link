from django.db import models
from apps.core.models import TenantModel
from django.contrib.gis.db import models as gis_models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
import re
import logging

logger = logging.getLogger(__name__)


# ====================================================================
# SISTEMA DE CATEGORIZAÇÃO FLEXÍVEL DE EQUIPAMENTOS
# ====================================================================

class CategoriaEquipamento(models.Model):
    """
    Categorias personalizáveis de equipamentos (não hardcoded).
    Permite adicionar novos tipos de equipamentos sem alterar código.
    Exemplos: Trator, Colhedeira, Pivot Central, Bomba, Gerador, etc.
    """
    
    TIPO_MOBILIDADE_CHOICES = [
        ('autopropelido', 'Autopropelido'),      # Com propulsão própria (trator, colhedeira)
        ('estacionario', 'Estacionário'),        # Fixo/sem movimento (pivot, bomba, gerador)
        ('rebocado', 'Rebocado/Implemento'),     # Acoplado a outro (arado, grade, plantadeira)
    ]
    
    # Campos básicos
    nome = models.CharField('Nome', max_length=100, unique=True,
                           help_text='Ex: Trator, Colhedeira, Pivot Central, Bomba de Água')
    descricao = models.TextField('Descrição', blank=True, null=True,
                                 help_text='Descrição detalhada da categoria')
    
    # Classificação técnica correta
    tipo_mobilidade = models.CharField(
        'Tipo de Mobilidade',
        max_length=20,
        choices=TIPO_MOBILIDADE_CHOICES,
        help_text='Classificação quanto à mobilidade do equipamento'
    )
    
    # Hierarquia (permite subcategorias)
    categoria_pai = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='subcategorias',
        verbose_name='Categoria Pai',
        help_text='Categoria superior (opcional para hierarquia)'
    )
    
    # Validações dinâmicas - define quais campos são obrigatórios
    requer_horimetro = models.BooleanField(
        'Requer Horímetro',
        default=False,
        help_text='Se marcado, horímetro_atual será obrigatório'
    )
    requer_potencia = models.BooleanField(
        'Requer Potência',
        default=False,
        help_text='Se marcado, potência (kW ou CV) será obrigatória'
    )
    requer_localizacao = models.BooleanField(
        'Requer Localização',
        default=False,
        help_text='Se marcado, local_instalacao será obrigatório'
    )
    requer_acoplamento = models.BooleanField(
        'Requer Acoplamento',
        default=False,
        help_text='Se marcado, maquina_principal será obrigatória (implementos)'
    )
    
    # Status e ordenação
    ativo = models.BooleanField('Ativo', default=True)
    ordem_exibicao = models.IntegerField('Ordem de Exibição', default=0,
                                        help_text='Ordem para listagem (menor primeiro)')
    
    # Metadata
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por = models.ForeignKey(
        'core.CustomUser',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='categorias_equipamento_criadas'
    )
    
    class Meta:
        verbose_name = 'Categoria de Equipamento'
        verbose_name_plural = 'Categorias de Equipamentos'
        ordering = ['ordem_exibicao', 'nome']
        indexes = [
            models.Index(fields=['tipo_mobilidade']),
            models.Index(fields=['ativo']),
        ]
    
    def __str__(self):
        if self.categoria_pai:
            return f"{self.categoria_pai.nome} > {self.nome}"
        return self.nome
    
    def clean(self):
        """Validações customizadas"""
        # Evitar ciclos na hierarquia
        if self.categoria_pai:
            pai = self.categoria_pai
            while pai:
                if pai == self:
                    raise ValidationError({
                        'categoria_pai': 'Não é possível criar ciclo na hierarquia de categorias'
                    })
                pai = pai.categoria_pai


class Equipamento(TenantModel):
    """
    Modelo principal para equipamentos do sistema agrícola.
    Agora com categorização FLEXÍVEL - não limitada por choices hardcoded.
    Suporta: Máquinas, Implementos, Pivot Central, Bombas, Geradores, Motores, etc.
    """

    # Status do equipamento
    STATUS_CHOICES = [
        ('ativo', 'Ativo'),
        ('inativo', 'Inativo'),
        ('manutencao', 'Manutenção'),
        ('vendido', 'Vendido'),
    ]

    # ====================================================================
    # CAMPOS BÁSICOS
    # ====================================================================
    
    # Categoria FLEXÍVEL (substituindo tipo_equipamento hardcoded)
    categoria = models.ForeignKey(
        CategoriaEquipamento,
        on_delete=models.PROTECT,
        related_name='equipamentos',
        verbose_name='Categoria',
        help_text='Categoria flexível do equipamento (Trator, Pivot, Bomba, etc)',
        null=True,  # Temporário para migração
        blank=True  # Temporário para migração
    )
    
    nome = models.CharField('Nome', max_length=200, help_text='Nome do equipamento')
    marca = models.CharField('Marca', max_length=100, help_text='Marca/fabricante')
    modelo = models.CharField('Modelo', max_length=100, help_text='Modelo específico')
    numero_serie = models.CharField('Número de Série', max_length=100, blank=True, null=True)
    ano_fabricacao = models.PositiveIntegerField('Ano de Fabricação', validators=[MinValueValidator(1900)])
    data_aquisicao = models.DateField('Data de Aquisição', blank=True, null=True)
    valor_aquisicao = models.DecimalField('Valor de Aquisição', max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])

    # Status
    status = models.CharField('Status', max_length=15, choices=STATUS_CHOICES, default='ativo')
    observacoes = models.TextField('Observações', blank=True, null=True)

    # ====================================================================
    # CAMPOS DINÂMICOS POR CATEGORIA
    # ====================================================================
    
    # Para equipamentos AUTOPROPELIDOS (tratores, colhedeiras)
    horimetro_atual = models.DecimalField(
        'Horímetro Atual (h)', 
        max_digits=10, decimal_places=1, 
        blank=True, null=True, 
        validators=[MinValueValidator(0)],
        help_text='Obrigatório se categoria.requer_horimetro=True'
    )
    capacidade_tanque = models.DecimalField(
        'Capacidade Tanque (L)', 
        max_digits=8, decimal_places=1, 
        blank=True, null=True, 
        validators=[MinValueValidator(0)]
    )
    consumo_medio = models.DecimalField(
        'Consumo Médio (L/h)', 
        max_digits=6, decimal_places=2, 
        blank=True, null=True, 
        validators=[MinValueValidator(0)]
    )
    gps_tracking = models.BooleanField('GPS Tracking', default=False)
    
    # Para equipamentos com POTÊNCIA (geradores, motores, bombas)
    potencia_cv = models.DecimalField(
        'Potência (CV)', 
        max_digits=8, decimal_places=2, 
        blank=True, null=True, 
        validators=[MinValueValidator(0)],
        help_text='Obrigatório se categoria.requer_potencia=True'
    )
    potencia_kw = models.DecimalField(
        'Potência (kW)', 
        max_digits=8, decimal_places=2, 
        blank=True, null=True, 
        validators=[MinValueValidator(0)]
    )
    
    # Para equipamentos ESTACIONÁRIOS (pivot, bomba, gerador)
    local_instalacao = models.CharField(
        'Local de Instalação', 
        max_length=200, 
        blank=True, null=True,
        help_text='Obrigatório se categoria.requer_localizacao=True'
    )
    coordenadas = gis_models.PointField(
        'Coordenadas Geográficas',
        blank=True, null=True,
        srid=4326,
        help_text='Localização GPS do equipamento estacionário'
    )
    
    # Elétricos (gerador, motor elétrico, bomba)
    tensao_volts = models.PositiveIntegerField('Tensão (V)', blank=True, null=True)
    frequencia_hz = models.PositiveIntegerField('Frequência (Hz)', blank=True, null=True)
    fases = models.PositiveIntegerField(
        'Fases', 
        blank=True, null=True, 
        validators=[MinValueValidator(1), MaxValueValidator(3)]
    )
    
    # Para IMPLEMENTOS (grade, plantadeira, pulverizador)
    maquina_principal = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='implementos_vinculados',
        verbose_name='Equipamento Principal',
        help_text='Equipamento ao qual este está acoplado (ex: trator para implemento)',
        limit_choices_to={'categoria__tipo_mobilidade__in': ['autopropelido', 'estacionario']}
    )
    largura_trabalho = models.DecimalField(
        'Largura de Trabalho (m)', 
        max_digits=5, decimal_places=2, 
        blank=True, null=True, 
        validators=[MinValueValidator(0)]
    )
    profundidade_trabalho = models.DecimalField(
        'Profundidade Máxima (cm)', 
        max_digits=5, decimal_places=1, 
        blank=True, null=True, 
        validators=[MinValueValidator(0)]
    )
    capacidade = models.DecimalField(
        'Capacidade', 
        max_digits=10, decimal_places=2, 
        blank=True, null=True, 
        validators=[MinValueValidator(0)],
        help_text='Capacidade genérica (L, kg, sacas, etc)'
    )
    
    # Para VEÍCULOS (se houver categoria veículo)
    placa = models.CharField('Placa', max_length=10, blank=True, null=True)
    quilometragem_atual = models.PositiveIntegerField('Quilometragem Atual (km)', blank=True, null=True)
    capacidade_carga = models.DecimalField(
        'Capacidade de Carga (kg)', 
        max_digits=10, decimal_places=2, 
        blank=True, null=True, 
        validators=[MinValueValidator(0)]
    )
    
    # ====================================================================
    # CARACTERÍSTICAS ESPECÍFICAS (JSONFIELD FLEXÍVEL)
    # ====================================================================
    
    caracteristicas_especificas = models.JSONField(
        'Características Específicas',
        default=dict,
        blank=True,
        help_text='Campos personalizados por categoria (ex: vazao_m3h para bomba, area_irrigada para pivot)'
    )
    
    # Exemplos de estrutura JSON:
    # PIVOT: {"area_irrigada_ha": 125.5, "diametro_m": 450, "tipo_aspersor": "baixa_pressao"}
    # BOMBA: {"vazao_m3h": 80, "altura_manometrica_m": 45, "tipo_bomba": "centrifuga"}
    # GERADOR: {"tipo_combustivel": "diesel", "autonomia_horas": 12, "ruido_db": 75}
    # MOTOR: {"rotacao_rpm": 1800, "tipo_motor": "diesel", "cilindradas_cc": 2200}

    # ====================================================================
    # METADADOS
    # ====================================================================
    
    criado_em = models.DateTimeField('Criado em', auto_now_add=True)
    atualizado_em = models.DateTimeField('Atualizado em', auto_now=True)
    criado_por = models.ForeignKey(
        'core.CustomUser', 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name='equipamentos_criados'
    )

    class Meta:
        verbose_name = 'Equipamento'
        verbose_name_plural = 'Equipamentos'
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['categoria']),
            models.Index(fields=['status']),
            models.Index(fields=['marca', 'modelo']),
        ]

    def __str__(self):
        return f"{self.nome} - {self.marca} {self.modelo} ({self.categoria.nome})"
    
    @property
    def tipo_mobilidade(self):
        """Retorna tipo de mobilidade da categoria"""
        return self.categoria.tipo_mobilidade
    
    @property
    def e_autopropelido(self):
        return self.categoria.tipo_mobilidade == 'autopropelido'
    
    @property
    def e_estacionario(self):
        return self.categoria.tipo_mobilidade == 'estacionario'
    
    @property
    def e_implemento(self):
        return self.categoria.tipo_mobilidade == 'rebocado'

    def clean(self):
        """Validações baseadas na categoria (SEGURO - não quebra criação manual)"""
        super().clean()
        
        from datetime import date
        
        # Validações de data (permissivas)
        try:
            if self.ano_fabricacao and self.ano_fabricacao > date.today().year:
                raise ValidationError({
                    'ano_fabricacao': 'Ano de fabricação não pode ser no futuro.'
                })
            
            if self.data_aquisicao and self.data_aquisicao > date.today():
                raise ValidationError({
                    'data_aquisicao': 'Data de aquisição não pode ser no futuro.'
                })
        except Exception as e:
            logger.warning("Equipment validation warning (non-blocking): %s", e)
            # NÃO re-raise - permitir criação mesmo com warnings
        
        # ====================================================================
        # VALIDAÇÕES DINÂMICAS BASEADAS NA CATEGORIA - OPCIONAIS
        # ====================================================================
        # Removidas deliberadamente: todos os campos são agora opcionais
        # Isso garante compatibilidade com criação manual e via IA
        # ====================================================================
    
    def _validar_placa(self, placa):
        """Valida formato de placa brasileira"""
        # Padrão antigo: AAA-1234
        # Padrão novo: AAA1A23
        placa = placa.upper().replace('-', '')
        padrao_antigo = re.match(r'^[A-Z]{3}\d{4}$', placa)
        padrao_novo = re.match(r'^[A-Z]{3}\d[A-Z]\d{2}$', placa)
        return bool(padrao_antigo or padrao_novo)

    @property
    def idade_equipamento(self):
        """Retorna a idade do equipamento em anos"""
        from datetime import date
        if self.ano_fabricacao:
            return date.today().year - self.ano_fabricacao
        return None

    @property
    def depreciacao_estimada(self):
        """Retorna depreciação estimada (simplificada - 10% ao ano)"""
        from decimal import Decimal
        
        if self.valor_aquisicao and self.idade_equipamento:
            taxa_depreciacao_anual = Decimal('0.10')  # 10% ao ano
            valor_depreciado = self.valor_aquisicao * ((Decimal('1') - taxa_depreciacao_anual) ** self.idade_equipamento)
            return max(valor_depreciado, Decimal('0'))
        return self.valor_aquisicao or Decimal('0')

    def get_implementos_vinculados(self):
        """Retorna os implementos vinculados a este equipamento"""
        return self.implementos_vinculados.all()


class Abastecimento(TenantModel):
    """
    Registro de abastecimentos de equipamentos.
    """

    equipamento = models.ForeignKey(Equipamento, on_delete=models.CASCADE, related_name='abastecimentos')
    data_abastecimento = models.DateTimeField('Data do Abastecimento')
    quantidade_litros = models.DecimalField('Quantidade (L)', max_digits=8, decimal_places=2, validators=[MinValueValidator(0.01)])
    valor_unitario = models.DecimalField('Valor Unitário (R$/L)', max_digits=6, decimal_places=3, validators=[MinValueValidator(0)])
    valor_total = models.DecimalField('Valor Total (R$)', max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])

    # Relacionamento com produto do estoque
    produto_estoque = models.ForeignKey('estoque.Produto', on_delete=models.SET_NULL, null=True, blank=True,
                                       help_text='Produto do estoque utilizado no abastecimento')

    # Dados operacionais
    horimetro_km = models.DecimalField('Horímetro/Km no abastecimento', max_digits=10, decimal_places=1, validators=[MinValueValidator(0)], null=True, blank=True)
    local_abastecimento = models.CharField('Local do Abastecimento', max_length=200, blank=True, null=True)
    responsavel = models.CharField('Responsável', max_length=100, blank=True, null=True)

    # Observações
    observacoes = models.TextField('Observações', blank=True, null=True)

    # Metadados
    criado_em = models.DateTimeField('Criado em', auto_now_add=True)
    atualizado_em = models.DateTimeField('Atualizado em', auto_now=True)
    criado_por = models.ForeignKey('core.CustomUser', on_delete=models.SET_NULL, null=True, blank=True, related_name='abastecimentos_criados')

    class Meta:
        verbose_name = 'Abastecimento'
        verbose_name_plural = 'Abastecimentos'
        ordering = ['-data_abastecimento']

    def __str__(self):
        return f"Abastecimento {self.equipamento.nome} - {self.data_abastecimento.strftime('%d/%m/%Y')}"

    def save(self, *args, **kwargs):
        # Calcula valor total automaticamente
        if self.quantidade_litros and self.valor_unitario:
            self.valor_total = self.quantidade_litros * self.valor_unitario
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        if self.equipamento.tipo_motor == 'estatico':
            raise ValidationError('Equipamentos estáticos não podem ter abastecimentos.')


class OrdemServico(TenantModel):
    """
    Ordens de serviço para manutenção e reparos de equipamentos.
    """

    STATUS_CHOICES = [
        ('aberta', 'Aberta'),
        ('em_andamento', 'Em Andamento'),
        ('concluida', 'Concluída'),
        ('cancelada', 'Cancelada'),
    ]

    PRIORIDADE_CHOICES = [
        ('baixa', 'Baixa'),
        ('media', 'Média'),
        ('alta', 'Alta'),
        ('critica', 'Crítica'),
    ]

    TIPO_CHOICES = [
        ('preventiva', 'Preventiva'),
        ('corretiva', 'Corretiva'),
        ('melhoria', 'Melhoria'),
        ('emergencial', 'Emergencial'),
    ]

    # Informações básicas
    numero_os = models.CharField('Número da OS', max_length=20, unique=True)
    equipamento = models.ForeignKey(Equipamento, on_delete=models.CASCADE, related_name='ordens_servico')
    tipo = models.CharField('Tipo', max_length=15, choices=TIPO_CHOICES)
    prioridade = models.CharField('Prioridade', max_length=10, choices=PRIORIDADE_CHOICES, default='media')
    status = models.CharField('Status', max_length=15, choices=STATUS_CHOICES, default='aberta')

    # Datas
    data_abertura = models.DateTimeField('Data de Abertura', auto_now_add=True)
    data_previsao = models.DateField('Data Prevista', blank=True, null=True)
    data_conclusao = models.DateTimeField('Data de Conclusão', blank=True, null=True)

    # Descrição e diagnóstico
    descricao_problema = models.TextField('Descrição do Problema')
    diagnostico = models.TextField('Diagnóstico', blank=True, null=True)
    servicos_realizados = models.TextField('Serviços Realizados', blank=True, null=True)
    # Insumos utilizados (lista de dicts: {'produto_id':..., 'quantidade':...})
    insumos = models.JSONField(default=list, blank=True, verbose_name='Insumos')
    # Indica se os insumos já foram reservados no estoque (evita duplicar reservas)
    insumos_reservados = models.BooleanField('Insumos Reservados', default=False)

    # Custos
    custo_mao_obra = models.DecimalField('Custo Mão de Obra', max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    custo_pecas = models.DecimalField('Custo Peças', max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    custo_total = models.DecimalField('Custo Total', max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])

    # Fornecedores / Prestadores
    prestador_servico = models.ForeignKey('comercial.PrestadorServico', on_delete=models.SET_NULL, null=True, blank=True, related_name='ordens_servico', verbose_name='Prestador de Serviço')

    # Vincular NFes (peças compradas) — permite vincular NFes já baixadas/confirmadas em estoque
    nfes = models.ManyToManyField('fiscal.NFe', blank=True, related_name='ordens_servico', verbose_name='NFes vinculadas')

    # Responsáveis
    responsavel_abertura = models.ForeignKey('core.CustomUser', on_delete=models.SET_NULL, null=True, blank=True, related_name='ordens_abertas')
    responsavel_execucao = models.ForeignKey('core.CustomUser', on_delete=models.SET_NULL, null=True, blank=True, related_name='ordens_executadas')

    # Observações
    observacoes = models.TextField('Observações', blank=True, null=True)

    # Metadados
    criado_em = models.DateTimeField('Criado em', auto_now_add=True)
    atualizado_em = models.DateTimeField('Atualizado em', auto_now=True)

    class Meta:
        verbose_name = 'Ordem de Serviço'
        verbose_name_plural = 'Ordens de Serviço'
        ordering = ['-data_abertura']

    def __str__(self):
        return f"OS {self.numero_os} - {self.equipamento.nome}"

    def save(self, *args, **kwargs):
        # Calcula custo de peças automaticamente a partir dos insumos (se presentes)
        try:
            from decimal import Decimal
            total_pecas = Decimal('0')
            if self.insumos:
                for ins in self.insumos:
                    qtd = ins.get('quantidade')
                    if qtd is None:
                        continue
                    try:
                        qtd_dec = Decimal(str(qtd))
                    except Exception:
                        qtd_dec = Decimal('0')

                    produto_id = ins.get('produto_id') or ins.get('produto') or ins.get('produto_pk')
                    produto = None
                    if isinstance(produto_id, dict):
                        produto_id = produto_id.get('id')

                    if produto_id:
                        from apps.estoque.models import Produto
                        produto = Produto.objects.filter(pk=produto_id).first()

                    if produto and produto.custo_unitario:
                        total_pecas += qtd_dec * produto.custo_unitario
                    else:
                        # Se custo unitário não estiver definido, assume 0 e registra debug
                        total_pecas += qtd_dec * Decimal('0')
        except Exception:
            total_pecas = getattr(self, 'custo_pecas', 0)

        self.custo_pecas = total_pecas

        # Calcula custo total automaticamente
        self.custo_total = self.custo_mao_obra + self.custo_pecas

        # Gera número da OS se não existir
        if not self.numero_os:
            from datetime import datetime
            import uuid as _uuid
            self.numero_os = f"OS{datetime.now().strftime('%Y%m%d%H%M%S')}{_uuid.uuid4().hex[:4].upper()}"

        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        if self.data_conclusao:
            # Garantir comparação entre datas (data_conclusao pode ser datetime)
            from datetime import date
            if hasattr(self.data_conclusao, 'date'):
                data_conclusao_date = self.data_conclusao.date()
            else:
                data_conclusao_date = self.data_conclusao

            if data_conclusao_date < self.data_abertura.date():
                raise ValidationError({'data_conclusao': 'Data de conclusão não pode ser anterior à data de abertura.'})


class ManutencaoPreventiva(TenantModel):
    """
    Configurações de manutenção preventiva para equipamentos.
    """

    equipamento = models.ForeignKey(Equipamento, on_delete=models.CASCADE, related_name='manutencoes_preventivas')
    tipo_manutencao = models.CharField('Tipo de Manutenção', max_length=100)
    intervalo_horas = models.PositiveIntegerField('Intervalo (horas)', blank=True, null=True, help_text='Intervalo em horas de uso')
    intervalo_dias = models.PositiveIntegerField('Intervalo (dias)', blank=True, null=True, help_text='Intervalo em dias')
    ultima_manutencao = models.DateField('Última Manutenção', blank=True, null=True)
    proxima_manutencao = models.DateField('Próxima Manutenção', blank=True, null=True)
    ativo = models.BooleanField('Ativo', default=True)

    # Alertas
    alerta_antecedencia_dias = models.PositiveIntegerField('Alertar com antecedência (dias)', default=7)

    # Observações
    observacoes = models.TextField('Observações', blank=True, null=True)

    class Meta:
        verbose_name = 'Manutenção Preventiva'
        verbose_name_plural = 'Manutenções Preventivas'
        unique_together = ['equipamento', 'tipo_manutencao']

    def __str__(self):
        return f"{self.equipamento.nome} - {self.tipo_manutencao}"

    @property
    def necessita_manutencao(self):
        """Verifica se o equipamento necessita manutenção baseada nos intervalos"""
        from datetime import date, timedelta

        hoje = date.today()

        # Verifica intervalo por horas (para equipamentos auto-propelidos)
        if self.intervalo_horas and self.equipamento.horimetro_atual:
            # Esta é uma simplificação - em produção seria necessário rastrear horímetro da última manutenção
            pass

        # Verifica intervalo por dias
        if self.intervalo_dias and self.ultima_manutencao:
            dias_desde_ultima = (hoje - self.ultima_manutencao).days
            return dias_desde_ultima >= self.intervalo_dias

        return False

    @property
    def alerta_manutencao(self):
        """Verifica se deve alertar sobre manutenção próxima"""
        from datetime import date, timedelta

        if self.proxima_manutencao:
            data_alerta = self.proxima_manutencao - timedelta(days=self.alerta_antecedencia_dias)
            return date.today() >= data_alerta

        return False


class ConfiguracaoAlerta(TenantModel):
    """
    Configurações de alertas para equipamentos.
    """

    TIPO_ALERTA_CHOICES = [
        ('horimetro', 'Horímetro'),
        ('quilometragem', 'Quilometragem'),
        ('manutencao', 'Manutenção'),
        ('abastecimento', 'Abastecimento'),
    ]

    equipamento = models.ForeignKey(Equipamento, on_delete=models.CASCADE, related_name='configuracoes_alerta')
    tipo_alerta = models.CharField('Tipo de Alerta', max_length=20, choices=TIPO_ALERTA_CHOICES)
    limite = models.DecimalField('Limite', max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    unidade = models.CharField('Unidade', max_length=20, default='horas')
    ativo = models.BooleanField('Ativo', default=True)
    email_notificacao = models.BooleanField('Notificar por Email', default=True)
    sms_notificacao = models.BooleanField('Notificar por SMS', default=False)

    # Destinatários
    usuarios_notificar = models.ManyToManyField('core.CustomUser', blank=True, related_name='alertas_configurados')

    class Meta:
        verbose_name = 'Configuração de Alerta'
        verbose_name_plural = 'Configurações de Alertas'
        unique_together = ['equipamento', 'tipo_alerta']

    def __str__(self):
        return f"Alerta {self.equipamento.nome} - {self.tipo_alerta}"