from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Criação do router para as ViewSets
router = DefaultRouter()

# Rotas para categorização flexível (NOVO)
router.register(r'categorias-equipamento', views.CategoriaEquipamentoViewSet, basename='categoria-equipamento')

# Rotas existentes (atualizadas)
router.register(r'equipamentos', views.EquipamentoViewSet, basename='equipamento')
router.register(r'abastecimentos', views.AbastecimentoViewSet, basename='abastecimento')
router.register(r'ordens-servico', views.OrdemServicoViewSet, basename='ordem-servico')
router.register(r'manutencoes-preventivas', views.ManutencaoPreventivaViewSet, basename='manutencao-preventiva')
router.register(r'configuracoes-alerta', views.ConfiguracaoAlertaViewSet, basename='configuracao-alerta')

# Padrões de URL para o app máquinas
urlpatterns = [
    # Inclui todas as rotas do router
    path('', include(router.urls)),

    # URLs adicionais podem ser adicionadas aqui se necessário
    # path('relatorios/', views.RelatorioView.as_view(), name='relatorios'),
]