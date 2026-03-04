from django.db import models
from apps.core.models import TenantModel
from django.contrib.auth import get_user_model

User = get_user_model()

class Fornecedor(TenantModel):
    """
    Modelo para cadastro de fornecedores
    """
    TIPO_PESSOA_CHOICES = [
        ('pf', 'Pessoa Física'),
        ('pj', 'Pessoa Jurídica'),
    ]

    STATUS_CHOICES = [
        ('ativo', 'Ativo'),
        ('inativo', 'Inativo'),
        ('bloqueado', 'Bloqueado'),
    ]

    CATEGORIA_CHOICES = [
        ('insumos', 'Fornecedor de Insumos'),
        ('servicos', 'Fornecedor de Serviços'),
        ('maquinas', 'Fornecedor de Equipamentos / Máquinas'),
        ('transporte', 'Fornecedor de Transporte / Logística'),
        ('produtos_agricolas', 'Fornecedor de Produtos Agrícolas'),
        ('combustiveis', 'Fornecedor de Combustíveis'),
        ('ti', 'Fornecedor de TI / Soluções Digitais'),
        ('manutencao', 'Fornecedor de Manutenção / Peças'),
        ('prestador_servicos', 'Prestadores de Serviços'),
        ('fabricante', 'Fabricante'),
        ('outros', 'Outros'),
    ]

    # Informações básicas
    nome = models.CharField(max_length=200, verbose_name="Nome/Razão Social")
    tipo_pessoa = models.CharField(max_length=2, choices=TIPO_PESSOA_CHOICES, default='pj', verbose_name="Tipo de Pessoa")
    cpf_cnpj = models.CharField(max_length=18, unique=True, verbose_name="CPF/CNPJ")
    rg_ie = models.CharField(max_length=20, blank=True, verbose_name="RG/Inscrição Estadual")

    # Contato
    telefone = models.CharField(max_length=20, blank=True, verbose_name="Telefone")
    celular = models.CharField(max_length=20, blank=True, verbose_name="Celular")
    email = models.EmailField(blank=True, verbose_name="E-mail")

    # Endereço
    cep = models.CharField(max_length=9, blank=True, verbose_name="CEP")
    endereco = models.CharField(max_length=200, blank=True, verbose_name="Endereço")
    numero = models.CharField(max_length=10, blank=True, verbose_name="Número")
    complemento = models.CharField(max_length=100, blank=True, verbose_name="Complemento")
    bairro = models.CharField(max_length=100, blank=True, verbose_name="Bairro")
    cidade = models.CharField(max_length=100, blank=True, verbose_name="Cidade")
    estado = models.CharField(max_length=2, blank=True, verbose_name="Estado")

    # Dados Bancários
    TIPO_CONTA_CHOICES = [
        ('corrente', 'Conta Corrente'),
        ('poupanca', 'Conta Poupança'),
    ]
    TIPO_CHAVE_PIX_CHOICES = [
        ('cpf', 'CPF'),
        ('cnpj', 'CNPJ'),
        ('email', 'E-mail'),
        ('telefone', 'Telefone'),
        ('aleatoria', 'Chave Aleatória'),
    ]
    banco = models.CharField(max_length=100, blank=True, verbose_name="Banco")
    agencia_bancaria = models.CharField(max_length=20, blank=True, verbose_name="Agência")
    conta_bancaria = models.CharField(max_length=30, blank=True, verbose_name="Conta Bancária")
    tipo_conta = models.CharField(max_length=20, choices=TIPO_CONTA_CHOICES, blank=True, verbose_name="Tipo de Conta")
    titular_conta = models.CharField(max_length=200, blank=True, verbose_name="Titular da Conta")
    chave_pix = models.CharField(max_length=100, blank=True, verbose_name="Chave PIX")
    tipo_chave_pix = models.CharField(max_length=20, choices=TIPO_CHAVE_PIX_CHOICES, blank=True, verbose_name="Tipo de Chave PIX")

    # Informações comerciais
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default='outros', verbose_name="Categoria")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ativo', verbose_name="Status")
    observacoes = models.TextField(blank=True, verbose_name="Observações")

    # Métricas calculadas (para dashboard)
    total_compras = models.DecimalField(max_digits=15, decimal_places=2, default=0, editable=False, verbose_name="Total de Compras")
    ultima_compra = models.DateField(null=True, blank=True, editable=False, verbose_name="Última Compra")
    documentos_pendentes = models.PositiveIntegerField(default=0, editable=False, verbose_name="Documentos Pendentes")

    # Relacionamentos
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='fornecedores_criados', verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Fornecedor"
        verbose_name_plural = "Fornecedores"
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} ({self.cpf_cnpj})"

    def documentos_vencendo(self, dias=30):
        """Retorna documentos que vencem nos próximos dias"""
        from django.utils import timezone
        hoje = timezone.now().date()
        data_limite = hoje + timezone.timedelta(days=dias)
        return self.documentos.filter(
            data_vencimento__lte=data_limite,
            data_vencimento__gte=hoje,
            status='ativo'
        )

    def documentos_vencidos(self):
        """Retorna documentos vencidos"""
        from django.utils import timezone
        hoje = timezone.now().date()
        return self.documentos.filter(
            data_vencimento__lt=hoje,
            status='ativo'
        )


