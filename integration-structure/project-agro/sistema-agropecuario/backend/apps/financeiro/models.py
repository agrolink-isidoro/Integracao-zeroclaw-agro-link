from django.db import models
from apps.core.models import TenantModel
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from apps.fazendas.models import Talhao

User = get_user_model()

class ContaBancaria(TenantModel):
    """Conta bancária para lançamentos (livro caixa)."""
    banco = models.CharField(max_length=100, verbose_name='Banco')
    agencia = models.CharField(max_length=50, blank=True, verbose_name='Agência')
    conta = models.CharField(max_length=50, verbose_name='Conta')
    tipo = models.CharField(max_length=20, choices=[('corrente','Conta Corrente'), ('poupanca','Poupança')], default='corrente')
    moeda = models.CharField(max_length=5, default='BRL')
    saldo_inicial = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    
    # FASE 5: Novos campos para conciliação bancária
    tipo_pix = models.CharField(
        max_length=20,
        choices=[('cpf', 'CPF'), ('cnpj', 'CNPJ'), ('email', 'E-mail'), ('telefone', 'Telefone'), ('aleatoria', 'Chave Aleatória')],
        null=True,
        blank=True,
        verbose_name='Tipo de Chave PIX'
    )
    data_saldo_inicial = models.DateField(
        null=True,
        blank=True,
        verbose_name='Data do Saldo Inicial',
        help_text='Data de referência do saldo inicial'
    )
    observacoes = models.TextField(
        null=True,
        blank=True,
        verbose_name='Observações'
    )
    
    # New: PIX key (optional) to support PIX transfers
    pix_key = models.CharField(max_length=100, null=True, blank=True, verbose_name='Chave PIX')
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Conta Bancária'
        verbose_name_plural = 'Contas Bancárias'

    def __str__(self):
        return f"{self.banco} - {self.conta}"


class LancamentoFinanceiro(TenantModel):
    """Lançamento no livro caixa (financeiro)."""
    TIPO_CHOICES = [
        ('entrada', 'Entrada'),
        ('saida', 'Saída'),
    ]

    conta = models.ForeignKey('financeiro.ContaBancaria', on_delete=models.SET_NULL, null=True, blank=True, related_name='lancamentos')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    valor = models.DecimalField(max_digits=15, decimal_places=2)
    data = models.DateField(default=timezone.now)
    descricao = models.TextField(blank=True, null=True)

    origem_content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    origem_object_id = models.PositiveIntegerField(null=True, blank=True)
    origem = GenericForeignKey('origem_content_type', 'origem_object_id')

    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    reconciled = models.BooleanField(default=False)
    reconciled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Lançamento Financeiro'
        verbose_name_plural = 'Lançamentos Financeiros'
        ordering = ['-data', '-id']

    def __str__(self):
        return f"{self.get_tipo_display()} - R$ {self.valor} ({self.data})"


class CreditCard(TenantModel):
    """Cartões de crédito vinculados a uma conta bancária."""
    BANDEIRA_CHOICES = [
        ('01', 'Visa'),
        ('02', 'Mastercard'),
        ('03', 'American Express'),
        ('04', 'Sorocred'),
        ('05', 'Diners Club'),
        ('06', 'Elo'),
        ('07', 'Hipercard'),
        ('08', 'Aura'),
        ('09', 'Cabal'),
        ('99', 'Outros'),
    ]
    bandeira = models.CharField(max_length=50, null=True, blank=True)
    bandeira_codigo = models.CharField(max_length=2, choices=BANDEIRA_CHOICES, null=True, blank=True, help_text='Código tBand da NFe')
    numero_masked = models.CharField(max_length=32, null=True, blank=True, help_text='Número mascarado (ex: **** **** **** 1234)')
    numero_last4 = models.CharField(max_length=4, null=True, blank=True)
    conta = models.ForeignKey('financeiro.ContaBancaria', on_delete=models.SET_NULL, null=True, blank=True, related_name='cartoes')
    agencia = models.CharField(max_length=50, null=True, blank=True)
    validade = models.CharField(max_length=7, null=True, blank=True)  # MM/AAAA ou MM/AA
    dia_vencimento_fatura = models.IntegerField(
        null=True, 
        blank=True, 
        verbose_name='Dia do Vencimento da Fatura',
        help_text='Dia do mês em que a fatura do cartão vence (1-31)'
    )
    saldo_devedor = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        verbose_name='Saldo Devedor',
        help_text='Valor acumulado de compras não faturadas'
    )
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Cartão de Crédito'
        verbose_name_plural = 'Cartões de Crédito'

    def __str__(self):
        return f"{self.bandeira or 'Cartão'} {self.numero_last4 or ''}"

    def recalcular_saldo_devedor(self):
        """Recalcula o saldo devedor com base nas transações não faturadas."""
        from django.db.models import Sum
        total = self.transacoes.filter(faturado=False).aggregate(total=Sum('valor'))['total'] or 0
        self.saldo_devedor = total
        self.save(update_fields=['saldo_devedor'])
        return self.saldo_devedor


class TransacaoCartao(models.Model):
    """Transação de compra vinculada a um cartão de crédito, normalmente extraída de NFe."""
    cartao = models.ForeignKey('financeiro.CreditCard', on_delete=models.CASCADE, related_name='transacoes')
    nfe = models.ForeignKey('fiscal.NFe', on_delete=models.SET_NULL, null=True, blank=True, related_name='transacoes_cartao')
    valor = models.DecimalField(max_digits=15, decimal_places=2)
    data = models.DateField(null=True, blank=True)
    descricao = models.CharField(max_length=500, blank=True)
    nsu = models.CharField(max_length=100, null=True, blank=True, verbose_name='NSU/cAut', help_text='Código de autorização da transação')
    bandeira_nfe = models.CharField(max_length=10, null=True, blank=True, help_text='Código tBand da NFe')
    faturado = models.BooleanField(default=False, help_text='Se já foi incluído em uma fatura')
    vencimento_fatura = models.ForeignKey('financeiro.Vencimento', on_delete=models.SET_NULL, null=True, blank=True, related_name='transacoes_cartao', help_text='Vencimento da fatura que incluiu esta transação')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Transação de Cartão'
        verbose_name_plural = 'Transações de Cartão'
        ordering = ['-data', '-id']

    def __str__(self):
        return f"Transação {self.cartao} R$ {self.valor} ({self.data})"

