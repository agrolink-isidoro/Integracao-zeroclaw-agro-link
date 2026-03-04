from apps.core.mixins import TenantQuerySetMixin
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import models
from apps.core.permissions import RBACViewPermission
from .models import Vencimento, RateioCusto, RateioApproval, Financiamento, ParcelaFinanciamento, Emprestimo, ParcelaEmprestimo, ItemEmprestimo, Transferencia
from .serializers import (
    VencimentoSerializer, RateioCustoSerializer, RateioApprovalSerializer,
    FinanciamentoSerializer, ParcelaFinanciamentoSerializer,
    EmprestimoSerializer, ParcelaEmprestimoSerializer, ItemEmprestimoSerializer
)
from .services import (
    calcular_rateio_por_area, gerar_parcelas_financiamento, gerar_parcelas_emprestimo,
    atualizar_status_vencimentos, resumo_financeiro, validar_transicao_status_vencimento,
    validar_transicao_status_parcela, aprovar_rateio, bulk_atualizar_status_vencimentos,
    quitar_vencimento, bulk_quitar_vencimentos, transferir_entre_contas
)
from decimal import Decimal


class VencimentoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Vencimento"""
    rbac_module = 'financeiro'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = Vencimento.objects.all()
    serializer_class = VencimentoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'tipo', 'talhao', 'data_vencimento']
    search_fields = ['titulo', 'descricao']
    ordering_fields = ['data_vencimento', 'valor', 'criado_em']
    ordering = ['data_vencimento']

    @action(detail=True, methods=['post'])
    def marcar_pago(self, request, pk=None):
        """Marca um vencimento como pago"""
        vencimento = self.get_object()
        try:
            validar_transicao_status_vencimento(vencimento, 'pago')
            vencimento.status = 'pago'
            vencimento.data_pagamento = request.data.get('data_pagamento', None)
            vencimento.save()
            serializer = self.get_serializer(vencimento)
            return Response(serializer.data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def marcar_atrasado(self, request, pk=None):
        """Marca um vencimento como atrasado"""
        vencimento = self.get_object()
        try:
            validar_transicao_status_vencimento(vencimento, 'atrasado')
            vencimento.status = 'atrasado'
            vencimento.save()
            serializer = self.get_serializer(vencimento)
            return Response(serializer.data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def resumo_financeiro(self, request):
        """Retorna resumo financeiro"""
        data_referencia = request.query_params.get('data', None)
        if data_referencia:
            from datetime import datetime
            data_referencia = datetime.fromisoformat(data_referencia).date()

        resumo = resumo_financeiro(data_referencia)
        return Response(resumo)
    @action(detail=False, methods=['post'])
    def bulk_marcar_pago(self, request):
        """Marca múltiplos vencimentos como pagos"""
        vencimento_ids = request.data.get('ids', [])
        if not vencimento_ids:
            return Response({'error': 'Nenhum ID fornecido'}, status=status.HTTP_400_BAD_REQUEST)

        atualizados = bulk_atualizar_status_vencimentos(vencimento_ids, 'pago', request.user)
        return Response({
            'message': f'{len(atualizados)} vencimentos marcados como pagos',
            'atualizados': [v.id for v in atualizados]
        })

    @action(detail=False, methods=['post'])
    def atualizar_status_vencimentos(self, request):
        """Atualiza status de vencimentos atrasados"""
        resultado = atualizar_status_vencimentos()
        return Response({
            'message': f'{resultado["atrasados"]} vencimentos marcados como atrasados'
        })

    @action(detail=True, methods=['post'])
    def quitar(self, request, pk=None):
        """Quita (total ou parcial) um vencimento e gera o lancamento correspondente"""
        vencimento = self.get_object()
        valor = request.data.get('valor_pago', None)
        conta_id = request.data.get('conta_id', None)
        data_pagamento = request.data.get('data_pagamento', None)
        reconciliar = bool(request.data.get('reconciliar', False))
        try:
            valor_dec = Decimal(str(valor)) if valor is not None else None
            lanc = quitar_vencimento(vencimento, request.user, valor_pago=valor_dec, conta_id=conta_id, data_pagamento=data_pagamento, reconciliar=reconciliar)
            from .serializers import LancamentoFinanceiroSerializer
            lanc_ser = LancamentoFinanceiroSerializer(lanc)
            venc_ser = self.get_serializer(vencimento)
            return Response({'vencimento': venc_ser.data, 'lancamento': lanc_ser.data})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def bulk_quitar(self, request):
        """Quitar múltiplos vencimentos em lote"""
        ids = request.data.get('ids', [])
        conta_id = request.data.get('conta_id', None)
        data_pag = request.data.get('data_pagamento', None)
        reconciliar = bool(request.data.get('reconciliar', False))
        if not ids:
            return Response({'error': 'Nenhum ID fornecido'}, status=status.HTTP_400_BAD_REQUEST)
        resultado = bulk_quitar_vencimentos(ids, request.user, conta_id=conta_id, data_pagamento=data_pag, reconciliar=reconciliar)
        return Response(resultado)

    @action(detail=False, methods=['post'])
    def quitar_por_transferencia(self, request):
        """Quitar um ou vários vencimentos por transferência (DOC/TED/PIX/Interno)"""
        from .serializers import QuitarPorTransferenciaSerializer, TransferenciaSerializer
        from .services import pagar_vencimentos_por_transferencia

        ser = QuitarPorTransferenciaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        try:
            transfer = pagar_vencimentos_por_transferencia(
                conta_origem=data['conta_origem'],
                itens=data['itens'],
                tipo=data['tipo_transferencia'],
                dados_bancarios=data.get('dados_bancarios', {}),
                criado_por=request.user,
                client_tx_id=data.get('client_tx_id'),
                descricao=data.get('descricao')
            )
            out = TransferenciaSerializer(transfer)
            return Response(out.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RateioCustoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para RateioCusto"""
    rbac_module = 'financeiro'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = RateioCusto.objects.select_related('approval', 'approval__aprovado_por').all()
    serializer_class = RateioCustoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['data_rateio', 'safra', 'centro_custo', 'destino', 'driver_de_rateio']
    search_fields = ['titulo', 'descricao']
    ordering_fields = ['data_rateio', 'valor_total', 'criado_em']
    ordering = ['-data_rateio']

    @action(detail=True, methods=['post'])
    def recalcular(self, request, pk=None):
        """Recalcula o rateio baseado nas áreas atuais"""
        rateio = self.get_object()
        calcular_rateio_por_area(rateio)
        serializer = self.get_serializer(rateio)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def gerar_vencimento(self, request, pk=None):
        """Gera um vencimento a partir do rateio.
        Payload opcional:
            - data_vencimento: Data do vencimento (default: hoje + 30 dias)
            - descricao: Descrição adicional
        """
        from django.contrib.contenttypes.models import ContentType
        from datetime import timedelta

        rateio = self.get_object()

        # Validate rateio has value
        if not rateio.valor_total or rateio.valor_total <= 0:
            return Response({'error': 'Rateio sem valor para gerar vencimento'}, status=status.HTTP_400_BAD_REQUEST)

        # Parse data_vencimento or default to 30 days from now
        data_vencimento_str = request.data.get('data_vencimento')
        if data_vencimento_str:
            from datetime import datetime
            data_vencimento = datetime.strptime(data_vencimento_str, '%Y-%m-%d').date()
        else:
            data_vencimento = timezone.now().date() + timedelta(days=30)

        descricao = request.data.get('descricao', f'Vencimento do Rateio: {rateio.titulo or rateio.id}')

        # Create vencimento linked to rateio via GenericForeignKey
        vencimento = Vencimento.objects.create(
            titulo=rateio.titulo or f'Rateio #{rateio.id}',
            descricao=descricao,
            valor=rateio.valor_total,
            data_vencimento=data_vencimento,
            status='pendente',
            origem_content_type=ContentType.objects.get_for_model(rateio),
            origem_object_id=rateio.id,
            criado_por=request.user,
            tenant=request.user.tenant  # FIX: Ensure tenant isolation
        )

        from .serializers import VencimentoSerializer
        return Response(VencimentoSerializer(vencimento).data, status=status.HTTP_201_CREATED)


class RateioApprovalViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    rbac_module = 'financeiro'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = RateioApproval.objects.all().select_related('rateio', 'criado_por', 'aprovado_por')
    serializer_class = RateioApprovalSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        obj = self.get_object()
        # Permission check: allow financeiro.rateio_approver group members or admin users
        is_approver = request.user.groups.filter(name='financeiro.rateio_approver').exists() or request.user.is_staff or request.user.is_superuser
        if not is_approver:
            return Response({'detail': 'Forbidden'}, status=403)
        try:
            aprovar_rateio(obj, request.user, comentario=request.data.get('comentario'))
            return Response({'status': 'approved'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        obj = self.get_object()
        is_approver = request.user.groups.filter(name='financeiro.rateio_approver').exists() or request.user.is_staff or request.user.is_superuser
        if not is_approver:
            return Response({'detail': 'Forbidden'}, status=403)
        obj.reject(request.user, comentario=request.data.get('comentario'))
        return Response({'status': 'rejected'})

    @action(detail=False, methods=['get'], url_path='permissions')
    def permissions(self, request):
        """Retorna permissões relacionadas a aprovações de rateio para o usuário atual"""
        is_approver = request.user.groups.filter(name='financeiro.rateio_approver').exists() or request.user.is_staff or request.user.is_superuser
        return Response({
            'can_approve': bool(is_approver),
            'can_reject': bool(is_approver)
        })

class FinanciamentoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Financiamento"""
    rbac_module = 'financeiro'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = Financiamento.objects.all()
    serializer_class = FinanciamentoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'tipo_financiamento', 'talhao', 'instituicao_financeira']
    search_fields = ['titulo', 'descricao']
    ordering_fields = ['data_contratacao', 'valor_financiado', 'criado_em']
    ordering = ['-data_contratacao']

    def perform_create(self, serializer):
        # Ensure the creator is recorded (avoids ValidationError on full_clean)
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())

    @action(detail=True, methods=['post'])
    def gerar_parcelas(self, request, pk=None):
        """Gera parcelas automaticamente baseado no prazo"""
        financiamento = self.get_object()

        try:
            gerar_parcelas_financiamento(financiamento)
            serializer = self.get_serializer(financiamento)
            return Response(serializer.data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def resumo_financiamentos(self, request):
        """Retorna resumo dos financiamentos"""
        resumo = resumo_financeiro()
        return Response({
            'resumo': resumo['financiamentos']
        })


class ParcelaFinanciamentoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para ParcelaFinanciamento"""
    rbac_module = 'financeiro'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = ParcelaFinanciamento.objects.all()
    serializer_class = ParcelaFinanciamentoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'financiamento', 'data_vencimento']
    search_fields = ['financiamento__titulo']


class TransferenciaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Transferências entre contas"""
    rbac_module = 'financeiro'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = Transferencia.objects.all()
    serializer_class = __import__('apps.financeiro.serializers', fromlist=['TransferenciaSerializer']).TransferenciaSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Locate optional origin/destino generic relations if provided
        origem_ct = data.get('origem_content_type')
        origem_obj = data.get('origem_object_id')
        destino_ct = data.get('destino_content_type')
        destino_obj = data.get('destino_object_id')

        # Handle fornecedor_id convenience field: set destino GenericFK to Fornecedor
        fornecedor_id = data.pop('fornecedor_id', None)
        if fornecedor_id and not destino_ct:
            from django.contrib.contenttypes.models import ContentType
            from apps.comercial.models import Fornecedor
            try:
                fornecedor = Fornecedor.objects.get(pk=fornecedor_id)
                destino_ct = ContentType.objects.get_for_model(Fornecedor)
                destino_obj = fornecedor.pk
                # Auto-fill PIX key from fornecedor if transfer type is PIX and no key provided
                if data.get('tipo_transferencia') == 'pix' and not data.get('pix_key_destino') and fornecedor.chave_pix:
                    data['pix_key_destino'] = fornecedor.chave_pix
            except Fornecedor.DoesNotExist:
                from rest_framework import status as rf_status
                return Response({'fornecedor_id': 'Fornecedor não encontrado.'}, status=rf_status.HTTP_400_BAD_REQUEST)

        transfer = transferir_entre_contas(
            conta_origem=data['conta_origem'],
            conta_destino=data.get('conta_destino'),
            valor=data['valor'],
            tipo=data.get('tipo_transferencia', 'interno'),
            criado_por=request.user,
            descricao=data.get('descricao'),
            pix_key_origem=data.get('pix_key_origem'),
            pix_key_destino=data.get('pix_key_destino'),
            origem_ct=origem_ct, origem_obj=origem_obj,
            destino_ct=destino_ct, destino_obj=destino_obj
        )

        out_ser = self.get_serializer(transfer)
        headers = self.get_success_headers(out_ser.data)
        return Response(out_ser.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def mark_settled(self, request, pk=None):
        """Marca uma transferência pendente como liquidada (settled)."""
        from .services import marcar_transferencia_settled
        transfer = self.get_object()
        external_reference = request.data.get('external_reference')
        taxa_bancaria = request.data.get('taxa_bancaria')
        payment_metadata = request.data.get('payment_metadata')
        settlement_date = request.data.get('settlement_date', None)

        try:
            trans = marcar_transferencia_settled(transfer, settlement_date=settlement_date, external_reference=external_reference, taxa_bancaria=taxa_bancaria, payment_metadata=payment_metadata, criado_por=request.user)
            out = self.get_serializer(trans)
            return Response(out.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    ordering_fields = ['data_vencimento', 'numero_parcela', 'valor_parcela']
    ordering = ['data_vencimento']


class ContaBancariaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """CRUD simples para Contas Bancárias"""
    rbac_module = 'financeiro'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    from .models import ContaBancaria
    queryset = ContaBancaria.objects.all()

    from .serializers import ContaBancariaSerializer
    serializer_class = ContaBancariaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['banco', 'agencia', 'conta', 'ativo']
    search_fields = ['banco', 'conta']
    ordering = ['banco', 'conta']

    def destroy(self, request, *args, **kwargs):
        """Delete a ContaBancaria, handling related objects with PROTECT constraints"""
        conta = self.get_object()
        
        try:
            # Delete related Transferencias that reference this account
            from .models import Transferencia
            Transferencia.objects.filter(conta_origem=conta).delete()
            Transferencia.objects.filter(conta_destino=conta).delete()
            
            # Delete the account itself
            conta.delete()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception('Erro ao deletar conta %s: %s', conta.id, e)
            return Response(
                {'detail': f'Erro ao deletar conta: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def extrato(self, request, pk=None):
        """Retorna saldo atual, lançamentos e transações importadas para a conta"""
        from .models import ContaBancaria, LancamentoFinanceiro, BankTransaction
        from .serializers import LancamentoFinanceiroSerializer, BankTransactionSerializer

        conta = self.get_object()

        # filtros opcionais
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        reconciled = request.query_params.get('reconciled')

        lanc_qs = LancamentoFinanceiro.objects.filter(conta=conta).order_by('-data', '-id')
        tx_qs = BankTransaction.objects.filter(importacao__conta=conta).order_by('-date', '-id')

        if start:
            lanc_qs = lanc_qs.filter(data__gte=start)
            tx_qs = tx_qs.filter(date__gte=start)
        if end:
            lanc_qs = lanc_qs.filter(data__lte=end)
            tx_qs = tx_qs.filter(date__lte=end)
        if reconciled is not None:
            if reconciled.lower() in ['1','true','yes']:
                lanc_qs = lanc_qs.filter(reconciled=True)
            elif reconciled.lower() in ['0','false','no']:
                lanc_qs = lanc_qs.filter(reconciled=False)

        try:
            # compute balance
            entradas = lanc_qs.filter(tipo='entrada').aggregate(total=models.Sum('valor'))['total'] or 0
            saidas = lanc_qs.filter(tipo='saida').aggregate(total=models.Sum('valor'))['total'] or 0
            current_balance = (conta.saldo_inicial or 0) + entradas - saidas

            # limit to 200 rows for performance
            lanc = LancamentoFinanceiroSerializer(lanc_qs[:200], many=True)
            tx = BankTransactionSerializer(tx_qs[:200], many=True)

            # ensure balance is serialized as string to avoid Decimal issues
            return Response({
                'conta_id': conta.id,
                'saldo': str(current_balance) if current_balance is not None else None,
                'lancamentos': lanc.data,
                'bank_transactions': tx.data,
            })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception('Erro no endpoint extrato para conta %s: %s', getattr(conta, 'id', '?'), e)
            return Response({'detail': 'Erro interno ao gerar extrato: ' + str(e)}, status=500)



class LancamentoFinanceiroViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para LancamentoFinanceiro (Livro Caixa)"""
    rbac_module = 'financeiro'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    from .models import LancamentoFinanceiro
    queryset = LancamentoFinanceiro.objects.all().order_by('-data', '-id')

    from .serializers import LancamentoFinanceiroSerializer
    serializer_class = LancamentoFinanceiroSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['conta', 'data', 'tipo', 'reconciled']
    search_fields = ['descricao']
    ordering_fields = ['data', 'valor', 'id']
    ordering = ['-data', '-id']

    def get_queryset(self):
        qs = super().get_queryset()
        # suporta filtros por intervalo de datas via query params data__gte e data__lte
        data_gte = self.request.query_params.get('data__gte')
        data_lte = self.request.query_params.get('data__lte')
        conta = self.request.query_params.get('conta')
        reconciled = self.request.query_params.get('reconciled')
        tipo = self.request.query_params.get('tipo')

        if conta:
            qs = qs.filter(conta_id=conta)
        if data_gte:
            qs = qs.filter(data__gte=data_gte)
        if data_lte:
            qs = qs.filter(data__lte=data_lte)
        if reconciled is not None:
            if reconciled.lower() in ['1','true','yes']:
                qs = qs.filter(reconciled=True)
            elif reconciled.lower() in ['0','false','no']:
                qs = qs.filter(reconciled=False)
        if tipo:
            # tipo support comma separated
            tipos = [t.strip() for t in tipo.split(',') if t.strip()]
            if tipos:
                qs = qs.filter(tipo__in=tipos)
        return qs

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        """Marca ou desmarca o lançamento como reconciliado.
        Payload: { "reconciled": true|false }
        """
        lanc = self.get_object()
        reconciled = request.data.get('reconciled')
        if reconciled is None:
            return Response({'error': 'Campo reconciled obrigatório'}, status=400)
        try:
            reconciled_bool = bool(reconciled) if not isinstance(reconciled, str) else reconciled.lower() in ['1','true','yes']
            lanc.reconciled = reconciled_bool
            from django.utils import timezone
            lanc.reconciled_at = timezone.now() if reconciled_bool else None
            lanc.save()
            ser = self.get_serializer(lanc)
            return Response(ser.data)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=False, methods=['get'])
    def fluxo_caixa(self, request):
        """Retorna fluxo de caixa agregado por mês para um ano.
        Query params:
            - ano: Ano (default: ano atual)
            - centro_custo: ID do centro de custo (opcional)
            - conta: ID da conta bancária (opcional)
        """
        from django.db.models import Sum, Case, When, Value, DecimalField
        from django.db.models.functions import TruncMonth, ExtractMonth
        from django.utils import timezone
        from decimal import Decimal

        ano = int(request.query_params.get('ano', timezone.now().year))
        centro_custo_id = request.query_params.get('centro_custo')
        conta_id = request.query_params.get('conta')

        # Base queryset filtered by year
        qs = self.get_queryset().filter(data__year=ano)

        # Optional filter by conta
        if conta_id:
            qs = qs.filter(conta_id=conta_id)

        # Optional filter by centro_custo (via rateio relationship if available)
        # For now we include all lancamentos; centro_custo filtering can be extended later
        # if there's a FK on LancamentoFinanceiro to RateioCusto

        # Aggregate by month
        monthly_data = qs.annotate(
            mes=ExtractMonth('data')
        ).values('mes').annotate(
            receitas=Sum(
                Case(
                    When(tipo='entrada', then='valor'),
                    default=Value(Decimal('0.00')),
                    output_field=DecimalField(max_digits=15, decimal_places=2)
                )
            ),
            despesas=Sum(
                Case(
                    When(tipo='saida', then='valor'),
                    default=Value(Decimal('0.00')),
                    output_field=DecimalField(max_digits=15, decimal_places=2)
                )
            )
        ).order_by('mes')

        # Build full 12-month response
        meses_nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        result = []
        monthly_dict = {item['mes']: item for item in monthly_data}

        for i in range(1, 13):
            item = monthly_dict.get(i, {'receitas': Decimal('0.00'), 'despesas': Decimal('0.00')})
            receitas = item['receitas'] or Decimal('0.00')
            despesas = item['despesas'] or Decimal('0.00')
            saldo = receitas - despesas
            result.append({
                'mes': meses_nomes[i - 1],
                'mes_numero': i,
                'receitas': float(receitas),
                'despesas': float(despesas),
                'saldo': float(saldo)
            })

        return Response(result)


class CreditCardViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """CRUD para Cartões de Crédito"""
    rbac_module = 'financeiro'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    from .models import CreditCard
    queryset = CreditCard.objects.all().order_by('-criado_em')

    from .serializers import CreditCardSerializer
    serializer_class = CreditCardSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['conta', 'bandeira', 'ativo']
    search_fields = ['numero_last4', 'bandeira']
    ordering_fields = ['criado_em']
    ordering = ['-criado_em']

    def create(self, request, *args, **kwargs):
        """Wrap create to log unexpected errors and return safer response"""
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            # Import logger lazily
            import logging
            logger = logging.getLogger(__name__)
            logger.exception('Error creating CreditCard: %s', e)
            return Response({'detail': 'Erro interno ao salvar cartão. Verifique logs do servidor.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def transacoes(self, request, pk=None):
        """Lista transações do cartão, com filtro opcional por faturado."""
        card = self.get_object()
        from .models import TransacaoCartao
        from .serializers import TransacaoCartaoSerializer
        qs = TransacaoCartao.objects.filter(cartao=card).order_by('-data', '-id')
        faturado = request.query_params.get('faturado')
        if faturado is not None:
            qs = qs.filter(faturado=faturado.lower() in ['1', 'true', 'yes'])
        serializer = TransacaoCartaoSerializer(qs[:200], many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def gerar_fatura(self, request, pk=None):
        """Gera um Vencimento (fatura) para todas as transações não faturadas do cartão.

        Opcionalmente aceita:
        - mes/ano: para filtrar transações de um mês específico
        - data_vencimento: data do vencimento (default: dia_vencimento_fatura do cartão no próximo mês)
        """
        card = self.get_object()
        from .models import TransacaoCartao, Vencimento
        from django.db.models import Sum
        import datetime

        # Optional date filter
        mes = request.data.get('mes')
        ano = request.data.get('ano')

        qs = card.transacoes.filter(faturado=False)
        if mes and ano:
            qs = qs.filter(data__month=int(mes), data__year=int(ano))

        if not qs.exists():
            return Response({'detail': 'Nenhuma transação pendente para faturar.'}, status=status.HTTP_400_BAD_REQUEST)

        total = qs.aggregate(total=Sum('valor'))['total'] or 0
        count = qs.count()

        # Determine vencimento date
        data_vencimento_str = request.data.get('data_vencimento')
        if data_vencimento_str:
            data_vencimento = datetime.datetime.strptime(data_vencimento_str, '%Y-%m-%d').date()
        else:
            # Default: dia_vencimento_fatura of next month
            today = datetime.date.today()
            dia = card.dia_vencimento_fatura or 10
            if today.month == 12:
                data_vencimento = datetime.date(today.year + 1, 1, min(dia, 28))
            else:
                import calendar
                max_day = calendar.monthrange(today.year, today.month + 1)[1]
                data_vencimento = datetime.date(today.year, today.month + 1, min(dia, max_day))

        # Create Vencimento
        vencimento = Vencimento.objects.create(
            titulo=f'Fatura {card} - {count} transação(ões)',
            descricao=f'Fatura gerada automaticamente com {count} transações totalizando R$ {total:.2f}',
            valor=total,
            data_vencimento=data_vencimento,
            tipo='despesa',
            conta_bancaria=card.conta,
            criado_por=request.user,
            tenant=request.user.tenant  # FIX: Ensure tenant isolation
        )

        # Mark transactions as billed
        qs.update(faturado=True, vencimento_fatura=vencimento)

        # Recalculate balance
        card.recalcular_saldo_devedor()

        from .serializers import VencimentoSerializer
        return Response({
            'vencimento': VencimentoSerializer(vencimento).data,
            'transacoes_faturadas': count,
            'valor_total': float(total),
        }, status=status.HTTP_201_CREATED)


class EmprestimoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Emprestimo"""
    rbac_module = 'financeiro'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = Emprestimo.objects.all()
    serializer_class = EmprestimoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'tipo_emprestimo', 'talhao', 'instituicao_financeira']
    search_fields = ['titulo', 'descricao']
    ordering_fields = ['data_contratacao', 'valor_emprestimo', 'criado_em']
    ordering = ['-data_contratacao']

    def perform_create(self, serializer):
        # Ensure the creator is recorded (keeps behavior consistent with Financiamento)
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())

    @action(detail=True, methods=['post'])
    def gerar_parcelas(self, request, pk=None):
        """Gera parcelas automaticamente baseado no prazo"""
        emprestimo = self.get_object()

        try:
            gerar_parcelas_emprestimo(emprestimo)
            serializer = self.get_serializer(emprestimo)
            return Response(serializer.data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def resumo_emprestimos(self, request):
        """Retorna resumo dos empréstimos"""
        resumo = resumo_financeiro()
        return Response({
            'resumo': resumo['emprestimos']
        })


class ParcelaEmprestimoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para ParcelaEmprestimo"""
    rbac_module = 'financeiro'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = ParcelaEmprestimo.objects.all()
    serializer_class = ParcelaEmprestimoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'emprestimo', 'data_vencimento']
    search_fields = ['emprestimo__titulo']
    ordering_fields = ['data_vencimento', 'numero_parcela', 'valor_parcela']
    ordering = ['data_vencimento']

    @action(detail=True, methods=['post'])
    def marcar_pago(self, request, pk=None):
        """Marca uma parcela como paga"""
        parcela = self.get_object()
        try:
            validar_transicao_status_parcela(parcela, 'pago')
            parcela.status = 'pago'
            parcela.data_pagamento = request.data.get('data_pagamento', None)
            parcela.valor_pago = parcela.valor_parcela
            parcela.save()
            serializer = self.get_serializer(parcela)
            return Response(serializer.data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ItemEmprestimoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para ItemEmprestimo - Produtos vinculados a empréstimos"""
    rbac_module = 'financeiro'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = ItemEmprestimo.objects.select_related('emprestimo', 'produto')
    serializer_class = ItemEmprestimoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['emprestimo', 'produto', 'status']
    search_fields = ['produto__nome', 'emprestimo__titulo']
    ordering_fields = ['criado_em', 'quantidade', 'valor_total']
    ordering = ['-criado_em']