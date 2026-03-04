from django.db import models
from apps.core.models import TenantModel
from django.contrib.gis.db import models as gis_models
from django.db.models import F
from django.utils import timezone
import logging
from apps.core.models import CustomUser
from apps.comercial.models import Fornecedor
# from apps.fiscal.models import NFe, ItemNFe


class LocalArmazenamento(TenantModel):
    """
    Modelo para locais físicos de armazenamento.
    Suporta locais internos (vinculados a uma fazenda) e externos (vinculados a um fornecedor).
    """
    TIPO_CHOICES = [
        ('silo', 'Silo'),
        ('armazem', 'Armazém'),
        ('galpao', 'Galpão'),
        ('depósito', 'Depósito'),
        ('almoxerifado', 'Almoxarifado'),
        ('barracao', 'Barracão'),
        ('patio', 'Pátio'),
        ('posto', 'Posto de Combustível'),
        ('outro', 'Outro'),
    ]

    TIPO_LOCAL_CHOICES = [
        ('interno', 'Interno'),
        ('externo', 'Externo'),
    ]

    nome = models.CharField(max_length=100, unique=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='armazem')
    tipo_local = models.CharField(
        'Interno / Externo',
        max_length=10,
        choices=TIPO_LOCAL_CHOICES,
        default='interno',
    )
    capacidade_maxima = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Capacidade Máxima")
    unidade_capacidade = models.CharField(max_length=20, default='kg', verbose_name="Unidade de Capacidade")
    fazenda = models.ForeignKey(
        'fazendas.Fazenda', on_delete=models.CASCADE,
        related_name='locais_armazenamento',
        null=True, blank=True,
        help_text='Obrigatório para locais internos',
    )
    fornecedor = models.ForeignKey(
        'comercial.Fornecedor', on_delete=models.SET_NULL,
        related_name='locais_armazenamento',
        null=True, blank=True,
        help_text='Obrigatório para locais externos',
    )
    ativo = models.BooleanField(default=True)

    # Metadata
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = "Local de Armazenamento"
        verbose_name_plural = "Locais de Armazenamento"
        ordering = ['nome']

    def __str__(self):
        if self.tipo_local == 'externo' and self.fornecedor:
            return f"{self.nome} ({self.tipo}) - {self.fornecedor.nome}"
        if self.fazenda:
            return f"{self.nome} ({self.tipo}) - {self.fazenda.name}"
        return f"{self.nome} ({self.tipo})"

    def clean(self):
        from django.core.exceptions import ValidationError
        errors = {}
        if self.tipo_local == 'interno' and not self.fazenda_id:
            errors['fazenda'] = 'Fazenda é obrigatória para locais internos.'
        if self.tipo_local == 'externo' and not self.fornecedor_id:
            errors['fornecedor'] = 'Fornecedor é obrigatório para locais externos.'
        if errors:
            raise ValidationError(errors)

    @property
    def capacidade_atual(self):
        """Calcula a capacidade atual baseada nas movimentações"""
        entradas = self.movimentacoes_entrada.filter(tipo='entrada').aggregate(total=models.Sum('quantidade'))['total'] or 0
        saidas = self.movimentacoes_saida.filter(tipo='saida').aggregate(total=models.Sum('quantidade'))['total'] or 0
        return entradas - saidas

    @property
    def capacidade_disponivel(self):
        """Retorna a capacidade disponível"""
        if self.capacidade_maxima:
            return self.capacidade_maxima - self.capacidade_atual
        return None


