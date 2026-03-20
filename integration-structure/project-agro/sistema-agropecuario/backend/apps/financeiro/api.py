from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.core.mixins import TenantQuerySetMixin

from .serializers import (
    BankStatementImportSerializer, 
    BankTransactionSerializer,
    ItemExtratoBancarioSerializer
)
from .models import (
    BankStatementImport, 
    BankTransaction, 
    ContaBancaria,
    ItemExtratoBancario
)

import io, csv, hashlib, datetime, decimal


class BankTransactionViewSet(TenantQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = BankTransaction.objects.all().select_related('importacao')
    serializer_class = BankTransactionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['importacao', 'date', 'external_id']
    search_fields = ['description', 'external_id']


class BankStatementImportViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """Upload and history endpoints for bank statement imports"""
    permission_classes = [IsAuthenticated]
    queryset = BankStatementImport.objects.all().select_related('conta', 'criado_por').prefetch_related('transactions')
    serializer_class = BankStatementImportSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['conta', 'status']
    search_fields = ['arquivo_hash', 'original_filename']

    def create(self, request, *args, **kwargs):
        conta_id = request.data.get('conta')
        dry_run = request.data.get('dry_run') in ('true', 'True', True, '1', 1)
        arquivo = request.FILES.get('arquivo') or request.FILES.get('file') or None

        if not conta_id:
            return Response({'error': 'conta required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            conta = ContaBancaria.objects.get(id=conta_id)
        except ContaBancaria.DoesNotExist:
            return Response({'error': 'conta not found'}, status=status.HTTP_400_BAD_REQUEST)

        if arquivo is None:
            return Response({'error': 'arquivo required'}, status=status.HTTP_400_BAD_REQUEST)

        content = arquivo.read()
        try:
            text = content.decode('utf-8')
        except Exception:
            try:
                text = content.decode('latin-1')
            except Exception:
                return Response({'error': 'cannot decode file - expected text/csv'}, status=status.HTTP_400_BAD_REQUEST)

        arquivo_hash = hashlib.sha256(content).hexdigest()

        # Parse CSV - minimal, forgiving
        preview = []
        errors = []
        reader = csv.DictReader(io.StringIO(text))
        rownum = 0
        for row in reader:
            rownum += 1
            try:
                raw_date = (row.get('date') or row.get('data') or '').strip()
                date_val = None
                if raw_date:
                    # support YYYY-MM-DD
                    date_val = datetime.date.fromisoformat(raw_date)
                amt_text = (row.get('amount') or row.get('valor') or '0').replace(',', '').strip()
                amount = decimal.Decimal(amt_text)
                description = (row.get('description') or row.get('descricao') or '').strip()
                external_id = (row.get('external_id') or row.get('id') or '').strip() or None
                balance_text = (row.get('balance') or row.get('saldo') or '').replace(',', '').strip()
                balance = decimal.Decimal(balance_text) if balance_text else None
                preview.append({
                    'external_id': external_id,
                    'date': date_val.isoformat() if date_val else None,
                    'amount': str(amount),
                    'description': description,
                    'balance': str(balance) if balance is not None else None,
                })
            except Exception as e:
                errors.append({'row': rownum, 'error': str(e)})

        if dry_run:
            return Response({'preview': preview, 'errors': errors, 'arquivo_hash': arquivo_hash, 'rows_count': len(preview)})

        # Dedup check: if arquivo_hash matches an already successful import, return it
        existing = None
        if arquivo_hash:
            existing = BankStatementImport.objects.filter(arquivo_hash=arquivo_hash, status='success').first()
            if existing:
                ser = self.get_serializer(existing)
                return Response({'detail': 'already_imported', 'import': ser.data}, status=status.HTTP_200_OK)

        # Create import record (file saved to storage)
        imp = BankStatementImport.objects.create(
            conta=conta,
            formato='csv',
            status='pending',
            original_filename=getattr(arquivo, 'name', None),
            arquivo_hash=arquivo_hash,
            criado_por=request.user
        )
        # Save file content and persist
        imp.arquivo.save(getattr(arquivo, 'name', 'upload.csv'), arquivo, save=True)

        # Enqueue processing with Celery (if configured), fallback to synchronous processing
        try:
            from .tasks import process_bank_statement_import_task
            result = process_bank_statement_import_task.apply_async(args=[imp.id])
            return Response({'detail': 'enqueued', 'import_id': imp.id, 'job_id': getattr(result, 'id', None)}, status=status.HTTP_202_ACCEPTED)
        except Exception:
            # fallback: process synchronously
            from .services import process_bank_statement_import
            process_bank_statement_import(imp.id)
            serializer = self.get_serializer(imp)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], url_path='conciliar')
    def conciliar_importacao(self, request, pk=None):
        """
        FASE 5: Converte BankTransaction → ItemExtratoBancario e executa conciliação automática.
        POST /financeiro/bank-statements/{id}/conciliar/
        """
        importacao = self.get_object()
        
        if importacao.status != 'success':
            return Response(
                {'error': 'Importação deve estar concluída (status=success) para conciliar'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Converter transações para ItemExtratoBancario
        from .services.conciliacao import ConciliacaoService
        service = ConciliacaoService()
        
        try:
            resultado = service.converter_bank_transactions(importacao, request.user)
            
            # Executar matching automático
            if resultado['itens_criados'] > 0:
                matches = service.match_automatico(importacao.conta)
                resultado['matches_automaticos'] = matches
            
            return Response(resultado, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ItemExtratoBancarioViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """
    FASE 5: ViewSet para gerenciar itens de extrato bancário e conciliação.
    """
    permission_classes = [IsAuthenticated]
    queryset = ItemExtratoBancario.objects.all().select_related(
        'conta_bancaria', 'vencimento', 'transferencia', 
        'conciliado_por', 'importado_por'
    )
    serializer_class = ItemExtratoBancarioSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['conta_bancaria', 'conciliado', 'tipo', 'data']
    search_fields = ['descricao']
    ordering_fields = ['data', 'valor', 'conciliado']
    ordering = ['-data']
    
    @action(detail=True, methods=['post'])
    def conciliar_manual(self, request, pk=None):
        """
        Concilia manualmente um item de extrato com um vencimento.
        POST /financeiro/itens-extrato/{id}/conciliar_manual/
        Body: {"vencimento_id": 123} ou {"transferencia_id": 456}
        """
        item = self.get_object()
        vencimento_id = request.data.get('vencimento_id')
        transferencia_id = request.data.get('transferencia_id')
        
        if not vencimento_id and not transferencia_id:
            return Response(
                {'error': 'vencimento_id ou transferencia_id obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .services.conciliacao import ConciliacaoService
        service = ConciliacaoService()
        
        try:
            if vencimento_id:
                service.conciliar_manual(item.id, vencimento_id, request.user)
            elif transferencia_id:
                # Implementar conciliação com transferência
                from .models import Transferencia
                transferencia = Transferencia.objects.get(id=transferencia_id)
                item.conciliar_com_transferencia(transferencia, request.user)
            
            item.refresh_from_db()
            serializer = self.get_serializer(item)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def desconciliar(self, request, pk=None):
        """
        Remove a conciliação de um item de extrato.
        POST /financeiro/itens-extrato/{id}/desconciliar/
        """
        item = self.get_object()
        
        if not item.conciliado:
            return Response(
                {'error': 'Item não está conciliado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            item.desconciliar()
            serializer = self.get_serializer(item)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def pendentes(self, request):
        """
        Lista itens de extrato pendentes de conciliação.
        GET /financeiro/itens-extrato/pendentes/?conta_bancaria=123
        """
        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset.filter(conciliado=False)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

