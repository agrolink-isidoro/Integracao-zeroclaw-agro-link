from django.db import models
from django.utils import timezone
from apps.fazendas.models import Talhao
from apps.core.models import Tenant, TenantModel
import json


class WeatherForecast(TenantModel):
    """
    Modelo para armazenar previsões de clima por talhão ou localização.
    Atualizado regularmente via OpenWeatherMap API.
    """
    talhao = models.ForeignKey(
        Talhao,
        on_delete=models.CASCADE,
        related_name='weather_forecasts',
        null=True,
        blank=True,
        help_text='Talhão cuja previsão se refere'
    )
    
    # Localização
    latitude = models.FloatField(help_text='Latitude da previsão (EPSG:4326)')
    longitude = models.FloatField(help_text='Longitude da previsão (EPSG:4326)')
    municipio = models.CharField(
        max_length=200,
        blank=True,
        help_text='Nome do município/cidade'
    )
    
    # Clima Atual
    temperatura_atual = models.FloatField(help_text='Temperatura atual em °C')
    temperatura_sensacao = models.FloatField(
        null=True,
        blank=True,
        help_text='Sensação térmica em °C'
    )
    umidade_atual = models.IntegerField(help_text='Umidade relativa em %')
    condicao_atual = models.CharField(
        max_length=50,
        help_text='Condição do clima (Sunny, Rainy, Cloudy, etc)'
    )
    descricao_clima = models.TextField(
        blank=True,
        help_text='Descrição detalhada da condição'
    )
    vento_velocidade = models.FloatField(help_text='Velocidade do vento em km/h')
    vento_direcao = models.IntegerField(
        null=True,
        blank=True,
        help_text='Direção do vento em graus (0-360)'
    )
    indice_uv = models.FloatField(
        null=True,
        blank=True,
        help_text='Índice UV (0-11+)'
    )
    ponto_orvalho = models.FloatField(
        null=True,
        blank=True,
        help_text='Ponto de orvalho em °C'
    )
    pressao = models.FloatField(
        null=True,
        blank=True,
        help_text='Pressão atmosférica em hPa'
    )
    visibilidade = models.IntegerField(
        null=True,
        blank=True,
        help_text='Visibilidade em metros'
    )
    cobertura_nuvens = models.IntegerField(
        null=True,
        blank=True,
        help_text='Cobertura de nuvens em %'
    )
    chance_precipitacao = models.IntegerField(
        null=True,
        blank=True,
        help_text='Chance de precipitação em %'
    )
    
    # Previsão 7 dias (armazenado como JSON)
    forecast_7dias = models.JSONField(
        default=list,
        blank=True,
        help_text='Previsão para próximos 7 dias em formato JSON'
    )
    
    # Dados Agrícolas
    risco_doenca_fungica = models.CharField(
        max_length=20,
        choices=[
            ('BAIXO', 'Baixo'),
            ('MEDIO', 'Médio'),
            ('ALTO', 'Alto'),
        ],
        default='BAIXO',
        help_text='Risco de doença fúngica'
    )
    recomendacao_pulverizacao = models.TextField(
        blank=True,
        help_text='Recomendação sobre pulverização'
    )
    indice_aridez = models.FloatField(
        null=True,
        blank=True,
        help_text='Índice de aridez para irrigação'
    )
    
    # Metadados
    data_previsao = models.DateTimeField(
        auto_now_add=True,
        help_text='Data/hora da última atualização'
    )
    proxima_atualizacao = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Próxima data de atualização agendada'
    )
    fonte_dados = models.CharField(
        max_length=50,
        default='openweathermap',
        help_text='Fonte dos dados (API usada)'
    )
    
    class Meta:
        verbose_name = 'Previsão de Clima'
        verbose_name_plural = 'Previsões de Clima'
        ordering = ['-data_previsao']
        indexes = [
            models.Index(fields=['talhao', '-data_previsao']),
            models.Index(fields=['latitude', 'longitude', '-data_previsao']),
        ]
    
    def __str__(self):
        if self.talhao:
            return f'{self.talhao.name} - {self.data_previsao.strftime("%d/%m/%Y %H:%M")}'
        return f'{self.municipio or "Weather"} - {self.data_previsao.strftime("%d/%m/%Y %H:%M")}'
    
    def is_recent(self):
        """Verifica se a previsão é recente (menos de 2 horas)"""
        return (timezone.now() - self.data_previsao).total_seconds() < 7200
    
    def get_forecast_day(self, day_index):
        """Retorna a previsão para um dia específico (0-6)"""
        if 0 <= day_index < len(self.forecast_7dias):
            return self.forecast_7dias[day_index]
        return None


