from django.db import models
from apps.core.models import TenantModel
from django.conf import settings

class CentroCusto(TenantModel):
    CATEGORIAS = [
        ('benfeitoria', 'Benfeitoria'),
        ('administrativo', 'Administrativo'),
        ('alimentacao', 'Alimentação'),
        ('transporte', 'Transporte'),
        ('frete', 'Frete'),
        ('consultoria', 'Consultoria'),
        ('energia', 'Energia'),
        ('agua', 'Água'),
        ('seguro', 'Seguro'),
        ('manutencao', 'Manutenção'),
        ('outro', 'Outro'),
    ]

    codigo = models.CharField(max_length=50, unique=True)
    nome = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    categoria = models.CharField(max_length=50, choices=CATEGORIAS, default='administrativo')
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    pai = models.ForeignKey('self', blank=True, null=True, on_delete=models.SET_NULL, related_name='filhos')
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.SET_NULL)

    class Meta:
        verbose_name = 'Centro de Custo'
        verbose_name_plural = 'Centros de Custo'
        ordering = ['codigo']

    def __str__(self):
        return f"{self.codigo} - {self.nome}"


class DespesaAdministrativa(TenantModel):
    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    data = models.DateField()
    documento_referencia = models.CharField(max_length=100, null=True, blank=True)
    anexos = models.JSONField(null=True, blank=True)
    pendente_rateio = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    centro = models.ForeignKey(CentroCusto, on_delete=models.CASCADE, related_name='despesas')
    fornecedor = models.ForeignKey('comercial.Fornecedor', blank=True, null=True, on_delete=models.SET_NULL)
    rateio = models.ForeignKey('financeiro.RateioCusto', blank=True, null=True, on_delete=models.SET_NULL)
    safra = models.ForeignKey('agricultura.Plantio', blank=True, null=True, on_delete=models.SET_NULL)

    class Meta:
        verbose_name = 'Despesa Administrativa'
        verbose_name_plural = 'Despesas Administrativas'
        ordering = ['-data', '-criado_em']

    def __str__(self):
        return self.titulo


class Funcionario(TenantModel):
    """Registro de funcionário simples para folha de pagamento."""
    TIPO_CHOICES = [
        ('registrado', 'Registrado'),
        ('temporario', 'Temporário')
    ]

    RECEBE_POR_CHOICES = [
        ('pix', 'PIX'),
        ('transferencia', 'Transferência Bancária'),
        ('boleto', 'Boleto')
    ]

    TIPO_CONTA_CHOICES = [
        ('corrente', 'Corrente'),
        ('poupanca', 'Poupança')
    ]

    nome = models.CharField(max_length=200)
    cpf = models.CharField(max_length=11, null=True, blank=True)
    cargo = models.CharField(max_length=100, null=True, blank=True)
    conta_bancaria = models.CharField(max_length=100, null=True, blank=True)

    # Bancários (novos campos)
    banco = models.CharField(max_length=100, null=True, blank=True)
    agencia = models.CharField(max_length=20, null=True, blank=True)
    conta = models.CharField(max_length=50, null=True, blank=True)
    tipo_conta = models.CharField(max_length=20, choices=TIPO_CONTA_CHOICES, null=True, blank=True)
    pix_key = models.CharField(max_length=255, null=True, blank=True, help_text='Chave PIX (CPF/CNPJ/telefone/email/EVP)')
    recebe_por = models.CharField(max_length=20, choices=RECEBE_POR_CHOICES, default='pix')
    nome_titular = models.CharField(max_length=200, null=True, blank=True)
    cpf_cnpj = models.CharField(max_length=14, null=True, blank=True)

    salario_bruto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='registrado')
    diaria_valor = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text='Valor diário para temporários')
    dependentes = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Funcionário'
        verbose_name_plural = 'Funcionários'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class FolhaPagamento(TenantModel):
    """Lote de folha de pagamento básico (persistência leve para MVP)."""
    descricao = models.CharField(max_length=200, null=True, blank=True)
    periodo_ano = models.PositiveIntegerField(null=True, blank=True)
    periodo_mes = models.PositiveIntegerField(null=True, blank=True)
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    executado = models.BooleanField(default=False)
    criado_por = models.ForeignKey('core.CustomUser', null=True, blank=True, on_delete=models.SET_NULL)
    criado_em = models.DateTimeField(auto_now_add=True)


class Notificacao(models.Model):
    """Modelo para notificações do sistema."""
    TIPO_CHOICES = [
        ('info', 'Informação'),
        ('warning', 'Aviso'),
        ('error', 'Erro'),
        ('success', 'Sucesso'),
    ]

    PRIORIDADE_CHOICES = [
        ('baixa', 'Baixa'),
        ('media', 'Média'),
        ('alta', 'Alta'),
        ('critica', 'Crítica'),
    ]

    titulo = models.CharField(max_length=200)
    mensagem = models.TextField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='info')
    prioridade = models.CharField(max_length=20, choices=PRIORIDADE_CHOICES, default='media')
    lida = models.BooleanField(default=False)
    lida_em = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    expira_em = models.DateTimeField(null=True, blank=True)
    usuario = models.ForeignKey('core.CustomUser', on_delete=models.CASCADE, related_name='notificacoes')

    class Meta:
        verbose_name = 'Notificação'
        verbose_name_plural = 'Notificações'
        ordering = ['-criado_em']

    def __str__(self):
        return self.titulo


class FolhaPagamentoItem(models.Model):
    folha = models.ForeignKey(FolhaPagamento, on_delete=models.CASCADE, related_name='itens')
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE)
    salario_bruto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    hora_extra = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    hora_extra_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    hora_extra_type = models.CharField(max_length=20, default='normal')
    dsr = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    inss = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ir = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    descontos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    descontos_outro = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    liquido = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        verbose_name = 'Item Folha'
        verbose_name_plural = 'Itens Folha'

    def __str__(self):
        return f"{self.funcionario.nome} - R$ {self.liquido}"