class Vencimento(TenantModel):
    """
    Modelo para controlar pagamentos a vencer
    """
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('pago', 'Pago'),
        ('atrasado', 'Atrasado'),
        ('cancelado', 'Cancelado'),
    ]

    TIPO_CHOICES = [
        ('despesa', 'Despesa'),
        ('receita', 'Receita'),
    ]

    titulo = models.CharField(max_length=200, verbose_name="Título")
    descricao = models.TextField(blank=True, verbose_name="Descrição")
    valor = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Valor")
    data_vencimento = models.DateField(verbose_name="Data de Vencimento")
    data_pagamento = models.DateField(null=True, blank=True, verbose_name="Data de Pagamento")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente', verbose_name="Status")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='despesa', verbose_name="Tipo")

    # Relacionamentos
    talhao = models.ForeignKey(Talhao, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Talhão")
    nfe = models.ForeignKey('fiscal.NFe', on_delete=models.SET_NULL, null=True, blank=True, related_name='vencimentos', verbose_name="NFe Vinculada")
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='vencimentos_criados', verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    # FASE 5: Novos campos para conciliação bancária
    conta_bancaria = models.ForeignKey(
        'financeiro.ContaBancaria',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vencimentos',
        verbose_name='Conta Bancária',
        help_text='Conta bancária onde o vencimento foi/será pago'
    )
    confirmado_extrato = models.BooleanField(
        default=False,
        verbose_name='Confirmado no Extrato',
        help_text='Indica se este vencimento foi confirmado através de conciliação bancária'
    )
    
    # Generic Foreign Key para vincular com ItemExtratoBancario
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vencimentos_relacionados'
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    objeto_relacionado = GenericForeignKey('content_type', 'object_id')

    class Meta:
        verbose_name = "Vencimento"
        verbose_name_plural = "Vencimentos"
        ordering = ['data_vencimento']

    def __str__(self):
        return f"{self.titulo} - {self.valor} ({self.get_status_display()})"

    @property
    def dias_atraso(self):
        """Calcula os dias de atraso"""
        if self.status == 'atrasado':
            return (timezone.now().date() - self.data_vencimento).days
        return 0

    @property
    def valor_pago(self):
        """Retorna o valor se pago, senão 0"""
        return self.valor if self.status == 'pago' else Decimal('0.00')


class RateioCusto(TenantModel):
    """
    Modelo para rateio de custos por área usando PostGIS
    """
    titulo = models.CharField(max_length=200, verbose_name="Título do Rateio")
    descricao = models.TextField(blank=True, verbose_name="Descrição")
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Valor Total")
    data_rateio = models.DateField(default=timezone.now, verbose_name="Data do Rateio")

    # Área total em hectares (calculada automaticamente)
    area_total_hectares = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, verbose_name="Área Total (ha)")

    # Metadados e vínculo contábil
    # Origem: link genérico para Plantio/Manejo/Colheita/OrdemServico/DespesaAdministrativa
    origem_content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    origem_object_id = models.PositiveIntegerField(null=True, blank=True)
    origem = GenericForeignKey('origem_content_type', 'origem_object_id')

    # Safra relacionada (quando aplicável)
    safra = models.ForeignKey('agricultura.Plantio', null=True, blank=True, on_delete=models.SET_NULL, related_name='rateios')

    # Centro de custo (tipo de despesa)
    centro_custo = models.ForeignKey('administrativo.CentroCusto', null=True, blank=True, on_delete=models.SET_NULL, related_name='rateios')

    # Data e hora do rateio (registro explícito)
    data_hora_rateio = models.DateTimeField(default=timezone.now, verbose_name='Data/Hora do Rateio')

    # Destino / natureza contábil do custo
    DESTINO_CHOICES = [
        ('operacional','Operacional / Lavoura'),
        ('manutencao','Manutenção'),
        ('combustivel','Combustível'),
        ('despesa_adm','Despesa Administrativa'),
        ('investimento','Investimento'),
        ('benfeitoria','Benfeitoria'),
        ('financeiro','Financeiro / Juros'),
    ]
    destino = models.CharField(max_length=30, choices=DESTINO_CHOICES, default='operacional')

    # Driver de rateio para custos indiretos
    DRIVER_CHOICES = [
        ('area','Área (ha)'),
        ('producao','Produção (kg)'),
        ('horas_maquina','Horas de Máquina'),
        ('uniforme','Rateio Uniforme'),
    ]
    driver_de_rateio = models.CharField(max_length=30, choices=DRIVER_CHOICES, default='area')

    # Relacionamentos com talhões (quando aplicável)
    talhoes = models.ManyToManyField(Talhao, through='RateioTalhao', verbose_name="Talhões")
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='rateios_criados', verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")

    class Meta:
        verbose_name = "Rateio de Custo"
        verbose_name_plural = "Rateios de Custos"
        ordering = ['-data_rateio']
        indexes = [models.Index(fields=['safra']), models.Index(fields=['centro_custo']), models.Index(fields=['destino']), models.Index(fields=['data_hora_rateio'])]

    def __str__(self):
        return f"{self.titulo} - R$ {self.valor_total}"

    def calcular_area_total(self):
        """Calcula a área total dos talhões associados"""
        area_total = sum(talhao.area_size for talhao in self.talhoes.all())
        self.area_total_hectares = area_total
        return area_total

    def clean(self):
        """Validações customizadas para garantir coerência do rateio"""
        # Se driver por área, deve existir pelo menos 1 talhão
        if self.driver_de_rateio == 'area' and not self.talhoes.exists():
            raise ValidationError({'talhoes': 'Driver "area" requer pelo menos um talhão associado.'})

        # Centro de custo é obrigatório para despesas administrativas e financeiras
        if self.destino in ['despesa_adm', 'financeiro'] and not self.centro_custo:
            raise ValidationError({'centro_custo': 'Centro de custo obrigatório para despesas administrativas e financeiras.'})

        return super().clean()

    def salvar_rateios_talhao(self):
        """Calcula e salva o rateio por talhão baseado na área"""
        if not self.area_total_hectares:
            self.calcular_area_total()

        for talhao in self.talhoes.all():
            proporcao = talhao.area_size / self.area_total_hectares
            valor_rateado = self.valor_total * proporcao

            RateioTalhao.objects.update_or_create(
                rateio=self,
                talhao=talhao,
                defaults={
                    'proporcao_area': proporcao,
                    'valor_rateado': valor_rateado
                }
            )


