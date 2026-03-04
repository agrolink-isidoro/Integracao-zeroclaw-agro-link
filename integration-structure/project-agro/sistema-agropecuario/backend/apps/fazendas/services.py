"""
Services para operações de arrendamento de fazendas.
"""
from django.db import transaction
from django.contrib.auth import get_user_model
from dateutil.relativedelta import relativedelta
from decimal import Decimal

from .models import DocumentoArrendamento, ParcelaArrendamento
from apps.financeiro.models import Vencimento

User = get_user_model()


class ArrendamentoService:
    """Service para operações de documentos de arrendamento."""
    
    @staticmethod
    @transaction.atomic
    def criar_documento_com_parcelas(dados_documento, usuario, tenant=None):
        """
        Cria documento de arrendamento e gera parcelas/vencimentos automaticamente.
        
        Args:
            dados_documento: dict com dados do documento
                - fazenda, arrendador, arrendatario, talhoes (list)
                - data_inicio, data_fim, valor_total
                - numero_parcelas, periodicidade
                - observacoes (opcional)
            usuario: User que está criando
            tenant: Tenant proprietário (injetado pelo mixin no ViewSet)
            
        Returns:
            DocumentoArrendamento criado
        """
        # Resolver tenant a partir do usuário se não fornecido explicitamente
        if tenant is None and usuario and hasattr(usuario, 'tenant'):
            tenant = usuario.tenant

        # Extrair talhoes antes de criar (ManyToMany deve ser setado depois)
        talhoes_ids = dados_documento.pop('talhoes', [])
        
        # Criar documento
        tenant_kwargs = {'tenant': tenant} if tenant is not None else {}
        documento = DocumentoArrendamento.objects.create(
            **dados_documento,
            criado_por=usuario,
            **tenant_kwargs
        )
        
        # Adicionar talhoes
        if talhoes_ids:
            documento.talhoes.set(talhoes_ids)
        
        # Gerar parcelas
        valor_parcela = Decimal(documento.valor_total) / Decimal(documento.numero_parcelas)
        data_base = documento.data_inicio
        
        delta_map = {
            'MENSAL': relativedelta(months=1),
            'BIMESTRAL': relativedelta(months=2),
            'TRIMESTRAL': relativedelta(months=3),
            'SEMESTRAL': relativedelta(months=6),
            'ANUAL': relativedelta(years=1),
        }
        delta = delta_map[documento.periodicidade]
        
        for i in range(1, documento.numero_parcelas + 1):
            data_vencimento = data_base + (delta * i)
            
            # Validar se data está dentro do período do arrendamento
            if data_vencimento > documento.data_fim:
                data_vencimento = documento.data_fim
            
            # Criar parcela
            parcela = ParcelaArrendamento.objects.create(
                documento=documento,
                numero_parcela=i,
                valor=valor_parcela,
                data_vencimento=data_vencimento
            )
            
            # Criar vencimento no Financeiro
            vencimento = Vencimento.objects.create(
                titulo=f"Arrendamento Doc {documento.numero_documento} - Parcela {i}/{documento.numero_parcelas}",
                descricao=f"Arrendamento: {documento.arrendador.nome} → {documento.arrendatario.nome}",
                valor=valor_parcela,
                data_vencimento=data_vencimento,
                tipo='despesa',  # Arrendamento é despesa para o arrendatário
                status='pendente',
                criado_por=usuario,
                **tenant_kwargs
            )
            
            # Vincular
            parcela.vencimento = vencimento
            parcela.save()
        
        # Ativar documento
        documento.status = 'ATIVO'
        documento.save()
        
        return documento
    
    @staticmethod
    @transaction.atomic
    def cancelar_documento(documento_id, usuario):
        """
        Cancela documento de arrendamento e vencimentos associados.
        
        Args:
            documento_id: ID do documento
            usuario: User que está cancelando
            
        Returns:
            DocumentoArrendamento cancelado
        """
        documento = DocumentoArrendamento.objects.get(id=documento_id)
        
        if documento.status == 'ENCERRADO':
            raise ValueError("Documento já encerrado")
        
        if documento.status == 'CANCELADO':
            raise ValueError("Documento já cancelado")
        
        # Cancelar vencimentos pendentes
        for parcela in documento.parcelas.all():
            if parcela.vencimento and parcela.vencimento.status == 'pendente':
                parcela.vencimento.status = 'cancelado'
                parcela.vencimento.save()
        
        documento.status = 'CANCELADO'
        documento.save()
        
        return documento
    
    @staticmethod
    def obter_documentos_ativos(fazenda_id=None, arrendador_id=None, arrendatario_id=None):
        """
        Obtém documentos de arrendamento ativos com filtros opcionais.
        
        Args:
            fazenda_id: Filtrar por fazenda
            arrendador_id: Filtrar por arrendador
            arrendatario_id: Filtrar por arrendatário
            
        Returns:
            QuerySet de DocumentoArrendamento
        """
        qs = DocumentoArrendamento.objects.filter(status='ATIVO')
        
        if fazenda_id:
            qs = qs.filter(fazenda_id=fazenda_id)
        
        if arrendador_id:
            qs = qs.filter(arrendador_id=arrendador_id)
        
        if arrendatario_id:
            qs = qs.filter(arrendatario_id=arrendatario_id)
        
        return qs.select_related('fazenda', 'arrendador', 'arrendatario').prefetch_related('talhoes', 'parcelas')
    
    @staticmethod
    def calcular_valor_pago(documento):
        """Calcula total já pago de um documento."""
        total_pago = Decimal('0.00')
        
        for parcela in documento.parcelas.all():
            if parcela.vencimento and parcela.vencimento.status == 'pago':
                total_pago += parcela.valor
        
        return total_pago
    
    @staticmethod
    def calcular_valor_pendente(documento):
        """Calcula total ainda pendente de um documento."""
        total_pendente = Decimal('0.00')
        
        for parcela in documento.parcelas.all():
            if parcela.vencimento and parcela.vencimento.status == 'pendente':
                total_pendente += parcela.valor
        
        return total_pendente