class PrestadorServico(TenantModel):
    """
    Modelo para cadastro de prestadores de serviço
    """
    TIPO_PESSOA_CHOICES = [
        ('pf', 'Pessoa Física'),
        ('pj', 'Pessoa Jurídica'),
    ]

    STATUS_CHOICES = [
        ('ativo', 'Ativo'),
        ('inativo', 'Inativo'),
        ('bloqueado', 'Bloqueado'),
    ]

    CATEGORIA_CHOICES = [
        ('agricola', 'Serviços Agrícolas'),
        ('mecanica', 'Serviços Mecânicos'),
        ('transporte', 'Transporte'),
        ('consultoria', 'Consultoria'),
        ('manutencao', 'Manutenção'),
        ('outros', 'Outros'),
    ]

    # Informações básicas
    nome = models.CharField(max_length=200, verbose_name="Nome/Razão Social")
    tipo_pessoa = models.CharField(max_length=2, choices=TIPO_PESSOA_CHOICES, default='pf', verbose_name="Tipo de Pessoa")
    cpf_cnpj = models.CharField(max_length=18, unique=True, verbose_name="CPF/CNPJ")
    rg_ie = models.CharField(max_length=20, blank=True, verbose_name="RG/Inscrição Estadual")

    # Contato
    telefone = models.CharField(max_length=20, blank=True, verbose_name="Telefone")
    celular = models.CharField(max_length=20, blank=True, verbose_name="Celular")
    email = models.EmailField(blank=True, verbose_name="E-mail")

    # Endereço
    cep = models.CharField(max_length=9, blank=True, verbose_name="CEP")
    endereco = models.CharField(max_length=200, blank=True, verbose_name="Endereço")
    numero = models.CharField(max_length=10, blank=True, verbose_name="Número")
    complemento = models.CharField(max_length=100, blank=True, verbose_name="Complemento")
    bairro = models.CharField(max_length=100, blank=True, verbose_name="Bairro")
    cidade = models.CharField(max_length=100, blank=True, verbose_name="Cidade")
    estado = models.CharField(max_length=2, blank=True, verbose_name="Estado")

    # Informações comerciais
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default='outros', verbose_name="Categoria")
    especialidades = models.TextField(blank=True, verbose_name="Especialidades")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ativo', verbose_name="Status")
    observacoes = models.TextField(blank=True, verbose_name="Observações")

    # Relacionamentos
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='prestadores_criados', verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Prestador de Serviço"
        verbose_name_plural = "Prestadores de Serviço"
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} ({self.categoria})"


class InstituicaoFinanceira(models.Model):
    """
    Modelo para cadastro de instituições financeiras conforme lista do BACEN
    """
    STATUS_CHOICES = [
        ('ativo', 'Ativo'),
        ('inativo', 'Inativo'),
    ]

    SEGMENTO_CHOICES = [
        ('banco_comercial', 'Banco Comercial'),
        ('banco_multiplo', 'Banco Múltiplo'),
        ('banco_investimento', 'Banco de Investimento'),
        ('soc_credito', 'Sociedade de Crédito'),
        ('financ_desenvolvimento', 'Financeira de Desenvolvimento'),
        ('caixa_economica', 'Caixa Econômica'),
        ('banco_central', 'Banco Central'),
        ('conglomerado', 'Conglomerado'),
        ('outros', 'Outros'),
    ]

    # Informações do BACEN
    codigo_bacen = models.CharField(max_length=10, unique=True, verbose_name="Código BACEN")
    nome = models.CharField(max_length=200, verbose_name="Nome da Instituição")
    nome_reduzido = models.CharField(max_length=100, blank=True, verbose_name="Nome Reduzido")
    segmento = models.CharField(max_length=30, choices=SEGMENTO_CHOICES, default='banco_comercial', verbose_name="Segmento")

    # Informações de contato
    telefone = models.CharField(max_length=20, blank=True, verbose_name="Telefone")
    site = models.URLField(blank=True, verbose_name="Site")

    # Endereço
    cep = models.CharField(max_length=9, blank=True, verbose_name="CEP")
    endereco = models.CharField(max_length=200, blank=True, verbose_name="Endereço")
    numero = models.CharField(max_length=10, blank=True, verbose_name="Número")
    complemento = models.CharField(max_length=100, blank=True, verbose_name="Complemento")
    bairro = models.CharField(max_length=100, blank=True, verbose_name="Bairro")
    cidade = models.CharField(max_length=100, blank=True, verbose_name="Cidade")
    estado = models.CharField(max_length=2, blank=True, verbose_name="Estado")

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ativo', verbose_name="Status")
    data_inicio_operacao = models.DateField(null=True, blank=True, verbose_name="Data de Início da Operação")
    observacoes = models.TextField(blank=True, verbose_name="Observações")

    # Relacionamentos
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='instituicoes_criadas', verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Instituição Financeira"
        verbose_name_plural = "Instituições Financeiras"
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} ({self.codigo_bacen})"


