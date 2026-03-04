from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"locais-armazenamento", views.LocalArmazenamentoViewSet)
router.register(r"produtos", views.ProdutoViewSet)
router.register(r"lotes", views.LoteViewSet)
router.register(r"movimentacoes", views.MovimentacaoEstoqueViewSet)
router.register(r"auditoria-produtos", views.ProdutoAuditoriaViewSet)
router.register(r"movimentacao-statements", views.MovimentacaoStatementViewSet)

# FASE 1 - Comercial Revamp: Localizações
router.register(r"localizacoes", views.LocalizacaoViewSet, basename='localizacao')
router.register(r"produtos-armazenados", views.ProdutoArmazenadoViewSet, basename='produto-armazenado')

urlpatterns = [
    path("", include(router.urls)),
    path('categorias/', views.categorias_list, name='categorias-list'),
    path('produto-ultimo-preco/', views.produto_ultimo_preco_entrada, name='produto-ultimo-preco'),
]
