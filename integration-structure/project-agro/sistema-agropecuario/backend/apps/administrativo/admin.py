from django.contrib import admin
from .models import Funcionario

@admin.register(Funcionario)
class FuncionarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'nome', 'cpf', 'banco', 'agencia', 'conta', 'tipo_conta', 'pix_key', 'recebe_por', 'salario_bruto', 'ativo')
    search_fields = ('nome', 'cpf', 'pix_key', 'banco', 'conta')
    list_filter = ('recebe_por', 'tipo_conta', 'ativo')
    readonly_fields = ('criado_em', 'atualizado_em')
