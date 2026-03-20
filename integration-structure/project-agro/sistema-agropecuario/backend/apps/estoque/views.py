from apps.core.mixins import TenantQuerySetMixin
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from apps.core.permissions import RBACViewPermission
from .models import Produto, Lote, MovimentacaoEstoque, LocalArmazenamento, ProdutoAuditoria, MovimentacaoStatement
from .serializers import ProdutoSerializer, LoteSerializer, MovimentacaoEstoqueSerializer, LocalArmazenamentoSerializer, ProdutoAuditoriaSerializer, MovimentacaoStatementSerializer


class LocalArmazenamentoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    rbac_module = 'estoque'
    """ViewSet para LocalArmazenamento"""
    queryset = LocalArmazenamento.objects.select_related('fazenda', 'fornecedor', 'criado_por')
    serializer_class = LocalArmazenamentoSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tipo', 'tipo_local', 'fazenda', 'fornecedor', 'ativo', 'criado_por']
    search_fields = ['nome', 'fazenda__name', 'fornecedor__nome']
    ordering_fields = ['nome', 'tipo', 'capacidade_maxima', 'criado_em']
    ordering = ['nome']

    def perform_create(self, serializer):
        """Define o usuário que criou o registro"""
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())

    @action(detail=False, methods=['get'], url_path='com-saldo')
    def com_saldo(self, request):
        """Retorna locais que têm pelo menos um produto com quantidade_estoque > 0."""
        locais_ids = (
            Produto.objects
            .filter(local_armazenamento__isnull=False, quantidade_estoque__gt=0)
            .values_list('local_armazenamento_id', flat=True)
            .distinct()
        )
        qs = LocalArmazenamento.objects.filter(id__in=locais_ids).order_by('nome')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class ProdutoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """
    ViewSet para Produto com busca inteligente para agricultura.
    Suporta busca por: código, nome, princípio ativo, composição química.
    """
    rbac_module = 'estoque'
    # Include related fornecedor and local_armazenamento to avoid N+1 and provide names in list views
    queryset = Produto.objects.prefetch_related('lotes').select_related('criado_por', 'fornecedor', 'local_armazenamento')
    serializer_class = ProdutoSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    pagination_class = None  # Retorna todos os produtos sem limite de paginação
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categoria', 'codigo', 'ativo', 'unidade', 'estoque_minimo', 'local_armazenamento']
    
    # Busca inteligente - incluindo novos campos
    search_fields = [
        'codigo',
        'nome',
        'descricao',
        'categoria',
        'principio_ativo',      # Novo
        'composicao_quimica',   # Novo
    ]
    
    ordering_fields = ['nome', 'codigo', 'quantidade_estoque', 'estoque_minimo', 'criado_em']
    ordering = ['nome']

    def perform_create(self, serializer):
        """Define o usuário que criou o registro"""
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())

    def destroy(self, request, *args, **kwargs):
        """Override destroy to add logging for debugging FK issues"""
        import logging
        logger = logging.getLogger(__name__)
        instance = self.get_object()
        logger.info(f"Deleting produto {instance.id} - {instance.nome}")
        try:
            response = super().destroy(request, *args, **kwargs)
            logger.info(f"Successfully deleted produto {instance.id}")
            return response
        except Exception as e:
            logger.error(f"Error deleting produto {instance.id}: {e}")
            raise


class LoteViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Lote"""
    rbac_module = 'estoque'
    queryset = Lote.objects.select_related('produto')
    serializer_class = LoteSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['produto', 'numero_lote', 'data_fabricacao', 'data_validade']
    search_fields = ['numero_lote', 'produto__nome', 'local_armazenamento']
    ordering_fields = ['numero_lote', 'data_fabricacao', 'quantidade_atual', 'criado_em']
    ordering = ['-data_fabricacao']


class MovimentacaoEstoqueViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para MovimentacaoEstoque com validações"""
    rbac_module = 'estoque'
    queryset = MovimentacaoEstoque.objects.select_related(
        'produto', 'lote', 'fazenda', 'talhao', 'local_armazenamento', 'criado_por'
    )
    serializer_class = MovimentacaoEstoqueSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'tipo', 'origem', 'produto', 'lote', 'fazenda', 'talhao',
        'local_armazenamento', 'data_movimentacao', 'criado_por'
    ]
    search_fields = [
        'produto__nome', 'lote__numero_lote', 'documento_referencia',
        'motivo', 'observacoes', 'fazenda__name', 'talhao__name'
    ]
    ordering_fields = ['data_movimentacao', 'quantidade', 'valor_total', 'tipo']
    ordering = ['-data_movimentacao']

    def perform_create(self, serializer):
        """Define o usuário que criou o registro usando o helper transacional"""
        from .services import create_movimentacao

        validated = serializer.validated_data
        produto = validated.get('produto')
        tipo = validated.get('tipo')
        quantidade = validated.get('quantidade')
        valor_unitario = validated.get('valor_unitario')

        # Prepare extras: everything else except core fields
        extras = {k: v for k, v in validated.items() if k not in ('produto', 'tipo', 'quantidade', 'valor_unitario')}
        # Inject tenant for isolation
        tenant = getattr(self.request, 'tenant', None) or getattr(self.request.user, 'tenant', None)
        if tenant is not None:
            extras['tenant'] = tenant

        movimentacao = create_movimentacao(
            produto=produto,
            tipo=tipo,
            quantidade=quantidade,
            valor_unitario=valor_unitario,
            criado_por=self.request.user,
            **extras
        )

        # Bind the created instance back to serializer
        serializer.instance = movimentacao


class ProdutoAuditoriaViewSet(TenantQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para auditoria de produtos (somente leitura).
    Permite rastrear todas as operações realizadas com produtos.
    """
    rbac_module = 'estoque'
    queryset = ProdutoAuditoria.objects.select_related('produto', 'criado_por')
    serializer_class = ProdutoAuditoriaSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'produto', 'acao', 'origem', 'nfe_numero', 'nfe_serie',
        'produto_categoria', 'criado_por', 'criado_em'
    ]
    search_fields = [
        'produto__nome', 'produto__codigo', 'nfe_chave_acesso',
        'fornecedor_nome', 'fornecedor_cnpj', 'produto_codigo',
        'produto_nome', 'observacoes'
    ]
    ordering_fields = ['criado_em', 'acao', 'origem', 'produto_categoria']
    ordering = ['-criado_em']


class MovimentacaoStatementViewSet(TenantQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet para declarações de movimentação (statements) - somente leitura"""
    rbac_module = 'estoque'
    queryset = MovimentacaoStatement.objects.select_related('produto', 'lote', 'fazenda', 'talhao', 'local_armazenamento', 'criado_por', 'movimentacao')
    serializer_class = MovimentacaoStatementSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'produto', 'tipo', 'movimentacao', 'movimentacao__origem', 'lote', 'fazenda', 'talhao', 'criado_por', 'criado_em', 'data_movimentacao'
    ]
    search_fields = [
        'produto__nome', 'documento_referencia', 'motivo', 'observacoes'
    ]
    ordering_fields = ['criado_em', 'data_movimentacao', 'quantidade']
    ordering = ['-criado_em']

    def get_queryset(self):
        # MovimentacaoStatement has no direct tenant field.
        # Filter via produto__tenant (Produto is a TenantModel).
        qs = MovimentacaoStatement.objects.select_related(
            'produto', 'lote', 'fazenda', 'talhao',
            'local_armazenamento', 'criado_por', 'movimentacao'
        )
        tenant = self._get_request_tenant()
        if tenant is not None:
            qs = qs.filter(movimentacao__tenant=tenant)
        elif not (self.request.user and self.request.user.is_superuser):
            return qs.none()
        return qs.order_by('-criado_em')


# Helper endpoint: categorias (derived from Produto.CATEGORIA_CHOICES)
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def categorias_list(request):
    """Retorna as categorias de produtos baseadas em Produto.CATEGORIA_CHOICES."""
    choices = Produto.CATEGORIA_CHOICES
    data = [
        {
            'id': idx + 1,
            'tag': key,
            'nome': label
        }
        for idx, (key, label) in enumerate(choices)
    ]
    return Response(data)