class Produto(TenantModel):
    """
    Modelo de Produto com suporte a busca inteligente para agricultura.
    """
    
    # Categorias específicas para agricultura
    CATEGORIA_CHOICES = [
        ('semente', 'Semente'),
        ('fertilizante', 'Fertilizante'),
        ('corretivo', 'Corretivo'),
        ('herbicida', 'Herbicida'),
        ('fungicida', 'Fungicida'),
        ('inseticida', 'Inseticida'),
        ('acaricida', 'Acaricida'),
        ('adjuvante', 'Adjuvante'),
        ('combustiveis_lubrificantes', 'Combustíveis e Lubrificantes'),
        ('pecas_manutencao', 'Peças de manutenção'),
        ('construcao', 'Construção'),
        ('correcao_solo', 'Correção de solo'),
        ('outro', 'Outro'),
    ]
    
    # Campos básicos
    codigo = models.CharField('Código', max_length=50, unique=True)
    nome = models.CharField('Nome', max_length=200)
    descricao = models.CharField('Descrição', max_length=200, null=True, blank=True)
    
    # Campos para busca inteligente (agricultura)
    principio_ativo = models.CharField(
        'Princípio Ativo',
        max_length=200,
        null=True, blank=True,
        help_text='Ingrediente ativo do produto (ex: Glifosato, Atrazina)'
    )
    composicao_quimica = models.TextField(
        'Composição Química',
        null=True, blank=True,
        help_text='Fórmula ou composição detalhada do produto'
    )
    
    # Estoque
    quantidade_estoque = models.DecimalField('Quantidade em Estoque', 
                                            max_digits=12, decimal_places=2, 
                                            default=0)
    quantidade_reservada = models.DecimalField('Quantidade Reservada', max_digits=12, decimal_places=2, default=0)
    unidade = models.CharField('Unidade', max_length=20)
    vencimento = models.DateField('Data de Vencimento', null=True, blank=True)
    estoque_minimo = models.DecimalField('Estoque Mínimo', 
                                        max_digits=12, decimal_places=2, 
                                        default=0)
    
    # Custos
    custo_unitario = models.DecimalField('Custo Unitário', 
                                        max_digits=10, decimal_places=2, 
                                        null=True, blank=True)
    preco_venda = models.DecimalField('Preço de Venda', 
                                     max_digits=10, decimal_places=2, 
                                     null=True, blank=True)
    
    # Categoria (agora com choices)
    categoria = models.CharField(
        'Categoria',
        max_length=30,
        choices=CATEGORIA_CHOICES,
        null=True, blank=True
    )
    
    # Fornecedor
    fornecedor = models.ForeignKey(
        Fornecedor,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='produtos',
        verbose_name='Fornecedor'
    )
    
    # Local de Armazenamento
    local_armazenamento = models.ForeignKey(
        LocalArmazenamento,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='produtos',
        verbose_name='Local de Armazenamento'
    )
    
    # Dosagem padrão (para operações)
    dosagem_padrao = models.DecimalField('Dosagem Padrão', 
                                        max_digits=10, decimal_places=2, 
                                        null=True, blank=True)
    unidade_dosagem = models.CharField('Unidade de Dosagem', 
                                      max_length=20, 
                                      null=True, blank=True,
                                      help_text='Ex: L/ha, kg/ha, g/ha')
    
    # Status
    ativo = models.BooleanField('Ativo', default=True)

    # Metadata
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, 
                                   null=True, blank=True)
    
    class Meta:
        verbose_name = 'Produto'
        verbose_name_plural = 'Produtos'
        ordering = ['nome']
        indexes = [
            models.Index(fields=['codigo']),
            models.Index(fields=['categoria']),
            models.Index(fields=['principio_ativo']),
        ]

    def __str__(self):
        return f"{self.codigo} - {self.nome}"

    @property
    def alerta_baixo(self):
        return self.quantidade_estoque < self.estoque_minimo

    @property
    def saldo_atual(self):
        entradas = self.movimentacoes.filter(tipo='entrada').aggregate(total=models.Sum('quantidade'))['total'] or 0
        saidas = self.movimentacoes.filter(tipo='saida').aggregate(total=models.Sum('quantidade'))['total'] or 0
        return entradas - saidas


