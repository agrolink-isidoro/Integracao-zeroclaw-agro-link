from rest_framework.routers import DefaultRouter
from .views import (
    FornecedorViewSet, PrestadorServicoViewSet, InstituicaoFinanceiraViewSet, FabricanteViewSet,
    ClienteViewSet, CargaViagemViewSet, SiloBolsaViewSet, VendaColheitaViewSet, EmpresaViewSet,
    DocumentoFornecedorViewSet, HistoricoAlteracaoViewSet, VendaContratoViewSet, ParcelaContratoViewSet
)
from .despesas import DespesaPrestadoraViewSet, CompraViewSet

# Register app namespace so reverse('comercial:...') works in tests
app_name = 'comercial'

router = DefaultRouter()
router.register(r'fornecedores', FornecedorViewSet)
router.register(r'prestadores-servico', PrestadorServicoViewSet)
router.register(r'instituicoes-financeiras', InstituicaoFinanceiraViewSet)
router.register(r'fabricantes', FabricanteViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'empresas', EmpresaViewSet)
router.register(r'cargas-viagem', CargaViagemViewSet)
router.register(r'carga-viagems', CargaViagemViewSet)
router.register(r'silos-bolsa', SiloBolsaViewSet)
router.register(r'vendas-colheita', VendaColheitaViewSet)
router.register(r'despesas-prestadoras', DespesaPrestadoraViewSet)
router.register(r'compras', CompraViewSet)
router.register(r'documentos-fornecedor', DocumentoFornecedorViewSet)
router.register(r'historico-alteracao', HistoricoAlteracaoViewSet)
# FASE 2 - Contratos
router.register(r'vendas-contrato', VendaContratoViewSet)
router.register(r'parcelas-contrato', ParcelaContratoViewSet)
# New endpoints
from .views import ContratoViewSet, VendasComprasViewSet
router.register(r'contratos', ContratoViewSet, basename='contrato')
router.register(r'vendas-compras', VendasComprasViewSet, basename='vendas-compras')

from django.urls import path, re_path
from .views import EmpresaAgregadosView, AgregadosListView

urlpatterns = router.urls + [
    # support both query-param format and suffix (e.g. .csv)
    path('empresas/<int:pk>/agregados/', EmpresaAgregadosView.as_view(), name='empresa-agregados'),
    re_path(r'^empresas/(?P<pk>\d+)/agregados(?:\.(?P<format>[^/]+))?/$', EmpresaAgregadosView.as_view()),
    path('empresas/<int:pk>/agregados/csv/', EmpresaAgregadosView.as_view()),
    path('agregados/', AgregadosListView.as_view(), name='agregados'),
    path('agregados/csv/', AgregadosListView.as_view()),
    re_path(r'^agregados(?:\.(?P<format>[^/]+))?/$', AgregadosListView.as_view()),
]