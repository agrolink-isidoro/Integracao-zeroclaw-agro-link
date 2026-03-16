from rest_framework import serializers
from .models import WeatherForecast, WeatherAlert, FavoriteCidade


class WeatherDay7Serializer(serializers.Serializer):
    """Serializer para um dia de previsão (dentro do JSON)"""
    data = serializers.DateField()
    temp_max = serializers.FloatField()
    temp_min = serializers.FloatField()
    condicao = serializers.CharField()
    chuva_prevista = serializers.FloatField()
    vento_medio = serializers.FloatField()
    umidade_media = serializers.IntegerField()
    indice_uv = serializers.FloatField(required=False)


class WeatherForecastSerializer(serializers.ModelSerializer):
    """Serializer principal para previsões de clima"""
    talhao_name = serializers.CharField(source='talhao.name', read_only=True)
    area_name = serializers.CharField(source='talhao.area.name', read_only=True)
    
    class Meta:
        model = WeatherForecast
        fields = [
            'id',
            'talhao',
            'talhao_name',
            'area_name',
            'latitude',
            'longitude',
            'municipio',
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
            'forecast_7dias',
            'risco_doenca_fungica',
            'recomendacao_pulverizacao',
            'indice_aridez',
            'data_previsao',
            'proxima_atualizacao',
            'fonte_dados',
        ]
        read_only_fields = ['id', 'data_previsao', 'tenante']


class WeatherAlertSerializer(serializers.ModelSerializer):
    """Serializer para alertas de clima"""
    talhao_name = serializers.CharField(source='talhao.name', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    severidade_display = serializers.CharField(source='get_severidade_display', read_only=True)
    
    class Meta:
        model = WeatherAlert
        fields = [
            'id',
            'talhao',
            'talhao_name',
            'tipo',
            'tipo_display',
            'severidade',
            'severidade_display',
            'descricao',
            'data_inicio_prevista',
            'data_fim_prevista',
            'ativo',
            'criado_em',
        ]
        read_only_fields = ['id', 'criado_em', 'tenant']


class FavoriteCidadeSerializer(serializers.ModelSerializer):
    """Serializer para cidades favoritas do usuário"""
    
    class Meta:
        model = FavoriteCidade
        fields = [
            'id',
            'name',
            'state',
            'country',
            'latitude',
            'longitude',
            'display_name',
            'is_active',
            'order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'tenant']