class Lote(TenantModel):
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name='lotes')
    numero_lote = models.CharField(max_length=50)
    data_fabricacao = models.DateField(null=True, blank=True)
    data_validade = models.DateField(null=True, blank=True)
    quantidade_inicial = models.DecimalField(max_digits=12, decimal_places=2)
    quantidade_atual = models.DecimalField(max_digits=12, decimal_places=2)
    local_armazenamento = models.CharField(max_length=100, null=True, blank=True)
    observacoes = models.TextField(null=True, blank=True)

    # Metadata
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Lote"
        verbose_name_plural = "Lotes"
        unique_together = ('produto', 'numero_lote')

    def __str__(self):
        return f"Lote {self.numero_lote} - {self.produto.nome}"


class MovimentacaoEstoque(TenantModel):
    TIPO_CHOICES = [
        ('entrada', 'Entrada'),
        ('saida', 'Saída'),
        ('reserva', 'Reserva'),
        ('liberacao', 'Liberação'),
        ('reversao', 'Reversão'),
    ]
    ORIGEM_CHOICES = [
        ('manual', 'Manual'),
        ('nfe', 'NFe'),
        ('ordem_servico', 'Ordem de Serviço'),
        ('colheita', 'Colheita Agrícola'),
        ('abastecimento', 'Abastecimento'),
        ('manutencao', 'Manutenção'),
        ('agricultura', 'Operação Agrícola'),
        ('venda', 'Venda'),
        ('ajuste', 'Ajuste'),
    ]

    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name='movimentacoes')
    lote = models.ForeignKey(Lote, on_delete=models.SET_NULL, null=True, blank=True, related_name='movimentacoes')
    operacao = models.ForeignKey('agricultura.Operacao', on_delete=models.SET_NULL, null=True, blank=True, related_name='movimentacoes')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    origem = models.CharField(max_length=20, choices=ORIGEM_CHOICES, default='manual')
    quantidade = models.DecimalField(max_digits=12, decimal_places=2)
    valor_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    data_movimentacao = models.DateTimeField(auto_now_add=True)
    documento_referencia = models.CharField(max_length=100, null=True, blank=True)
    motivo = models.TextField(blank=True)
    observacoes = models.TextField(null=True, blank=True)

    # Relacionamentos
    # nfe = models.ForeignKey(NFe, on_delete=models.SET_NULL, null=True, blank=True)
    # item_nfe = models.ForeignKey(ItemNFe, on_delete=models.SET_NULL, null=True, blank=True)
    fazenda = models.ForeignKey('fazendas.Fazenda', on_delete=models.SET_NULL, null=True, blank=True)
    talhao = models.ForeignKey('fazendas.Talhao', on_delete=models.SET_NULL, null=True, blank=True)
    local_armazenamento = models.ForeignKey(LocalArmazenamento, on_delete=models.SET_NULL, null=True, blank=True, related_name='movimentacoes', verbose_name="Local de Armazenamento")

    # Metadata
    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)

    # Integração e alocação de custos
    plantio = models.ForeignKey('agricultura.Plantio', on_delete=models.SET_NULL, null=True, blank=True, related_name='movimentacoes')
    ordem_servico = models.ForeignKey('maquinas.OrdemServico', on_delete=models.SET_NULL, null=True, blank=True, related_name='movimentacoes')
    custo_alocado = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rateio = models.ForeignKey('financeiro.RateioCusto', on_delete=models.SET_NULL, null=True, blank=True)
    pendente_rateio = models.BooleanField(default=False)
    custo_fonte = models.CharField(max_length=20, choices=[('safra','Safra'),('manutencao','Manutenção'),('administrativo','Administrativo'),('manual','Manual')], null=True, blank=True)

    # Snapshots de saldo (serão preenchidos pelo helper transacional)
    saldo_anterior = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    saldo_posterior = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    class Meta:
        verbose_name = "Movimentação de Estoque"
        verbose_name_plural = "Movimentações de Estoque"
        ordering = ['-data_movimentacao']
        indexes = [models.Index(fields=['produto', 'data_movimentacao']), models.Index(fields=['pendente_rateio'])]

    def __str__(self):
        return f"{self.tipo} - {self.produto.nome} ({self.quantidade} {self.produto.unidade})"

    def save(self, *args, **kwargs):
        if self.valor_unitario and self.quantidade:
            self.valor_total = self.valor_unitario * self.quantidade
        super().save(*args, **kwargs)

        # Atualizar quantidade do lote se aplicável
        if self.lote:
            if self.tipo == 'entrada':
                self.lote.quantidade_atual += self.quantidade
            elif self.tipo == 'saida':
                self.lote.quantidade_atual -= self.quantidade
            self.lote.save()

        # Atualizar saldo do produto
        if self.tipo == 'entrada':
            self.produto.quantidade_estoque += self.quantidade
        elif self.tipo == 'saida':
            self.produto.quantidade_estoque -= self.quantidade
        elif self.tipo == 'reserva':
            # reserva: incrementa a quantidade_reservada, não altera quantidade_estoque
            self.produto.quantidade_reservada += self.quantidade
        elif self.tipo == 'liberacao':
            # liberacao: reduz a quantidade_reservada (libera para disponibilidade)
            self.produto.quantidade_reservada -= self.quantidade
            if self.produto.quantidade_reservada < 0:
                self.produto.quantidade_reservada = 0
        elif self.tipo == 'reversao':
            # reversao: comportamento especializado (não altera estoque por padrão)
            pass
        self.produto.save()

        # Sincronizar com o modelo de localizações (ProdutoArmazenado / Localizacao) para garantir consistência entre modelos
        try:
            # Só tentamos sincronizar se a movimentação estiver ligada a um LocalArmazenamento antigo
            # e houver uma Localizacao nova com o mesmo nome (consistência entre modelos antigos e FASE1)
            if self.local_armazenamento:
                # procurar Localizacao com mesmo nome da LocalArmazenamento
                from .models import ProdutoArmazenado, Localizacao as LocalizacaoModel

                local = LocalizacaoModel.objects.filter(nome=self.local_armazenamento.nome).first()
                if local:
                    lote_str = self.lote.numero_lote if self.lote else (self.documento_referencia or '')

                    # ENTRADA: incrementa quantidade disponível e capacidade ocupada
                    if self.tipo == 'entrada':
                        pa, _ = ProdutoArmazenado.objects.get_or_create(
                            produto=self.produto, localizacao=local, lote=lote_str,
                            defaults={'quantidade': 0, 'data_entrada': timezone.now().date(), 'status': 'disponivel'}
                        )
                        pa.quantidade += self.quantidade
                        if pa.status != 'disponivel':
                            pa.status = 'disponivel'
                        pa.save()

                        LocalizacaoModel.objects.filter(pk=local.pk).update(capacidade_ocupada=F('capacidade_ocupada') + self.quantidade)

                    # SAÍDA: consome de registros disponíveis (por lote preferencialmente) e reduz capacidade
                    elif self.tipo == 'saida':
                        remaining = self.quantidade
                        qs = ProdutoArmazenado.objects.filter(produto=self.produto, localizacao=local, lote=lote_str, status='disponivel').order_by('-quantidade')
                        for pa in qs:
                            if remaining <= 0:
                                break
                            dec = min(pa.quantidade, remaining)
                            pa.quantidade -= dec
                            remaining -= dec
                            if pa.quantidade == 0:
                                pa.delete()
                            else:
                                pa.save()

                        if remaining > 0:
                            # tentar consumir de outros lotes disponíveis
                            qs2 = ProdutoArmazenado.objects.filter(produto=self.produto, localizacao=local, status='disponivel').exclude(pk__in=qs.values_list('pk', flat=True)).order_by('-quantidade')
                            for pa in qs2:
                                if remaining <= 0:
                                    break
                                dec = min(pa.quantidade, remaining)
                                pa.quantidade -= dec
                                remaining -= dec
                                if pa.quantidade == 0:
                                    pa.delete()
                                else:
                                    pa.save()

                        consumed = self.quantidade - remaining
                        LocalizacaoModel.objects.filter(pk=local.pk).update(capacidade_ocupada=F('capacidade_ocupada') - consumed)

                    # RESERVA: move quantidade de 'disponivel' para 'reservado' (por local/lote)
                    elif self.tipo == 'reserva':
                        need = self.quantidade
                        avail_qs = ProdutoArmazenado.objects.filter(produto=self.produto, localizacao=local, status='disponivel').order_by('-quantidade')
                        logger = logging.getLogger(__name__)
                        for pa in avail_qs:
                            if need <= 0:
                                break
                            dec = min(pa.quantidade, need)
                            logger.debug("Reserva: consumindo %s do ProdutoArmazenado id=%s (antes=%s)", dec, pa.pk, pa.quantidade)
                            pa.quantidade -= dec
                            if pa.quantidade == 0:
                                pa.delete()
                            else:
                                pa.save()

                            # Ensure we create / update a record specifically with status='reservado'
                            try:
                                pa_res, _ = ProdutoArmazenado.objects.get_or_create(
                                    produto=self.produto, localizacao=local, lote=lote_str, status='reservado',
                                    defaults={'quantidade': 0, 'data_entrada': timezone.now().date()}
                                )
                            except Exception:
                                # Unique constraint prevents creating a second record with same lote; fall back to creating a "reserved" lote variant
                                from django.db import IntegrityError
                                import uuid
                                try:
                                    reserved_lote = f"{lote_str}-res-{uuid.uuid4().hex[:8]}"
                                    pa_res = ProdutoArmazenado.objects.create(
                                        produto=self.produto, localizacao=local, lote=reserved_lote,
                                        quantidade=0, data_entrada=timezone.now().date(), status='reservado'
                                    )
                                except Exception:
                                    logging.getLogger(__name__).exception('Erro ao criar registro reservado alternativo')
                                    raise

                            pa_res.quantidade += dec
                            pa_res.save()

                            need -= dec

                        if need > 0:
                            logger.warning(
                                "Reserva parcial: não havia suficiente em localizacao %s; reservado parcialmente", local.pk
                            )

                    # LIBERAÇÃO: move de 'reservado' para 'disponivel'
                    elif self.tipo == 'liberacao':
                        need = self.quantidade
                        res_qs = ProdutoArmazenado.objects.filter(produto=self.produto, localizacao=local, status='reservado').order_by('-quantidade')
                        for pa in res_qs:
                            if need <= 0:
                                break
                            dec = min(pa.quantidade, need)
                            pa.quantidade -= dec
                            if pa.quantidade == 0:
                                pa.delete()
                            else:
                                pa.save()

                            pa_disp, _ = ProdutoArmazenado.objects.get_or_create(
                                produto=self.produto, localizacao=local, lote=pa.lote,
                                defaults={'quantidade': 0, 'data_entrada': timezone.now().date(), 'status': 'disponivel'}
                            )
                            pa_disp.quantidade += dec
                            pa_disp.status = 'disponivel'
                            pa_disp.save()

                            need -= dec
        except Exception:
            logging.getLogger(__name__).exception("Erro ao sincronizar ProdutoArmazenado/Localizacao para movimentacao %s", getattr(self, 'pk', None))

        # Registrar MovimentacaoStatement e ProdutoAuditoria para auditoria
        try:
            saldo_resultante = self.produto.quantidade_estoque
            # Build metadata dict with origem info for the statement
            stmt_metadata = {}
            if self.origem:
                stmt_metadata['origem'] = self.origem
                origem_map = dict(self.ORIGEM_CHOICES)
                stmt_metadata['origem_display'] = origem_map.get(self.origem, self.origem)
            MovimentacaoStatement.objects.create(
                movimentacao=self,
                produto=self.produto,
                tipo=self.tipo,
                quantidade=self.quantidade,
                unidade=self.produto.unidade,
                valor_unitario=self.valor_unitario,
                valor_total=self.valor_total,
                data_movimentacao=self.data_movimentacao,
                documento_referencia=self.documento_referencia,
                motivo=self.motivo,
                observacoes=self.observacoes,
                lote=self.lote,
                fazenda=self.fazenda,
                talhao=self.talhao,
                local_armazenamento=self.local_armazenamento,
                saldo_resultante=saldo_resultante,
                criado_por=self.criado_por,
                metadata=stmt_metadata or None,
            )
        except Exception:
            logging.getLogger(__name__).exception("Erro ao criar MovimentacaoStatement")

        # Registrar auditoria de produto (entrada/saída)
        try:
            # Ao criar auditoria, truncar strings para o tamanho máximo do campo — previne DataError
            prod_cat = (self.produto.categoria[:30] if self.produto.categoria else None)
            prod_unidade = (self.produto.unidade[:20] if self.produto.unidade else None)
            ProdutoAuditoria.objects.create(
                produto=self.produto,
                acao='movimentacao',
                origem=self.origem or 'manual',
                produto_codigo=(self.produto.codigo[:50] if self.produto.codigo else None),
                produto_nome=(self.produto.nome[:200] if self.produto.nome else None),
                produto_categoria=prod_cat,
                produto_unidade=prod_unidade,
                quantidade=self.quantidade,
                valor_unitario=self.valor_unitario,
                documento_referencia=(self.documento_referencia[:100] if self.documento_referencia else None),
                observacoes=self.observacoes,
                criado_por=self.criado_por
            )
        except Exception:
            logging.getLogger(__name__).exception("Erro ao criar ProdutoAuditoria para movimentacao")


