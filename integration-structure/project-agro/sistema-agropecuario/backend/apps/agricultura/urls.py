from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'agricultura'

router = DefaultRouter()
router.register(r'culturas', views.CulturaViewSet)
router.register(r'plantios', views.PlantioViewSet)
router.register(r'colheitas', views.ColheitaViewSet)
router.register(r'manejos', views.ManejoViewSet)
router.register(r'ordens-servico', views.OrdemServicoViewSet)
router.register(r'insumos', views.InsumoViewSet)
router.register(r'dismiss-alerts', views.DismissAlertViewSet)
router.register(r'harvest-sessions', views.HarvestSessionViewSet)
router.register(r'movimentacoes-carga', views.MovimentacaoCargaViewSet)

# Novo sistema de operações unificado
router.register(r'operacoes', views.OperacaoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]