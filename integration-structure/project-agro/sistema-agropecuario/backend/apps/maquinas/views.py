from apps.core.mixins import TenantQuerySetMixin
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q, F, Avg
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta
from apps.core.permissions import RBACViewPermission
from .models import (
    CategoriaEquipamento,
    Equipamento, 
    Abastecimento, 
    OrdemServico, 
    ManutencaoPreventiva, 
    ConfiguracaoAlerta
)
from .serializers import (
    CategoriaEquipamentoSerializer,
    EquipamentoSerializer, 
    EquipamentoListSerializer,
    EquipamentoGeoSerializer,
    AbastecimentoSerializer,
    OrdemServicoSerializer, 
    ManutencaoPreventivaSerializer, 
    ConfiguracaoAlertaSerializer,
    EquipamentoDashboardSerializer, 
    AbastecimentoDashboardSerializer
)


# ====================================================================
# VIEWSETS PARA CATEGORIZAÇÃO FLEXÍVEL
# ====================================================================

class CategoriaEquipamentoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de categorias de equipamentos.
    Permite criar novas categorias sem modificar código.
    
    NOTA: CategoriaEquipamento é GLOBAL (não é filtrada por tenant)
    pois as categorias devem estar disponíveis para todos os usuários.
    """
    rbac_module = 'maquinas'
    queryset = CategoriaEquipamento.objects.filter(ativo=True).prefetch_related('subcategorias')
    serializer_class = CategoriaEquipamentoSerializer
    permission_classes = [IsAuthenticated, RBACViewPermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'descricao']
    ordering_fields = ['ordem_exibicao', 'nome']
    ordering = ['ordem_exibicao', 'nome']
    
    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    @action(detail=False, methods=['GET'])
    def por_tipo_mobilidade(self, request):
        """
        Retorna categorias agrupadas por tipo de mobilidade.
        Útil para formulários em cascata.
        """
        tipo_mobilidade = request.query_params.get('tipo_mobilidade')
        
        queryset = self.get_queryset()
        if tipo_mobilidade:
            queryset = queryset.filter(tipo_mobilidade=tipo_mobilidade)
        
        # Agrupar por tipo_mobilidade
        resultado = {}
        for categoria in queryset:
            tipo = categoria.get_tipo_mobilidade_display()
            if tipo not in resultado:
                resultado[tipo] = []
            resultado[tipo].append({
                'id': categoria.id,
                'nome': categoria.nome,
                'requer_horimetro': categoria.requer_horimetro,
                'requer_potencia': categoria.requer_potencia,
                'requer_localizacao': categoria.requer_localizacao,
                'requer_acoplamento': categoria.requer_acoplamento,
            })
        
        return Response(resultado)
    
    @action(detail=True, methods=['GET'])
    def requisitos(self, request, pk=None):
        """
        Retorna os requisitos de validação de uma categoria.
        Usado pelo frontend para mostrar/ocultar campos dinamicamente.
        """
        categoria = self.get_object()
        return Response({
            'categoria': categoria.nome,
            'tipo_mobilidade': categoria.tipo_mobilidade,
            'requisitos': {
                'horimetro': categoria.requer_horimetro,
                'potencia': categoria.requer_potencia,
                'localizacao': categoria.requer_localizacao,
                'acoplamento': categoria.requer_acoplamento,
            },
            'campos_sugeridos': self._get_campos_sugeridos(categoria)
        })
    
    def _get_campos_sugeridos(self, categoria):
        """Sugere campos do JSONField caracteristicas_especificas baseado na categoria"""
        sugestoes = {
            'Pivot Central': ['area_irrigada_ha', 'diametro_m', 'tipo_aspersor', 'velocidade_rotacao'],
            'Bomba de Água': ['vazao_m3h', 'altura_manometrica_m', 'tipo_bomba', 'tipo_rotor'],
            'Gerador Elétrico': ['tipo_combustivel', 'autonomia_horas', 'ruido_db', 'sistema_partida'],
            'Motor Elétrico': ['rotacao_rpm', 'rendimento_percent', 'classe_isolamento', 'ip_protecao'],
            'Motor a Combustão': ['rotacao_rpm', 'tipo_motor', 'cilindradas_cc', 'tipo_combustivel'],
        }
        return sugestoes.get(categoria.nome, [])


class EquipamentoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de equipamentos com CATEGORIZAÇÃO FLEXÍVEL.
    Agora suporta Pivot, Bomba, Gerador, Motor, além de máquinas tradicionais.
    """
    rbac_module = 'maquinas'
    queryset = Equipamento.objects.select_related('categoria', 'maquina_principal', 'criado_por')
    permission_classes = [IsAuthenticated, RBACViewPermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'marca', 'modelo', 'numero_serie', 'categoria__nome']
    ordering_fields = ['nome', 'data_aquisicao', 'valor_aquisicao']
    ordering = ['-data_aquisicao']

    def get_serializer_class(self):
        if self.action == 'list':
            return EquipamentoListSerializer
        elif self.action == 'mapa_estacionarios':
            return EquipamentoGeoSerializer
        return EquipamentoSerializer
    
    def get_queryset(self):
        """Filtros via query params"""
        queryset = super().get_queryset()
        
        # Filtrar por categoria
        categoria_id = self.request.query_params.get('categoria')
        if categoria_id:
            queryset = queryset.filter(categoria_id=categoria_id)
        
        # Filtrar por tipo de mobilidade
        tipo_mobilidade = self.request.query_params.get('tipo_mobilidade')
        if tipo_mobilidade:
            queryset = queryset.filter(categoria__tipo_mobilidade=tipo_mobilidade)
        
        # Filtrar por status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        return queryset

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())

    @action(detail=False, methods=['GET'])
    def dashboard(self, request):
        """
        Retorna dados para o dashboard de equipamentos.
        Agora com estatísticas por categoria flexível.
        """
        hoje = timezone.now().date()

        # Estatísticas gerais
        qs = self.get_queryset()
        total_equipamentos = qs.count()
        equipamentos_ativos = qs.filter(status='ativo').count()
        equipamentos_manutencao = qs.filter(status='manutencao').count()

        # Custos
        custo_total = qs.aggregate(
            total=Sum('valor_aquisicao')
        )['total'] or 0

        depreciacao_total = sum([eq.depreciacao_estimada for eq in qs])

        data = {
            'total_equipamentos': total_equipamentos,
            'equipamentos_ativos': equipamentos_ativos,
            'equipamentos_manutencao': equipamentos_manutencao,
            'custo_total_equipamentos': custo_total,
            'depreciacao_total': depreciacao_total,
        }

        serializer = EquipamentoDashboardSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def por_categoria(self, request):
        """
        Retorna equipamentos agrupados por CATEGORIA FLEXÍVEL.
        Substitui o antigo 'por_tipo' que usava choices hardcoded.
        """
        equipamentos_por_categoria = (
            self.get_queryset()
            .values('categoria__id', 'categoria__nome', 'categoria__tipo_mobilidade')
            .annotate(
                total=Count('id'),
                ativos=Count('id', filter=Q(status='ativo')),
                em_manutencao=Count('id', filter=Q(status='manutencao')),
                valor_total=Sum('valor_aquisicao')
            )
            .order_by('categoria__ordem_exibicao', 'categoria__nome')
        )

        page = self.paginate_queryset(equipamentos_por_categoria)
        if page is not None:
            # page is an iterable of dict-like objects
            return self.get_paginated_response(list(page))

        return Response(list(equipamentos_por_categoria))
    
    @action(detail=False, methods=['GET'])
    def mapa_estacionarios(self, request):
        """
        Retorna GeoJSON com equipamentos estacionários que possuem coordenadas.
        Usado para mostrar no mapa: pivots, bombas, geradores, motores.
        """
        equipamentos = (
            self.get_queryset()
            .filter(categoria__tipo_mobilidade='estacionario', coordenadas__isnull=False)
            .select_related('categoria')
        )
        
        page = self.paginate_queryset(equipamentos)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(equipamentos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def por_tipo(self, request):
        """
        DEPRECATED - Use 'por_categoria' em vez disso.
        Mantido para compatibilidade com código antigo.
        """
        return self.por_categoria(request)

    @action(detail=True, methods=['GET'])
    def historico_abastecimentos(self, request, pk=None):
        """
        Retorna histórico de abastecimentos do equipamento.
        """
        equipamento = self.get_object()
        abastecimentos = Abastecimento.objects.filter(equipamento=equipamento).order_by('-data_abastecimento')[:10]

        page = self.paginate_queryset(abastecimentos)
        if page is not None:
            serializer = AbastecimentoSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = AbastecimentoSerializer(abastecimentos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def ordens_servico(self, request, pk=None):
        """
        Retorna ordens de serviço do equipamento.
        """
        equipamento = self.get_object()
        ordens = OrdemServico.objects.filter(equipamento=equipamento).order_by('-data_abertura')

        page = self.paginate_queryset(ordens)
        if page is not None:
            serializer = OrdemServicoSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = OrdemServicoSerializer(ordens, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def implementos_vinculados(self, request, pk=None):
        """
        Retorna implementos vinculados a esta máquina.
        """
        equipamento = self.get_object()
        if equipamento.tipo_equipamento != 'maquina':
            return Response({'error': 'Apenas máquinas podem ter implementos vinculados.'}, status=400)

        implementos = equipamento.get_implementos_vinculados()

        page = self.paginate_queryset(implementos)
        if page is not None:
            serializer = EquipamentoListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = EquipamentoListSerializer(implementos, many=True)
        return Response(serializer.data)


class AbastecimentoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de abastecimentos.
    """
    rbac_module = 'maquinas'
    queryset = Abastecimento.objects.select_related('equipamento', 'criado_por').all()
    serializer_class = AbastecimentoSerializer
    permission_classes = [IsAuthenticated, RBACViewPermission]

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())

    def get_queryset(self):
        queryset = super().get_queryset()
        equipamento_id = self.request.query_params.get('equipamento', None)
        if equipamento_id:
            queryset = queryset.filter(equipamento_id=equipamento_id)
        return queryset

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Retorna dados para o dashboard de abastecimentos.
        """
        hoje = timezone.now()
        mes_atual = hoje.replace(day=1)

        # Abastecimentos do mês
        qs = self.get_queryset()
        qs_mes = qs.filter(data_abastecimento__gte=mes_atual)
        abastecimentos_mes = qs_mes.aggregate(total=Count('id'), custo_total=Sum('valor_total'))

        # Debug: log detalhado para investigar discrepâncias de soma
        try:
            ids = list(qs_mes.values_list('id', flat=True))
            # compute iterative sum to compare with DB aggregate
            iterative_sum = sum([getattr(a, 'valor_total', 0) or 0 for a in qs_mes.only('valor_total')])
            logger = logging.getLogger(__name__)
            logger.info('Dashboard Abastecimentos: count_ids=%d aggregate_total=%s iterative_sum=%s ids=%s',
                        abastecimentos_mes.get('total'), str(abastecimentos_mes.get('custo_total')), str(iterative_sum), ids)
        except Exception:
            logging.getLogger(__name__).exception('Erro ao gerar debug info para dashboard de abastecimentos')

        # Consumo médio diário (últimos 30 dias)
        ultimos_30_dias = hoje - timedelta(days=30)
        consumo_total = qs.filter(
            data_abastecimento__gte=ultimos_30_dias
        ).aggregate(total_litros=Sum('quantidade_litros'))['total_litros'] or 0

        consumo_medio_dia = consumo_total / 30 if consumo_total > 0 else 0

        data = {
            'total_abastecimentos_mes': abastecimentos_mes['total'],
            'custo_total_abastecimentos_mes': abastecimentos_mes['custo_total'] or 0,
            'consumo_medio_litros_dia': consumo_medio_dia,
        }

        serializer = AbastecimentoDashboardSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def por_equipamento(self, request):
        """
        Retorna consumo por equipamento no período.
        """
        dias = int(request.query_params.get('dias', 30))
        data_inicio = timezone.now() - timedelta(days=dias)

        consumo_por_equipamento = self.get_queryset().filter(
            data_abastecimento__gte=data_inicio
        ).values('equipamento__nome').annotate(
            total_litros=Sum('quantidade_litros'),
            total_custo=Sum('valor_total'),
            abastecimentos=Count('id')
        ).order_by('-total_litros')

        page = self.paginate_queryset(consumo_por_equipamento)
        if page is not None:
            return self.get_paginated_response(list(page))

        return Response(list(consumo_por_equipamento))


class OrdemServicoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de ordens de serviço.
    """
    rbac_module = 'maquinas'
    queryset = OrdemServico.objects.select_related('equipamento', 'responsavel_abertura', 'responsavel_execucao').all()
    serializer_class = OrdemServicoSerializer
    permission_classes = [IsAuthenticated, RBACViewPermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status', None)
        equipamento_id = self.request.query_params.get('equipamento', None)

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if equipamento_id:
            queryset = queryset.filter(equipamento_id=equipamento_id)

        return queryset

    @action(detail=True, methods=['post'])
    def concluir(self, request, pk=None):
        """
        Marca a ordem de serviço como concluída.
        """
        ordem = self.get_object()
        ordem.status = 'concluida'
        ordem.data_conclusao = timezone.now()

        # Validar antes de salvar (invoca clean do modelo)
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework import status
        try:
            ordem.full_clean()
            ordem.save()
        except DjangoValidationError as e:
            return Response({'detail': e.message_dict}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(ordem)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        """
        Retorna estatísticas das ordens de serviço.
        """
        hoje = timezone.now().date()
        mes_atual = hoje.replace(day=1)

        estatisticas = self.get_queryset().filter(
            data_abertura__gte=mes_atual
        ).aggregate(
            total=Count('id'),
            abertas=Count('id', filter=Q(status='aberta')),
            em_andamento=Count('id', filter=Q(status='em_andamento')),
            concluidas=Count('id', filter=Q(status='concluida')),
            custo_total=Sum('custo_total')
        )

        return Response(estatisticas)


class ManutencaoPreventivaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de manutenções preventivas.
    """
    rbac_module = 'maquinas'
    queryset = ManutencaoPreventiva.objects.select_related('equipamento').all()
    serializer_class = ManutencaoPreventivaSerializer
    permission_classes = [IsAuthenticated, RBACViewPermission]

    @action(detail=False, methods=['get'])
    def necessitam_manutencao(self, request):
        """
        Retorna equipamentos que necessitam manutenção preventiva.
        """
        manutencoes = self.get_queryset().filter(ativo=True)
        equipamentos_manutencao = []

        page = self.paginate_queryset(manutencoes)
        iterator = page if page is not None else manutencoes

        for manutencao in iterator:
            if manutencao.necessita_manutencao:
                equipamentos_manutencao.append({
                    'equipamento': manutencao.equipamento.nome,
                    'tipo_manutencao': manutencao.tipo_manutencao,
                    'ultima_manutencao': manutencao.ultima_manutencao,
                    'proxima_manutencao': manutencao.proxima_manutencao,
                })

        if page is not None:
            return self.get_paginated_response(equipamentos_manutencao)

        return Response(equipamentos_manutencao)

    @action(detail=False, methods=['get'])
    def alertas(self, request):
        """
        Retorna alertas de manutenção preventiva.
        """
        manutencoes = self.get_queryset().filter(ativo=True)
        alertas = []

        page = self.paginate_queryset(manutencoes)
        iterator = page if page is not None else manutencoes

        for manutencao in iterator:
            if manutencao.alerta_manutencao:
                alertas.append({
                    'equipamento': manutencao.equipamento.nome,
                    'tipo_manutencao': manutencao.tipo_manutencao,
                    'proxima_manutencao': manutencao.proxima_manutencao,
                    'dias_para_manutencao': (manutencao.proxima_manutencao - timezone.now().date()).days,
                })

        if page is not None:
            return self.get_paginated_response(alertas)

        return Response(alertas)


class ConfiguracaoAlertaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de configurações de alertas.
    """
    rbac_module = 'maquinas'
    queryset = ConfiguracaoAlerta.objects.select_related('equipamento').all()
    serializer_class = ConfiguracaoAlertaSerializer
    permission_classes = [IsAuthenticated, RBACViewPermission]

    @action(detail=False, methods=['get'])
    def ativos(self, request):
        """
        Retorna configurações de alertas ativas.
        """
        configuracoes = self.get_queryset().filter(ativo=True)

        page = self.paginate_queryset(configuracoes)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(configuracoes, many=True)
        return Response(serializer.data)