class WeatherAlert(TenantModel):
    """
    Alertas de clima extremo para fazendas/talhões
    """
    talhao = models.ForeignKey(
        Talhao,
        on_delete=models.CASCADE,
        related_name='weather_alerts',
        null=True,
        blank=True
    )
    
    tipo = models.CharField(
        max_length=50,
        choices=[
            ('CHUVA_FORTE', 'Chuva Forte'),
            ('GRANIZO', 'Granizo'),
            ('VENTO_FORTE', 'Vento Forte'),
            ('GEADA', 'Geada'),
            ('ESTIAGEM', 'Estiagem'),
            ('RAIO', 'Raio/Tempestade'),
        ],
        help_text='Tipo de alerta'
    )
    severidade = models.CharField(
        max_length=20,
        choices=[
            ('BAIXA', 'Baixa'),
            ('MEDIA', 'Média'),
            ('ALTA', 'Alta'),
            ('CRITICA', 'Crítica'),
        ],
        default='MEDIA'
    )
    descricao = models.TextField(help_text='Descrição do alerta')
    data_inicio_prevista = models.DateTimeField(help_text='Quando o alerta começa')
    data_fim_prevista = models.DateTimeField(help_text='Quando o alerta termina')
    ativo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Alerta de Clima'
        verbose_name_plural = 'Alertas de Clima'
        ordering = ['-data_inicio_prevista']
    
    def __str__(self):
        return f'{self.get_tipo_display()} - {self.data_inicio_prevista.strftime("%d/%m/%Y")}'


class FavoriteCidade(TenantModel):
    """
    Cidades favoritas do usuário para observação rápida de clima.
    Cada usuário pode ter até 3 cidades favoritas.
    """
    user = models.ForeignKey(
        'core.CustomUser',
        on_delete=models.CASCADE,
        related_name='favorite_cities',
        help_text='Usuário que favoritou a cidade'
    )
    
    # Dados da cidade
    name = models.CharField(
        max_length=200,
        help_text='Nome da cidade'
    )
    state = models.CharField(
        max_length=200,
        blank=True,
        help_text='Estado/Província'
    )
    country = models.CharField(
        max_length=200,
        help_text='País'
    )
    latitude = models.FloatField(help_text='Latitude (EPSG:4326)')
    longitude = models.FloatField(help_text='Longitude (EPSG:4326)')
    display_name = models.CharField(
        max_length=500,
        help_text='Nome formatado para exibição (ex: São Paulo, SP)'
    )
    
    # Controle
    is_active = models.BooleanField(
        default=True,
        help_text='Se é a cidade ativa (para observação)'
    )
    order = models.IntegerField(
        default=0,
        help_text='Ordem de exibição'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Cidade Favorita'
        verbose_name_plural = 'Cidades Favoritas'
        ordering = ['order', '-created_at']
        unique_together = ['tenant', 'user', 'latitude', 'longitude']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'tenant'],
                condition=models.Q(is_active=True),
                name='only_one_active_favorite_per_user'
            ),
        ]
    
    def __str__(self):
        return f'{self.display_name}'
    
    @classmethod
    def get_user_favorites(cls, user, tenant=None):
        """Retorna todas as cidades favoritas do usuário"""
        qs = cls.objects.filter(user=user)
        if tenant:
            qs = qs.filter(tenant=tenant)
        return qs
    
    @classmethod
    def get_active_city(cls, user, tenant=None):
        """Retorna a cidade favorita ativa (para observação)"""
        qs = cls.objects.filter(user=user, is_active=True)
        if tenant:
            qs = qs.filter(tenant=tenant)
        return qs.first()
