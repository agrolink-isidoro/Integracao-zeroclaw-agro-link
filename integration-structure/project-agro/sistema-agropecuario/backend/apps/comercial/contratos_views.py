# ========================================
# VIEWSETS PARA CONTRATOS
# ========================================

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, F, DecimalField

from .models import (
    ContratoCompra, ItemCompra, CondicaoCompra,
    ContratoVenda, ItemVenda, ParcelaVenda, CondicaoVenda,
    ContratoFinanceiro, DadosEmprestimo, DadosConsorcio, DadosSeguro,
    DadosAplicacaoFinanceira, DocumentoAdicionalFinanceiro, CondicaoFinanceira
)
from .contratos_serializers import (
    ContratoCompraSerializer, ItemCompraSerializer, CondicaoCompraSerializer,
    ContratoVendaSerializer, ItemVendaSerializer, ParcelaVendaSerializer, CondicaoVendaSerializer,
    ContratoFinanceiroSerializer, DadosEmprestimoSerializer, DadosConsorcioSerializer,
    DadosSeguroSerializer, DadosAplicacaoFinanceiraSerializer,
    DocumentoAdicionalFinanceiroSerializer, CondicaoFinanceiraSerializer
)


# ========================================
# CONTRATO DE COMPRA VIEWSETS
# ========================================

class ContratoCompraViewSet(viewsets.ModelViewSet):
    """ViewSet para Contratos de Compra"""
    
    queryset = ContratoCompra.objects.all()
    serializer_class = ContratoCompraSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'fornecedor', 'empresa', 'criado_por']
    search_fields = ['titulo', 'numero_contrato', 'fornecedor__nome']
    ordering_fields = ['criado_em', 'valor_total', 'data_inicio']
    ordering = ['-criado_em']
    
    def perform_create(self, serializer):
        """Define o usuário criador"""
        serializer.save(criado_por=self.request.user)
    
    @action(detail=True, methods=['post'])
    def calcular_total(self, request, pk=None):
        """Recalculates the contract total value"""
        contrato = self.get_object()
        total = contrato.calcular_valor_total()
        contrato.save()
        return Response({
            'id': contrato.id,
            'valor_total': str(total)
        })


class ItemCompraViewSet(viewsets.ModelViewSet):
    """ViewSet para Itens de Compra"""
    
    queryset = ItemCompra.objects.all()
    serializer_class = ItemCompraSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['contrato']
    search_fields = ['descricao_item']


class CondicaoCompraViewSet(viewsets.ModelViewSet):
    """ViewSet para Condições de Compra"""
    
    queryset = CondicaoCompra.objects.all()
    serializer_class = CondicaoCompraSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['contrato', 'tipo_condicao']
    search_fields = ['descricao']


# ========================================
# CONTRATO DE VENDA VIEWSETS
# ========================================

