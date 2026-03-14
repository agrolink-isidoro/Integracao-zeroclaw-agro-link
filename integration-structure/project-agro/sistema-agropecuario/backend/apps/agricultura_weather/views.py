from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta

from .models import WeatherForecast, WeatherAlert, FavoriteCidade
from .serializers import WeatherForecastSerializer, WeatherAlertSerializer, FavoriteCidadeSerializer
from .services import OpenMeteoService
from apps.fazendas.models import Talhao


class CitiesSearchViewSet(viewsets.ViewSet):
    """
    API para buscar cidades
    
    Endpoints:
    - GET /api/agricultura-weather/cities/search/?q=search_term - Buscar cidades (sem autenticação necessária)
    """
    permission_classes = []  # Sem autenticação necessária
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Busca cidades por nome
        GET /api/agricultura-weather/cities/search/?q=search_term&limit=5
        """
        query = request.query_params.get('q', '').strip()
        limit = int(request.query_params.get('limit', 5))
        
        if not query:
            return Response(
                {'error': 'Parâmetro q é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(query) < 2:
            return Response(
                {'error': 'Query deve ter pelo menos 2 caracteres'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cities = OpenMeteoService.search_cities(query, limit)
        
        return Response({
            'query': query,
            'results': cities,
            'count': len(cities)
        })


class WeatherForecastViewSet(viewsets.ModelViewSet):
    """
    API para previsões de clima
    
    Endpoints:
    - GET /api/weather-forecasts/?talhao_id=xxx  - Previsão para talhão
    - GET /api/weather-forecasts/?lat=xxx&lon=yyy - Previsão para coordenadas
    - POST /api/weather-forecasts/sync-now/ - Atualizar previsões agora
    """
    serializer_class = WeatherForecastSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retorna previsões do usuário/tenant"""
        user = self.request.user
        qs = WeatherForecast.objects.all()
        
        # Filtrar por tenant se disponível
        if hasattr(user, 'tenant'):
            qs = qs.filter(Q(tenant=user.tenant) | Q(tenant__isnull=True))
        
        return qs.order_by('-data_previsao')
    
    def list(self, request, *args, **kwargs):
        """
        Lista previsões
        Filtros:
        - talhao_id: ID do talhão
        - latitude + longitude: coordenadas
        - recent: apenas previsões recentes (default: True)
        """
        talhao_id = request.query_params.get('talhao_id')
        latitude = request.query_params.get('latitude')
        longitude = request.query_params.get('longitude')
        recent_only = request.query_params.get('recent', 'true').lower() == 'true'
        
        qs = self.get_queryset()
        
        if talhao_id:
            try:
                talhao = Talhao.objects.get(id=talhao_id)
                qs = qs.filter(talhao=talhao)
            except Talhao.DoesNotExist:
                return Response(
                    {'error': 'Talhão não encontrado'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif latitude and longitude:
            try:
                lat = float(latitude)
                lon = float(longitude)
                qs = qs.filter(latitude=lat, longitude=lon)
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Coordenadas inválidas'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Apenas previsões recentes
        if recent_only:
            two_hours_ago = timezone.now() - timedelta(hours=2)
            qs = qs.filter(data_previsao__gte=two_hours_ago)
        
        # Se não encontrar, tentar buscar da API
        if not qs.exists() and talhao_id:
            return self._get_or_create_forecast(talhao_id)
        
        super_response = super().list(request, *args, **kwargs)
        return super_response
    
    @action(detail=False, methods=['post'])
    def sync_now(self, request):
        """
        Atualiza previsões de clima para todos os talhões
        POST /api/weather-forecasts/sync-now/
        """
        talhao_ids = request.data.get('talhao_ids', [])
        
        if talhao_ids:
            talhoes = Talhao.objects.filter(id__in=talhao_ids)
        else:
            # Atualizar todos os talhões do tenant
            if hasattr(request.user, 'tenant'):
                talhoes = Talhao.objects.filter(area__fazenda__tenant=request.user.tenant)
            else:
                talhoes = Talhao.objects.all()
        
        updated = 0
        errors = []
        
        for talhao in talhoes[:10]:  # Limite a 10 para não sobrecarregar
            try:
                self._update_talhao_forecast(talhao)
                updated += 1
            except Exception as e:
                errors.append({
                    'talhao_id': talhao.id,
                    'erro': str(e)
                })
        
        return Response({
            'atualizado': updated,
            'total': talhoes.count(),
            'erros': errors
        })
    
    @action(detail=False, methods=['get'])
    def for_talhao(self, request):
        """
        Retorna previsão mais recente para um talhão
        GET /api/weather-forecasts/for_talhao/?talhao_id=xxx
        """
        talhao_id = request.query_params.get('talhao_id')
        
        if not talhao_id:
            return Response(
                {'error': 'talhao_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return self._get_or_create_forecast(talhao_id)
    
    @action(detail=False, methods=['get'])
    def by_coordinates(self, request):
        """
        Retorna previsão para coordenadas específicas (latitude, longitude)
        GET /api/weather-forecasts/by_coordinates/?latitude=xxx&longitude=yyy
        """
        latitude = request.query_params.get('latitude')
        longitude = request.query_params.get('longitude')
        
        if not latitude or not longitude:
            return Response(
                {'error': 'latitude e longitude são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            lat = float(latitude)
            lon = float(longitude)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Coordenadas inválidas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se existe previsão recente para essas coordenadas
        recent_forecast = WeatherForecast.objects.filter(
            latitude=lat,
            longitude=lon,
            data_previsao__gte=timezone.now() - timedelta(hours=2)
        ).first()
        
        if recent_forecast:
            serializer = self.get_serializer(recent_forecast)
            return Response(serializer.data)
        
        # Caso contrário, buscar dados da API
        try:
            current_weather = OpenMeteoService.get_current_weather(lat, lon)
            forecast_7days = OpenMeteoService.get_forecast_7days(lat, lon)
            
            if not current_weather:
                return Response(
                    {'error': 'Falha ao buscar dados de clima'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Calcular métricas agrícolas
            risco = OpenMeteoService.calcular_risco_doenca(
                current_weather['temperatura_atual'],
                current_weather['umidade_atual'],
                current_weather['vento_velocidade']
            )
            
            recomendacao = OpenMeteoService.gerar_recomendacao_pulverizacao(
                current_weather['temperatura_atual'],
                current_weather['umidade_atual'],
                current_weather['vento_velocidade'],
                current_weather['condicao_atual']
            )
            
            # Criar previsão em memória (sem salvar, apenas retornar)
            forecast_data = {
                'id': 0,  # Temporary ID
                'talhao': None,
                'talhao_name': None,
                'latitude': lat,
                'longitude': lon,
                'municipio': current_weather.get('municipio', f'{lat}, {lon}'),
                'temperatura_atual': current_weather['temperatura_atual'],
                'temperatura_sensacao': current_weather.get('temperatura_sensacao'),
                'umidade_atual': current_weather['umidade_atual'],
                'condicao_atual': current_weather['condicao_atual'],
                'descricao_clima': current_weather.get('descricao_clima', ''),
                'vento_velocidade': current_weather['vento_velocidade'],
                'vento_direcao': current_weather.get('vento_direcao'),
                'indice_uv': current_weather.get('indice_uv'),
                'ponto_orvalho': current_weather.get('ponto_orvalho'),
                'pressao': current_weather.get('pressao'),
                'visibilidade': current_weather.get('visibilidade'),
                'cobertura_nuvens': current_weather.get('cobertura_nuvens'),
                'chance_precipitacao': current_weather.get('chance_precipitacao'),
                'forecast_7dias': forecast_7days,
                'risco_doenca_fungica': risco,
                'recomendacao_pulverizacao': recomendacao,
                'indice_aridez': 0.5,  # Default value
                'data_previsao': timezone.now().isoformat(),
                'proxima_atualizacao': (timezone.now() + timedelta(hours=2)).isoformat(),
                'fonte_dados': 'OpenWeatherMap'
            }
            
            return Response(forecast_data)
        except Exception as e:
            return Response(
                {'error': f'Erro ao buscar clima: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    
    def _get_or_create_forecast(self, talhao_id):
        """Obtém ou cria previsão para um talhão"""
        try:
            talhao = Talhao.objects.get(id=talhao_id)
        except Talhao.DoesNotExist:
            return Response(
                {'error': 'Talhão não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar se existe previsão recente
        recent_forecast = WeatherForecast.objects.filter(
            talhao=talhao,
            data_previsao__gte=timezone.now() - timedelta(hours=2)
        ).first()
        
        if recent_forecast:
            serializer = self.get_serializer(recent_forecast)
            return Response(serializer.data)
        
        # Caso contrário, buscar coordenadas e fazer requisição
        if not talhao.area or not hasattr(talhao.area, 'geom'):
            return Response(
                {'error': 'Talhão sem geolocalização'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Extrair centroide da geometria (simplificado)
        try:
            self._update_talhao_forecast(talhao)
            forecast = WeatherForecast.objects.filter(talhao=talhao).latest('data_previsao')
            serializer = self.get_serializer(forecast)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Erro ao buscar clima: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _update_talhao_forecast(self, talhao):
        """Atualiza previsão para um talhão específico"""
        # Obter coordenadas (por enquanto usaremos coordenadas fixas)
        # Em produção, extrairia do centroide da geometria
        latitude = -15.8  # Exemplo: aprox. Brasília
        longitude = -47.9
        
        # Buscar dados da API
        current_weather = OpenWeatherMapService.get_current_weather(latitude, longitude)
        forecast_7days = OpenWeatherMapService.get_forecast_7days(latitude, longitude)
        
        if not current_weather:
            raise Exception('Falha ao buscar dados de clima')
        
        # Calcular métricas agrícolas
        risco = OpenWeatherMapService.calcular_risco_doenca(
            current_weather['temperatura_atual'],
            current_weather['umidade_atual'],
            current_weather['vento_velocidade']
        )
        
        recomendacao = OpenWeatherMapService.gerar_recomendacao_pulverizacao(
            current_weather['temperatura_atual'],
            current_weather['umidade_atual'],
            current_weather['vento_velocidade'],
            current_weather['condicao_atual']
        )
        
        # Criar ou atualizar previsão
        forecast = WeatherForecast.objects.create(
            talhao=talhao,
            tenant=talhao.area.fazenda.tenant if hasattr(talhao.area, 'fazenda') else None,
            latitude=latitude,
            longitude=longitude,
            municipio=current_weather.get('municipio', ''),
            temperatura_atual=current_weather['temperatura_atual'],
            temperatura_sensacao=current_weather.get('temperatura_sensacao'),
            umidade_atual=current_weather['umidade_atual'],
            condicao_atual=current_weather['condicao_atual'],
            descricao_clima=current_weather.get('descricao_clima', ''),
            vento_velocidade=current_weather['vento_velocidade'],
            vento_direcao=current_weather.get('vento_direcao'),
            indice_uv=current_weather.get('indice_uv'),
            ponto_orvalho=current_weather.get('ponto_orvalho'),
            pressao=current_weather.get('pressao'),
            visibilidade=current_weather.get('visibilidade'),
            cobertura_nuvens=current_weather.get('cobertura_nuvens'),
            chance_precipitacao=current_weather.get('chance_precipitacao'),
            forecast_7dias=forecast_7days,
            risco_doenca_fungica=risco,
            recomendacao_pulverizacao=recomendacao,
            proxima_atualizacao=timezone.now() + timedelta(hours=2)
        )
        
        return forecast


class WeatherAlertViewSet(viewsets.ModelViewSet):
    """API para alertas de clima"""
    serializer_class = WeatherAlertSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        qs = WeatherAlert.objects.filter(ativo=True)
        
        if hasattr(user, 'tenant'):
            qs = qs.filter(Q(tenant=user.tenant) | Q(tenant__isnull=True))
        
        return qs.order_by('-data_inicio_prevista')


class FavoriteCidadeViewSet(viewsets.ModelViewSet):
    """
    API para gerenciar cidades favoritas do usuário.
    
    Endpoints:
    - GET /api/agricultura-weather/favorite-cities/ - Listar favoritas
    - POST /api/agricultura-weather/favorite-cities/ - Adicionar favorita (max 3)
    - PUT /api/agricultura-weather/favorite-cities/{id}/ - Atualizar
    - DELETE /api/agricultura-weather/favorite-cities/{id}/ - Remover
    - POST /api/agricultura-weather/favorite-cities/{id}/set-active/ - Marcar como ativa
    """
    serializer_class = FavoriteCidadeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retorna apenas as favoritas do usuário logado"""
        return FavoriteCidade.objects.filter(
            user=self.request.user,
            tenant=self.request.user.tenant if hasattr(self.request.user, 'tenant') else None
        ).order_by('order', '-created_at')
    
    def perform_create(self, serializer):
        """Ao criar, adiciona o usuário e tenant automaticamente"""
        # Verificar limite de 3 cidades favoritas
        count = self.get_queryset().count()
        if count >= 3:
            raise status.HTTP_400_BAD_REQUEST(
                detail='Máximo de 3 cidades favoritas permitidas'
            )
        
        serializer.save(
            user=self.request.user,
            tenant=self.request.user.tenant if hasattr(self.request.user, 'tenant') else None
        )
    
    @action(detail=True, methods=['post'])
    def set_active(self, request, pk=None):
        """
        Marca uma cidade como ativa (para observação).
        POST /api/agricultura-weather/favorite-cities/{id}/set-active/
        """
        city = self.get_object()
        
        # Desativar todas as outras
        self.get_queryset().update(is_active=False)
        
        # Ativar esta
        city.is_active = True
        city.save()
        
        serializer = self.get_serializer(city)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Retorna a cidade ativa (para observação).
        GET /api/agricultura-weather/favorite-cities/active/
        """
        city = self.get_queryset().filter(is_active=True).first()
        
        if not city:
            return Response(None)
        
        serializer = self.get_serializer(city)
        return Response(serializer.data)
