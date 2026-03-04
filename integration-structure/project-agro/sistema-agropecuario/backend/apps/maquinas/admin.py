from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import (
    CategoriaEquipamento,
    Equipamento,
    Abastecimento,
    OrdemServico,
    ManutencaoPreventiva,
    ConfiguracaoAlerta
)


@admin.register(CategoriaEquipamento)
class CategoriaEquipamentoAdmin(admin.ModelAdmin):
    """Admin para categorias de equipamentos"""
    list_display = [
        'ordem_exibicao', 'nome', 'tipo_mobilidade', 
        'requer_horimetro', 'requer_potencia', 'requer_localizacao', 
        'requer_acoplamento', 'ativo', 'total_equipamentos'
    ]
    list_display_links = ['nome']  # Define nome como link clicável
    list_filter = ['tipo_mobilidade', 'ativo', 'requer_horimetro', 'requer_potencia']
    search_fields = ['nome', 'descricao']
    ordering = ['ordem_exibicao', 'nome']
    list_editable = ['ordem_exibicao', 'ativo']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'descricao', 'categoria_pai', 'tipo_mobilidade')
        }),
        ('Requisitos de Validação', {
            'fields': (
                'requer_horimetro', 
                'requer_potencia', 
                'requer_localizacao', 
                'requer_acoplamento'
            ),
            'description': 'Define quais campos serão obrigatórios para esta categoria'
        }),
        ('Configurações', {
            'fields': ('ativo', 'ordem_exibicao')
        }),
    )
    
    def total_equipamentos(self, obj):
        return obj.equipamentos.count()
    total_equipamentos.short_description = 'Total Equipamentos'


@admin.register(Equipamento)
class EquipamentoAdmin(GISModelAdmin):
    """Admin para equipamentos com suporte GIS"""
    list_display = [
        'nome', 'categoria', 'marca', 'modelo', 
        'status', 'horimetro_atual', 'local_instalacao'
    ]
    list_filter = ['categoria', 'status', 'categoria__tipo_mobilidade', 'gps_tracking']
    search_fields = ['nome', 'marca', 'modelo', 'numero_serie']
    readonly_fields = [
        'criado_em', 'atualizado_em', 'criado_por',
        'idade_equipamento', 'depreciacao_estimada',
        'tipo_mobilidade', 'e_autopropelido', 'e_estacionario', 'e_implemento'
    ]
    autocomplete_fields = ['categoria', 'maquina_principal']
    
    fieldsets = (
        ('Categoria e Identificação', {
            'fields': ('categoria', 'nome', 'marca', 'modelo', 'numero_serie')
        }),
        ('Dados de Aquisição', {
            'fields': ('ano_fabricacao', 'data_aquisicao', 'valor_aquisicao')
        }),
        ('Status', {
            'fields': ('status', 'observacoes')
        }),
        ('Autopropelidos', {
            'fields': (
                'horimetro_atual', 'capacidade_tanque', 
                'consumo_medio', 'gps_tracking'
            ),
            'classes': ('collapse',)
        }),
        ('Potência', {
            'fields': ('potencia_cv', 'potencia_kw'),
            'classes': ('collapse',)
        }),
        ('Estacionários', {
            'fields': (
                'local_instalacao', 'coordenadas',
                'tensao_volts', 'frequencia_hz', 'fases'
            ),
            'classes': ('collapse',)
        }),
        ('Implementos', {
            'fields': (
                'maquina_principal',
                'largura_trabalho', 'profundidade_trabalho', 'capacidade'
            ),
            'classes': ('collapse',)
        }),
        ('Veículos', {
            'fields': ('placa', 'quilometragem_atual', 'capacidade_carga'),
            'classes': ('collapse',)
        }),
        ('Características Específicas (JSON)', {
            'fields': ('caracteristicas_especificas',),
            'classes': ('collapse',),
            'description': 'Campos customizados por categoria'
        }),
        ('Campos Calculados', {
            'fields': (
                'idade_equipamento', 'depreciacao_estimada',
                'tipo_mobilidade', 'e_autopropelido', 'e_estacionario', 'e_implemento'
            ),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('criado_em', 'atualizado_em', 'criado_por'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Abastecimento)
class AbastecimentoAdmin(admin.ModelAdmin):
    list_display = [
        'equipamento', 'data_abastecimento', 'quantidade_litros', 
        'valor_total', 'horimetro_km'
    ]
    list_filter = ['data_abastecimento', 'equipamento__categoria']
    search_fields = ['equipamento__nome', 'local_abastecimento', 'responsavel']
    date_hierarchy = 'data_abastecimento'


@admin.register(OrdemServico)
class OrdemServicoAdmin(admin.ModelAdmin):
    list_display = [
        'numero_os', 'equipamento', 'prioridade', 
        'status', 'data_abertura'
    ]
    list_filter = ['prioridade', 'status', 'data_abertura']
    search_fields = ['numero_os', 'equipamento__nome', 'descricao_problema']
    date_hierarchy = 'data_abertura'


@admin.register(ManutencaoPreventiva)
class ManutencaoPreventivaAdmin(admin.ModelAdmin):
    list_display = [
        'equipamento', 'tipo_manutencao'
    ]
    list_filter = ['tipo_manutencao']
    search_fields = ['equipamento__nome', 'descricao']


@admin.register(ConfiguracaoAlerta)
class ConfiguracaoAlertaAdmin(admin.ModelAdmin):
    list_display = [
        'equipamento', 'tipo_alerta', 
        'ativo'
    ]
    list_filter = ['tipo_alerta', 'ativo']
    search_fields = ['equipamento__nome']
