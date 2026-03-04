from django.urls import path

from . import views

app_name = "dashboard"

urlpatterns = [
    path("resumo/", views.resumo_view, name="resumo"),
    path("financeiro/", views.financeiro_view, name="financeiro"),
    path("estoque/", views.estoque_view, name="estoque"),
    path("comercial/", views.comercial_view, name="comercial"),
    path("administrativo/", views.administrativo_view, name="administrativo"),
    path("agricultura/", views.agricultura_view, name="agricultura"),
]