class RateioTalhao(models.Model):
    """
    Modelo intermediário para rateio por talhão
    """
    rateio = models.ForeignKey(RateioCusto, on_delete=models.CASCADE, verbose_name="Rateio")
    talhao = models.ForeignKey(Talhao, on_delete=models.CASCADE, verbose_name="Talhão")

    # Cálculos automáticos
    proporcao_area = models.DecimalField(max_digits=8, decimal_places=6, null=True, blank=True, verbose_name="Proporção da Área")
    valor_rateado = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Valor Rateado")

    class Meta:
        verbose_name = "Rateio por Talhão"
        verbose_name_plural = "Rateios por Talhão"
        unique_together = ['rateio', 'talhao']

    def __str__(self):
        return f"{self.rateio.titulo} - {self.talhao.nome}: R$ {self.valor_rateado}"


class RateioApproval(TenantModel):
    """Solicitação de aprovação para um `RateioCusto` gerado automaticamente ou manualmente.

    Workflow:
    - status: 'pending' (padrão) → um aprovador do grupo `financeiro.rateio_approver` pode aprovar/rejeitar.
    - Ao aprovar, gera um `administrativo.LogAuditoria` com detalhes da decisão.
    """

    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('approved', 'Aprovado'),
        ('rejected', 'Rejeitado'),
    ]

    rateio = models.OneToOneField(RateioCusto, on_delete=models.CASCADE, related_name='approval')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='rateios_aprovacao_solicitados')
    criado_em = models.DateTimeField(auto_now_add=True)

    aprovado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='rateios_aprovados')
    aprovado_em = models.DateTimeField(null=True, blank=True)
    comentario = models.TextField(null=True, blank=True)

    class Meta:
        verbose_name = "Solicitação de Aprovação de Rateio"
        verbose_name_plural = "Solicitações de Aprovação de Rateios"
        ordering = ['-criado_em']

    def approve(self, user, comentario=None):
        """Marca como aprovado e registra `LogAuditoria`"""
        self.status = 'approved'
        self.aprovado_por = user
        from django.utils import timezone
        self.aprovado_em = timezone.now()
        if comentario:
            self.comentario = comentario
        self.save()

        # Registrar LogAuditoria
        # from apps.administrativo.models import LogAuditoria, Notificacao
        # LogAuditoria.objects.create(
        #     usuario=user,
        #     acao='update',
        #     modelo='RateioApproval',
        #     objeto_id=self.id,
        #     descricao=f'Rateio {self.rateio.id} aprovado por {user.username}',
        #     dados_anteriores={'status': 'pending'},
        #     dados_novos={'status': 'approved', 'comentario': comentario},
        # )
        from apps.administrativo.models import Notificacao
        # Mark linked despesa as not pending if exists
        try:
            from apps.administrativo.models import DespesaAdministrativa
            despesa = DespesaAdministrativa.objects.filter(rateio=self.rateio).first()
            if despesa:
                despesa.pendente_rateio = False
                despesa.save()
        except Exception:
            pass

        # Notify creator of the rateio that it was approved
        creator = getattr(self.rateio, 'criado_por', None)
        if creator:
            Notificacao.objects.create(
                titulo=f'Rateio aprovado #{self.rateio.id}',
                mensagem=f'Seu rateio #{self.rateio.id} foi aprovado por {user.username}.',
                tipo='info',
                prioridade='medium',
                usuario=creator
            )

    def reject(self, user, comentario=None):
        """Marca como rejeitado e registra `LogAuditoria`"""
        self.status = 'rejected'
        self.aprovado_por = user
        from django.utils import timezone
        self.aprovado_em = timezone.now()
        if comentario:
            self.comentario = comentario
        self.save()

        try:
            # from apps.administrativo.models import LogAuditoria, Notificacao
            # LogAuditoria.objects.create(
            #     usuario=user,
            #     acao='update',
            #     modelo='RateioApproval',
            #     objeto_id=self.id,
            #     descricao=f'Rateio {self.rateio.id} rejeitado por {user.username}',
            #     dados_anteriores={'status': 'pending'},
            #     dados_novos={'status': 'rejected', 'comentario': comentario},
            # )
            from apps.administrativo.models import Notificacao
            # Mark linked despesa as not pending if exists
            try:
                from apps.administrativo.models import DespesaAdministrativa
                despesa = DespesaAdministrativa.objects.filter(rateio=self.rateio).first()
                if despesa:
                    despesa.pendente_rateio = False
                    despesa.save()
            except Exception:
                pass

            # Notify creator of the rateio that it was rejected
            creator = getattr(self.rateio, 'criado_por', None)
            if creator:
                Notificacao.objects.create(
                    titulo=f'Rateio rejeitado #{self.rateio.id}',
                    mensagem=f'Seu rateio #{self.rateio.id} foi rejeitado por {user.username}. Comentário: {comentario or ""}',
                    tipo='info',
                    prioridade='medium',
                    usuario=creator
                )
        except Exception:
            pass