class MovimentacaoStatement(models.Model):
    """
    Registro de declaração/declaração (statement) para cada movimentação de estoque.
    Fornece uma linha auditável e facilmente pesquisável para validação de fluxo de estoque.
    """
    movimentacao = models.ForeignKey(MovimentacaoEstoque, on_delete=models.SET_NULL, null=True, blank=True, related_name='statements')
    # Usar SET_NULL para permitir criar statements mesmo quando o produto está sendo removido
    produto = models.ForeignKey(Produto, on_delete=models.SET_NULL, null=True, blank=True, related_name='statements')
    tipo = models.CharField(max_length=10, choices=MovimentacaoEstoque.TIPO_CHOICES)
    quantidade = models.DecimalField(max_digits=12, decimal_places=2)
    unidade = models.CharField(max_length=20, null=True, blank=True)
    valor_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    data_movimentacao = models.DateTimeField()
    documento_referencia = models.CharField(max_length=100, null=True, blank=True)
    motivo = models.TextField(blank=True)
    observacoes = models.TextField(null=True, blank=True)

    lote = models.ForeignKey(Lote, on_delete=models.SET_NULL, null=True, blank=True, related_name='statements')
    fazenda = models.ForeignKey('fazendas.Fazenda', on_delete=models.SET_NULL, null=True, blank=True)
    talhao = models.ForeignKey('fazendas.Talhao', on_delete=models.SET_NULL, null=True, blank=True)
    local_armazenamento = models.ForeignKey(LocalArmazenamento, on_delete=models.SET_NULL, null=True, blank=True)

    saldo_resultante = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text='Saldo do produto após a movimentação')

    # Snapshot fields para garantir auditoria quando o produto for removido
    produto_codigo = models.CharField(max_length=50, null=True, blank=True)
    produto_nome = models.CharField(max_length=200, null=True, blank=True)

    # Integração de custo / rateio
    plantio = models.ForeignKey('agricultura.Plantio', on_delete=models.SET_NULL, null=True, blank=True, related_name='statements')
    ordem_servico = models.ForeignKey('maquinas.OrdemServico', on_delete=models.SET_NULL, null=True, blank=True, related_name='statements')
    custo_alocado = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rateio = models.ForeignKey('financeiro.RateioCusto', on_delete=models.SET_NULL, null=True, blank=True)
    pendente_rateio = models.BooleanField(default=False)
    custo_fonte = models.CharField(max_length=20, choices=[('safra','Safra'),('manutencao','Manutenção'),('administrativo','Administrativo'),('manual','Manual')], null=True, blank=True)

    # Saldo snapshots (duplicados em statement para auditoria)
    saldo_anterior = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    saldo_posterior = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Dados adicionais de validação / alertas
    metadata = models.JSONField(null=True, blank=True, help_text='Dados auxiliares, como validações e alertas gerados')

    criado_em = models.DateTimeField(auto_now_add=True)
    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = 'Declaração de Movimentação'
        verbose_name_plural = 'Declarações de Movimentações'
        ordering = ['-criado_em']
        indexes = [models.Index(fields=['produto', '-criado_em']), models.Index(fields=['tipo']), models.Index(fields=['documento_referencia'])]

    def __str__(self):
        return f"{self.tipo} - {self.produto.nome} ({self.quantidade} {self.unidade})"