class Fabricante(models.Model):
    """
    Modelo para cadastro de fabricantes
    """
    TIPO_PESSOA_CHOICES = [
        ('pf', 'Pessoa Física'),
        ('pj', 'Pessoa Jurídica'),
    ]

    STATUS_CHOICES = [
        ('ativo', 'Ativo'),
        ('inativo', 'Inativo'),
        ('bloqueado', 'Bloqueado'),
    ]

    # Informações básicas
    nome = models.CharField(max_length=200, verbose_name="Nome/Razão Social")
    tipo_pessoa = models.CharField(max_length=2, choices=TIPO_PESSOA_CHOICES, default='pj', verbose_name="Tipo de Pessoa")
    cpf_cnpj = models.CharField(max_length=18, unique=True, verbose_name="CPF/CNPJ")
    rg_ie = models.CharField(max_length=20, blank=True, verbose_name="RG/Inscrição Estadual")

    # Contato
    telefone = models.CharField(max_length=20, blank=True, verbose_name="Telefone")
    celular = models.CharField(max_length=20, blank=True, verbose_name="Celular")
    email = models.EmailField(blank=True, verbose_name="E-mail")

    # Endereço
    cep = models.CharField(max_length=9, blank=True, verbose_name="CEP")
    endereco = models.CharField(max_length=200, blank=True, verbose_name="Endereço")
    numero = models.CharField(max_length=10, blank=True, verbose_name="Número")
    complemento = models.CharField(max_length=100, blank=True, verbose_name="Complemento")
    bairro = models.CharField(max_length=100, blank=True, verbose_name="Bairro")
    cidade = models.CharField(max_length=100, blank=True, verbose_name="Cidade")
    estado = models.CharField(max_length=2, blank=True, verbose_name="Estado")

    # Informações específicas do fabricante
    linha_produtos = models.TextField(blank=True, verbose_name="Linha de Produtos")
    certificacoes = models.TextField(blank=True, verbose_name="Certificações")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ativo', verbose_name="Status")
    observacoes = models.TextField(blank=True, verbose_name="Observações")

    # Relacionamentos
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='fabricantes_criados', verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Fabricante"
        verbose_name_plural = "Fabricantes"
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} ({self.cpf_cnpj})"


class Cliente(TenantModel):
    """
    Modelo para cadastro de clientes/compradores
    """
    TIPO_PESSOA_CHOICES = [
        ('pf', 'Pessoa Física'),
        ('pj', 'Pessoa Jurídica'),
    ]

    STATUS_CHOICES = [
        ('ativo', 'Ativo'),
        ('inativo', 'Inativo'),
        ('bloqueado', 'Bloqueado'),
    ]

    # Informações básicas
    nome = models.CharField(max_length=200, verbose_name="Nome/Razão Social")
    tipo_pessoa = models.CharField(max_length=2, choices=TIPO_PESSOA_CHOICES, default='pj', verbose_name="Tipo de Pessoa")
    cpf_cnpj = models.CharField(max_length=18, unique=True, verbose_name="CPF/CNPJ")
    rg_ie = models.CharField(max_length=20, blank=True, verbose_name="RG/Inscrição Estadual")
    inscricao_estadual = models.CharField(max_length=20, blank=True, null=True, verbose_name="Inscrição Estadual")

    # Contato
    telefone = models.CharField(max_length=20, blank=True, verbose_name="Telefone")
    celular = models.CharField(max_length=20, blank=True, verbose_name="Celular")
    email = models.EmailField(blank=True, verbose_name="E-mail")

    # Endereço
    cep = models.CharField(max_length=9, blank=True, verbose_name="CEP")
    endereco = models.CharField(max_length=200, blank=True, verbose_name="Endereço")
    numero = models.CharField(max_length=10, blank=True, verbose_name="Número")
    complemento = models.CharField(max_length=100, blank=True, verbose_name="Complemento")
    bairro = models.CharField(max_length=100, blank=True, verbose_name="Bairro")
    cidade = models.CharField(max_length=100, blank=True, verbose_name="Cidade")
    estado = models.CharField(max_length=2, blank=True, verbose_name="Estado")

    # Informações comerciais
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ativo', verbose_name="Status")
    observacoes = models.TextField(blank=True, verbose_name="Observações")

    # Relacionamentos
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='clientes_criados', verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} ({self.cpf_cnpj})"