class Financiamento(TenantModel):
    """
    Modelo para controlar financiamentos agrícolas
    """

    STATUS_CHOICES = [
        ('ativo', 'Ativo'),
        ('quitado', 'Quitado'),
        ('cancelado', 'Cancelado'),
        ('em_analise', 'Em Análise'),
    ]

    # Default choices (kept for compatibility with Comercial app)
    TIPO_FINANCIAMENTO_CHOICES = [
        ('comercializacao', 'Comercialização'),
        ('industrializacao', 'Industrialização'),
        ('custeio', 'Custeio'),
        ('investimento', 'Investimento'),
    ]

    # Operações financeiras: conjunto específico usado pelo modal de Operações
    FINANCIAMENTO_TIPO_CHOICES_OPERACOES = [
        ('credito_rotativo', 'Crédito Rotativo'),
        ('custeio', 'Custeio'),
        ('cpr', 'CPR'),
        ('investimento', 'Investimento'),
    ]

    # Ensure the model field allows all possible choices (union) so both apps work
    ALL_TIPO_FINANCIAMENTO_CHOICES = [
        ('credito_rotativo', 'Crédito Rotativo'),
        ('custeio', 'Custeio'),
        ('cpr', 'CPR'),
        ('investimento', 'Investimento'),
        ('comercializacao', 'Comercialização'),
        ('industrializacao', 'Industrialização'),
    ]

    FREQUENCIA_TAXA_CHOICES = [
        ('mensal', 'Mensal'),
        ('trimestral', 'Trimestral'),
        ('semestral', 'Semestral'),
        ('anual', 'Anual'),
    ]

    METODO_CALCULO_CHOICES = [
        ('price', 'PRICE (Sistema Francês)'),
        ('sac', 'SAC (Sistema de Amortização Constante)'),
        ('personalizado', 'Personalizado'),
    ]

    titulo = models.CharField(max_length=200, verbose_name="Título do Financiamento")
    descricao = models.TextField(blank=True, verbose_name="Descrição")
    valor_total = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Valor Total")
    valor_entrada = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name="Valor de Entrada")
    valor_financiado = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Valor Financiado")
    taxa_juros = models.DecimalField(max_digits=5, decimal_places=2, verbose_name="Taxa de Juros (%)")
    frequencia_taxa = models.CharField(max_length=20, choices=FREQUENCIA_TAXA_CHOICES, default='mensal', verbose_name="Frequência da Taxa")
    metodo_calculo = models.CharField(max_length=20, choices=METODO_CALCULO_CHOICES, default='price', verbose_name="Método de Cálculo")
    numero_parcelas = models.PositiveIntegerField(verbose_name="Número de Parcelas")
    prazo_meses = models.PositiveIntegerField(verbose_name="Prazo Total (meses)")
    data_contratacao = models.DateField(verbose_name="Data de Contratação")
    data_primeiro_vencimento = models.DateField(verbose_name="Primeiro Vencimento")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ativo', verbose_name="Status")

    # Grace period (carência): número de meses
    carencia_meses = models.PositiveIntegerField(default=0, verbose_name="Carência (meses)")
    # When true, interest accrued during carência is capitalized into principal (juros embutidos)
    juros_embutidos = models.BooleanField(default=False, verbose_name="Juros Embutidos na Carência")

    # Store the union of allowed choices so both Commercial and Financial UIs are supported
    tipo_financiamento = models.CharField(max_length=30, choices=ALL_TIPO_FINANCIAMENTO_CHOICES, default='custeio', verbose_name="Tipo")

    # Relacionamentos
    talhao = models.ForeignKey(Talhao, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Talhão")
    instituicao_financeira = models.ForeignKey('comercial.InstituicaoFinanceira', on_delete=models.CASCADE, verbose_name="Instituição Financeira")
    numero_contrato = models.CharField(max_length=100, blank=True, null=True, verbose_name="Número do Contrato")

    # Optional/expanded fields requested
    garantias = models.TextField(blank=True, null=True, verbose_name="Garantias")
    contrato_arquivo = models.FileField(upload_to='contratos/financiamentos/', null=True, blank=True, verbose_name="Arquivo do Contrato")
    taxa_multa = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="Taxa de Multa (%)")
    taxa_mora = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="Taxa de Mora (%)")
    # Conta destino (pode ser obrigatória pela validação de negócio)
    conta_destino = models.ForeignKey('financeiro.ContaBancaria', on_delete=models.PROTECT, null=True, blank=True, related_name='financiamentos_recebidos', verbose_name="Conta Destino")

    aprovado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='financiamentos_aprovados', verbose_name="Aprovado por")
    aprovado_em = models.DateTimeField(null=True, blank=True, verbose_name="Aprovado em")
    observacoes = models.TextField(blank=True, null=True, verbose_name="Observações")

    # Originalidade / origem (link genérico opcional)
    origem_content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True)
    origem_object_id = models.PositiveIntegerField(null=True, blank=True)
    origem = GenericForeignKey('origem_content_type', 'origem_object_id')

    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='financiamentos_criados', verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    def clean(self):
        """Model-level clean. Historically conto_destino could be required by business rules; prefer enforcing at serializer/API layer where needed."""
        return super().clean()

    def save(self, *args, **kwargs):
        # Garantir validação na persistência
        self.full_clean()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Financiamento"
        verbose_name_plural = "Financiamentos"
        ordering = ['-data_contratacao']

    def __str__(self):
        return f"{self.titulo} - R$ {self.valor_financiado}"

    @property
    def valor_pendente(self):
        """Calcula o valor ainda pendente do financiamento com base nas parcelas criadas"""
        total_pago = sum(parcela.valor_pago for parcela in self.parcelas.all())
        return self.valor_financiado - total_pago

    @property
    def parcelas_pendentes(self):
        """Retorna o número de parcelas pendentes"""
        return self.parcelas.filter(status='pendente').count()

    def get_taxa_mensal(self):
        """Converte a taxa para mensal baseada na frequência"""
        taxa_anual = self.taxa_juros / 100

        if self.frequencia_taxa == 'mensal':
            return taxa_anual / 12
        elif self.frequencia_taxa == 'trimestral':
            return taxa_anual / 4
        elif self.frequencia_taxa == 'semestral':
            return taxa_anual / 2
        elif self.frequencia_taxa == 'anual':
            return taxa_anual
        return taxa_anual / 12  # default mensal

    def _effective_principal_with_carencia(self):
        """Return effective principal after capitalizing interest during carência

        If `juros_embutidos` is True and `carencia_meses` > 0, the interest accrued
        during the grace period is capitalized into the principal using compound
        capitalization based on monthly rate computed by `get_taxa_mensal`.
        """
        from decimal import Decimal
        principal = Decimal(str(self.valor_financiado))
        if self.juros_embutidos and self.carencia_meses > 0:
            taxa = Decimal(str(self.get_taxa_mensal()))
            principal = principal * ((Decimal('1') + taxa) ** self.carencia_meses)
        return principal

    def calcular_parcelas_price(self):
        """Calcula parcelas usando o sistema PRICE (Francês)"""
        if self.numero_parcelas <= 0 or self.valor_financiado <= 0:
            return []

        taxa_mensal = self.get_taxa_mensal()
        if taxa_mensal <= 0:
            return []

        # Use effective principal if juros embutidos is set
        principal = self._effective_principal_with_carencia()

        # Fórmula PRICE: PMT = P * (r(1+r)^n) / ((1+r)^n - 1)
        valor_parcela = principal * (taxa_mensal * (1 + taxa_mensal) ** self.numero_parcelas) / ((1 + taxa_mensal) ** self.numero_parcelas - 1)

        parcelas = []
        saldo_devedor = principal

        for numero in range(1, self.numero_parcelas + 1):
            juros = saldo_devedor * taxa_mensal
            amortizacao = valor_parcela - juros
            saldo_devedor -= amortizacao

            parcelas.append({
                'numero': numero,
                'valor_parcela': valor_parcela,
                'juros': juros,
                'amortizacao': amortizacao,
                'saldo_devedor': max(0, saldo_devedor)
            })

        return parcelas

    def calcular_parcelas_sac(self):
        """Calcula parcelas usando o sistema SAC"""
        if self.numero_parcelas <= 0 or self.valor_financiado <= 0:
            return []

        taxa_mensal = self.get_taxa_mensal()
        # Use effective principal if juros embutidos is set
        principal = self._effective_principal_with_carencia()
        amortizacao = principal / self.numero_parcelas

        parcelas = []
        saldo_devedor = principal

        for numero in range(1, self.numero_parcelas + 1):
            juros = saldo_devedor * taxa_mensal
            valor_parcela = amortizacao + juros
            saldo_devedor -= amortizacao

            parcelas.append({
                'numero': numero,
                'valor_parcela': valor_parcela,
                'juros': juros,
                'amortizacao': amortizacao,
                'saldo_devedor': max(0, saldo_devedor)
            })

        return parcelas

    def calcular_parcelas_personalizado(self):
        """Método para cálculo personalizado - pode ser implementado conforme necessidade"""
        # Por enquanto, retorna cálculo simples sem juros
        if self.numero_parcelas <= 0:
            return []

        valor_parcela = self.valor_financiado / self.numero_parcelas

        parcelas = []
        for numero in range(1, self.numero_parcelas + 1):
            parcelas.append({
                'numero': numero,
                'valor_parcela': valor_parcela,
                'juros': 0,
                'amortizacao': valor_parcela,
                'saldo_devedor': self.valor_financiado - (valor_parcela * numero)
            })

        return parcelas

    def gerar_parcelas(self):
        """Gera as parcelas baseado no método de cálculo selecionado"""
        if self.metodo_calculo == 'price':
            return self.calcular_parcelas_price()
        elif self.metodo_calculo == 'sac':
            return self.calcular_parcelas_sac()
        elif self.metodo_calculo == 'personalizado':
            return self.calcular_parcelas_personalizado()
        else:
            return self.calcular_parcelas_price()  # default


