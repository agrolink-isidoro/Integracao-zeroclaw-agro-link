from apps.core.mixins import TenantQuerySetMixin
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from apps.core.permissions import RBACViewPermission
from .models import (
    Cultura, Plantio, Colheita, ColheitaItem, Manejo, OrdemServico, 
    Insumo, DismissAlert, Operacao, OperacaoProduto, HarvestSession, HarvestSessionItem, MovimentacaoCarga
)
from .serializers import (
    CulturaSerializer, PlantioSerializer, ColheitaSerializer, 
    ManejoSerializer, OrdemServicoSerializer, InsumoSerializer, 
    DismissAlertSerializer, OperacaoSerializer, OperacaoListSerializer
)


class CulturaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Cultura"""
    rbac_module = 'agricultura'
    queryset = Cultura.objects.all()
    serializer_class = CulturaSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['ativo']
    search_fields = ['nome', 'descricao']
    ordering_fields = ['nome', 'ciclo_dias', 'criado_em']
    ordering = ['nome']


class PlantioViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Plantio com relacionamentos otimizados"""
    rbac_module = 'agricultura'
    queryset = Plantio.objects.prefetch_related('talhoes__area__fazenda').select_related('cultura', 'produto_semente', 'criado_por')
    serializer_class = PlantioSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['fazenda', 'cultura', 'status', 'data_plantio', 'criado_por']
    search_fields = ['talhoes__name', 'cultura__nome', 'observacoes']
    ordering_fields = ['data_plantio', 'criado_em']
    ordering = ['-data_plantio']

    def perform_create(self, serializer):
        """Define o usuário que criou o registro"""
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())

    @action(detail=True, methods=['post'])
    def contabilizar(self, request, pk=None):
        """Força a contabilização do plantio (gera rateio e aprovação)"""
        plantio = self.get_object()
        try:
            from apps.financeiro.services import create_rateio_from_operacao
            user = request.user
            create_rateio_from_operacao(plantio, created_by=user)
            plantio.contabilizado = True
            plantio.save(update_fields=['contabilizado'])
            serializer = self.get_serializer(plantio)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def recalcular_custos(self, request, pk=None):
        """Recalcula os custos agregados do plantio"""
        plantio = self.get_object()
        try:
            from .services import calcular_custos_plantio, gerar_rateio_plantio
            resumo = calcular_custos_plantio(plantio)
            if request.data.get('gerar_rateio'):
                gerar_rateio_plantio(plantio, created_by=request.user)
            return Response(resumo)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def kpis(self, request, pk=None):
        """Retorna KPIs agregados da safra (custos, produtividade, margem, breakdown)."""
        plantio = self.get_object()
        try:
            from .kpis import get_safra_kpis
            data = get_safra_kpis(plantio)
            return Response(data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ColheitaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Colheita com integração estoque/comercial"""
    rbac_module = 'agricultura'
    queryset = Colheita.objects.select_related(
        'plantio__cultura', 'plantio__fazenda',
        'movimentacao_estoque', 'carga_comercial', 'criado_por'
    ).prefetch_related('plantio__talhoes__area__fazenda')
    serializer_class = ColheitaSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'plantio', 'status', 'data_colheita', 'qualidade', 'unidade',
        'movimentacao_estoque', 'carga_comercial', 'criado_por'
    ]
    search_fields = ['plantio__cultura__nome', 'plantio__talhoes__name', 'observacoes']
    ordering_fields = ['data_colheita', 'quantidade_colhida', 'criado_em']
    ordering = ['-data_colheita']

    @action(detail=True, methods=['post'])
    def contabilizar(self, request, pk=None):
        """Força a contabilização da colheita (gera rateio e aprovação)"""
        colheita = self.get_object()
        try:
            from apps.financeiro.services import create_rateio_from_operacao
            user = request.user
            create_rateio_from_operacao(colheita, created_by=user)
            colheita.contabilizado = True
            colheita.save(update_fields=['contabilizado'])
            serializer = self.get_serializer(colheita)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def cargas(self, request, pk=None):
        """Retorna todas as cargas relacionadas a esta colheita"""
        colheita = self.get_object()
        
        # Buscar MovimentacaoCarga através do HarvestSession relacionado ao plantio da colheita
        from .serializers import MovimentacaoCargaSerializer
        from django.db.models import Q
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"=== DEBUG cargas para colheita {colheita.id} ===")
        logger.info(f"Plantio ID: {colheita.plantio_id}")
        
        # Estratégia 1: Buscar por session items (se houver sessões)
        sessions = HarvestSession.objects.filter(plantio=colheita.plantio)
        session_ids = list(sessions.values_list('id', flat=True))
        logger.info(f"Sessions encontradas: {session_ids}")
        
        session_items = HarvestSessionItem.objects.filter(session_id__in=session_ids) if session_ids else []
        session_item_ids = list(session_items.values_list('id', flat=True)) if session_items else []
        logger.info(f"Session items encontrados: {session_item_ids}")
        
        # Estratégia 2: Buscar por talhões do plantio (mais abrangente)
        talhao_ids = list(colheita.plantio.talhoes.values_list('id', flat=True))
        logger.info(f"Talhões do plantio: {talhao_ids}")
        
        # Combinar as duas estratégias: session items OU talhões do plantio
        query = Q()
        if session_item_ids:
            query |= Q(session_item_id__in=session_item_ids)
        if talhao_ids:
            query |= Q(talhao_id__in=talhao_ids)
        
        # Buscar movimentações
        movimentacoes = MovimentacaoCarga.objects.filter(query).select_related(
            'session_item', 'talhao', 'local_destino', 'empresa_destino', 'transporte'
        ).order_by('-criado_em')
        
        logger.info(f"Total de movimentações encontradas: {movimentacoes.count()}")
        for mov in movimentacoes:
            logger.info(f"  - Mov {mov.id}: talhao={mov.talhao_id}, session_item={mov.session_item_id}, peso={mov.peso_liquido}")
        
        serializer = MovimentacaoCargaSerializer(movimentacoes, many=True)
        
        return Response({
            'count': movimentacoes.count(),
            'plantio_nome': colheita.plantio.nome_safra if hasattr(colheita.plantio, 'nome_safra') else str(colheita.plantio),
            'data_colheita': colheita.data_colheita,
            'quantidade_colhida': colheita.quantidade_colhida,
            'results': serializer.data
        })

    def perform_create(self, serializer):
        """Define o usuário que criou o registro"""
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())

    @action(detail=True, methods=['post'])
    def armazenar_estoque(self, request, pk=None):
        """Endpoint para armazenar colheita em estoque"""
        colheita = self.get_object()
        local_armazenamento_id = request.data.get('local_armazenamento_id')
        lote_numero = request.data.get('lote_numero')

        if not local_armazenamento_id:
            return Response(
                {'error': 'Local de armazenamento é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.estoque.models import LocalArmazenamento
        try:
            local = LocalArmazenamento.objects.get(id=local_armazenamento_id)
        except LocalArmazenamento.DoesNotExist:
            return Response(
                {'error': 'Local de armazenamento não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        sucesso, mensagem = colheita.armazenar_em_estoque(local, lote_numero)

        if sucesso:
            serializer = self.get_serializer(colheita)
            return Response(serializer.data)
        else:
            return Response({'error': mensagem}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def enviar_comercial(self, request, pk=None):
        """Endpoint para enviar colheita para comercial"""
        colheita = self.get_object()
        tipo_colheita = request.data.get('tipo_colheita')
        tipo_entrega = request.data.get('tipo_entrega')

        if not tipo_colheita:
            return Response(
                {'error': 'Tipo de colheita é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.comercial.models import CargaViagem
        try:
            carga = CargaViagem.objects.create(
                tipo_colheita=tipo_colheita,
                tipo_entrega=tipo_entrega,
                data_colheita=colheita.data_colheita,
                peso_total=colheita.quantidade_colhida,
                fazenda=colheita.plantio.talhao.fazenda,
                cultura=colheita.plantio.cultura,
                colheita_agricola=colheita,
                criado_por=request.user
            )

            # Atualizar status da colheita
            colheita.status = 'comercializada'
            colheita.carga_comercial = carga
            colheita.save()

            serializer = self.get_serializer(colheita)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': f'Erro ao criar carga comercial: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='start-item')
    def start_item(self, request, pk=None):
        """Inicia um ColheitaItem para um talhão associado a esta colheita.
        Payload: { talhao_id, maquina?, trator?, basuca?, operador_id?, quantidade_colhida?, started_at? }
        """
        colheita = self.get_object()
        talhao_id = request.data.get('talhao_id')
        if not talhao_id:
            return Response({'error': 'talhao_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        from apps.fazendas.models import Talhao
        try:
            talhao = Talhao.objects.get(pk=talhao_id)
        except Talhao.DoesNotExist:
            return Response({'error': 'Talhão não encontrado'}, status=status.HTTP_404_NOT_FOUND)

        item = None
        try:
            item = colheita.itens.create(
                talhao=talhao,
                maquina=request.data.get('maquina'),
                trator=request.data.get('trator'),
                basuca=request.data.get('basuca'),
                operador_id=request.data.get('operador_id'),
                quantidade_colhida=request.data.get('quantidade_colhida') or 0,
                started_at=request.data.get('started_at')
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        from .serializers import ColheitaItemSerializer
        serializer = ColheitaItemSerializer(item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='add-transfer')
    def add_transfer(self, request, pk=None):
        """Registra uma transferência (harvester->tractor ou tractor->truck) para um ColheitaItem.
        Payload: { item_id, from_vehicle, to_vehicle, quantidade, notes }
        """
        item_id = request.data.get('item_id')
        if not item_id:
            return Response({'error': 'item_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            item = ColheitaItem.objects.get(pk=item_id, colheita_id=pk)
        except ColheitaItem.DoesNotExist:
            return Response({'error': 'ColheitaItem não encontrado para esta colheita'}, status=status.HTTP_404_NOT_FOUND)

        transfer = item.transfers.create(
            from_vehicle=request.data.get('from_vehicle'),
            to_vehicle=request.data.get('to_vehicle'),
            quantidade=request.data.get('quantidade') or 0,
            notes=request.data.get('notes')
        )

        from .serializers import HarvestTransferSerializer
        serializer = HarvestTransferSerializer(transfer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """Lista itens e transfers associados a uma colheita"""
        colheita = self.get_object()
        from .serializers import ColheitaItemSerializer
        serializer = ColheitaItemSerializer(colheita.itens.all(), many=True)
        return Response(serializer.data)


class ManejoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Manejo"""
    rbac_module = 'agricultura'
    queryset = Manejo.objects.select_related('plantio__cultura', 'usuario_responsavel')
    serializer_class = ManejoSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['plantio', 'tipo', 'data_manejo', 'usuario_responsavel']
    search_fields = ['tipo', 'descricao', 'equipamento']
    ordering_fields = ['data_manejo', 'custo', 'criado_em']
    ordering = ['-data_manejo']

    @action(detail=True, methods=['post'])
    def contabilizar(self, request, pk=None):
        """Força a contabilização do manejo (gera rateio e aprovação)"""
        manejo = self.get_object()
        try:
            from apps.financeiro.services import create_rateio_from_operacao
            user = request.user
            create_rateio_from_operacao(manejo, created_by=user)
            manejo.contabilizado = True
            manejo.save(update_fields=['contabilizado'])
            serializer = self.get_serializer(manejo)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class OrdemServicoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para OrdemServico"""
    rbac_module = 'agricultura'
    queryset = OrdemServico.objects.prefetch_related('talhoes').select_related('fazenda', 'criado_por')
    serializer_class = OrdemServicoSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['fazenda', 'status', 'criado_em']
    search_fields = ['tarefa', 'maquina']
    ordering_fields = ['criado_em', 'data_inicio', 'status']
    ordering = ['-criado_em']


class InsumoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Insumo"""
    rbac_module = 'agricultura'
    queryset = Insumo.objects.all()
    serializer_class = InsumoSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categoria', 'unidade', 'ativo']
    search_fields = ['nome', 'codigo', 'descricao']
    ordering_fields = ['nome', 'categoria', 'criado_em']
    ordering = ['nome']


class DismissAlertViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para DismissAlert"""
    rbac_module = 'agricultura'
    queryset = DismissAlert.objects.all()
    serializer_class = DismissAlertSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]


class HarvestSessionViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Sessões de Colheita"""
    rbac_module = 'agricultura'
    from .serializers import HarvestSessionSerializer
    queryset = HarvestSession.objects.select_related('plantio').prefetch_related('itens', 'equipamentos', 'equipe')
    serializer_class = HarvestSessionSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['plantio', 'status', 'data_inicio']
    search_fields = ['plantio__cultura__nome', 'observacoes']
    ordering_fields = ['data_inicio', 'criado_em']
    ordering = ['-data_inicio']

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Inicia a sessão mudando status de 'planejada' para 'em_andamento'"""
        session = self.get_object()
        if session.status == 'em_andamento':
            return Response({'detail': 'Sessão já está em andamento'}, status=status.HTTP_400_BAD_REQUEST)
        if session.status not in ['planejada']:
            return Response({'detail': f'Não é possível iniciar sessão no status {session.status}'}, status=status.HTTP_400_BAD_REQUEST)
        session.status = 'em_andamento'
        session.save()
        return Response({'status': 'em_andamento', 'message': 'Sessão iniciada com sucesso'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancela a sessão"""
        session = self.get_object()
        session.status = 'cancelada'
        session.save()
        return Response({'status': 'cancelada'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """Tenta finalizar a sessão. Se houver itens pendentes, retorna 400 a não ser que force=1"""
        session = self.get_object()
        force = request.data.get('force') in [True, '1', 1, 'true']
        pending = session.itens.filter(status__in=['pendente', 'em_transporte']).exists()
        if pending and not force:
            return Response({'detail': 'Existem itens pendentes, passe ?force=1 para forçar.'}, status=status.HTTP_400_BAD_REQUEST)
        session.status = 'finalizada'
        session.save()
        return Response({'status': 'finalizada'})


class MovimentacaoCargaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Movimentações de Carga"""
    rbac_module = 'agricultura'
    from .serializers import MovimentacaoCargaSerializer
    queryset = MovimentacaoCarga.objects.select_related('session_item', 'talhao', 'local_destino', 'empresa_destino', 'transporte')
    serializer_class = MovimentacaoCargaSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['session_item', 'session_item__session', 'talhao', 'destino_tipo']
    search_fields = ['placa', 'motorista', 'condicoes_graos']
    ordering_fields = ['criado_em']
    ordering = ['-criado_em']

    def perform_create(self, serializer):
        moviment = serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())
        # serializer.create already updates session_item status and checks finalize
        return moviment

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        """Marca como reconciliada e (quando aplicável) cria uma MovimentacaoEstoque de entrada."""
        mov = self.get_object()
        if mov.reconciled:
            return Response({'detail': 'Movimentação já reconciliada.'}, status=status.HTTP_400_BAD_REQUEST)

        # Determine produto a partir da safra/cultura
        produto = None
        from apps.estoque.models import Produto
        from apps.estoque.services import create_movimentacao

        # 1) Prefer product via session -> plantio -> cultura
        try:
            cultura_nome = mov.session_item.session.plantio.cultura.nome
            produto = Produto.objects.filter(nome__icontains=cultura_nome).first()
        except Exception:
            produto = None

        # 2) If no session, try to derive plantio/cultura from talhão relation
        if not produto and mov.talhao:
            try:
                from apps.agricultura.models import Plantio
                plantio = Plantio.objects.filter(talhoes=mov.talhao).order_by('-data_plantio').first()
                if plantio and plantio.cultura:
                    cultura_nome = plantio.cultura.nome
                    produto = Produto.objects.filter(nome__icontains=cultura_nome).first()
            except Exception:
                produto = None

        # 3) Last resort: try matching produto by talhão name
        if not produto and mov.talhao:
            try:
                produto = Produto.objects.filter(nome__icontains=mov.talhao.name).first()
            except Exception:
                produto = None

        if not produto:
            # Provide clearer message when cultura is unknown
            cultura_display = None
            try:
                cultura_display = getattr(mov.session_item.session.plantio, 'cultura').nome
            except Exception:
                cultura_display = getattr(getattr(mov.talhao, 'name', None), 'name', None) or '?'
            return Response({'detail': f'Produto não encontrado (cultura/talhão: {cultura_display}). Não foi criada movimentação de estoque.'}, status=status.HTTP_400_BAD_REQUEST)

        # Use peso_liquido como quantidade preferencial
        quantidade = mov.peso_liquido or mov.peso_bruto
        if not quantidade:
            return Response({'detail': 'Peso não informado para criar movimentação de estoque.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.estoque.models import Lote
        lote = None
        movimentacao = None

        # Resolver fazenda de forma segura
        fazenda = None
        try:
            if mov.session_item and mov.session_item.session and mov.session_item.session.plantio:
                fazenda = mov.session_item.session.plantio.fazenda
        except Exception:
            pass

        # Behavior depends on destino_tipo
        if mov.destino_tipo in ['armazenagem_interna', 'armazenagem_externa']:
            # Prefer explicit local_destino, fallback to product local
            local = mov.local_destino or produto.local_armazenamento
            if local:
                lote_num = f"COL-{mov.id}"
                lote = Lote.objects.create(produto=produto, numero_lote=lote_num, quantidade_inicial=quantidade, quantidade_atual=0, local_armazenamento=local.nome if hasattr(local, 'nome') else None)

            # Build a safe motivo text
            sess_label = None
            try:
                sess_label = f"sessão {mov.session_item.session.id}"
            except Exception:
                sess_label = f"talhão {mov.talhao.name if getattr(mov.talhao, 'name', None) else mov.talhao.id if getattr(mov.talhao, 'id', None) else ''}"

            motivo_text = f"Entrada a partir de movimentação de carga ({sess_label})"
            if mov.empresa_destino:
                motivo_text += f"; destino empresa: {mov.empresa_destino.nome}"

            movimentacao = create_movimentacao(
                produto=produto,
                tipo='entrada',
                quantidade=quantidade,
                criado_por=request.user,
                origem='colheita',
                lote=lote,
                documento_referencia=f"MovimentacaoCarga #{mov.id}",
                motivo=motivo_text,
                fazenda=fazenda,
                talhao=mov.talhao,
                local_armazenamento=local,
            )

        elif mov.destino_tipo == 'venda_direta':
            # For sales, record a saída (reduces stock) and reference company
            motivo = f"Saída por venda direta (MovimentacaoCarga #{mov.id})"
            if mov.empresa_destino:
                motivo += f" - comprador: {mov.empresa_destino.nome}"
            movimentacao = create_movimentacao(
                produto=produto,
                tipo='saida',
                quantidade=quantidade,
                criado_por=request.user,
                origem='venda',
                documento_referencia=f"MovimentacaoCarga #{mov.id}",
                motivo=motivo,
                fazenda=fazenda,
                talhao=mov.talhao,
            )
        else:
            # Generic fallback: create entrada as before
            local = mov.local_destino or produto.local_armazenamento
            if local:
                lote_num = f"COL-{mov.id}"
                lote = Lote.objects.create(produto=produto, numero_lote=lote_num, quantidade_inicial=quantidade, quantidade_atual=0, local_armazenamento=local.nome if hasattr(local, 'nome') else None)
            sess_label = None
            try:
                sess_label = f"sessão {mov.session_item.session.id}"
            except Exception:
                sess_label = f"talhão {mov.talhao.name if getattr(mov.talhao, 'name', None) else mov.talhao.id if getattr(mov.talhao, 'id', None) else ''}"
            motivo_text = f"Entrada a partir de movimentação de carga ({sess_label})"
            movimentacao = create_movimentacao(
                produto=produto,
                tipo='entrada',
                quantidade=quantidade,
                criado_por=request.user,
                origem='colheita',
                lote=lote,
                documento_referencia=f"MovimentacaoCarga #{mov.id}",
                motivo=motivo_text,
                fazenda=fazenda,
                talhao=mov.talhao,
                local_armazenamento=local,
            )

        mov.reconciled = True
        from django.utils import timezone
        mov.reconciled_at = timezone.now()
        mov.reconciled_by = request.user
        mov.save()

        return Response({'status': 'reconciled', 'movimentacao_estoque': movimentacao.id}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        """Aplica um ajuste sobre a movimentação de estoque criada a partir desta movimentação de carga.

        Payload esperado: { "new_quantity": 123.45, "reason": "ajuste por umidade" }
        O ajuste cria uma MovimentacaoEstoque de compensação (entrada/saida) e atualiza o lote.quantidade_atual.
        Também atualiza o MovimentacaoCarga.peso_liquido para refletir o peso final informado.
        """
        mov = self.get_object()
        new_q = request.data.get('new_quantity')
        reason = request.data.get('reason') or ''
        from decimal import Decimal, InvalidOperation
        try:
            # Use Decimal for consistent arithmetic with model DecimalFields
            new_q = Decimal(str(new_q))
        except (InvalidOperation, Exception):
            return Response({'detail': 'new_quantity inválido'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.estoque.models import MovimentacaoEstoque, Lote
        # Find the MovimentacaoEstoque created by reconcile (matching documento_referencia)
        ref = f"MovimentacaoCarga #{mov.id}"
        origem_mov = MovimentacaoEstoque.objects.filter(documento_referencia=ref).order_by('-id').first()
        if not origem_mov:
            return Response({'detail': 'Movimentação de estoque original não encontrada para ajuste.'}, status=status.HTTP_400_BAD_REQUEST)

        old_q = Decimal(str(origem_mov.quantidade or 0))
        delta = new_q - old_q
        if abs(delta) == Decimal('0'):
            # nothing to adjust
            mov.peso_liquido = new_q
            mov.save()
            return Response({'detail': 'Sem alterações necessárias', 'movimentacao_estoque': origem_mov.id}, status=status.HTTP_200_OK)

        # Create adjustment movimentacao (entrada se delta>0, saida se delta<0)
        tipo = 'entrada' if delta > 0 else 'saida'
        ajuste_motivo = f"Ajuste a partir de MovimentacaoCarga #{mov.id}" + (f" - {reason}" if reason else '')
        from apps.estoque.services import create_movimentacao as create_mov_ajuste
        ajuste = create_mov_ajuste(
            produto=origem_mov.produto,
            tipo=tipo,
            quantidade=abs(delta),
            criado_por=request.user,
            origem='ajuste',
            lote=origem_mov.lote,
            documento_referencia=f"Ajuste-MovimentacaoCarga #{mov.id}",
            motivo=ajuste_motivo,
            fazenda=origem_mov.fazenda,
            talhao=origem_mov.talhao,
            local_armazenamento=origem_mov.local_armazenamento,
        )

        # Ensure lote reflects the new confirmed quantity exactly (avoid relying on delta arithmetic
        # since historical creates may have produced inconsistent totals). We set the lote.quantidade_atual
        # to the confirmed `new_q`.
        lote = origem_mov.lote
        if lote:
            lote.quantidade_atual = new_q
            lote.save()

        # Update original movimentacao record? We leave the original as historical and apply adjustment
        # But update MovimentacaoCarga.peso_liquido to the new confirmed weight
        mov.peso_liquido = new_q
        mov.save()

        return Response({'status': 'adjusted', 'adjustment_id': ajuste.id, 'lote': lote.id if lote else None}, status=status.HTTP_200_OK)

    # ===== FASE 3: Novas Actions para Reconciliação e Relatórios =====
    
    @action(detail=True, methods=['post'])
    def registrar_chegada(self, request, pk=None):
        """Registra chegada de carga com peso da balança (FASE 3)."""
        from .services import CargaService
        
        peso_balanca = request.data.get('peso_balanca')
        if not peso_balanca:
            return Response({'error': 'peso_balanca é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            carga = CargaService.registrar_chegada_carga(
                carga_id=pk,
                peso_balanca=peso_balanca,
                usuario=request.user
            )
            
            from .serializers import MovimentacaoCargaSerializer
            return Response(
                MovimentacaoCargaSerializer(carga).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def diferencas_significativas(self, request):
        """Retorna cargas com diferença significativa entre peso estimado e real (FASE 3)."""
        from .services import CargaService
        
        limite = request.query_params.get('limite_percentual', 5)
        try:
            limite = float(limite)
        except:
            limite = 5
        
        diferencas = CargaService.obter_diferencas_significativas(limite_percentual=limite)
        
        return Response({
            'count': len(diferencas),
            'limite_percentual': limite,
            'results': diferencas
        })
    
    @action(detail=False, methods=['get'])
    def em_transito(self, request):
        """Retorna cargas em trânsito (não reconciliadas) (FASE 3)."""
        from .services import CargaService
        from .serializers import MovimentacaoCargaSerializer
        
        cargas = CargaService.obter_cargas_em_transito()
        serializer = MovimentacaoCargaSerializer(cargas, many=True)
        
        return Response({
            'count': cargas.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Dashboard com estatísticas de cargas (FASE 3)."""
        from django.db.models import Count, Sum, Avg, Q as DQ
        from decimal import Decimal

        qs = self.get_queryset()

        # Estatísticas agregadas (tenant-filtered)
        stats_agg = qs.aggregate(
            total=Count('id'),
            reconciliadas=Count('id', filter=DQ(reconciled=True)),
            peso_total=Sum('peso_liquido'),
            peso_medio=Avg('peso_liquido')
        )
        stats = {
            'total_cargas': stats_agg['total'] or 0,
            'cargas_reconciliadas': stats_agg['reconciliadas'] or 0,
            'cargas_pendentes': (stats_agg['total'] or 0) - (stats_agg['reconciliadas'] or 0),
            'peso_total_kg': float(stats_agg['peso_total'] or 0),
            'peso_medio_kg': float(stats_agg['peso_medio'] or 0),
        }

        # Diferenças significativas (tenant-filtered)
        limite_percentual = 5
        diferencas = []
        for carga in qs.filter(peso_bruto__isnull=False, peso_liquido__isnull=False, reconciled=True):
            peso_estimado = carga.peso_liquido or Decimal('0')
            peso_real = carga.peso_bruto or Decimal('0')
            if peso_estimado > 0:
                diferenca = peso_real - peso_estimado
                percentual = (diferenca / peso_estimado) * 100
                if abs(percentual) > limite_percentual:
                    diferencas.append({
                        'id': carga.id,
                        'placa': carga.placa,
                        'peso_estimado': float(peso_estimado),
                        'peso_balanca': float(peso_real),
                        'diferenca': float(diferenca),
                        'percentual': float(percentual),
                        'data': carga.criado_em,
                    })

        return Response({
            **stats,
            'diferencas_significativas_count': len(diferencas),
            'diferencas_recentes': diferencas[:5],
        })

# ====================================================================
# VIEWSETS PARA NOVO SISTEMA DE OPERAÇÕES UNIFICADO
# ====================================================================

class OperacaoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """
    ViewSet para Operacao - Sistema Unificado de Operações Agrícolas.
    Substitui Manejo e OrdemServico com estrutura hierárquica.
    """
    rbac_module = 'agricultura'
    queryset = Operacao.objects.select_related(
        'plantio__cultura', 'fazenda', 'trator', 'implemento',
        'operador', 'criado_por'
    ).prefetch_related('talhoes__area', 'produtos_operacao__produto')
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'categoria', 'tipo', 'status', 'plantio', 'fazenda',
        'data_operacao', 'operador', 'criado_por'
    ]
    search_fields = ['observacoes', 'plantio__cultura__nome']
    ordering_fields = ['data_operacao', 'criado_em']
    ordering = ['-data_operacao', '-criado_em']
    
    def get_serializer_class(self):
        """Usa serializer simplificado para listagem"""
        if self.action == 'list':
            return OperacaoListSerializer
        return OperacaoSerializer
    
    def perform_create(self, serializer):
        """Define o usuário que criou a operação"""
        # Só associa usuário se estiver autenticado
        tenant_kwargs = self._get_tenant_kwargs()
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(criado_por=self.request.user, **tenant_kwargs)
        else:
            serializer.save(**tenant_kwargs)


    
    @action(detail=False, methods=['GET'], url_path='tipos-por-categoria')
    def tipos_por_categoria(self, request):
        """
        Endpoint auxiliar para wizard dinâmico.
        Retorna tipos de operação filtrados por categoria.
        
        Query params:
            - categoria: código da categoria (ex: 'preparacao', 'adubacao')
        
        Exemplo: /api/agricultura/operacoes/tipos-por-categoria/?categoria=preparacao
        """
        categoria = request.query_params.get('categoria')
        
        if not categoria:
            return Response(
                {'error': 'Parâmetro "categoria" é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar categoria
        categorias_validas = dict(Operacao.CATEGORIA_CHOICES).keys()
        if categoria not in categorias_validas:
            return Response(
                {'error': f'Categoria inválida. Opções: {list(categorias_validas)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filtrar tipos que pertencem à categoria
        # Mapear categoria para prefixo do código
        prefixo_map = {
            'preparacao': 'prep',
            'adubacao': 'adub',
            'plantio': 'plan',
            'tratos': 'trat',
            'pulverizacao': 'pulv',
            'mecanicas': 'mec',
        }
        
        prefixo = prefixo_map.get(categoria, categoria[:4])
        tipos = [
            {'value': codigo, 'label': nome}
            for codigo, nome in Operacao.TIPO_CHOICES
            if codigo.startswith(prefixo)
        ]
        
        return Response({
            'categoria': categoria,
            'tipos': tipos
        })
    
    @action(detail=False, methods=['POST'], url_path='estimate')
    def estimate(self, request):
        """
        Estima quantidades totais de cada produto com base em talhões (ou plantio) e dosagens fornecidas.
        Payload esperada:
          - plantio: optional plantio id
          - talhoes: optional list of talhao ids
          - produtos_input: list of {produto_id, dosagem, unidade_dosagem?}
        Retorna:
          - area_total_ha
          - produtos: [{produto_id, dosagem, unidade_dosagem, quantidade_total, quantidade_estoque, estoque_suficiente, custo_unitario, custo_total}]
        """
        from decimal import Decimal
        data = request.data
        plantio_id = data.get('plantio')
        talhoes_ids = data.get('talhoes') or []
        produtos_input = data.get('produtos_input') or []

        # Importar modelo Produto localmente para evitar import circulares
        from apps.estoque.models import Produto

        area_total = None
        # calcular area
        if plantio_id:
            try:
                plantio = Plantio.objects.get(id=plantio_id)
                area_total = Decimal(str(plantio.area_total_ha))
            except Plantio.DoesNotExist:
                return Response({'error': 'Plantio não encontrado'}, status=status.HTTP_400_BAD_REQUEST)
        elif talhoes_ids:
            from apps.fazendas.models import Talhao
            talhoes_qs = Talhao.objects.filter(id__in=talhoes_ids)
            total = Decimal('0')
            for t in talhoes_qs:
                area = t.area_hectares or t.area_size or 0
                total += Decimal(str(area))
            area_total = total
        else:
            return Response({'error': 'plantio ou talhoes é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        produtos_res = []
        total_custo = Decimal('0')
        for p in produtos_input:
            try:
                produto = Produto.objects.get(id=p.get('produto_id'))
            except Produto.DoesNotExist:
                return Response({'error': f"Produto {p.get('produto_id')} não encontrado"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                dosagem = Decimal(str(p.get('dosagem') or produto.dosagem_padrao or 0))
            except Exception:
                dosagem = Decimal('0')
            quantidade_total = (dosagem * area_total).quantize(Decimal('0.001'))
            qtd_estoque = produto.quantidade_estoque or Decimal('0')
            estoque_suficiente = qtd_estoque >= quantidade_total
            custo_unit = produto.custo_unitario or Decimal('0')
            custo_total_prod = (custo_unit * quantidade_total).quantize(Decimal('0.01'))
            total_custo += custo_total_prod
            produtos_res.append({
                'produto_id': produto.id,
                'produto_nome': produto.nome,
                'dosagem': float(dosagem),
                'unidade_dosagem': p.get('unidade_dosagem') or produto.unidade_dosagem,
                'quantidade_total': float(quantidade_total),
                'quantidade_estoque': float(qtd_estoque),
                'estoque_suficiente': estoque_suficiente,
                'custo_unitario': float(custo_unit),
                'custo_total': float(custo_total_prod),
            })

        return Response({
            'area_total_ha': float(area_total),
            'produtos': produtos_res,
            'custo_total_estimate': float(total_custo)
        })

    @action(detail=False, methods=['GET'], url_path='estatisticas')
    def estatisticas(self, request):
        """
        Retorna estatísticas gerais das operações.
        
        Query params:
            - fazenda: filtrar por fazenda
            - plantio: filtrar por safra
            - data_inicio: filtrar a partir de data
            - data_fim: filtrar até data
        """
        from django.db.models import Count, Sum, Avg
        
        queryset = self.filter_queryset(self.get_queryset())
        
        # Filtros adicionais
        fazenda_id = request.query_params.get('fazenda')
        plantio_id = request.query_params.get('plantio')
        data_inicio = request.query_params.get('data_inicio')
        data_fim = request.query_params.get('data_fim')
        
        if fazenda_id:
            queryset = queryset.filter(fazenda_id=fazenda_id)
        if plantio_id:
            queryset = queryset.filter(plantio_id=plantio_id)
        if data_inicio:
            queryset = queryset.filter(data_operacao__gte=data_inicio)
        if data_fim:
            queryset = queryset.filter(data_operacao__lte=data_fim)
        
        # Calcular estatísticas
        por_categoria = queryset.values('categoria').annotate(
            total=Count('id'),
            custo_total=Sum('custo_total')
        )
        
        por_status = queryset.values('status').annotate(
            total=Count('id')
        )
        
        return Response({
            'total_operacoes': queryset.count(),
            'custo_total': queryset.aggregate(Sum('custo_total'))['custo_total__sum'] or 0,
            'area_total_ha': sum(op.area_total_ha for op in queryset),
            'por_categoria': list(por_categoria),
            'por_status': list(por_status),
        })


@api_view(['POST'])
def whatsapp_ia_webhook(request):
    # Placeholder para integração WhatsApp IA
    # Receber mensagem, processar com IA, responder
    message = request.data.get('message', '')
    # Aqui integrar com API IA (ex: OpenAI, ou placeholder)
    response = f"IA processou: {message}"  # Placeholder
    return Response({'response': response}, status=status.HTTP_200_OK)