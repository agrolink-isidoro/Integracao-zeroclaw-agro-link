from rest_framework import routers
from .views import (
    ConfiguracaoSistemaViewSet, LogAuditoriaViewSet,
    BackupViewSet, NotificacaoViewSet,
    CentroCustoViewSet, DespesaAdministrativaViewSet,
    FuncionarioViewSet, FolhaPagamentoViewSet
)

router = routers.SimpleRouter()
router.register(r'configuracoes', ConfiguracaoSistemaViewSet, basename='configuracao')
router.register(r'logs-auditoria', LogAuditoriaViewSet, basename='log-auditoria')
router.register(r'backups', BackupViewSet, basename='backup')
router.register(r'notificacoes', NotificacaoViewSet, basename='notificacao')
router.register(r'centros-custo', CentroCustoViewSet, basename='centro-custo')
router.register(r'despesas', DespesaAdministrativaViewSet, basename='despesa-administrativa')
router.register(r'funcionarios', FuncionarioViewSet, basename='funcionario')
router.register(r'folha-pagamento', FolhaPagamentoViewSet, basename='folha-pagamento')

# Extra endpoint for backfill
from django.urls import path
from .views import BackfillRateiosView

urlpatterns = router.urls + [
    path('backfill-rateios/', BackfillRateiosView.as_view(), name='backfill-rateios')
]