class Empresa(models.Model):
    """
    Empresa / Organização (placeholder model for integration with other apps).
    Add fields or replace with a richer model later when requirements are finalised.
    """
    nome = models.CharField(max_length=200, verbose_name="Nome/Razão Social")
    cnpj = models.CharField(max_length=18, unique=True, verbose_name="CNPJ")
    contato = models.CharField(max_length=200, null=True, blank=True, verbose_name="Contato")
    endereco = models.CharField(max_length=200, blank=True, verbose_name="Endereço")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} ({self.cnpj})"


class DespesaPrestadora(TenantModel):
    """Despesa lançada por uma empresa prestadora/fornecedor.

    Permite agregar despesas por empresa para uso em rateios no Administrativo.
    """
    CATEGORIA_CHOICES = [
        ('transporte', 'Transporte'),
        ('mecanica', 'Mecânica'),
        ('servico', 'Serviço'),
        ('material', 'Material'),
        ('outros', 'Outros'),
    ]

    empresa = models.ForeignKey('Empresa', null=True, blank=True, on_delete=models.SET_NULL, related_name='despesas')
    prestador = models.ForeignKey('PrestadorServico', null=True, blank=True, on_delete=models.SET_NULL, related_name='despesas')
    data = models.DateField(verbose_name='Data da despesa')
    categoria = models.CharField(max_length=30, choices=CATEGORIA_CHOICES, default='outros')
    valor = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Valor')
    centro_custo = models.ForeignKey('administrativo.CentroCusto', null=True, blank=True, on_delete=models.SET_NULL, related_name='despesas_prestadoras')
    descricao = models.TextField(blank=True)

    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='despesas_prestadoras_criadas')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Despesa Prestadora'
        verbose_name_plural = 'Despesas Prestadoras'
        ordering = ['-data', 'empresa']
        indexes = [
            models.Index(fields=['empresa', 'data']),
            models.Index(fields=['empresa', 'categoria', 'data']),
        ]

    def __str__(self):
        return f"Despesa {self.id} - {self.empresa or self.prestador} - {self.valor} on {self.data}"


class Compra(TenantModel):
    """Compra / Compra de materiais ou serviços vinculada a um fornecedor."""
    fornecedor = models.ForeignKey(Fornecedor, on_delete=models.SET_NULL, null=True, blank=True, related_name='compras')
    data = models.DateField(verbose_name='Data da compra')
    valor_total = models.DecimalField(max_digits=14, decimal_places=2, verbose_name='Valor Total')
    descricao = models.TextField(blank=True)

    # Optional: XML content uploaded for this compra (used to auto-create NFe when present)
    xml_content = models.TextField(null=True, blank=True)

    # Link to automatically created NFe (if any)
    nfe = models.ForeignKey('fiscal.NFe', null=True, blank=True, on_delete=models.SET_NULL, related_name='compras')

    # Aggregated impostos from linked NFe (filled when auto-created)
    valor_icms = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, default=0)
    valor_pis = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, default=0)
    valor_cofins = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, default=0)

    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='compras_criadas')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Compra'
        verbose_name_plural = 'Compras'
        ordering = ['-data', 'fornecedor']

    def __str__(self):
        return f"Compra {self.id} - {self.fornecedor or 'N/A'} - {self.valor_total} on {self.data}"


# Ensure signals are imported so they are registered when models module is imported
try:
    from . import signals  # noqa: F401
except Exception:
    pass