class ProdutoAuditoria(TenantModel):
    """
    Modelo para auditoria de operações com produtos, especialmente via NFE.
    """

    ACOES_CHOICES = [
        ('criado', 'Criado'),
        ('atualizado', 'Atualizado'),
        ('validado', 'Validado'),
        ('excluido', 'Excluído'),
        ('movimentacao', 'Movimentação'),
    ]

    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name='auditorias')
    acao = models.CharField(max_length=20, choices=ACOES_CHOICES)
    origem = models.CharField(max_length=20, default='manual')  # 'manual', 'nfe', 'api'

    # Dados da NFE (se aplicável)
    nfe_numero = models.CharField(max_length=9, null=True, blank=True)
    nfe_serie = models.CharField(max_length=3, null=True, blank=True)
    nfe_chave_acesso = models.CharField(max_length=44, null=True, blank=True)
    fornecedor_nome = models.CharField(max_length=60, null=True, blank=True)
    fornecedor_cnpj = models.CharField(max_length=14, null=True, blank=True)

    # Dados do produto no momento da operação
    produto_codigo = models.CharField(max_length=50)
    produto_nome = models.CharField(max_length=200)
    # Alinhar tamanho com apps.estoque.Produto.categoria (max_length=30) para evitar DataError
    produto_categoria = models.CharField(max_length=30, null=True, blank=True)
    produto_unidade = models.CharField(max_length=20)

    # Detalhes da operação
    quantidade = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    valor_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    documento_referencia = models.CharField(max_length=100, null=True, blank=True)

    # Validações realizadas
    validacoes_realizadas = models.JSONField(null=True, blank=True, help_text='Lista de validações executadas')
    alertas = models.JSONField(null=True, blank=True, help_text='Alertas gerados durante a operação')

    # Metadata
    observacoes = models.TextField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = "Auditoria de Produto"
        verbose_name_plural = "Auditorias de Produtos"
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['produto', '-criado_em']),
            models.Index(fields=['acao']),
            models.Index(fields=['origem']),
            models.Index(fields=['nfe_chave_acesso']),
        ]

    def __str__(self):
        return f"{self.acao} - {self.produto_codigo} ({self.criado_em.strftime('%d/%m/%Y %H:%M')})"


