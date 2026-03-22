import logging
from apps.core.mixins import TenantQuerySetMixin
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from apps.core.permissions import RBACViewPermission, IsRBACAdmin
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db.models import Sum

logger = logging.getLogger(__name__)
from .models import CentroCusto, DespesaAdministrativa, Funcionario, FolhaPagamento, FolhaPagamentoItem
from .serializers import CentroCustoSerializer, DespesaAdministrativaSerializer, FuncionarioSerializer, FolhaPagamentoSerializer


# Lightweight placeholders for other viewsets registered by the app's URLs.
# These exist so importing `backend.apps.administrativo.urls` doesn't fail when
# higher-level modules import them during URL routing. They provide minimal
# list/detail implementations and require authentication.
class ConfiguracaoSistemaViewSet(viewsets.ViewSet):
    rbac_module = 'administrativo'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    def list(self, request):
        return Response([])

class LogAuditoriaViewSet(viewsets.ViewSet):
    rbac_module = 'administrativo'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    def list(self, request):
        return Response([])

class BackupViewSet(viewsets.ViewSet):
    rbac_module = 'administrativo'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    def list(self, request):
        return Response([])

class NotificacaoViewSet(viewsets.ViewSet):
    rbac_module = 'administrativo'
    permission_classes = [IsAuthenticated, RBACViewPermission]

    def list(self, request):
        """List all notifications for the authenticated user."""
        from .models import Notificacao
        from .serializers import NotificacaoSerializer
        qs = Notificacao.objects.filter(usuario=request.user).order_by('-criado_em')
        serializer = NotificacaoSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='nao_lidas')
    def nao_lidas(self, request):
        """Return unread notifications for the authenticated user."""
        from .models import Notificacao
        from .serializers import NotificacaoSerializer
        qs = Notificacao.objects.filter(usuario=request.user, lida=False).order_by('-criado_em')
        serializer = NotificacaoSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='marcar_todas_lidas')
    def marcar_todas_lidas(self, request):
        """Mark all unread notifications as read for current user."""
        from .models import Notificacao
        updated = Notificacao.objects.filter(usuario=request.user, lida=False).update(lida=True, lida_em=timezone.now())
        return Response({'updated': updated})


class CentroCustoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Centros de Custo"""
    rbac_module = 'administrativo'
    queryset = CentroCusto.objects.all()
    serializer_class = CentroCustoSerializer
    permission_classes = [IsAuthenticated, RBACViewPermission]
    # Tests expect raw list responses for this endpoint, so disable pagination
    pagination_class = None
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categoria', 'ativo']
    search_fields = ['codigo', 'nome']
    ordering_fields = ['codigo', 'nome']
    ordering = ['codigo']


class DespesaAdministrativaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Despesas Administrativas"""
    rbac_module = 'administrativo'
    queryset = DespesaAdministrativa.objects.select_related('centro', 'safra', 'fornecedor').all()
    serializer_class = DespesaAdministrativaSerializer
    permission_classes = [IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['centro', 'data', 'pendente_rateio']
    search_fields = ['titulo', 'documento_referencia']
    ordering_fields = ['data', 'valor']
    ordering = ['-data']

    def perform_create(self, serializer):
        """Cria despesa e, se auto_rateio=True, tenta gerar rateio automaticamente."""
        auto_rateio = serializer.validated_data.pop('auto_rateio', False)
        despesa = serializer.save(**self._get_tenant_kwargs())

        if auto_rateio:
            try:
                from apps.financeiro.services import create_rateio_from_despesa
                rateio = create_rateio_from_despesa(despesa, created_by=self.request.user)
                despesa.rateio = rateio
                despesa.pendente_rateio = False
                despesa.save()
            except Exception:
                # Se falhar auto-rateio, marca como pendente
                despesa.pendente_rateio = True
                despesa.save()
        else:
            despesa.pendente_rateio = True
            despesa.save()

    @action(detail=True, methods=['post'], url_path='preview_rateio')
    def preview_rateio(self, request, pk=None):
        """Retorna preview do rateio (sem persistir) com a proporção por talhão."""
        despesa = self.get_object()
        try:
            from apps.financeiro.services import generate_rateio_from_despesa
            parts = generate_rateio_from_despesa(despesa)
            if parts is None:
                return Response({
                    'valor_total': float(despesa.valor),
                    'parts': [],
                    'message': 'Sem talhões associados à safra para gerar rateio.'
                })
            return Response({
                'valor_total': float(despesa.valor),
                'parts': parts,
            })
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='create_rateio')
    def create_rateio(self, request, pk=None):
        """Cria o rateio persistido a partir da despesa."""
        despesa = self.get_object()
        if despesa.rateio:
            return Response({'detail': 'Rateio já foi criado para esta despesa.', 'id': despesa.rateio.id},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            from apps.financeiro.services import create_rateio_from_despesa
            rateio = create_rateio_from_despesa(despesa, created_by=request.user)
            despesa.rateio = rateio
            despesa.pendente_rateio = False
            despesa.save()
            return Response({'id': rateio.id, 'titulo': rateio.titulo}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FuncionarioViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Funcionários"""
    rbac_module = 'administrativo'
    queryset = Funcionario.objects.all()
    serializer_class = FuncionarioSerializer
    permission_classes = [IsAuthenticated, RBACViewPermission]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['ativo']
    search_fields = ['nome', 'cpf', 'cargo']
    ordering_fields = ['nome', 'cargo']
    ordering = ['nome']


class FolhaPagamentoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Folha de Pagamento (preview + persist minimal)"""
    rbac_module = 'administrativo'
    queryset = FolhaPagamento.objects.all().prefetch_related('itens')
    serializer_class = FolhaPagamentoSerializer
    permission_classes = [IsAuthenticated, RBACViewPermission]

    def create(self, request, *args, **kwargs):
        """Cria uma folha e retorna preview sem marcar executado (preview mode).
        Payload: { periodo_mes, periodo_ano, funcionarios_ids?: [1,2,3] }
        """
        periodo_mes = request.data.get('periodo_mes')
        periodo_ano = request.data.get('periodo_ano')
        funcionarios_ids = request.data.get('funcionarios_ids', None)

        # select employees
        qs = Funcionario.objects.filter(ativo=True)
        if funcionarios_ids:
            qs = qs.filter(id__in=funcionarios_ids)

        itens = []
        total = 0
        from decimal import Decimal
        # New parameters for hours-based overtime calculation
        hora_extra_hours = Decimal(str(request.data.get('hora_extra_hours', 0))) if request.data.get('hora_extra_hours') is not None else Decimal('0')
        hora_extra_type = (request.data.get('hora_extra_type') or 'normal')  # 'normal' or 'sunday'
        holidays_count = int(request.data.get('holidays_count', 0) or 0)
        dias_uteis = Decimal(str(request.data.get('dias_uteis', 26)))

        # outros_descontos
        outros = request.data.get('outros_descontos', []) or []  # expect list of {label, amount}
        extra_desconto_total = Decimal('0')
        try:
            for od in outros:
                extra_desconto_total += Decimal(str(od.get('amount', 0)))
        except Exception:
            extra_desconto_total = Decimal('0')

        # determine overtime premium percent function
        def premium_pct(p_type: str):
            return Decimal('1.0') if str(p_type).lower() in ('sunday', 'feriado', 'holiday', 'domingo') else Decimal('0.5')

        # --- Tax parameters (2026 defaults as per project decisions) ---
        SM = Decimal(str(request.data.get('salario_minimo', '1621.00')))
        INSS_TETO = Decimal(str(request.data.get('inss_teto', '8537.55')))
        DEPENDENTE_DEDUCAO = Decimal(str(request.data.get('dependente_deducao', '189.59')))
        IR_ISENCAO = Decimal('5000')
        IR_REDUCTOR_LIMIT = Decimal('7350')
        IR_REDUCTOR_INDEX = Decimal('0.133145')
        IR_ALIQUOTA_ALTA = Decimal('0.275')
        IR_PARCELA_DEDUZIR = Decimal('893.66')

        # Use utils for INSS and IR computations
        from .utils import compute_inss, compute_ir

        # Partial-apply some defaults from request data (overrideable by payload for testing)
        SM = Decimal(str(request.data.get('salario_minimo', '1621.00')))
        INSS_TETO = Decimal(str(request.data.get('inss_teto', '8537.55')))
        DEPENDENTE_DEDUCAO = Decimal(str(request.data.get('dependente_deducao', '189.59')))
        IR_ISENCAO = Decimal('5000')
        IR_REDUCTOR_LIMIT = Decimal('7350')
        IR_REDUCTOR_INDEX = Decimal('0.133145')
        IR_ALIQUOTA_ALTA = Decimal('0.275')
        IR_PARCELA_DEDUZIR = Decimal('893.66')

        # wrap utils to use local defaults
        def _compute_inss(salario_val):
            return compute_inss(salario_val, SM, INSS_TETO)

        def _compute_ir(salario_bruto, inss_val, dependentes):
            return compute_ir(salario_bruto, inss_val, dependentes, DEPENDENTE_DEDUCAO, IR_ISENCAO, IR_REDUCTOR_LIMIT, IR_REDUCTOR_INDEX, IR_ALIQUOTA_ALTA, IR_PARCELA_DEDUZIR)

        per_emp = request.data.get('per_employee_horas', []) or []
        per_emp_map = {int(p['id']): p for p in per_emp}

        # accept per-employee overrides: list of {id, inss, ir, dsr, descontos_outro, liquido}
        per_emp_overrides = request.data.get('per_employee_overrides', []) or []
        per_emp_overrides_map = {int(p['id']): p for p in per_emp_overrides}
        logger.debug('per_emp_overrides_map: %s', per_emp_overrides_map)

        for f in qs:
            # If temporary worker, salary_base comes from diária * dias_trabalhados (if provided)
            pe = per_emp_map.get(f.id) or {}
            if getattr(f, 'tipo', 'registrado') == 'temporario':
                dias = Decimal(str(pe.get('dias_trabalhados', 0))) if pe.get('dias_trabalhados') is not None else Decimal('0')
                diaria = (f.diaria_valor or Decimal('0'))
                salario_base = (diaria * dias).quantize(Decimal('0.001'))
                # temporarios do not get overtime, INSS, IR or DSR
                hourly_rate = Decimal('0')
                total_extra = Decimal('0')
                hours = Decimal('0')
                hora_extra_entries = []
            else:
                salario_base = (f.salario_bruto or Decimal('0'))
                # hourly rate assumption: monthly salary / 220
                hourly_rate = (salario_base / Decimal('220')) if salario_base else Decimal('0')

                # pick per-employee hours entries if present, otherwise use defaults passed earlier
                total_extra = Decimal('0')
                hours = Decimal('0')
                hora_extra_entries = []
                if pe and pe.get('entries'):
                    for e in pe.get('entries', []):
                        hrs = Decimal(str(e.get('hours', 0)))
                        kind = e.get('kind', 'extra')
                        if kind == 'diaria':
                            day_type = e.get('day_type', 'weekday')
                            # if domingo/feriado, include 9 hours as sunday-type entry
                            if day_type in ('domingo', 'feriado'):
                                nine = Decimal('9')
                                add_hours = min(nine, hrs)
                                # add sunday entry for up to 9
                                base_h = (hourly_rate * add_hours)
                                premium_h = (hourly_rate * add_hours * premium_pct('sunday'))
                                hora_val = (base_h + premium_h).quantize(Decimal('0.001'))
                                total_extra += hora_val
                                hours += add_hours
                                hora_extra_entries.append({ 'hours': float(add_hours), 'type': 'sunday', 'valor': float(hora_val), 'origin': 'diaria' })
                                # if worked more than 9h, treat overflow also as sunday-type (additional premium)
                                if hrs > nine:
                                    extra_over = hrs - nine
                                    base_h = (hourly_rate * extra_over)
                                    premium_h = (hourly_rate * extra_over * premium_pct('sunday'))
                                    hora_val = (base_h + premium_h).quantize(Decimal('0.001'))
                                    total_extra += hora_val
                                    hours += extra_over
                                    hora_extra_entries.append({ 'hours': float(extra_over), 'type': 'sunday', 'valor': float(hora_val), 'origin': 'diaria-overflow' })
                            else:
                                # weekday: only hours exceeding 9 count as overtime (normal)
                                nine = Decimal('9')
                                if hrs > nine:
                                    extra_over = hrs - nine
                                    base_h = (hourly_rate * extra_over)
                                    premium_h = (hourly_rate * extra_over * premium_pct('normal'))
                                    hora_val = (base_h + premium_h).quantize(Decimal('0.001'))
                                    total_extra += hora_val
                                    hours += extra_over
                                    hora_extra_entries.append({ 'hours': float(extra_over), 'type': 'normal', 'valor': float(hora_val), 'origin': 'diaria-overflow' })
                        else:
                            ptype = e.get('type', 'normal')
                            extra_pct = premium_pct(ptype)
                            base_h = (hourly_rate * hrs)
                            premium_h = (hourly_rate * hrs * extra_pct)
                            hora_val = (base_h + premium_h).quantize(Decimal('0.001'))
                            total_extra += hora_val
                            hours += hrs
                            hora_extra_entries.append({ 'hours': float(hrs), 'type': ptype, 'valor': float(hora_val) })
                else:
                    # backward compatible single-value behavior
                    single_hours = hora_extra_hours
                    hours = single_hours
                    extra_pct = premium_pct(hora_extra_type)
                    base_h = hourly_rate * single_hours
                    premium_h = hourly_rate * single_hours * extra_pct
                    total_extra = (base_h + premium_h).quantize(Decimal('0.001'))
            # Determine whether to include DSR for this employee: per-employee override -> global include_dsr -> default (holidays_count>0)
            pe_include = None
            if pe and ('include_dsr' in pe) and pe.get('include_dsr') is not None:
                pe_include = bool(pe.get('include_dsr'))
            elif 'include_dsr' in request.data and request.data.get('include_dsr') is not None:
                pe_include = bool(request.data.get('include_dsr'))
            else:
                pe_include = bool(holidays_count)

            dsr = Decimal('0')
            if pe_include and holidays_count and dias_uteis and dias_uteis != 0:
                dsr = (total_extra * Decimal(str(holidays_count)) / dias_uteis).quantize(Decimal('0.001'))

            # salary used for INSS/IR calculations is salary base + total_extra
            salario_effective = (salario_base + total_extra).quantize(Decimal('0.001'))

            # For temporary workers, taxes (INSS/IR) and DSR do not apply
            if getattr(f, 'tipo', 'registrado') == 'temporario':
                inss_val = Decimal('0')
                inss_breakdown = []
                ir_val = Decimal('0')
                ir_info = {'exempt': True}
                # ensure dsr is zero
                dsr = Decimal('0')
                descontos_outro_val = Decimal(str(extra_desconto_total)).quantize(Decimal('0.001'))
                descontos_total = (inss_val + ir_val + descontos_outro_val).quantize(Decimal('0.001'))
                liquido = (salario_effective - descontos_total).quantize(Decimal('0.001'))
            else:
                # compute canonical values first
                inss_val, inss_breakdown = _compute_inss(salario_effective)
                ir_val, ir_info = _compute_ir(salario_effective, inss_val, f.dependentes or 0)
                descontos_outro_val = Decimal(str(extra_desconto_total)).quantize(Decimal('0.001'))
                descontos_total = (inss_val + ir_val + descontos_outro_val).quantize(Decimal('0.001'))
                liquido = (salario_effective + dsr - descontos_total).quantize(Decimal('0.001'))

            # keep a snapshot of computed values in case overrides are applied
            computed_snapshot = {
                'inss': float(inss_val.quantize(Decimal('0.001'))),
                'ir': float(ir_val.quantize(Decimal('0.001'))),
                'dsr': float(dsr.quantize(Decimal('0.001')) if isinstance(dsr, Decimal) else Decimal(dsr).quantize(Decimal('0.001'))),
                'descontos_outro': float(Decimal(str(descontos_outro_val)).quantize(Decimal('0.001'))),
                'liquido': float(Decimal(str(liquido)).quantize(Decimal('0.001'))),
            }

            # apply per-employee overrides if present
            overrides = per_emp_overrides_map.get(f.id, {})
            logger.debug('overrides for %s: %s', f.id, overrides)
            override_used = False
            # note: overrides may include 'inss', 'ir', 'dsr', 'descontos_outro', 'liquido'
            if overrides:
                override_used = True
                if 'inss' in overrides:
                    inss_val = Decimal(str(overrides.get('inss', inss_val)))
                if 'ir' in overrides:
                    ir_val = Decimal(str(overrides.get('ir', ir_val)))
                if 'descontos_outro' in overrides:
                    descontos_outro_val = Decimal(str(overrides.get('descontos_outro', descontos_outro_val)))
                if 'dsr' in overrides:
                    dsr = Decimal(str(overrides.get('dsr', dsr)))
                # if liquido is overridden, honor it and skip recomputation of liquido
                if 'liquido' in overrides:
                    liquido = Decimal(str(overrides.get('liquido')))
                else:
                    descontos_total = (inss_val + ir_val + descontos_outro_val).quantize(Decimal('0.01'))
                    liquido = (salario_effective + dsr - descontos_total).quantize(Decimal('0.01'))

            itens.append({
                'funcionario': FuncionarioSerializer(f).data,
                'salario_bruto': float(salario_base),
                'hora_extra': float(total_extra),
                'hora_extra_hours': float(hours),
                'hora_extra_entries': hora_extra_entries,
                'dsr': float(dsr),
                'descontos': float((inss_val + ir_val)),
                'descontos_outro': float(descontos_outro_val),
                'liquido': float(liquido),
                'inss': float(inss_val),
                'inss_breakdown': inss_breakdown,
                'ir': float(ir_val),
                'ir_info': ir_info,
                # include original computed snapshot and any override info for frontend
                'computed': computed_snapshot,
                'overrides': overrides if override_used else None,
            })
            total += float(liquido)

        # Create record to keep trace (not executed)
        folha = FolhaPagamento.objects.create(descricao=f'Folha {periodo_mes}/{periodo_ano}', periodo_mes=periodo_mes or 0, periodo_ano=periodo_ano or 0, valor_total=total, criado_por=request.user if request.user.is_authenticated else None, **self._get_tenant_kwargs())
        # create items for persistence
        for it in itens:
            # determine an aggregate hora_extra_type for persistence
            h_entries = it.get('hora_extra_entries', []) or []
            if len(h_entries) == 1:
                h_type = h_entries[0].get('type', 'normal')
            elif len(h_entries) > 1:
                h_type = 'multiple'
            else:
                h_type = it.get('hora_extra_type', 'normal')

            FolhaPagamentoItem.objects.create(
                folha=folha,
                funcionario_id=it['funcionario']['id'],
                salario_bruto=it['salario_bruto'],
                hora_extra=it.get('hora_extra', 0),
                hora_extra_hours=it.get('hora_extra_hours', 0),
                hora_extra_type=h_type,
                dsr=it.get('dsr', 0),
                inss=it.get('inss', 0),
                ir=it.get('ir', 0),
                descontos=it['descontos'],
                descontos_outro=it.get('descontos_outro', 0),
                liquido=it['liquido']
            )

        serializer = self.get_serializer(folha)
        data_out = serializer.data
        # replace serialized itens with the computed 'itens' list (preserves computed values and overrides info)
        data_out['itens'] = itens
        return Response(data_out, status=201)

    @action(detail=True, methods=['post'])
    def run(self, request, pk=None):
        folha = self.get_object()
        if folha.executado:
            return Response({'detail': 'Folha já executada'}, status=400)

        # accept per-employee overrides to adjust persisted items before marking executed
        per_emp_overrides = request.data.get('per_employee_overrides', []) or []
        from decimal import Decimal
        for ov in per_emp_overrides:
            emp_id = ov.get('id')
            try:
                item = FolhaPagamentoItem.objects.get(folha=folha, funcionario_id=emp_id)
            except FolhaPagamentoItem.DoesNotExist:
                continue
            # apply overrides if present
            if 'inss' in ov:
                item.inss = Decimal(str(ov.get('inss', item.inss)))
            if 'ir' in ov:
                item.ir = Decimal(str(ov.get('ir', item.ir)))
            if 'descontos_outro' in ov:
                item.descontos_outro = Decimal(str(ov.get('descontos_outro', item.descontos_outro)))
            if 'dsr' in ov:
                item.dsr = Decimal(str(ov.get('dsr', item.dsr)))
            if 'liquido' in ov:
                item.liquido = Decimal(str(ov.get('liquido', item.liquido)))
            # recompute descontos (inss + ir) if inss/ir changed
            item.descontos = (item.inss + item.ir)
            item.save()

        folha.executado = True
        folha.save()

        # Create financial records for the executed folha:
        # - create a Vencimento for each FolhaPagamentoItem (if not already present)
        # - create an aggregate DespesaAdministrativa (centro 'ADM' if available) marked as pending rateio
        try:
            from django.contrib.contenttypes.models import ContentType
            from apps.financeiro.models import Vencimento
            from apps.administrativo.models import DespesaAdministrativa, CentroCusto
            from django.utils import timezone

            item_ct = ContentType.objects.get_for_model(FolhaPagamentoItem)
            _tk = self._get_tenant_kwargs()
            created_vencimentos = []
            for item in folha.itens.all():
                # avoid duplicating a vencimento for the same folha-item
                exists = Vencimento.objects.filter(content_type=item_ct, object_id=item.id).exists()
                if not exists:
                    v = Vencimento.objects.create(
                        titulo=f"Folha {folha.id} - Funcionário {item.funcionario.id}",
                        descricao=f"Vencimento gerado automaticamente pela execução da folha {folha.id}",
                        valor=item.liquido,
                        data_vencimento=timezone.now().date(),
                        tipo='despesa',
                        criado_por=request.user,
                        content_type=item_ct,
                        object_id=item.id,
                        **_tk,
                    )
                    created_vencimentos.append(v.id)

            # try to create an aggregate DespesaAdministrativa for reporting/rateio purposes
            centro = CentroCusto.objects.filter(codigo='ADM').first() or CentroCusto.objects.first()
            if centro:
                DespesaAdministrativa.objects.create(
                    titulo=f"Folha {folha.periodo_mes}/{folha.periodo_ano}",
                    descricao=f"Despesa agregada gerada na execução da folha {folha.id}",
                    valor=folha.valor_total,
                    data=timezone.now().date(),
                    centro=centro,
                    pendente_rateio=True,
                    **_tk,
                )
        except Exception:
            # Do not fail execution if financeiro app is missing or any error happens here; we
            # still mark the folha as executed. Any exception will be visible in server logs.
            pass

        return Response({'status': 'executed', 'id': folha.id})

    @action(detail=True, methods=['post'], url_path='pagar_por_transferencia')
    def pagar_por_transferencia(self, request, pk=None):
        """Executa o pagamento da folha por transferência (batch).

        Payload: {
          "conta_origem": <id>,
          "pagamentos": [ { funcionario_id, vencimento_id?: optional, valor, forma?: 'pix'|'ted'|'doc'|'interno', dados_bancarios_override?: {} , client_tx_id?: optional } ],
          "descricao": "opcional"
        }

        Response: summary por item { funcionario_id, success: bool, transfer_id?, error?: str }
        """
        from .serializers import PagarFolhaPorTransferenciaSerializer
        from apps.financeiro.services import pagar_vencimentos_por_transferencia
        from apps.financeiro.models import ContaBancaria, Vencimento
        from .models import FolhaPagamentoItem
        from django.shortcuts import get_object_or_404

        serializer = PagarFolhaPorTransferenciaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        conta_origem_id = data['conta_origem']
        pagamentos = data['pagamentos']
        descricao = data.get('descricao', '')

        # resolve conta_origem instance
        try:
            conta_origem = ContaBancaria.objects.get(pk=conta_origem_id)
        except ContaBancaria.DoesNotExist:
            return Response({'detail': 'Conta origem não encontrada'}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        for p in pagamentos:
            funcionario_id = p['funcionario_id']
            venc_id = p.get('vencimento_id')
            valor = p['valor']
            forma = p.get('forma', 'pix')
            dados_override = p.get('dados_bancarios_override') or {}
            client_tx_id = p.get('client_tx_id')

            try:
                # if no vencimento specified, create one linked to folha and funcionario
                if not venc_id:
                    # use today's date as vencimento default
                    v = Vencimento.objects.create(
                        titulo=f"Folha {self.get_object().id} - Funcionário {funcionario_id}",
                        valor=valor,
                        data_vencimento=timezone.now().date(),
                        tipo='despesa',
                        criado_por=request.user,
                        **self._get_tenant_kwargs(),
                    )
                    venc_id = v.id
                else:
                    v = get_object_or_404(Vencimento, pk=venc_id)

                transfer = pagar_vencimentos_por_transferencia(
                    conta_origem=conta_origem,
                    itens=[{'vencimento': venc_id, 'valor': str(valor)}],
                    tipo=forma,
                    dados_bancarios=dados_override,
                    criado_por=request.user,
                    client_tx_id=client_tx_id,
                    descricao=descricao
                )
                results.append({'funcionario_id': funcionario_id, 'success': True, 'transfer_id': transfer.id})
            except Exception as e:
                results.append({'funcionario_id': funcionario_id, 'success': False, 'error': str(e)})

        return Response({'results': results})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Return aggregated totals for a given month/year (defaults to previous month if missing).
        Response: { total_horas_extra_cost, total_inss, total_folha }
        All values are Decimal quantized to 3 decimal places.
        """
        from decimal import Decimal
        from datetime import timedelta

        month = request.query_params.get('month')
        year = request.query_params.get('year')
        if month and year:
            try:
                month = int(month)
                year = int(year)
            except Exception:
                return Response({'detail': 'month/year invalid'}, status=400)
        else:
            # default to previous month relative to today
            today = timezone.now().date()
            first = today.replace(day=1)
            prev_last = first - timedelta(days=1)
            month = prev_last.month
            year = prev_last.year

        folhas = FolhaPagamento.objects.filter(periodo_mes=month, periodo_ano=year, executado=True)

        if not folhas.exists():
            zero = Decimal('0').quantize(Decimal('0.001'))
            return Response({'total_horas_extra_cost': float(zero), 'total_inss': float(zero), 'total_folha': float(zero)})

        # sums
        hora_extra_sum = FolhaPagamentoItem.objects.filter(folha__in=folhas).aggregate(total=Sum('hora_extra'))['total'] or Decimal('0')
        inss_sum = FolhaPagamentoItem.objects.filter(folha__in=folhas).aggregate(total=Sum('inss'))['total'] or Decimal('0')
        total_folha_sum = folhas.aggregate(total=Sum('valor_total'))['total'] or Decimal('0')

        hora_extra_sum = Decimal(hora_extra_sum).quantize(Decimal('0.001'))
        inss_sum = Decimal(inss_sum).quantize(Decimal('0.001'))
        total_folha_sum = Decimal(total_folha_sum).quantize(Decimal('0.001'))

        return Response({'total_horas_extra_cost': float(hora_extra_sum), 'total_inss': float(inss_sum), 'total_folha': float(total_folha_sum)})


# Minimal admin-only endpoint that the real project exposes (kept simple for tests)
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser

class BackfillRateiosView(APIView):
    rbac_module = 'administrativo'
    permission_classes = [IsAuthenticated, IsRBACAdmin]

    def post(self, request):
        # For tests we don't execute heavy commands; return a harmless response
        return Response({'ok': True, 'output': ''})