class ContratoVendaViewSet(viewsets.ModelViewSet):
    """ViewSet para Contratos de Venda"""
    
    queryset = ContratoVenda.objects.all()
    serializer_class = ContratoVendaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'cliente', 'empresa', 'criado_por']
    search_fields = ['titulo', 'numero_contrato', 'cliente__nome_completo']
    ordering_fields = ['criado_em', 'valor_total', 'data_inicio']
    ordering = ['-criado_em']
    
    def perform_create(self, serializer):
        """Define o usuário criador"""
        serializer.save(criado_por=self.request.user)
    
    @action(detail=True, methods=['post'])
    def calcular_total(self, request, pk=None):
        """Recalculates the contract total value"""
        contrato = self.get_object()
        total = contrato.calcular_valor_total()
        contrato.save()
        return Response({
            'id': contrato.id,
            'valor_total': str(total)
        })
    
    @action(detail=True, methods=['post'])
    def gerar_parcelas(self, request, pk=None):
        """Generates payment installments for the contract"""
        contrato = self.get_object()
        
        # Remove existing installments
        contrato.parcelas_venda.all().delete()
        
        if contrato.numero_parcelas <= 0:
            return Response({'error': 'Número de parcelas deve ser maior que 0'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not contrato.data_inicio:
            return Response({'error': 'Data de início deve ser definida'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate installment value
        valor_parcela = contrato.valor_total / contrato.numero_parcelas
        
        # Create installments
        from datetime import timedelta, datetime
        data_vencimento = contrato.data_inicio
        
        parcelas = []
        for i in range(1, contrato.numero_parcelas + 1):
            parcelas.append(
                ParcelaVenda(
                    contrato=contrato,
                    numero_parcela=i,
                    valor_parcela=valor_parcela,
                    data_vencimento=data_vencimento
                )
            )
            # Add 30 days for next installment
            data_vencimento = data_vencimento + timedelta(days=30)
        
        ParcelaVenda.objects.bulk_create(parcelas)
        
        return Response({
            'id': contrato.id,
            'parcelas_criadas': contrato.numero_parcelas,
            'valor_parcela': str(valor_parcela)
        })


class ItemVendaViewSet(viewsets.ModelViewSet):
    """ViewSet para Itens de Venda"""
    
    queryset = ItemVenda.objects.all()
    serializer_class = ItemVendaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['contrato']
    search_fields = ['descricao_produto']


class ParcelaVendaViewSet(viewsets.ModelViewSet):
    """ViewSet para Parcelas de Venda"""
    
    queryset = ParcelaVenda.objects.all()
    serializer_class = ParcelaVendaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['contrato', 'status']
    ordering_fields = ['data_vencimento', 'numero_parcela']
    ordering = ['numero_parcela']
    
    @action(detail=True, methods=['post'])
    def marcar_paga(self, request, pk=None):
        """Marks a installment as paid"""
        parcela = self.get_object()
        
        if parcela.status == 'paga':
            return Response({'error': 'Parcela já foi marcada como paga'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update installment status
        from datetime import date
        parcela.status = 'paga'
        parcela.data_pagamento = request.data.get('data_pagamento', date.today())
        parcela.valor_pago = request.data.get('valor_pago', parcela.valor_parcela)
        parcela.save()
        
        return Response(self.get_serializer(parcela).data)


class CondicaoVendaViewSet(viewsets.ModelViewSet):
    """ViewSet para Condições de Venda"""
    
    queryset = CondicaoVenda.objects.all()
    serializer_class = CondicaoVendaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['contrato', 'tipo_condicao']
    search_fields = ['descricao']


# ========================================
# CONTRATO FINANCEIRO VIEWSETS
# ========================================

class ContratoFinanceiroViewSet(viewsets.ModelViewSet):
    """ViewSet para Contratos Financeiros (Empréstimos, Consórcios, Seguros, Aplicações)"""
    
    queryset = ContratoFinanceiro.objects.all()
    serializer_class = ContratoFinanceiroSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'produto_financeiro', 'beneficiario', 'instituicao_financeira', 'empresa']
    search_fields = ['titulo', 'numero_contrato', 'beneficiario__nome_completo']
    ordering_fields = ['criado_em', 'valor_total', 'data_vigencia_inicial']
    ordering = ['-criado_em']
    
    def perform_create(self, serializer):
        """Define o usuário criador"""
        serializer.save(criado_por=self.request.user)
    
    @action(detail=True, methods=['get'])
    def resumo(self, request, pk=None):
        """Returns a summary of the financial contract"""
        contrato = self.get_object()
        
        resumo = {
            'id': contrato.id,
            'numero_contrato': contrato.numero_contrato,
            'titulo': contrato.titulo,
            'produto_financeiro': contrato.get_produto_financeiro_display(),
            'valor_total': str(contrato.valor_total),
            'valor_entrada': str(contrato.valor_entrada),
            'status': contrato.get_status_display(),
            'data_vigencia_inicial': contrato.data_vigencia_inicial,
            'data_vigencia_final': contrato.data_vigencia_final,
        }
        
        # Add specific product data
        if hasattr(contrato, 'dados_emprestimo'):
            resumo['produto_details'] = {
                'taxa_juros': float(contrato.dados_emprestimo.taxa_juros),
                'prazo_meses': contrato.dados_emprestimo.prazo_meses,
                'numero_parcelas': contrato.dados_emprestimo.numero_parcelas,
            }
        elif hasattr(contrato, 'dados_seguro'):
            resumo['produto_details'] = {
                'tipo_seguro': contrato.dados_seguro.tipo_seguro,
                'premio_anual': str(contrato.dados_seguro.premio_anual),
            }
        elif hasattr(contrato, 'dados_aplicacao_financeira'):
            resumo['produto_details'] = {
                'tipo_aplicacao': contrato.dados_aplicacao_financeira.get_tipo_aplicacao_display(),
                'valor_aplicado': str(contrato.dados_aplicacao_financeira.valor_aplicado),
                'taxa_retorno': float(contrato.dados_aplicacao_financeira.taxa_retorno),
            }
        
        return Response(resumo)


class DadosEmprestimoViewSet(viewsets.ModelViewSet):
    """ViewSet para Dados de Empréstimo"""
    
    queryset = DadosEmprestimo.objects.all()
    serializer_class = DadosEmprestimoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['contrato']


class DadosConsorcioViewSet(viewsets.ModelViewSet):
    """ViewSet para Dados de Consórcio"""
    
    queryset = DadosConsorcio.objects.all()
    serializer_class = DadosConsorcioSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['contrato']


class DadosSeguroViewSet(viewsets.ModelViewSet):
    """ViewSet para Dados de Seguro"""
    
    queryset = DadosSeguro.objects.all()
    serializer_class = DadosSeguroSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['contrato']


class DadosAplicacaoFinanceiraViewSet(viewsets.ModelViewSet):
    """ViewSet para Dados de Aplicação Financeira"""
    
    queryset = DadosAplicacaoFinanceira.objects.all()
    serializer_class = DadosAplicacaoFinanceiraSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['contrato']


class DocumentoAdicionalFinanceiroViewSet(viewsets.ModelViewSet):
    """ViewSet para Documentos Adicionais de Contratos Financeiros"""
    
    queryset = DocumentoAdicionalFinanceiro.objects.all()
    serializer_class = DocumentoAdicionalFinanceiroSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['contrato', 'tipo_documento']


class CondicaoFinanceiraViewSet(viewsets.ModelViewSet):
    """ViewSet para Condições Financeiras"""
    
    queryset = CondicaoFinanceira.objects.all()
    serializer_class = CondicaoFinanceiraSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['contrato', 'tipo_condicao']