# ============================================
# FASE 1 - COMERCIAL REVAMP: Novos Modelos
# ============================================

class Localizacao(TenantModel):
    """
    Modelo para localizações físicas de armazenamento.
    FASE 1 - Estoque: Rastreamento por localização interna/externa.
    """
    TIPO_CHOICES = [
        ('interna', 'Interna (Própria)'),
        ('externa', 'Externa (Terceiros)'),
    ]

    nome = models.CharField('Nome', max_length=200)
    tipo = models.CharField('Tipo', max_length=20, choices=TIPO_CHOICES)
    endereco = models.TextField('Endereço', blank=True, null=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    capacidade_total = models.DecimalField(
        'Capacidade Total (kg)',
        max_digits=15,
        decimal_places=2,
        default=0
    )
    capacidade_ocupada = models.DecimalField(
        'Capacidade Ocupada (kg)',
        max_digits=15,
        decimal_places=2,
        default=0
    )
    ativa = models.BooleanField('Ativa', default=True)
    observacoes = models.TextField(blank=True, null=True)
    
    # Metadata
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Localização'
        verbose_name_plural = 'Localizações'
        ordering = ['nome']
        indexes = [
            models.Index(fields=['tipo', 'ativa'], name='estoque_loc_tipo_ativa_idx'),
        ]

    def __str__(self):
        return f"{self.nome} ({self.get_tipo_display()})"

    @property
    def capacidade_disponivel(self):
        """Retorna a capacidade disponível em kg"""
        return self.capacidade_total - self.capacidade_ocupada

    @property
    def percentual_ocupacao(self):
        """Retorna o percentual de ocupação"""
        if self.capacidade_total > 0:
            return (self.capacidade_ocupada / self.capacidade_total) * 100
        return 0

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.capacidade_ocupada > self.capacidade_total:
            raise ValidationError('Capacidade ocupada não pode ser maior que a capacidade total.')
        if self.capacidade_ocupada < 0:
            raise ValidationError('Capacidade ocupada não pode ser negativa.')


class ProdutoArmazenado(TenantModel):
    """
    Rastreamento de produtos por localização e lote.
    FASE 1 - Estoque: Permite saber exatamente onde cada produto está.
    """
    STATUS_CHOICES = [
        ('disponivel', 'Disponível'),
        ('reservado', 'Reservado'),
        ('bloqueado', 'Bloqueado'),
    ]

    produto = models.ForeignKey(
        Produto,
        on_delete=models.PROTECT,
        related_name='produtos_armazenados',
        verbose_name='Produto'
    )
    localizacao = models.ForeignKey(
        Localizacao,
        on_delete=models.PROTECT,
        related_name='produtos_armazenados',
        verbose_name='Localização'
    )
    lote = models.CharField('Lote', max_length=100)
    quantidade = models.DecimalField(
        'Quantidade',
        max_digits=15,
        decimal_places=2,
        default=0
    )
    data_entrada = models.DateField('Data de Entrada')
    status = models.CharField(
        'Status',
        max_length=20,
        choices=STATUS_CHOICES,
        default='disponivel'
    )
    observacoes = models.TextField(blank=True, null=True)
    
    # Metadata
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Produto Armazenado'
        verbose_name_plural = 'Produtos Armazenados'
        ordering = ['-data_entrada']
        indexes = [
            models.Index(fields=['localizacao', 'produto'], name='estoque_pa_loc_prod_idx'),
            models.Index(fields=['status'], name='estoque_pa_status_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['produto', 'localizacao', 'lote'],
                name='unique_produto_localizacao_lote'
            ),
        ]

    def __str__(self):
        return f"{self.produto.nome} - Lote {self.lote} ({self.localizacao.nome})"

    @property
    def quantidade_disponivel(self):
        """Retorna a quantidade disponível (não reservada/bloqueada)"""
        if self.status == 'disponivel':
            return self.quantidade
        return 0

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.quantidade < 0:
            raise ValidationError('Quantidade não pode ser negativa.')
        
        # Validar capacidade da localização
        if self.localizacao:
            peso_produto = self.quantidade  # Assumindo que quantidade está em kg
            if self.localizacao.capacidade_disponivel < peso_produto:
                raise ValidationError(
                    f'Capacidade insuficiente na localização {self.localizacao.nome}. '
                    f'Disponível: {self.localizacao.capacidade_disponivel} kg'
                )
