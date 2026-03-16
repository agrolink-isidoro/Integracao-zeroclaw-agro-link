from django.contrib import admin
from .models import WeatherForecast, WeatherAlert


@admin.register(WeatherForecast)
class WeatherForecastAdmin(admin.ModelAdmin):
    list_display = [
        'talhao',
        'municipio',
        'temperatura_atual',
        'condicao_atual',
        'umidade_atual',
        'risco_doenca_fungica',
        'data_previsao',
    ]
    list_filter = [
        'risco_doenca_fungica',
        'condicao_atual',
        'data_previsao',
        'fonte_dados',
    ]
    search_fields = ['talhao__name', 'municipio']
    readonly_fields = ['data_previsao', 'id']
    fieldsets = (
        ('Localização', {
            'fields': ('talhao', 'municipio', 'latitude', 'longitude')
        }),
        ('Clima Atual', {
            'fields': (
                'temperatura_atual',
                'temperatura_sensacao',
                'umidade_atual',
                'condicao_atual',
                'descricao_clima',
                'vento_velocidade',
                'vento_direcao',
                'indice_uv',
                'ponto_orvalho',
                'pressao',
                'visibilidade',
                'cobertura_nuvens',
                'chance_precipitacao',
            )
        }),
        ('Previsão 7 Dias', {
            'fields': ('forecast_7dias',)
        }),
        ('Dados Agrícolas', {
            'fields': (
                'risco_doenca_fungica',
                'recomendacao_pulverizacao',
                'indice_aridez',
            )
        }),
        ('Metadados', {
            'fields': (
                'data_previsao',
                'proxima_atualizacao',
                'fonte_dados',
                'tenant',
            )
        }),
    )


@admin.register(WeatherAlert)
class WeatherAlertAdmin(admin.ModelAdmin):
    list_display = [
        'talhao',
        'tipo',
        'severidade',
        'data_inicio_prevista',
        'ativo',
    ]
    list_filter = ['tipo', 'severidade', 'ativo', 'data_inicio_prevista']
    search_fields = ['talhao__name', 'descricao']
    readonly_fields = ['id']
    fieldsets = (
        ('Alerta', {
            'fields': ('talhao', 'tipo', 'severidade', 'descricao', 'ativo')
        }),
        ('Período', {
            'fields': ('data_inicio_prevista', 'data_fim_prevista')
        }),
        ('Metadados', {
            'fields': ('id', 'tenant')
        }),
    )