class Contrato(TenantModel):
    """Contrato comercial simplificado (MVP).

    Stores partes/itens/condicoes as JSON fields to avoid complex relation modeling at this stage.
    """
    TIPO_CONTRATO_CHOICES = [
        ('compra', 'Compra'),
        ('venda', 'Venda'),
        ('venda_futura', 'Venda Futura'),
        ('venda_spot', 'Venda Spot'),
        ('bater', 'Barter'),
        ('servico', 'Serviço'),
        ('fornecimento', 'Fornecimento'),
        ('parceria', 'Parceria'),
        ('outros', 'Outros'),
    ]

    numero_contrato = models.CharField(max_length=100, unique=True)
    titulo = models.CharField(max_length=200)
    tipo_contrato = models.CharField(max_length=50, choices=TIPO_CONTRATO_CHOICES, default='compra')
    categoria = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=50, default='rascunho')
    valor_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    data_inicio = models.DateField()
    data_fim = models.DateField(blank=True, null=True)
    
    # Campos adicionais (sincronia com frontend)
    prazo_execucao_dias = models.IntegerField(blank=True, null=True, verbose_name="Prazo de Execução (dias)")
    observacoes = models.TextField(blank=True, null=True, verbose_name="Observações")

    partes = models.JSONField(blank=True, null=True)
    itens = models.JSONField(blank=True, null=True)
    condicoes = models.JSONField(blank=True, null=True)

    documento = models.FileField(upload_to='contratos/', blank=True, null=True)

    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='contratos_criados')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Contrato'
        verbose_name_plural = 'Contratos'
        ordering = ['-criado_em']

    def __str__(self):
        return f"Contrato {self.numero_contrato} - {self.titulo} - {self.status}"

class CargaViagem(TenantModel):
    """
    Modelo para registro de cargas de colheita
    """
    TIPO_COLHEITA_CHOICES = [
        ('colheita_completa', 'Colheita Completa com Pesagem e Classificação'),
        ('silo_bolsa', 'Armazenamento em Silo Bolsa com Vendas Parceladas'),
        ('contrato_industria', 'Colheita por Contrato com Indústria'),
    ]

    TIPO_ENTREGA_CHOICES = [
        ('contrato_pre_fixado', 'Entrega sob contrato de venda pré-fixado'),
        ('armazem_geral', 'Entrega para armazém geral'),
    ]

    # Informações básicas
    tipo_colheita = models.CharField(max_length=20, choices=TIPO_COLHEITA_CHOICES, verbose_name="Tipo de Colheita")
    tipo_entrega = models.CharField(max_length=20, choices=TIPO_ENTREGA_CHOICES, blank=True, null=True, verbose_name="Tipo de Entrega")
    data_colheita = models.DateField(verbose_name="Data da Colheita")
    peso_total = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Peso Total (kg)")
    classificacao = models.CharField(max_length=100, blank=True, verbose_name="Classificação")

    # Relacionamentos
    fazenda = models.ForeignKey('fazendas.Fazenda', on_delete=models.CASCADE, verbose_name="Fazenda")
    cultura = models.ForeignKey('agricultura.Cultura', on_delete=models.CASCADE, verbose_name="Cultura")

    # NOVO: Referência opcional para colheita agrícola (integração)
    colheita_agricola = models.OneToOneField('agricultura.Colheita', null=True, blank=True, on_delete=models.SET_NULL, verbose_name="Colheita Agrícola")

    # Análise de qualidade (opcional)
    umidade = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="Umidade (%)")
    impurezas = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="Impurezas (%)")
    observacoes = models.TextField(blank=True, verbose_name="Observações")

    # Pesagens / Frete (fluxo: tare -> load -> gross -> unload)
    truck_plate = models.CharField(max_length=20, null=True, blank=True, verbose_name="Placa do Caminhão")
    driver_name = models.CharField(max_length=200, null=True, blank=True, verbose_name="Nome do Motorista")

    tare_weight = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Peso Tare (kg)")
    tare_time = models.DateTimeField(null=True, blank=True)

    gross_weight = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Peso Bruto (kg)")
    gross_time = models.DateTimeField(null=True, blank=True)

    unload_local = models.ForeignKey('estoque.LocalArmazenamento', on_delete=models.SET_NULL, null=True, blank=True, related_name='unloads', verbose_name='Local de Descarregamento')
    unload_movimentacao = models.OneToOneField('estoque.MovimentacaoEstoque', on_delete=models.SET_NULL, null=True, blank=True, related_name='carga_unload', verbose_name='Movimentacao de Descarregamento')

    @property
    def net_weight(self):
        try:
            if self.tare_weight is not None and self.gross_weight is not None:
                return self.gross_weight - self.tare_weight
        except Exception:
            return None
        return None

    # Custos para armazém geral
    custo_armazenagem = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Custo de Armazenagem")
    custo_recepcao = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Custo de Recepção")
    custo_limpeza = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Custo de Limpeza")

    # NOVO: Controle de frete
    comprador_responsavel_frete = models.BooleanField(
        default=False,
        verbose_name="Comprador Responsável pelo Frete",
        help_text="Marque se o comprador é responsável pelo frete de transporte"
    )
    valor_frete_unitario = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        verbose_name="Valor Frete Unitário",
        help_text="Valor do frete por unidade (R$/unidade)"
    )
    unidade_frete = models.CharField(
        max_length=10,
        choices=[
            ('saca', 'Por Saca (60kg)'),
            ('kg', 'Por Kg'),
            ('tonelada', 'Por Tonelada (1000kg)')
        ],
        default='saca',
        verbose_name="Unidade do Frete"
    )

    # Metadata
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='cargas_criadas', verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Carga de Viagem"
        verbose_name_plural = "Cargas de Viagem"
        ordering = ['-data_colheita']

    def __str__(self):
        return f"Carga {self.tipo_colheita} - {self.fazenda.name} ({self.data_colheita})"

    @property
    def custo_total_armazem(self):
        """Calcula o custo total para modalidade armazém geral"""
        if self.tipo_entrega == 'armazem_geral':
            return self.custo_armazenagem + self.custo_recepcao + self.custo_limpeza
        return 0

    @property
    def frete_responsabilidade_fazenda(self):
        """Verifica se a fazenda é responsável pelo frete"""
        return not self.comprador_responsavel_frete

    @property
    def valor_frete_total(self):
        """Calcula o valor total do frete baseado na unidade"""
        if not self.frete_responsabilidade_fazenda or not self.valor_frete_unitario:
            return 0

        # Converte peso para a unidade do frete
        if self.unidade_frete == 'saca':
            # 1 saca = 60 kg
            unidades = self.peso_total / 60
        elif self.unidade_frete == 'kg':
            unidades = self.peso_total
        elif self.unidade_frete == 'tonelada':
            # 1 tonelada = 1000 kg
            unidades = self.peso_total / 1000
        else:
            unidades = 0

        return unidades * self.valor_frete_unitario

    @property
    def custo_total_com_frete(self):
        """Custo total incluindo frete se responsabilidade da fazenda"""
        total = self.custo_total_armazem
        if self.frete_responsabilidade_fazenda:
            total += self.valor_frete_total
        return total

    def conectar_colheita(self, colheita):
        """Conecta esta carga com uma colheita agrícola"""
        from apps.agricultura.models import Colheita
        if isinstance(colheita, Colheita) and colheita.pode_enviar_comercial:
            self.colheita_agricola = colheita
            self.save()
            colheita.status = 'comercializada'
            colheita.carga_comercial = self
            colheita.save()
            return True
        return False