@api_view(['GET'])
def produto_ultimo_preco_entrada(request):
    """Retorna o último valor unitário de entrada (tipo=entrada) para um produto dado `produto_id` como query param."""
    produto_id = request.query_params.get('produto_id')
    if not produto_id:
        return Response({'error': 'produto_id é obrigatório'}, status=400)
    try:
        mov = MovimentacaoEstoque.objects.filter(
            produto_id=produto_id, tipo='entrada', valor_unitario__isnull=False
        ).order_by('-data_movimentacao').first()
        if not mov:
            return Response({'valor_unitario': None}, status=200)
        return Response({'valor_unitario': str(mov.valor_unitario) if mov.valor_unitario is not None else None, 'data_movimentacao': mov.data_movimentacao}, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# ============================================
# FASE 1 - COMERCIAL REVAMP: ViewSets de Localização
# ============================================

from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .models import Localizacao, ProdutoArmazenado
from .serializers import LocalizacaoSerializer, ProdutoArmazenadoSerializer, MovimentarEntreLocalizacoesSerializer
from .services import EstoqueLocalizacaoService


class LocalizacaoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Localizacao - FASE 1"""
    rbac_module = 'estoque'
    queryset = Localizacao.objects.prefetch_related('produtos_armazenados')
    serializer_class = LocalizacaoSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['tipo', 'ativa']
    search_fields = ['nome', 'endereco']
    ordering_fields = ['nome', 'tipo', 'capacidade_total', 'percentual_ocupacao', 'criado_em']
    ordering = ['nome']

    @action(detail=True, methods=['get'])
    def saldos(self, request, pk=None):
        """Retorna saldos de produtos nesta localização"""
        localizacao = self.get_object()
        produtos = ProdutoArmazenado.objects.filter(
            localizacao=localizacao,
            quantidade__gt=0
        ).select_related('produto')
        
        serializer = ProdutoArmazenadoSerializer(produtos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def historico(self, request, pk=None):
        """Retorna histórico de movimentações da localização"""
        localizacao = self.get_object()
        
        # Parâmetros de filtro
        produto_id = request.query_params.get('produto_id')
        data_inicio = request.query_params.get('data_inicio')
        data_fim = request.query_params.get('data_fim')
        
        movimentacoes = EstoqueLocalizacaoService.historico_movimentacoes_localizacao(
            localizacao_id=localizacao.id,
            produto_id=produto_id,
            data_inicio=data_inicio,
            data_fim=data_fim
        )
        
        serializer = MovimentacaoEstoqueSerializer(movimentacoes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def relatorio(self, request):
        """Retorna relatório consolidado de localizações"""
        relatorio = EstoqueLocalizacaoService.relatorio_localizacoes()
        return Response(relatorio)


class ProdutoArmazenadoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para ProdutoArmazenado - FASE 1"""
    rbac_module = 'estoque'
    queryset = ProdutoArmazenado.objects.select_related('produto', 'localizacao')
    serializer_class = ProdutoArmazenadoSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['produto', 'localizacao', 'lote', 'status']
    search_fields = ['produto__nome', 'produto__codigo', 'lote', 'localizacao__nome']
    ordering_fields = ['data_entrada', 'quantidade', 'criado_em']
    ordering = ['-data_entrada']

    @action(detail=False, methods=['post'])
    def movimentar(self, request):
        """Movimenta produto entre localizações"""
        serializer = MovimentarEntreLocalizacoesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            movimentacao = EstoqueLocalizacaoService.movimentar_entre_localizacoes(
                produto_id=serializer.validated_data['produto_id'],
                localizacao_origem_id=serializer.validated_data['localizacao_origem_id'],
                localizacao_destino_id=serializer.validated_data['localizacao_destino_id'],
                quantidade=serializer.validated_data['quantidade'],
                lote=serializer.validated_data['lote'],
                usuario=request.user,
                observacoes=serializer.validated_data.get('observacoes')
            )
            
            return Response(
                MovimentacaoEstoqueSerializer(movimentacao).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def consultar_saldo(self, request):
        """Consulta saldo de produtos por localização"""
        produto_id = request.query_params.get('produto_id')
        localizacao_id = request.query_params.get('localizacao_id')
        
        saldos = EstoqueLocalizacaoService.consultar_saldo_por_localizacao(
            produto_id=produto_id,
            localizacao_id=localizacao_id
        )
        
        serializer = ProdutoArmazenadoSerializer(saldos, many=True)
        return Response(serializer.data)

