from rest_framework.routers import DefaultRouter
from .views import (
    FornecedorViewSet, PrestadorServicoViewSet, InstituicaoFinanceiraViewSet, FabricanteViewSet,
    ClienteViewSet, CargaViagemViewSet, SiloBolsaViewSet, VendaColheitaViewSet, EmpresaViewSet,
    DocumentoFornecedorViewSet, HistoricoAlteracaoViewSet, VendaContratoViewSet, ParcelaContratoViewSet,
    ContratoViewSet, VendasComprasViewSet
)
from .despesas import DespesaPrestadoraViewSet, CompraViewSet
from .contratos_views import (
    ContratoCompraViewSet, ItemCompraViewSet, CondicaoCompraViewSet,
    ContratoVendaViewSet, ItemVendaViewSet, ParcelaVendaViewSet, CondicaoVendaViewSet,
    ContratoFinanceiroViewSet, DadosEmprestimoViewSet, DadosConsorcioViewSet,
    DadosSeguroViewSet, DadosAplicacaoFinanceiraViewSet,
    DocumentoAdicionalFinanceiroViewSet, CondicaoFinanceiraViewSet
)

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
router.register(r'contratos', ContratoViewSet, basename='contrato')
router.register(r'vendas-compras', VendasComprasViewSet, basename='vendas-compras')
# Contract management endpoints
router.register(r'contratos-compra', ContratoCompraViewSet, basename='contrato-compra')
router.register(r'itens-compra', ItemCompraViewSet, basename='item-compra')
router.register(r'condicoes-compra', CondicaoCompraViewSet, basename='condicao-compra')
router.register(r'contratos-venda', ContratoVendaViewSet, basename='contrato-venda')
router.register(r'itens-venda', ItemVendaViewSet, basename='item-venda')
router.register(r'parcelas-venda', ParcelaVendaViewSet, basename='parcela-venda')
router.register(r'condicoes-venda', CondicaoVendaViewSet, basename='condicao-venda')
router.register(r'contratos-financeiro', ContratoFinanceiroViewSet, basename='contrato-financeiro')
router.register(r'dados-emprestimo', DadosEmprestimoViewSet, basename='dados-emprestimo')
router.register(r'dados-consorcio', DadosConsorcioViewSet, basename='dados-consorcio')
router.register(r'dados-seguro', DadosSeguroViewSet, basename='dados-seguro')
router.register(r'dados-aplicacao-financeira', DadosAplicacaoFinanceiraViewSet, basename='dados-aplicacao-financeira')
router.register(r'documentos-adicionais-financeiro', DocumentoAdicionalFinanceiroViewSet, basename='documento-adicional-financeiro')
router.register(r'condicoes-financeira', CondicaoFinanceiraViewSet, basename='condicao-financeira')

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