class BankStatementImport(TenantModel):
    """Registro de importação de extratos bancários (CSV/ACH/etc)."""
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('processing', 'Em Processamento'),
        ('success', 'Concluído'),
        ('failed', 'Falhou'),
    ]

    arquivo = models.FileField(upload_to='bank_statements/', null=True, blank=True)
    original_filename = models.CharField(max_length=255, null=True, blank=True)
    conta = models.ForeignKey('financeiro.ContaBancaria', on_delete=models.CASCADE, related_name='statement_imports')
    formato = models.CharField(max_length=20, default='csv')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    arquivo_hash = models.CharField(max_length=128, db_index=True, null=True, blank=True)
    rows_count = models.PositiveIntegerField(null=True, blank=True)
    errors_count = models.PositiveIntegerField(null=True, blank=True)

    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='bank_statement_imports')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Importação de Extrato Bancário'
        verbose_name_plural = 'Importações de Extratos Bancários'
        indexes = [models.Index(fields=['arquivo_hash']), models.Index(fields=['status'])]

    def __str__(self):
        return f"Import #{self.id} - {self.conta} ({self.status})"


class BankTransaction(TenantModel):
    """Transação importada de um extrato bancário."""
    importacao = models.ForeignKey('financeiro.BankStatementImport', on_delete=models.CASCADE, related_name='transactions')
    external_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    description = models.TextField(null=True, blank=True)
    balance = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    raw_payload = models.JSONField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Transação de Extrato'
        verbose_name_plural = 'Transações de Extratos'
        indexes = [models.Index(fields=['external_id']), models.Index(fields=['date']), models.Index(fields=['amount'])]

    def __str__(self):
        return f"{self.date} - {self.amount} - {self.description[:50] if self.description else ''}"



class Transferencia(TenantModel):
    """Representa uma transferência entre contas bancárias.

    Ao criar uma transferência, o serviço correspondente deve gerar um 'saida'
    no `conta_origem` e uma 'entrada' no `conta_destino` no livro caixa, ambos
    com referência (`origem`) para esta transferência.
    """

    TIPO_CHOICES = [
        ('doc', 'DOC'),
        ('ted', 'TED'),
        ('pix', 'PIX'),
        ('interno', 'Transferência Interna'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('settled', 'Liquidada'),
        ('failed', 'Falhada'),
    ]

    conta_origem = models.ForeignKey('financeiro.ContaBancaria', on_delete=models.PROTECT, related_name='transferencias_origem')
    conta_destino = models.ForeignKey('financeiro.ContaBancaria', on_delete=models.PROTECT, null=True, blank=True, related_name='transferencias_destino')
    tipo_transferencia = models.CharField(max_length=20, choices=TIPO_CHOICES, default='interno')
    valor = models.DecimalField(max_digits=15, decimal_places=2)
    data = models.DateTimeField(default=timezone.now)
    descricao = models.TextField(blank=True, null=True)

    # Optional: store the PIX keys used (if applicable)
    pix_key_origem = models.CharField(max_length=100, null=True, blank=True)
    pix_key_destino = models.CharField(max_length=100, null=True, blank=True)

    # Status & settlement info
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    settlement_date = models.DateField(null=True, blank=True)
    external_reference = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    taxa_bancaria = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    payment_metadata = models.JSONField(null=True, blank=True)
    client_tx_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)

    # Titulares (origem/destino) --- Generic link to Proprietario or Fornecedor or other
    origem_content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    origem_object_id = models.PositiveIntegerField(null=True, blank=True)
    origem = GenericForeignKey('origem_content_type', 'origem_object_id')

    destino_content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    destino_object_id = models.PositiveIntegerField(null=True, blank=True)
    destino = GenericForeignKey('destino_content_type', 'destino_object_id')

    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Transferência'
        verbose_name_plural = 'Transferências'
        ordering = ['-data']

    def __str__(self):
        destino = self.conta_destino or 'Externa'
        return f"Transferência {self.tipo_transferencia} R$ {self.valor} {self.conta_origem} -> {destino}"


