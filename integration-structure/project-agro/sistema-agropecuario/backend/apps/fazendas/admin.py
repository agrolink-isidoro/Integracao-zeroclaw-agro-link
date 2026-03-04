from django.contrib import admin

from .models import Fazenda, Area, Talhao, Arrendamento, CotacaoSaca, Proprietario


class TalhaoInline(admin.TabularInline):
    model = Talhao
    extra = 0


class AreaInline(admin.TabularInline):
    model = Area
    extra = 0
    show_change_link = True


@admin.register(Fazenda)
class FazendaAdmin(admin.ModelAdmin):
    list_display = ("name", "matricula")
    search_fields = ("name", "matricula")
    inlines = [AreaInline]


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ("name", "fazenda")
    search_fields = ("name", "fazenda__name")
    inlines = [TalhaoInline]


@admin.register(Talhao)
class TalhaoAdmin(admin.ModelAdmin):
    list_display = ("name", "area", "area_size")
    search_fields = ("name", "area__name")


@admin.register(Arrendamento)
class ArrendamentoAdmin(admin.ModelAdmin):
    list_display = ("arrendador", "fazenda", "start_date", "end_date")
    search_fields = ("arrendador", "fazenda__name")


@admin.register(CotacaoSaca)
class CotacaoSacaAdmin(admin.ModelAdmin):
    list_display = ("cultura", "data", "preco_por_saca", "fonte")
    list_filter = ("cultura", "data")
    search_fields = ("cultura", "fonte")


@admin.register(Proprietario)
class ProprietarioAdmin(admin.ModelAdmin):
    list_display = ("nome", "cpf_cnpj", "telefone", "email")
    search_fields = ("nome", "cpf_cnpj")
