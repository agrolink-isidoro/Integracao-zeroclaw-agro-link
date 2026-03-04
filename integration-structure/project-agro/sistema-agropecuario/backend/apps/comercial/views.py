from apps.core.mixins import TenantQuerySetMixin
from rest_framework import viewsets, status
from rest_framework.decorators import action, permission_classes
from rest_framework import status
from rest_framework.response import Response
import rest_framework.permissions as permissions
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Fornecedor, PrestadorServico, InstituicaoFinanceira, Fabricante, Cliente, CargaViagem, SiloBolsa, VendaColheita, DespesaPrestadora, Compra, Empresa, DocumentoFornecedor, HistoricoAlteracao, Contrato
from .serializers import FornecedorSerializer, PrestadorServicoSerializer, InstituicaoFinanceiraSerializer, FabricanteSerializer, ClienteSerializer, CargaViagemSerializer, SiloBolsaSerializer, VendaColheitaSerializer, DespesaPrestadoraSerializer, CompraSerializer, DocumentoFornecedorSerializer, HistoricoAlteracaoSerializer
from .permissions import IsComercialAdmin, CanExportCSV, IsEmpresaMember
from apps.core.permissions import RBACViewPermission


class FornecedorViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Fornecedor

    Aceita tanto payload JSON quanto `multipart/form-data` enviado pelo frontend.
    Faz normalização das chaves de `FormData` (ex: `endereco_*`, `contato_*`,
    `documentos[...]`) para os campos do modelo e cria registros de
    `DocumentoFornecedor` quando fornecidos.
    """
    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'tipo_pessoa', 'categoria', 'estado', 'cidade']
    search_fields = ['nome', 'cpf_cnpj', 'email', 'telefone', 'celular']
    ordering_fields = ['nome', 'criado_em', 'atualizado_em', 'total_compras', 'ultima_compra']
    ordering = ['nome']

    def _normalize_payload_from_formdata(self, request):
        """Converte `request.data`/`request.FILES` do formato do frontend para
        um dicionário compatível com o `FornecedorSerializer` e retorna também
        a lista de documentos (cada um pode conter um arquivo em `FILES`)."""
        data = request.data.copy()

        # Nome: frontend envia `nome_completo` (pf) ou `razao_social` (pj)
        tipo = data.get('tipo_pessoa')
        nome = None
        if tipo == 'pf':
            nome = data.get('nome_completo')
        else:
            nome = data.get('razao_social')
        if nome:
            data['nome'] = nome

        # Categoria: frontend envia `categoria_fornecedor`
        if 'categoria_fornecedor' in data:
            data['categoria'] = data.get('categoria_fornecedor')

        # RG/Inscrição Estadual: frontend envia `inscricao_estadual`
        if 'inscricao_estadual' in data:
            data['rg_ie'] = data.get('inscricao_estadual')

        # Contato
        if 'contato_telefone_principal' in data:
            data['telefone'] = data.get('contato_telefone_principal')
        if 'contato_telefone_secundario' in data:
            data['celular'] = data.get('contato_telefone_secundario')
        if 'contato_email_principal' in data:
            data['email'] = data.get('contato_email_principal')

        # Endereço (write to write-only alias `endereco_text` to avoid clashing
        # with the nested `endereco` SerializerMethodField which is read-only
        mapping = {
            'endereco_logradouro': 'endereco_text',
            'endereco_numero': 'numero',
            'endereco_complemento': 'complemento',
            'endereco_bairro': 'bairro',
            'endereco_cidade': 'cidade',
            'endereco_estado': 'estado',
            'endereco_cep': 'cep'
        }
        for src, dst in mapping.items():
            if src in data:
                data[dst] = data.get(src)

        # Documentos: reunir chaves do tipo documentos[0]tipo, documentos[0]numero, ...
        docs = []
        import re
        for key in list(data.keys()):
            m = re.match(r'documentos\[(\d+)\](\w+)', key)
            if m:
                idx = int(m.group(1))
                field = m.group(2)
                while len(docs) <= idx:
                    docs.append({})
                docs[idx][field] = data.get(key)

        # Arquivos em request.FILES podem usar a mesma convenção
        for fkey in list(request.FILES.keys()):
            m = re.match(r'documentos\[(\d+)\](\w+)', fkey)
            if m:
                idx = int(m.group(1))
                field = m.group(2)
                while len(docs) <= idx:
                    docs.append({})
                docs[idx][field] = request.FILES.get(fkey)

        return data, docs

    def create(self, request, *args, **kwargs):
        data, docs = self._normalize_payload_from_formdata(request)

        serializer = self.get_serializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        fornecedor = serializer.save(criado_por=request.user)

        # Criar documentos associados se houver
        if docs:
            errors = {}
            for i, d in enumerate(docs):
                d['fornecedor'] = fornecedor.id
                doc_serializer = DocumentoFornecedorSerializer(data=d, context={'request': request})
                if doc_serializer.is_valid():
                    doc_serializer.save(criado_por=request.user)
                else:
                    errors[i] = doc_serializer.errors
            if errors:
                # Rollback parcial: remover fornecedor e retornar erro estruturado
                fornecedor.delete()
                return Response({'documentos': errors}, status=status.HTTP_400_BAD_REQUEST)

        return Response(FornecedorSerializer(fornecedor).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Normaliza payload similar ao create para suportar edição via FormData."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        data, docs = self._normalize_payload_from_formdata(request)

        serializer = self.get_serializer(instance, data=data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        fornecedor = serializer.save()

        # Se houver documentos enviados, anexar como novos documentos
        if docs:
            for d in docs:
                d['fornecedor'] = fornecedor.id
                doc_serializer = DocumentoFornecedorSerializer(data=d, context={'request': request})
                if doc_serializer.is_valid():
                    doc_serializer.save(criado_por=request.user)
                else:
                    # ignorar documentos inválidos na atualização (poderíamos retornar erro se preferir)
                    pass

        return Response(FornecedorSerializer(fornecedor).data)

    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Dashboard específico do fornecedor"""
        fornecedor = self.get_object()
        data = {
            'fornecedor': FornecedorSerializer(fornecedor).data,
            'documentos_vencendo': DocumentoFornecedorSerializer(
                fornecedor.documentos_vencendo(), many=True
            ).data,
            'documentos_vencidos': DocumentoFornecedorSerializer(
                fornecedor.documentos_vencidos(), many=True
            ).data,
            'historico_recente': HistoricoAlteracaoSerializer(
                fornecedor.historico.order_by('-alterado_em')[:10], many=True
            ).data,
        }
        return Response(data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsComercialAdmin, CanExportCSV])
    def dashboard(self, request):
        """Dashboard geral de fornecedores com KPIs agregados"""
        hoje = timezone.now().date()
        from django.db.models import Sum, Count

        total_fornecedores = self.get_queryset().count()
        gastos_por_categoria = list(self.get_queryset().values('categoria').annotate(total=Sum('total_compras')).order_by('-total'))
        fornecedores_por_status = list(self.get_queryset().values('status').annotate(count=Count('id')))

        _tenant = self._get_request_tenant()
        _tf = {'tenant': _tenant} if _tenant is not None else {}
        documentos_vencendo_count = DocumentoFornecedor.objects.filter(
            **_tf,
            status='ativo',
            data_vencimento__lte=hoje + timezone.timedelta(days=30),
            data_vencimento__gte=hoje
        ).count()
        documentos_vencidos_count = DocumentoFornecedor.objects.filter(
            **_tf,
            status='ativo',
            data_vencimento__lt=hoje
        ).count()

        top_fornecedores_gastos = list(self.get_queryset().order_by('-total_compras').values('id', 'nome', 'total_compras')[:10])

        data_global = {
            'total_fornecedores': total_fornecedores,
            'gastos_por_categoria': gastos_por_categoria,
            'fornecedores_por_status': fornecedores_por_status,
            'documentos_vencendo_count': documentos_vencendo_count,
            'documentos_vencidos_count': documentos_vencidos_count,
            'top_fornecedores_gastos': top_fornecedores_gastos,
        }
        return Response(data_global)


class PrestadorServicoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para PrestadorServico"""
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = PrestadorServico.objects.all()
    serializer_class = PrestadorServicoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'tipo_pessoa', 'categoria', 'estado', 'cidade']
    search_fields = ['nome', 'cpf_cnpj', 'email', 'telefone', 'celular', 'especialidades']
    ordering_fields = ['nome', 'categoria', 'criado_em', 'atualizado_em']
    ordering = ['nome']


class InstituicaoFinanceiraViewSet(viewsets.ModelViewSet):
    """ViewSet para InstituicaoFinanceira - Retorna todas as instituições sem limitação de tenant
    
    Fornece lista completa de instituições financeiras brasileiras (BACEN).
    Suporta paginação com page_size até 1000.
    """
    permission_classes = [IsAuthenticated]
    queryset = InstituicaoFinanceira.objects.all()
    serializer_class = InstituicaoFinanceiraSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'segmento', 'estado', 'cidade']
    search_fields = ['codigo_bacen', 'nome', 'nome_reduzido', 'site']
    ordering_fields = ['nome', 'codigo_bacen', 'segmento', 'criado_em']
    ordering = ['nome']
    pagination_class = None  # Retorna todos os resultados (total ~280+ bancos) sem paginação por padrão


class FabricanteViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Fabricante"""
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = Fabricante.objects.all()
    serializer_class = FabricanteSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'tipo_pessoa', 'estado', 'cidade']
    search_fields = ['nome', 'cpf_cnpj', 'email', 'telefone', 'celular', 'linha_produtos', 'certificacoes']
    ordering_fields = ['nome', 'criado_em', 'atualizado_em']
    ordering = ['nome']


class ClienteViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Cliente"""
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'tipo_pessoa', 'estado', 'cidade']
    search_fields = ['nome', 'cpf_cnpj', 'rg_ie', 'email', 'telefone', 'celular']
    ordering_fields = ['nome', 'criado_em', 'atualizado_em']
    ordering = ['nome']
    # Tests and some clients expect full list responses (no pagination)
    pagination_class = None

    def list(self, request, *args, **kwargs):
        """Override to add diagnostic logging for tests"""
        resp = super().list(request, *args, **kwargs)
        try:
            logger.error('CLIENTE LIST response data type=%s sample=%s', type(resp.data), str(resp.data)[:200])
        except Exception:
            logger.exception('Error while logging cliente list response')
        return resp


class CargaViagemViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para CargaViagem com filtros avançados"""
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = CargaViagem.objects.select_related('fazenda', 'cultura', 'colheita_agricola', 'criado_por')
    serializer_class = CargaViagemSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'tipo_colheita', 'tipo_entrega', 'fazenda', 'cultura', 'colheita_agricola',
        'data_colheita', 'criado_por'
    ]
    search_fields = ['observacoes', 'classificacao']
    ordering_fields = ['data_colheita', 'peso_total', 'criado_em', 'atualizado_em']
    ordering = ['-data_colheita']

    def perform_create(self, serializer):
        """Define o usuário que criou o registro"""
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())

    @action(detail=True, methods=['post'])
    def weigh_tare(self, request, pk=None):
        """Registrar peso tare (caminhão vazio)."""
        carga = self.get_object()
        tare_weight = request.data.get('tare_weight')
        truck_plate = request.data.get('truck_plate')
        driver_name = request.data.get('driver_name')

        if tare_weight is None:
            return Response({'error': 'tare_weight é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        carga.tare_weight = tare_weight
        carga.tare_time = timezone.now()
        if truck_plate:
            carga.truck_plate = truck_plate
        if driver_name:
            carga.driver_name = driver_name
        carga.save()
        serializer = self.get_serializer(carga)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def weigh_gross(self, request, pk=None):
        """Registrar peso bruto (após carregamento)."""
        carga = self.get_object()
        gross_weight = request.data.get('gross_weight')
        if gross_weight is None:
            return Response({'error': 'gross_weight é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        carga.gross_weight = gross_weight
        carga.gross_time = timezone.now()
        carga.save()
        serializer = self.get_serializer(carga)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unload(self, request, pk=None):
        """Descarrega a carga em um `LocalArmazenamento`. Cria lote + movimentacao de entrada."""
        carga = self.get_object()
        local_id = request.data.get('local_armazenamento_id')
        lote_numero = request.data.get('lote_numero')
        if local_id is None:
            return Response({'error': 'local_armazenamento_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from apps.estoque.models import LocalArmazenamento, Lote, Produto
            from apps.estoque.services import create_movimentacao
            local = LocalArmazenamento.objects.get(id=local_id)
        except LocalArmazenamento.DoesNotExist:
            return Response({'error': 'Local de armazenamento não encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Need net weight
        net = carga.net_weight
        if net is None or net <= 0:
            return Response({'error': 'Net weight não disponível ou inválido'}, status=status.HTTP_400_BAD_REQUEST)

        # Create lote
        if not lote_numero:
            lote_numero = f"COL-{carga.id}-{(timezone.now()).strftime('%Y%m%d')}-{(carga.truck_plate or 'NA')}"

        # Map product by cultura
        produto = Produto.objects.filter(nome__icontains=carga.cultura.nome).first()
        if not produto:
            return Response({'error': 'Produto para cultura não encontrado; vincule um produto antes do descarregamento'}, status=status.HTTP_400_BAD_REQUEST)

        lote, created = Lote.objects.get_or_create(
            produto=produto,
            numero_lote=lote_numero,
            defaults={
                'quantidade_inicial': net,
                'quantidade_atual': net,
                'local_armazenamento': local.nome,
                'data_fabricacao': carga.data_colheita,
            }
        )

        # Create movimentacao de entrada usando service transacional
        movimentacao = create_movimentacao(
            produto=produto,
            tipo='entrada',
            quantidade=net,
            criado_por=request.user,
            origem='colheita',
            lote=lote,
            fazenda=carga.fazenda,
            talhao=None,
            local_armazenamento=local,
            documento_referencia=f"Carga #{carga.id}",
            motivo=f"Recebimento de colheita {carga.tipo_colheita}",
        )

        carga.unload_local = local
        carga.unload_movimentacao = movimentacao
        carga.save()

        # link colheita if present
        if carga.colheita_agricola:
            carga.colheita_agricola.status = 'armazenada'
            carga.colheita_agricola.movimentacao_estoque = movimentacao
            carga.colheita_agricola.save()

        serializer = self.get_serializer(carga)
        return Response(serializer.data)


class SiloBolsaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para SiloBolsa com filtros de estoque"""
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = SiloBolsa.objects.select_related('carga_viagem__cultura', 'carga_viagem__fazenda', 'criado_por')
    serializer_class = SiloBolsaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['carga_viagem', 'data_armazenamento', 'criado_por']
    search_fields = ['carga_viagem__cultura__nome', 'carga_viagem__fazenda__name']
    ordering_fields = ['data_armazenamento', 'estoque_atual', 'capacidade_total', 'criado_em']
    ordering = ['-data_armazenamento']

    def perform_create(self, serializer):
        """Define o usuário que criou o registro"""
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())


class VendaColheitaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para VendaColheita com integração fiscal"""
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = VendaColheita.objects.select_related('cliente', 'criado_por')
    serializer_class = VendaColheitaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'origem_tipo', 'cliente', 'data_venda', 'regime_tributario',
        'status_emissao', 'criado_por'
    ]
    search_fields = ['numero_nota_fiscal', 'observacoes', 'cliente__nome']
    ordering_fields = ['data_venda', 'valor_total', 'data_emissao_nota', 'criado_em']
    ordering = ['-data_venda']

    def perform_create(self, serializer):
        """Define o usuário que criou o registro e calcula valor total"""
        data = serializer.validated_data
        quantidade = data.get('quantidade', 0)
        preco_unitario = data.get('preco_unitario', 0)
        valor_total = quantidade * preco_unitario

        serializer.save(
            criado_por=self.request.user,
            valor_total=valor_total,
            **self._get_tenant_kwargs()
        )


class EmpresaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Empresa"""
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = Empresa.objects.all()

    def get_serializer_class(self):
        from .serializers import EmpresaSerializer
        return EmpresaSerializer


class DespesaPrestadoraViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = DespesaPrestadora.objects.all()
    serializer_class = DespesaPrestadoraSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['empresa', 'prestador', 'categoria', 'data']
    search_fields = ['descricao']
    ordering_fields = ['data', 'valor']

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())


class CompraViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = Compra.objects.all()
    serializer_class = CompraSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['fornecedor', 'data']
    search_fields = ['descricao']
    ordering_fields = ['data', 'valor_total']

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())


class ContratoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet for Contratos (MVP)."""
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = Contrato.objects.all()
    serializer_class = None
    # Contracts are expected to be returned as full lists in our tests (no pagination)
    pagination_class = None
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'categoria', 'data_inicio']
    search_fields = ['numero_contrato', 'titulo']
    ordering_fields = ['data_inicio', 'criado_em']

    def get_queryset(self):
        return super().get_queryset()

    def get_serializer_class(self):
        from .serializers import ContratoSerializer
        return ContratoSerializer

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user, **self._get_tenant_kwargs())


class VendasComprasViewSet(viewsets.ViewSet):
    """Unified endpoint exposing vendas and compras and supporting creation of both types."""
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]

    def list(self, request):
        from .models import Compra, VendaColheita
        from .serializers import CompraSerializer, VendaColheitaSerializer

        # Tenant filtering — get tenant from request
        _tenant = getattr(request, 'tenant', None) or getattr(request.user, 'tenant', None)
        _tf = {'tenant': _tenant} if _tenant else {}

        # basic combined list sorted by date descending
        compras = Compra.objects.filter(**_tf).order_by('-data')[:100]
        vendas = VendaColheita.objects.filter(**_tf).order_by('-data_venda')[:100]

        result = []
        for c in compras:
            result.append({
                'id': f"compra-{c.id}",
                'tipo_operacao': 'compra',
                'numero_documento': str(c.id),
                'data_operacao': c.data.isoformat(),
                'entidade_tipo': 'fornecedor',
                'entidade_id': c.fornecedor.id if c.fornecedor else None,
                'entidade_nome': c.fornecedor.nome if c.fornecedor else None,
                'valor_liquido': float(c.valor_total),
                'status': 'paga',
            })

        for v in vendas:
            result.append({
                'id': f"venda-{v.id}",
                'tipo_operacao': 'venda',
                'numero_documento': str(v.id),
                'data_operacao': v.data_venda.isoformat(),
                'entidade_tipo': 'cliente',
                'entidade_id': v.cliente.id if v.cliente else None,
                'entidade_nome': v.cliente.nome if v.cliente else None,
                'valor_liquido': float(v.valor_total),
                'status': 'entregue' if getattr(v, 'status_emissao', None) == 'issued' else 'pendente',
            })

        # sort by date desc
        result.sort(key=lambda r: r.get('data_operacao', ''), reverse=True)
        return Response(result)

    def create(self, request):
        payload = request.data
        tipo = payload.get('tipo_operacao')
        if tipo == 'compra':
            # delegate to CompraSerializer
            from .serializers import CompraSerializer
            serializer = CompraSerializer(data=payload, context={'request': request})
            serializer.is_valid(raise_exception=True)
            obj = serializer.save()
            return Response(CompraSerializer(obj).data, status=201)
        elif tipo == 'venda':
            from .serializers import VendaColheitaSerializer
            serializer = VendaColheitaSerializer(data=payload, context={'request': request})
            serializer.is_valid(raise_exception=True)
            obj = serializer.save(criado_por=request.user)
            return Response(VendaColheitaSerializer(obj).data, status=201)
        else:
            return Response({'detail': 'tipo_operacao must be compra or venda'}, status=400)


class EmpresaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para Empresa"""
    rbac_module = 'comercial'
    queryset = Empresa.objects.all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['cnpj']
    search_fields = ['nome', 'cnpj', 'contato']
    ordering_fields = ['nome', 'criado_em']
    ordering = ['nome']
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]

    def get_serializer_class(self):
        # Lazy import to avoid import-time errors in CI when migrations run
        from .serializers import EmpresaSerializer
        return EmpresaSerializer


# Aggregation endpoints
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db.models import Sum

from rest_framework.permissions import IsAuthenticated
from .permissions import IsEmpresaMember, IsComercialAdmin, CanExportCSV
import logging
logger = logging.getLogger(__name__)


class EmpresaAgregadosView(APIView):
    """Retorna agregados (total e por categoria) para uma empresa num período"""
    rbac_module = 'comercial'
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission, IsEmpresaMember, CanExportCSV]

    def get(self, request, pk):
        periodo = request.query_params.get('periodo')  # YYYY-MM
        fmt = request.query_params.get('format', 'json')
        # support explicit /csv/ path
        if fmt != 'csv' and request.path.endswith('/csv/'):
            fmt = 'csv'

        empresa = get_object_or_404(Compra._meta.apps.get_model('comercial', 'Empresa'), pk=pk)
        # FIX: Filter by tenant to prevent data leakage
        qs = DespesaPrestadora.objects.filter(empresa_id=pk, tenant=request.user.tenant)

        if periodo:
            try:
                year, month = periodo.split('-')
                qs = qs.filter(data__year=int(year), data__month=int(month))
            except Exception:
                return Response({'detail': 'periodo deve ter formato YYYY-MM'}, status=400)

        total = qs.aggregate(total=Sum('valor'))['total'] or 0
        por_categoria_qs = qs.values('categoria').annotate(total=Sum('valor')).order_by('-total')

        por_categoria = [{'categoria': x['categoria'], 'total': float(x['total'] or 0)} for x in por_categoria_qs]

        payload = {
            'periodo': periodo,
            'empresa': {'id': empresa.id, 'nome': empresa.nome, 'cnpj': getattr(empresa, 'cnpj', None)},
            'total': float(total or 0),
            'por_categoria': por_categoria
        }

        if fmt == 'csv':
            # build CSV
            import csv
            from io import StringIO
            si = StringIO()
            writer = csv.writer(si)
            writer.writerow(['categoria', 'total'])
            for row in por_categoria:
                writer.writerow([row['categoria'], f"{row['total']:.2f}"])
            writer.writerow(['TOTAL', f"{payload['total']:.2f}"])
            resp = HttpResponse(si.getvalue(), content_type='text/csv')
            resp['Content-Disposition'] = f'attachment; filename="agregados_empresa_{pk}_{periodo or "all"}.csv"'
            return resp

        return Response(payload)


class AgregadosListView(APIView):
    """Retorna agregados globais por empresa com paginação"""
    rbac_module = 'comercial'
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission, IsComercialAdmin, CanExportCSV]
    pagination_class = PageNumberPagination

    def get(self, request):
        periodo = request.query_params.get('periodo')
        fmt = request.query_params.get('format', 'json')
        # support explicit /csv/ path
        if fmt != 'csv' and request.path.endswith('/csv/'):
            fmt = 'csv'
        # Detailed logging to aid debugging of CSV/permissions issues
        try:
            logger.error('AGREGADOS GET: path=%s format=%s user=%s is_staff=%s', request.path, fmt, getattr(request.user, 'username', None), getattr(getattr(request, 'user', None), 'is_staff', None))
        except Exception:
            logger.exception('Error while logging agregados request')

        # FIX: Filter by tenant to prevent data leakage
        qs = DespesaPrestadora.objects.filter(tenant=request.user.tenant)
        if periodo:
            try:
                year, month = periodo.split('-')
                qs = qs.filter(data__year=int(year), data__month=int(month))
            except Exception:
                return Response({'detail': 'periodo deve ter formato YYYY-MM'}, status=400)

        agg = qs.values('empresa', 'empresa__nome', 'empresa__cnpj').annotate(total=Sum('valor')).order_by('-total')

        # transform to friendly dicts
        items = [{'empresa': {'id': x['empresa'], 'nome': x.get('empresa__nome'), 'cnpj': x.get('empresa__cnpj')}, 'total': float(x['total'] or 0)} for x in agg]

        # CSV export for global
        if fmt == 'csv':
            import csv
            from io import StringIO
            si = StringIO()
            writer = csv.writer(si)
            writer.writerow(['empresa_id', 'empresa_nome', 'cnpj', 'total'])
            for it in items:
                writer.writerow([it['empresa']['id'], it['empresa']['nome'] or '', it['empresa']['cnpj'] or '', f"{it['total']:.2f}"])
            resp = HttpResponse(si.getvalue(), content_type='text/csv')
            resp['Content-Disposition'] = f'attachment; filename="agregados_comercial_{periodo or "all"}.csv"'
            return resp

        # paginate
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(items, request)
        return paginator.get_paginated_response(page)


class DocumentoFornecedorViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para DocumentoFornecedor"""
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = DocumentoFornecedor.objects.all()
    serializer_class = DocumentoFornecedorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['fornecedor', 'tipo', 'status', 'data_vencimento']
    search_fields = ['titulo', 'numero', 'descricao']
    ordering_fields = ['titulo', 'data_emissao', 'data_vencimento', 'criado_em']
    ordering = ['-data_vencimento']

    @action(detail=False, methods=['get'])
    def vencendo(self, request):
        """Documentos vencendo nos próximos 30 dias"""
        from django.utils import timezone
        hoje = timezone.now().date()
        data_limite = hoje + timezone.timedelta(days=30)
        queryset = self.get_queryset().filter(
            data_vencimento__lte=data_limite,
            data_vencimento__gte=hoje,
            status='ativo'
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def vencidos(self, request):
        """Documentos já vencidos"""
        from django.utils import timezone
        hoje = timezone.now().date()
        queryset = self.get_queryset().filter(
            data_vencimento__lt=hoje,
            status='ativo'
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class HistoricoAlteracaoViewSet(TenantQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet para HistoricoAlteracao (somente leitura)"""
    rbac_module = 'comercial'
    permission_classes = [IsAuthenticated, RBACViewPermission]
    queryset = HistoricoAlteracao.objects.all()
    serializer_class = HistoricoAlteracaoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['fornecedor', 'tipo_alteracao', 'alterado_por']
    search_fields = ['descricao']
    ordering_fields = ['alterado_em']
    ordering = ['-alterado_em']


class VendaContratoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """ViewSet para VendaContrato"""
    rbac_module = 'comercial'
    from .models import VendaContrato
    from .serializers import VendaContratoSerializer, CriarContratoSerializer
    
    queryset = VendaContrato.objects.all()
    serializer_class = VendaContratoSerializer
    permission_classes = [IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'tipo', 'cliente']
    search_fields = ['numero_contrato', 'cliente__nome', 'produto__nome']
    ordering_fields = ['data_contrato', 'valor_total', 'numero_contrato']
    ordering = ['-data_contrato']
    
    def get_queryset(self):
        """Otimiza queries com select_related e prefetch_related"""
        return super().get_queryset().select_related(
            'cliente', 'produto', 'criado_por'
        ).prefetch_related('parcelas', 'parcelas__vencimento')
    
    @action(detail=False, methods=['post'])
    def criar_com_parcelas(self, request):
        """Cria contrato e gera parcelas automaticamente."""
        from .serializers import CriarContratoSerializer
        from .services import ContratoService
        
        serializer = CriarContratoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Remover campos não pertencentes ao model
            dados_contrato = {
                k: v for k, v in serializer.validated_data.items()
            }
            
            contrato = ContratoService.criar_contrato_com_parcelas(
                dados_contrato=dados_contrato,
                usuario=request.user,
                tenant=getattr(request, 'tenant', None) or getattr(request.user, 'tenant', None),
            )
            
            from .serializers import VendaContratoSerializer
            return Response(
                VendaContratoSerializer(contrato).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela contrato."""
        from .services import ContratoService
        
        try:
            contrato = ContratoService.cancelar_contrato(pk, request.user)
            from .serializers import VendaContratoSerializer
            return Response(
                VendaContratoSerializer(contrato).data,
                status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Dashboard de contratos com KPIs"""
        from .services import ContratoService
        from django.db.models import Count, Sum
        
        # KPIs principais
        total_ativos = self.get_queryset().filter(status='ATIVO').count()
        valor_total_ativos = ContratoService.obter_valor_total_contratos(status='ATIVO')
        
        # Contratos por tipo
        contratos_por_tipo = list(
            self.get_queryset().values('tipo').annotate(
                count=Count('id'),
                total=Sum('valor_total')
            )
        )
        
        # Parcelas vencendo
        from .models import ParcelaContrato
        parcelas_vencendo = ContratoService.obter_parcelas_vencendo(dias=30)
        from .serializers import ParcelaContratoSerializer
        parcelas_data = ParcelaContratoSerializer(parcelas_vencendo[:10], many=True).data
        
        return Response({
            'total_contratos_ativos': total_ativos,
            'valor_total_contratos_ativos': float(valor_total_ativos),
            'contratos_por_tipo': contratos_por_tipo,
            'parcelas_vencendo': parcelas_data,
        })


class ParcelaContratoViewSet(TenantQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet para ParcelaContrato (somente leitura)"""
    rbac_module = 'comercial'
    from .models import ParcelaContrato
    from .serializers import ParcelaContratoSerializer
    
    queryset = ParcelaContrato.objects.all()
    serializer_class = ParcelaContratoSerializer
    permission_classes = [IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['contrato', 'vencimento__status']
    ordering_fields = ['data_vencimento', 'numero_parcela', 'valor']
    ordering = ['data_vencimento']
    
    def get_queryset(self):
        """Otimiza queries"""
        return super().get_queryset().select_related(
            'contrato', 'contrato__cliente', 'vencimento'
        )