class PaymentAllocation(TenantModel):
    """Alocações de uma Transferência para um ou mais Vencimentos."""
    transferencia = models.ForeignKey('financeiro.Transferencia', on_delete=models.CASCADE, related_name='allocations')
    vencimento = models.ForeignKey('financeiro.Vencimento', on_delete=models.CASCADE, related_name='allocations')
    valor_alocado = models.DecimalField(max_digits=12, decimal_places=2)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Alocação de Transferência'
        verbose_name_plural = 'Alocações de Transferências'
        indexes = [models.Index(fields=['transferencia']), models.Index(fields=['vencimento'])]

    def __str__(self):
        return f"Alloc {self.transferencia_id} -> Venc {self.vencimento_id} = R$ {self.valor_alocado}"


class ParcelaFinanciamento(models.Model):
    """
    Modelo para controlar parcelas de financiamentos
    """
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('pago', 'Pago'),
        ('atrasado', 'Atrasado'),
        ('cancelado', 'Cancelado'),
    ]

    numero_parcela = models.PositiveIntegerField(verbose_name="Número da Parcela")
    valor_parcela = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Valor da Parcela")
    juros = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Valor dos Juros")
    amortizacao = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Valor da Amortização")
    saldo_devedor = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name="Saldo Devedor")
    valor_pago = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Valor Pago")
    data_vencimento = models.DateField(verbose_name="Data de Vencimento")
    data_pagamento = models.DateField(null=True, blank=True, verbose_name="Data de Pagamento")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente', verbose_name="Status")

    # Relacionamentos
    financiamento = models.ForeignKey(Financiamento, on_delete=models.CASCADE, related_name='parcelas', verbose_name="Financiamento")

    class Meta:
        verbose_name = "Parcela de Financiamento"
        verbose_name_plural = "Parcelas de Financiamentos"
        ordering = ['numero_parcela']
        unique_together = ['financiamento', 'numero_parcela']

    def __str__(self):
        return f"Parcela {self.numero_parcela} - {self.financiamento.titulo}"

    @property
    def dias_atraso(self):
        """Calcula os dias de atraso"""
        if self.status == 'atrasado':
            return (timezone.now().date() - self.data_vencimento).days
        return 0


class EmprestimoManager(models.Manager):
    def create(self, **kwargs):
        obj = self.model(**kwargs)
        # force validation on create
        obj.full_clean()
        return super().create(**kwargs)