class SiloBolsa(TenantModel):
    """
    Modelo para controle de armazenamento em silo bolsa
    """
    # Relacionamento com carga
    carga_viagem = models.OneToOneField(CargaViagem, on_delete=models.CASCADE, verbose_name="Carga de Viagem")

    # Capacidade e controle de estoque
    capacidade_total = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Capacidade Total (kg)")
    estoque_atual = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Estoque Atual (kg)")
    data_armazenamento = models.DateField(verbose_name="Data de Armazenamento")

    # Metadata
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='silos_criados', verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Silo Bolsa"
        verbose_name_plural = "Silos Bolsa"
        ordering = ['-data_armazenamento']

    def __str__(self):
        return f"Silo Bolsa - {self.carga_viagem} (Estoque: {self.estoque_atual}kg)"

    @property
    def estoque_disponivel(self):
        """Retorna o estoque disponível para venda"""
        return self.estoque_atual


class VendaColheita(TenantModel):
    """
    Modelo para registro de vendas de colheita
    """
    ORIGEM_TIPO_CHOICES = [
        ('carga_viagem', 'Carga de Viagem'),
        ('silo_bolsa', 'Silo Bolsa'),
    ]

    # Origem da venda
    origem_tipo = models.CharField(max_length=15, choices=ORIGEM_TIPO_CHOICES, verbose_name="Tipo de Origem")
    origem_id = models.PositiveIntegerField(verbose_name="ID da Origem")

    # Dados da venda
    data_venda = models.DateField(verbose_name="Data da Venda")
    quantidade = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Quantidade (kg)")
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Preço Unitário")
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, editable=False, verbose_name="Valor Total")

    # Relacionamentos
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, verbose_name="Cliente")
    # Local e produto vinculados à venda (produto deve pertencer ao local)
    local_armazenamento = models.ForeignKey('estoque.LocalArmazenamento', null=True, blank=True, on_delete=models.SET_NULL, related_name='+', verbose_name='Local de Armazenamento')
    produto = models.ForeignKey('estoque.Produto', null=True, blank=True, on_delete=models.SET_NULL, related_name='+', verbose_name='Produto')

    # Preparação para integração fiscal (futuro IBS)
    regime_tributario = models.CharField(max_length=10, default='atual', choices=[('atual', 'Atual'), ('ibs', 'IBS')], verbose_name="Regime Tributário")
    numero_nota_fiscal = models.CharField(max_length=50, blank=True, verbose_name="Número da Nota Fiscal")
    data_emissao_nota = models.DateTimeField(blank=True, null=True, verbose_name="Data de Emissão da Nota")
    valor_tributos = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Valor de Tributos")
    status_emissao = models.CharField(max_length=20, default='pendente', choices=[
        ('pendente', 'Pendente'),
        ('emitida', 'Emitida'),
        ('rejeitada', 'Rejeitada')
    ], verbose_name="Status de Emissão")

    # Observações
    observacoes = models.TextField(blank=True, verbose_name="Observações")

    # Metadata
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='vendas_criadas', verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Venda de Colheita"
        verbose_name_plural = "Vendas de Colheita"
        ordering = ['-data_venda']

    def __str__(self):
        return f"Venda {self.quantidade}kg para {self.cliente.nome} ({self.data_venda})"

    def save(self, *args, **kwargs):
        # Calcula valor total automaticamente
        self.valor_total = self.quantidade * self.preco_unitario
        super().save(*args, **kwargs)

    @property
    def origem(self):
        """Retorna o objeto de origem da venda"""
        if self.origem_tipo == 'carga_viagem':
            return CargaViagem.objects.get(id=self.origem_id)
        elif self.origem_tipo == 'silo_bolsa':
            return SiloBolsa.objects.get(id=self.origem_id)
        return None


