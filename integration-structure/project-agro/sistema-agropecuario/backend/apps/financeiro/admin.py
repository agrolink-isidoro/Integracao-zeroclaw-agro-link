from django.contrib import admin
from .models import Vencimento, RateioCusto, RateioTalhao, Financiamento, ParcelaFinanciamento, Emprestimo, ParcelaEmprestimo, RateioApproval


class RateioTalhaoInline(admin.TabularInline):
    model = RateioTalhao
    extra = 0


@admin.register(RateioCusto)
class RateioCustoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'valor_total', 'data_rateio', 'destino', 'safra', 'centro_custo', 'criado_por')
    list_filter = ('destino', 'centro_custo', 'safra')
    search_fields = ('titulo', 'descricao')
    inlines = [RateioTalhaoInline]
    fieldsets = (
        (None, {'fields': ('titulo', 'descricao', 'valor_total', 'data_rateio', 'data_hora_rateio')}),
        ('Origem / Contábil', {'fields': ('origem_content_type', 'origem_object_id', 'safra', 'centro_custo', 'destino', 'driver_de_rateio')}),
    )


@admin.register(RateioApproval)
class RateioApprovalAdmin(admin.ModelAdmin):
    list_display = ('rateio', 'status', 'criado_por', 'aprovado_por', 'criado_em', 'aprovado_em')
    readonly_fields = ('criado_em', 'aprovado_em')

# Bank statements admin
from .models import BankStatementImport, BankTransaction

@admin.register(BankStatementImport)
class BankStatementImportAdmin(admin.ModelAdmin):
    list_display = ('id', 'conta', 'formato', 'status', 'arquivo_hash', 'rows_count', 'errors_count', 'criado_em')
    list_filter = ('status', 'formato')
    search_fields = ('arquivo_hash', 'original_filename')

@admin.register(BankTransaction)
class BankTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'importacao', 'date', 'amount', 'external_id')
    search_fields = ('external_id', 'description')
    list_filter = ('date',)