"""
Services para operações de contratos de venda.
"""
from django.db import transaction
from django.contrib.auth import get_user_model
from dateutil.relativedelta import relativedelta
from django.contrib.contenttypes.models import ContentType
from decimal import Decimal

from .models import VendaContrato, ParcelaContrato
from apps.financeiro.models import Vencimento

User = get_user_model()


class ContratoService:
    """Service para operações de contratos."""
    
    @staticmethod
    @transaction.atomic
    def criar_contrato_com_parcelas(dados_contrato, usuario, tenant=None):
        """
        Cria contrato e gera parcelas/vencimentos automaticamente.
        
        Args:
            dados_contrato: dict com dados do contrato
            usuario: User que está criando
            tenant: Tenant proprietário (injetado pelo mixin no ViewSet)
            
        Returns:
            VendaContrato criado
        """
        # Resolver tenant a partir do usuário se não fornecido
        if tenant is None and usuario and hasattr(usuario, 'tenant'):
            tenant = usuario.tenant

        tenant_kwargs = {'tenant': tenant} if tenant is not None else {}

        # Criar contrato
        contrato = VendaContrato.objects.create(**dados_contrato, criado_por=usuario, **tenant_kwargs)
        
        # Gerar parcelas
        valor_parcela = Decimal(contrato.valor_total) / Decimal(contrato.numero_parcelas)
        data_base = contrato.data_contrato
        
        delta_map = {
            'MENSAL': relativedelta(months=1),
            'BIMESTRAL': relativedelta(months=2),
            'TRIMESTRAL': relativedelta(months=3),
        }
        delta = delta_map[contrato.periodicidade_parcelas]
        
        for i in range(1, contrato.numero_parcelas + 1):
            data_vencimento = data_base + (delta * i)
            
            # Criar parcela
            parcela = ParcelaContrato.objects.create(
                contrato=contrato,
                numero_parcela=i,
                valor=valor_parcela,
                data_vencimento=data_vencimento
            )
            
            # Criar vencimento no Financeiro
            vencimento = Vencimento.objects.create(
                titulo=f"{contrato.numero_contrato} - Parcela {i}/{contrato.numero_parcelas}",
                descricao=f"Parcela do contrato {contrato.numero_contrato}",
                valor=valor_parcela,
                data_vencimento=data_vencimento,
                tipo='receita',
                status='pendente',
                criado_por=usuario,
                **tenant_kwargs
            )
            
            # Vincular
            parcela.vencimento = vencimento
            parcela.save()
        
        # Ativar contrato
        contrato.status = 'ATIVO'
        contrato.save()
        
        return contrato
    
    @staticmethod
    @transaction.atomic
    def cancelar_contrato(contrato_id, usuario):
        """Cancela contrato e vencimentos associados."""
        contrato = VendaContrato.objects.get(id=contrato_id)
        
        if contrato.status == 'ENCERRADO':
            raise ValueError("Contrato já encerrado")
        
        # Cancelar vencimentos pendentes
        for parcela in contrato.parcelas.all():
            if parcela.vencimento and parcela.vencimento.status == 'pendente':
                parcela.vencimento.status = 'cancelado'
                parcela.vencimento.save()
        
        contrato.status = 'CANCELADO'
        contrato.save()
        
        return contrato
    
    @staticmethod
    def obter_contratos_ativos(cliente_id=None):
        """
        Retorna contratos ativos opcionalmente filtrados por cliente.
        
        Args:
            cliente_id: ID do cliente (opcional)
            
        Returns:
            QuerySet de VendaContrato
        """
        qs = VendaContrato.objects.filter(status='ATIVO')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        return qs.select_related('cliente', 'produto').prefetch_related('parcelas')
    
    @staticmethod
    def obter_valor_total_contratos(cliente_id=None, status='ATIVO'):
        """
        Calcula o valor total dos contratos.
        
        Args:
            cliente_id: ID do cliente (opcional)
            status: Status do contrato (padrão: ATIVO)
            
        Returns:
            Decimal com valor total
        """
        from django.db.models import Sum
        
        qs = VendaContrato.objects.filter(status=status)
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        
        resultado = qs.aggregate(total=Sum('valor_total'))
        return resultado['total'] or Decimal('0.00')
    
    @staticmethod
    def obter_parcelas_vencendo(dias=30):
        """
        Retorna parcelas que vencem nos próximos dias.
        
        Args:
            dias: Número de dias à frente (padrão: 30)
            
        Returns:
            QuerySet de ParcelaContrato
        """
        from django.utils import timezone
        from datetime import timedelta
        
        hoje = timezone.now().date()
        data_limite = hoje + timedelta(days=dias)
        
        return ParcelaContrato.objects.filter(
            data_vencimento__lte=data_limite,
            data_vencimento__gte=hoje,
            vencimento__status='pendente'
        ).select_related('contrato', 'contrato__cliente', 'vencimento').order_by('data_vencimento')