class DocumentoFornecedor(TenantModel):
    """
    Modelo para documentos de fornecedores (contratos, certificados, etc.)
    """
    TIPO_DOCUMENTO_CHOICES = [
        ('contrato', 'Contrato'),
        ('certificado', 'Certificado'),
        ('licenca', 'Licença'),
        ('autorizacao', 'Autorização'),
        ('outros', 'Outros'),
    ]

    STATUS_CHOICES = [
        ('ativo', 'Ativo'),
        ('vencido', 'Vencido'),
        ('expirando', 'Expirando'),
        ('cancelado', 'Cancelado'),
    ]

    # Relacionamento
    fornecedor = models.ForeignKey(Fornecedor, on_delete=models.CASCADE, related_name='documentos', verbose_name="Fornecedor")

    # Informações do documento
    tipo = models.CharField(max_length=20, choices=TIPO_DOCUMENTO_CHOICES, verbose_name="Tipo de Documento")
    titulo = models.CharField(max_length=200, verbose_name="Título")
    numero = models.CharField(max_length=50, blank=True, verbose_name="Número")
    descricao = models.TextField(blank=True, verbose_name="Descrição")

    # Datas
    from django.utils import timezone
    data_emissao = models.DateField(default=timezone.now, verbose_name="Data de Emissão")
    data_vencimento = models.DateField(null=True, blank=True, verbose_name="Data de Vencimento")
    data_renovacao = models.DateField(null=True, blank=True, verbose_name="Data de Renovação")

    # Status e alertas
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ativo', verbose_name="Status")
    dias_alerta = models.PositiveIntegerField(default=30, verbose_name="Dias para Alerta de Vencimento")

    # Arquivo
    arquivo = models.FileField(upload_to='documentos_fornecedores/', blank=True, null=True, verbose_name="Arquivo")

    # Observações
    observacoes = models.TextField(blank=True, verbose_name="Observações")

    # Metadata
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='documentos_fornecedor_criados', verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Documento de Fornecedor"
        verbose_name_plural = "Documentos de Fornecedores"
        ordering = ['-data_vencimento', 'titulo']

    def __str__(self):
        return f"{self.tipo} - {self.titulo} ({self.fornecedor.nome})"

    @property
    def dias_para_vencimento(self):
        """Calcula quantos dias faltam para o vencimento"""
        if not self.data_vencimento:
            return None
        from django.utils import timezone
        hoje = timezone.now().date()
        return (self.data_vencimento - hoje).days

    @property
    def status_calculado(self):
        """Calcula o status baseado na data de vencimento"""
        dias = self.dias_para_vencimento
        if dias is None:
            return 'ativo'
        elif dias < 0:
            return 'vencido'
        elif dias <= self.dias_alerta:
            return 'expirando'
        else:
            return 'ativo'