class Emprestimo(TenantModel):
    """
    Modelo para controlar empréstimos
    """
    STATUS_CHOICES = [
        ('ativo', 'Ativo'),
        ('quitado', 'Quitado'),
        ('cancelado', 'Cancelado'),
        ('em_analise', 'Em Análise'),
    ]

    TIPO_EMPRESTIMO_CHOICES = [
        ('pessoal', 'Pessoal'),
        ('empresarial', 'Empresarial'),
        ('rural', 'Rural'),
        ('consignado', 'Consignado'),
    ]

    FREQUENCIA_TAXA_CHOICES = [
        ('mensal', 'Mensal'),
        ('trimestral', 'Trimestral'),
        ('semestral', 'Semestral'),
        ('anual', 'Anual'),
    ]

    METODO_CALCULO_CHOICES = [
        ('price', 'PRICE (Sistema Francês)'),
        ('sac', 'SAC (Sistema de Amortização Constante)'),
        ('personalizado', 'Personalizado'),
    ]

    titulo = models.CharField(max_length=200, verbose_name="Título do Empréstimo")
    descricao = models.TextField(blank=True, verbose_name="Descrição")
    valor_emprestimo = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Valor do Empréstimo")
    valor_entrada = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name="Valor de Entrada")
    taxa_juros = models.DecimalField(max_digits=5, decimal_places=2, verbose_name="Taxa de Juros (%)")
    frequencia_taxa = models.CharField(max_length=20, choices=FREQUENCIA_TAXA_CHOICES, default='mensal', verbose_name="Frequência da Taxa")
    metodo_calculo = models.CharField(max_length=20, choices=METODO_CALCULO_CHOICES, default='price', verbose_name="Método de Cálculo")
    numero_parcelas = models.PositiveIntegerField(verbose_name="Número de Parcelas")
    prazo_meses = models.PositiveIntegerField(verbose_name="Prazo Total (meses)")
    data_contratacao = models.DateField(verbose_name="Data de Contratação")
    data_primeiro_vencimento = models.DateField(verbose_name="Primeiro Vencimento")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ativo', verbose_name="Status")
    tipo_emprestimo = models.CharField(max_length=20, choices=TIPO_EMPRESTIMO_CHOICES, default='rural', verbose_name="Tipo")

    # Grace period for emprestimo as well
    carencia_meses = models.PositiveIntegerField(default=0, verbose_name="Carência (meses)")
    juros_embutidos = models.BooleanField(default=False, verbose_name="Juros Embutidos na Carência")

    # Relacionamentos
    talhao = models.ForeignKey(Talhao, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Talhão")
    # Allow Emprestimo to be linked to either a Cliente OR an Instituição Financeira
    instituicao_financeira = models.ForeignKey('comercial.InstituicaoFinanceira', on_delete=models.CASCADE, null=True, blank=True, verbose_name="Instituição Financeira")
    cliente = models.ForeignKey('comercial.Cliente', on_delete=models.CASCADE, null=True, blank=True, verbose_name="Cliente")
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='emprestimos_criados', verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Empréstimo"
        verbose_name_plural = "Empréstimos"
        ordering = ['-data_contratacao']

    def __str__(self):
        return f"{self.titulo} - R$ {self.valor_emprestimo}"

    def clean(self):
        """Ensure that an Emprestimo is linked either to a cliente or an instituicao_financeira."""
        if not self.cliente and not self.instituicao_financeira:
            raise ValidationError({'instituicao_financeira': 'É necessário informar uma Instituição financeira ou um Cliente.'})
        return super().clean()

    def save(self, *args, **kwargs):
        # Extra enforcement to ensure create() doesn't bypass validation in some manager implementations
        if not self.cliente and not self.instituicao_financeira:
            raise ValidationError('É necessário informar uma Instituição financeira ou um Cliente para criar um Empréstimo.')
        self.full_clean()
        super().save(*args, **kwargs)

    # ensure manager enforces validation on create
    objects = EmprestimoManager()
    def get_taxa_mensal(self):
        """Converte a taxa para mensal baseada na frequência"""
        taxa_anual = self.taxa_juros / 100

        if self.frequencia_taxa == 'mensal':
            return taxa_anual / 12
        elif self.frequencia_taxa == 'trimestral':
            return taxa_anual / 4
        elif self.frequencia_taxa == 'semestral':
            return taxa_anual / 2
        elif self.frequencia_taxa == 'anual':
            return taxa_anual
        return taxa_anual / 12  # default mensal

    def _effective_principal_with_carencia(self):
        from decimal import Decimal
        principal = Decimal(str(self.valor_emprestimo))
        if self.juros_embutidos and self.carencia_meses > 0:
            taxa = Decimal(str(self.get_taxa_mensal()))
            principal = principal * ((Decimal('1') + taxa) ** self.carencia_meses)
        return principal

    def calcular_parcelas_price(self):
        """Calcula parcelas usando o sistema PRICE (Francês)"""
        if self.numero_parcelas <= 0 or self.valor_emprestimo <= 0:
            return []

        taxa_mensal = self.get_taxa_mensal()
        if taxa_mensal <= 0:
            return []

        principal = self._effective_principal_with_carencia()

        # Fórmula PRICE: PMT = P * (r(1+r)^n) / ((1+r)^n - 1)
        valor_parcela = principal * (taxa_mensal * (1 + taxa_mensal) ** self.numero_parcelas) / ((1 + taxa_mensal) ** self.numero_parcelas - 1)

        parcelas = []
        saldo_devedor = principal

        for numero in range(1, self.numero_parcelas + 1):
            juros = saldo_devedor * taxa_mensal
            amortizacao = valor_parcela - juros
            saldo_devedor -= amortizacao

            parcelas.append({
                'numero': numero,
                'valor_parcela': valor_parcela,
                'juros': juros,
                'amortizacao': amortizacao,
                'saldo_devedor': max(0, saldo_devedor)
            })

        return parcelas

    def calcular_parcelas_sac(self):
        """Calcula parcelas usando o sistema SAC"""
        if self.numero_parcelas <= 0 or self.valor_emprestimo <= 0:
            return []

        taxa_mensal = self.get_taxa_mensal()
        principal = self._effective_principal_with_carencia()
        amortizacao = principal / self.numero_parcelas

        parcelas = []
        saldo_devedor = principal

        for numero in range(1, self.numero_parcelas + 1):
            juros = saldo_devedor * taxa_mensal
            valor_parcela = amortizacao + juros
            saldo_devedor -= amortizacao

            parcelas.append({
                'numero': numero,
                'valor_parcela': valor_parcela,
                'juros': juros,
                'amortizacao': amortizacao,
                'saldo_devedor': max(0, saldo_devedor)
            })

        return parcelas

    def calcular_parcelas_personalizado(self):
        """Método para cálculo personalizado - pode ser implementado conforme necessidade"""
        # Por enquanto, retorna cálculo simples sem juros
        if self.numero_parcelas <= 0:
            return []

        valor_parcela = self.valor_emprestimo / self.numero_parcelas

        parcelas = []
        for numero in range(1, self.numero_parcelas + 1):
            parcelas.append({
                'numero': numero,
                'valor_parcela': valor_parcela,
                'juros': 0,
                'amortizacao': valor_parcela,
                'saldo_devedor': self.valor_emprestimo - (valor_parcela * numero)
            })

        return parcelas

    def gerar_parcelas(self):
        """Gera as parcelas baseado no método de cálculo selecionado"""
        if self.metodo_calculo == 'price':
            return self.calcular_parcelas_price()
        elif self.metodo_calculo == 'sac':
            return self.calcular_parcelas_sac()
        elif self.metodo_calculo == 'personalizado':
            return self.calcular_parcelas_personalizado()
        else:
            return self.calcular_parcelas_price()  # default

    @property
    def valor_pendente(self):
        """Calcula o valor ainda pendente"""
        total_pago = sum(parcela.valor_pago for parcela in self.parcelas.all())
        return self.valor_emprestimo - total_pago

    @property
    def parcelas_pendentes(self):
        """Retorna o número de parcelas pendentes"""
        return self.parcelas.filter(status='pendente').count()

    def clean(self):
        if self.valor_entrada > self.valor_emprestimo:
            raise ValidationError('O valor de entrada não pode ser maior que o valor do empréstimo.')
        if self.valor_entrada < 0:
            raise ValidationError('O valor de entrada não pode ser negativo.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ParcelaEmprestimo(models.Model):
    """
    Modelo para controlar parcelas de empréstimos
    """
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('pago', 'Pago'),
        ('atrasado', 'Atrasado'),
        ('cancelado', 'Cancelado'),
    ]

    numero_parcela = models.PositiveIntegerField(verbose_name="Número da Parcela")
    valor_parcela = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Valor da Parcela")
    juros = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Valor dos Juros")
    amortizacao = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Valor da Amortização")
    saldo_devedor = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name="Saldo Devedor")
    valor_pago = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Valor Pago")
    data_vencimento = models.DateField(verbose_name="Data de Vencimento")
    data_pagamento = models.DateField(null=True, blank=True, verbose_name="Data de Pagamento")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente', verbose_name="Status")

    # Relacionamentos
    emprestimo = models.ForeignKey(Emprestimo, on_delete=models.CASCADE, related_name='parcelas', verbose_name="Empréstimo")

    class Meta:
        verbose_name = "Parcela de Empréstimo"
        verbose_name_plural = "Parcelas de Empréstimos"
        ordering = ['numero_parcela']
        unique_together = ['emprestimo', 'numero_parcela']

    def __str__(self):
        return f"Parcela {self.numero_parcela} - {self.emprestimo.titulo}"

    @property
    def dias_atraso(self):
        """Calcula os dias de atraso"""
        if self.status == 'atrasado':
            return (timezone.now().date() - self.data_vencimento).days
        return 0


