from django.urls import path
from rest_framework import routers

from .views import (
    ProprietarioViewSet,
    FazendaViewSet,
    AreaViewSet,
    TalhaoViewSet,
    ArrendamentoViewSet,
    CotacaoSacaViewSet,
    DocumentoArrendamentoViewSet,
    ParcelaArrendamentoViewSet,
    geo_view,
)

router = routers.SimpleRouter()
router.register(r"proprietarios", ProprietarioViewSet, basename="proprietario")
router.register(r"fazendas", FazendaViewSet, basename="fazenda")
router.register(r"areas", AreaViewSet, basename="area")
router.register(r"talhoes", TalhaoViewSet, basename="talhao")
router.register(r"arrendamentos", ArrendamentoViewSet, basename="arrendamento")
router.register(r"cotacoes-saca", CotacaoSacaViewSet, basename="cotacao-saca")
router.register(r"documentos-arrendamento", DocumentoArrendamentoViewSet, basename="documento-arrendamento")
router.register(r"parcelas-arrendamento", ParcelaArrendamentoViewSet, basename="parcela-arrendamento")

urlpatterns = [
    path("geo/", geo_view, name="fazendas-geo"),
] + router.urls
