from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import DespesaPrestadora
from .serializers import DespesaPrestadoraSerializer


class DespesaPrestadoraViewSet(viewsets.ModelViewSet):
    """ViewSet para DespesaPrestadora"""
    queryset = DespesaPrestadora.objects.select_related('empresa', 'prestador', 'criado_por')
    serializer_class = DespesaPrestadoraSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['empresa', 'prestador', 'categoria', 'data', 'centro_custo']
    search_fields = ['descricao']
    ordering_fields = ['data', 'valor', 'criado_em']
    ordering = ['-data']

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)


# Compra ViewSet
from .models import Compra
from .serializers import CompraSerializer

class CompraViewSet(viewsets.ModelViewSet):
    """ViewSet para Compra"""
    queryset = Compra.objects.select_related('fornecedor', 'criado_por')
    serializer_class = CompraSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['fornecedor', 'data']
    search_fields = ['descricao']
    ordering_fields = ['data', 'valor_total']
    ordering = ['-data']

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)