class ItemEmprestimo(TenantModel):
    """
    Modelo para vincular produtos do estoque a empréstimos.
    Permite que um empréstimo seja feito com base em produtos específicos,
    calculando automaticamente o valor do empréstimo.
    """
    emprestimo = models.ForeignKey(
        Emprestimo,
        on_delete=models.CASCADE,
        related_name='itens_produtos',
        verbose_name="Empréstimo"
    )
    produto = models.ForeignKey(
        'estoque.Produto',
        on_delete=models.PROTECT,
        related_name='emprestimos_itens',
        verbose_name="Produto"
    )
    quantidade = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=1,
        verbose_name="Quantidade"
    )
    unidade = models.CharField(
        max_length=20,
        verbose_name="Unidade"
    )
    valor_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Valor Unitário"
    )
    valor_total = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name="Valor Total"
    )
    observacoes = models.TextField(
        blank=True,
        verbose_name="Observações"
    )
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Item de Empréstimo"
        verbose_name_plural = "Itens de Empréstimos"
        ordering = ['id']
        unique_together = ['emprestimo', 'produto']

    def __str__(self):
        return f"{self.produto.nome} - {self.quantidade} {self.unidade} (R$ {self.valor_total})"

    def save(self, *args, **kwargs):
        # Carregar automaticamente a unidade se não estiver preenchida
        if not self.unidade and self.produto:
            self.unidade = self.produto.unidade
        
        # Calcular valor_total automaticamente
        self.valor_total = (self.quantidade or 0) * (self.valor_unitario or 0)
        
        super().save(*args, **kwargs)

    def clean(self):
        """Validações adicionais"""
        from django.core.exceptions import ValidationError
        
        if self.produto and self.quantidade > self.produto.quantidade_estoque:
            raise ValidationError({
                'quantidade': f'Quantidade insuficiente. Disponível: {self.produto.quantidade_estoque}'
            })
        if self.quantidade <= 0:
            raise ValidationError({'quantidade': 'Quantidade deve ser maior que zero'})


class ItemExtratoBancario(TenantModel):
    """
    FASE 5: Item de extrato bancário importado para conciliação.
    Representa uma linha do extrato bancário (CSV/OFX) que pode ser
    conciliada com vencimentos ou transferências existentes.
    """
    
    TIPO_CHOICES = [
        ('DEBITO', 'Débito'),
        ('CREDITO', 'Crédito'),
    ]
    
    conta_bancaria = models.ForeignKey(
        ContaBancaria,
        on_delete=models.CASCADE,
        related_name='itens_extrato',
        verbose_name='Conta Bancária'
    )
    data = models.DateField(
        verbose_name='Data da Movimentação',
        help_text='Data da transação no extrato bancário'
    )
    descricao = models.TextField(
        verbose_name='Descrição',
        help_text='Descrição da transação conforme extrato'
    )
    valor = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='Valor'
    )
    tipo = models.CharField(
        max_length=10,
        choices=TIPO_CHOICES,
        verbose_name='Tipo',
        help_text='Débito (saída) ou Crédito (entrada)'
    )
    
    # Conciliação
    conciliado = models.BooleanField(
        default=False,
        verbose_name='Conciliado',
        help_text='Indica se este item já foi conciliado'
    )
    conciliado_em = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Conciliado em'
    )
    conciliado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conciliacoes_realizadas',
        verbose_name='Conciliado por'
    )
    
    # Relacionamentos com entidades conciliadas
    vencimento = models.ForeignKey(
        Vencimento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='itens_extrato',
        verbose_name='Vencimento Relacionado',
        help_text='Vencimento conciliado com este item de extrato'
    )
    transferencia = models.ForeignKey(
        'Transferencia',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='itens_extrato',
        verbose_name='Transferência Relacionada',
        help_text='Transferência conciliada com este item de extrato'
    )
    
    # Metadados
    arquivo_origem = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name='Arquivo de Origem',
        help_text='Nome do arquivo CSV/OFX de origem'
    )
    linha_original = models.TextField(
        null=True,
        blank=True,
        verbose_name='Linha Original',
        help_text='Linha original do arquivo para auditoria'
    )
    importado_em = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Importado em'
    )
    importado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='extratos_importados',
        verbose_name='Importado por'
    )
    
    class Meta:
        verbose_name = 'Item de Extrato Bancário'
        verbose_name_plural = 'Itens de Extrato Bancário'
        ordering = ['-data', '-id']
        indexes = [
            models.Index(fields=['conta_bancaria', 'data']),
            models.Index(fields=['conciliado', 'data']),
        ]
    
    def __str__(self):
        tipo_display = 'D' if self.tipo == 'DEBITO' else 'C'
        return f"{self.data} - {tipo_display} R$ {self.valor} - {self.descricao[:50]}"
    
    def conciliar_com_vencimento(self, vencimento, usuario=None):
        """Concilia este item com um vencimento."""
        self.vencimento = vencimento
        self.conciliado = True
        self.conciliado_em = timezone.now()
        self.conciliado_por = usuario
        self.save()
        
        # Atualizar vencimento
        vencimento.confirmado_extrato = True
        vencimento.status = 'pago'
        vencimento.data_pagamento = self.data
        vencimento.save()
    
    def conciliar_com_transferencia(self, transferencia, usuario=None):
        """Concilia este item com uma transferência."""
        self.transferencia = transferencia
        self.conciliado = True
        self.conciliado_em = timezone.now()
        self.conciliado_por = usuario
        self.save()
    
    def desconciliar(self):
        """Remove a conciliação deste item."""
        if self.vencimento:
            vencimento = self.vencimento
            vencimento.confirmado_extrato = False
            vencimento.status = 'pendente'
            vencimento.data_pagamento = None
            vencimento.save()
        
        self.vencimento = None
        self.transferencia = None
        self.conciliado = False
        self.conciliado_em = None
        self.conciliado_por = None
        self.save()