class HistoricoAlteracao(TenantModel):
    """
    Modelo para histórico de alterações em fornecedores
    """
    TIPO_ALTERACAO_CHOICES = [
        ('criacao', 'Criação'),
        ('edicao', 'Edição'),
        ('status_alterado', 'Status Alterado'),
        ('documento_adicionado', 'Documento Adicionado'),
        ('documento_removido', 'Documento Removido'),
        ('pagamento_registrado', 'Pagamento Registrado'),
    ]

    # Relacionamento
    fornecedor = models.ForeignKey(Fornecedor, on_delete=models.CASCADE, related_name='historico', verbose_name="Fornecedor")

    # Alteração
    tipo_alteracao = models.CharField(max_length=25, choices=TIPO_ALTERACAO_CHOICES, verbose_name="Tipo de Alteração")
    descricao = models.TextField(verbose_name="Descrição")
    dados_anteriores = models.JSONField(null=True, blank=True, verbose_name="Dados Anteriores")
    dados_novos = models.JSONField(null=True, blank=True, verbose_name="Dados Novos")

    # Metadata
    alterado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='alteracoes_fornecedor', verbose_name="Alterado por")
    alterado_em = models.DateTimeField(auto_now_add=True, verbose_name="Alterado em")

    class Meta:
        verbose_name = "Histórico de Alteração"
        verbose_name_plural = "Histórico de Alterações"
        ordering = ['-alterado_em']

    def __str__(self):
        return f"{self.tipo_alteracao} - {self.fornecedor.nome} ({self.alterado_em.date()})"


class VendaContrato(TenantModel):
    """Contrato de venda de produtos."""
    
    TIPO_CHOICES = [
        ('A_VISTA', 'À Vista'),
        ('PARCELADO', 'Parcelado'),
        ('ANTECIPADO', 'Antecipado'),
        ('FUTURO', 'Contrato Futuro'),
    ]
    
    STATUS_CHOICES = [
        ('RASCUNHO', 'Rascunho'),
        ('ATIVO', 'Ativo'),
        ('ENCERRADO', 'Encerrado'),
        ('CANCELADO', 'Cancelado'),
    ]
    
    numero_contrato = models.CharField(max_length=50, unique=True, verbose_name="Número do Contrato")
    cliente = models.ForeignKey('comercial.Cliente', on_delete=models.PROTECT, verbose_name="Cliente")
    produto = models.ForeignKey('estoque.Produto', on_delete=models.PROTECT, verbose_name="Produto")
    quantidade_total = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Quantidade Total")
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Preço Unitário")
    valor_total = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Valor Total")
    
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, verbose_name="Tipo")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RASCUNHO', verbose_name="Status")
    
    data_contrato = models.DateField(verbose_name="Data do Contrato")
    data_entrega_prevista = models.DateField(null=True, blank=True, verbose_name="Data de Entrega Prevista")
    
    numero_parcelas = models.PositiveIntegerField(default=1, verbose_name="Número de Parcelas")
    periodicidade_parcelas = models.CharField(
        max_length=20,
        choices=[('MENSAL','Mensal'), ('BIMESTRAL','Bimestral'), ('TRIMESTRAL','Trimestral')],
        default='MENSAL',
        verbose_name="Periodicidade das Parcelas"
    )
    
    observacoes = models.TextField(blank=True, null=True, verbose_name="Observações")
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Contrato de Venda"
        verbose_name_plural = "Contratos de Venda"
        ordering = ['-data_contrato']

    def __str__(self):
        return f"{self.numero_contrato} - {self.cliente.nome if hasattr(self.cliente, 'nome') else self.cliente}"


class ParcelaContrato(models.Model):
    """Parcela de contrato de venda."""
    
    contrato = models.ForeignKey(VendaContrato, on_delete=models.CASCADE, related_name='parcelas', verbose_name="Contrato")
    numero_parcela = models.PositiveIntegerField(verbose_name="Número da Parcela")
    valor = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Valor")
    data_vencimento = models.DateField(verbose_name="Data de Vencimento")
    
    # Link com Financeiro
    vencimento = models.ForeignKey(
        'financeiro.Vencimento',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='parcelas_contrato',
        verbose_name="Vencimento"
    )
    
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    
    class Meta:
        unique_together = ['contrato', 'numero_parcela']
        ordering = ['numero_parcela']
        verbose_name = "Parcela de Contrato"
        verbose_name_plural = "Parcelas de Contrato"
    
    def __str__(self):
        return f"Parcela {self.numero_parcela}/{self.contrato.numero_parcelas} - {self.contrato.numero_contrato}"