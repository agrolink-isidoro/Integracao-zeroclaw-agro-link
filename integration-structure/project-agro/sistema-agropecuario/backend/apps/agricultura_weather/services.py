"""
Serviço de integração com Open-Meteo API (gratuito e sem chave de API necessária)

API Docs: https://open-meteo.com/en/docs
Geocoding: https://open-meteo.com/en/docs/geocoding-api

Características:
- Sem necessidade de API key
- Até 10.000 requisições/dia gratuitamente
- Cobertura global com dados de previsão até 16 dias
"""

import logging
import requests
from typing import Dict, List, Optional, Any
from django.core.cache import cache

logger = logging.getLogger(__name__)


class OpenMeteoService:
    """
    Serviço para buscar dados de clima via Open-Meteo API (gratuito).
    
    Características:
    - Não requer API key
    - 10.000 requisições/dia gratuito
    - Cobertura global
    - Dados de previsão até 16 dias
    """
    
    # URLs base dos endpoints
    FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
    GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
    
    # Tempo limite para requisições
    REQUEST_TIMEOUT = 5
    
    # TTLs de cache em segundos
    CACHE_WEATHER_CURRENT = 3600      # 1 hora
    CACHE_WEATHER_FORECAST = 10800    # 3 horas
    CACHE_CITIES_SEARCH = 86400       # 24 horas
    
    # Mapeamento de códigos WMO (World Meteorological Organization)
    # Fonte: https://open-meteo.com/en/docs
    WMO_CODES = {
        # Céu claro
        0: 'Céu claro',
        1: 'Principalmente claro',
        2: 'Parcialmente nublado',
        3: 'Nublado',
        
        # Nevoeiro
        45: 'Nevoeiro',
        48: 'Nevoeiro geado',
        
        # Garoa
        51: 'Garoa leve',
        53: 'Garoa moderada',
        55: 'Garoa densa',
        
        # Chuva
        61: 'Chuva fraca',
        63: 'Chuva moderada',
        65: 'Chuva forte',
        
        # Neve
        71: 'Neve fraca',
        73: 'Neve moderada',
        75: 'Neve forte',
        
        # Aguaceiros
        80: 'Aguaceiros fracos',
        81: 'Aguaceiros moderados',
        82: 'Aguaceiros violentos',
        
        # Chuvisco de neve
        85: 'Chuvisco de neve',
        86: 'Chuva com neve',
        
        # Tempestades
        95: 'Tempestade',
        96: 'Tempestade com granizo',
        99: 'Tempestade com granizo forte',
    }
    
    # ========== MÉTODOS PRIVADOS ==========
    
    @classmethod
    def _get_weather_description(cls, weather_code: int) -> str:
        """
        Converte código WMO em descrição legível em português.
        
        Args:
            weather_code: Código WMO (0-99)
            
        Returns:
            Descrição do tempo em português
        """
        return cls.WMO_CODES.get(weather_code, 'Condição desconhecida')
    
    @classmethod
    def _calcular_ponto_orvalho(cls, temperatura: float, umidade: float) -> Optional[float]:
        """
        Calcula o ponto de orvalho usando a fórmula de Magnus.
        
        O ponto de orvalho é a temperatura em que o ar fica saturado
        de umidade e o orvalho começa a se condensar.
        
        Fórmula: Td = (b × α) / (a - α)
        onde: α = [(a × T) / (b + T)] + [HR / 100]
        
        Args:
            temperatura: Temperatura em °C
            umidade: Umidade relativa em % (0-100)
            
        Returns:
            Ponto de orvalho em °C ou None se dados inválidos
        """
        if not isinstance(temperatura, (int, float)) or not isinstance(umidade, (int, float)):
            return None
            
        a = 17.27
        b = 237.7
        
        alpha = ((a * temperatura) / (b + temperatura)) + (umidade / 100.0)
        orvalho = (b * alpha) / (a - alpha)
        
        return round(orvalho, 1)
    
    # ========== MÉTODOS PÚBLICOS ==========
    
    @classmethod
    def get_current_weather(cls, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        """
        Busca dados de clima atual para coordenadas específicas.
        
        Args:
            latitude: Latitude da localização
            longitude: Longitude da localização
            
        Returns:
            Dict com dados de clima atual ou None se erro
        """
        cache_key = f'weather_current_{latitude}_{longitude}'
        
        # Tentar buscar do cache
        cached = cache.get(cache_key)
        if cached:
            logger.debug(f'Cache hit para weather atual: {latitude}, {longitude}')
            return cached
        
        try:
            params = {
                'latitude': latitude,
                'longitude': longitude,
                'current': (
                    'temperature_2m,'
                    'relative_humidity_2m,'
                    'apparent_temperature,'
                    'weather_code,'
                    'wind_speed_10m,'
                    'cloud_cover,'
                    'uv_index,'
                    'dew_point_2m,'
                    'pressure_msl,'
                    'visibility'
                ),
                'timezone': 'auto',
            }
            
            response = requests.get(
                cls.FORECAST_URL,
                params=params,
                timeout=cls.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()
            
            current = data.get('current', {})
            
            # Decodificar código WMO
            weather_code = current.get('weather_code', 0)
            weather_description = cls._get_weather_description(weather_code)
            
            # Calcular ponto de orvalho
            temperatura = current.get('temperature_2m')
            umidade = current.get('relative_humidity_2m')
            ponto_orvalho = cls._calcular_ponto_orvalho(temperatura, umidade) if temperatura and umidade else None
            
            weather_data = {
                'latitude': latitude,
                'longitude': longitude,
                'municipio': f'{latitude:.2f}, {longitude:.2f}',
                'temperatura_atual': temperatura,
                'temperatura_sensacao': current.get('apparent_temperature'),
                'umidade_atual': umidade,
                'condicao_atual': weather_description,
                'descricao_clima': weather_description,
                'vento_velocidade': current.get('wind_speed_10m', 0),
                'vento_direcao': None,
                'indice_uv': current.get('uv_index'),
                'ponto_orvalho': ponto_orvalho,
                'pressao': current.get('pressure_msl'),
                'visibilidade': current.get('visibility'),
                'cobertura_nuvens': current.get('cloud_cover'),
                'chance_precipitacao': 0,
            }
            
            # Armazenar em cache
            cache.set(cache_key, weather_data, cls.CACHE_WEATHER_CURRENT)
            logger.info(f'Weather atual buscado com sucesso: {latitude}, {longitude}')
            return weather_data
            
        except requests.RequestException as e:
            logger.error(f'Erro ao buscar weather atual ({latitude}, {longitude}): {e}')
            return None
        except (KeyError, ValueError) as e:
            logger.error(f'Erro ao processar resposta do weather atual: {e}')
            return None
    
    @classmethod
    def get_forecast_7days(cls, latitude: float, longitude: float) -> List[Dict[str, Any]]:
        """
        Busca previsão de tempo para os próximos 7 dias.
        
        Args:
            latitude: Latitude da localização
            longitude: Longitude da localização
            
        Returns:
            Lista de dicts com previsões diárias
        """
        cache_key = f'weather_forecast_7days_{latitude}_{longitude}'
        
        # Tentar buscar do cache
        cached = cache.get(cache_key)
        if cached:
            logger.debug(f'Cache hit para forecast 7 dias: {latitude}, {longitude}')
            return cached
        
        try:
            params = {
                'latitude': latitude,
                'longitude': longitude,
                'daily': (
                    'temperature_2m_max,'
                    'temperature_2m_min,'
                    'weather_code,'
                    'precipitation_sum,'
                    'wind_speed_10m_max,'
                    'relative_humidity_2m_max'
                ),
                'timezone': 'auto',
            }
            
            response = requests.get(
                cls.FORECAST_URL,
                params=params,
                timeout=cls.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()
            
            daily = data.get('daily', {})
            forecast_list = []
            
            # Extrair arrays
            times = daily.get('time', [])
            temps_max = daily.get('temperature_2m_max', [])
            temps_min = daily.get('temperature_2m_min', [])
            weather_codes = daily.get('weather_code', [])
            precip_sum = daily.get('precipitation_sum', [])
            wind_max = daily.get('wind_speed_10m_max', [])
            humidity_max = daily.get('relative_humidity_2m_max', [])
            
            # Iterar por até 7 dias
            num_days = min(7, len(times))
            
            for i in range(num_days):
                weather_code = weather_codes[i] if i < len(weather_codes) else 0
                
                forecast_day = {
                    'data': times[i] if i < len(times) else None,
                    'temperatura_maxima': temps_max[i] if i < len(temps_max) else None,
                    'temperatura_minima': temps_min[i] if i < len(temps_min) else None,
                    'umidade_media': humidity_max[i] if i < len(humidity_max) else None,
                    'condicao': cls._get_weather_description(weather_code),
                    'chance_precipitacao': precip_sum[i] if i < len(precip_sum) else 0,
                    'vento_velocidade': wind_max[i] if i < len(wind_max) else None,
                }
                forecast_list.append(forecast_day)
            
            # Armazenar em cache
            cache.set(cache_key, forecast_list, cls.CACHE_WEATHER_FORECAST)
            logger.info(f'Forecast 7 dias buscado com sucesso: {latitude}, {longitude}')
            return forecast_list
            
        except requests.RequestException as e:
            logger.error(f'Erro ao buscar forecast 7 dias ({latitude}, {longitude}): {e}')
            return []
        except (KeyError, ValueError, IndexError) as e:
            logger.error(f'Erro ao processar resposta do forecast 7 dias: {e}')
            return []
    
    @classmethod
    def search_cities(cls, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Busca cidades por nome usando Open-Meteo Geocoding API.
        
        Não requer API key!
        
        Args:
            query: Nome da cidade a buscar
            limit: Número máximo de resultados (padrão: 5, máximo: 10)
            
        Returns:
            Lista de cidades encontradas com coordenadas
        """
        # Validar entrada
        if not query or len(query.strip()) < 2:
            logger.debug(f'Query de busca muito curta: "{query}"')
            return []
        
        query = query.strip()
        cache_key = f'cities_search_{query.lower()}'
        
        # Tentar buscar do cache
        cached = cache.get(cache_key)
        if cached:
            logger.debug(f'Cache hit para busca de cidades: "{query}"')
            return cached
        
        try:
            limit = max(1, min(limit, 10))  # Limitar entre 1 e 10
            
            params = {
                'name': query,
                'count': limit,
                'language': 'pt',
                'format': 'json',
            }
            
            response = requests.get(
                cls.GEOCODING_URL,
                params=params,
                timeout=cls.REQUEST_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()
            
            cities = []
            
            for item in data.get('results', []):
                city_name = item.get('name', '')
                city_state = item.get('admin1', '')
                city_country = item.get('country', '')
                
                # Construir display_name
                if city_state:
                    display_name = f'{city_name}, {city_state}'
                else:
                    display_name = f'{city_name}, {city_country}'
                
                city_data = {
                    'name': city_name,
                    'state': city_state,
                    'country': city_country,
                    'lat': item.get('latitude'),
                    'lon': item.get('longitude'),
                    'display_name': display_name,
                }
                
                cities.append(city_data)
            
            # Armazenar em cache
            cache.set(cache_key, cities, cls.CACHE_CITIES_SEARCH)
            logger.info(f'Busca de cidades bem-sucedida: "{query}" - {len(cities)} resultados')
            return cities
            
        except requests.RequestException as e:
            logger.error(f'Erro ao buscar cidades ("{query}"): {e}')
            return []
        except (KeyError, ValueError) as e:
            logger.error(f'Erro ao processar resposta da busca de cidades: {e}')
            return []
    
    @classmethod
    def calcular_risco_doenca(
        cls,
        temperatura: Optional[float],
        umidade: Optional[int],
        vento: Optional[float]
    ) -> str:
        """
        Calcula o nível de risco de doenças fúngicas.
        
        Baseado em condições climáticas favoráveis ao desenvolvimento
        de fungos patogênicos (especialmente míldio e ferrugem).
        
        Regras:
        - ALTO: 15-25°C e umidade > 80%
        - MÉDIO: 10-28°C e umidade > 60%
        - BAIXO: outras condições
        
        Args:
            temperatura: Temperatura em °C
            umidade: Umidade relativa em % (0-100)
            vento: Velocidade do vento em km/h
            
        Returns:
            'ALTO', 'MEDIO' ou 'BAIXO'
        """
        # Se dados insuficientes, retornar risco baixo
        if temperatura is None or umidade is None:
            return 'BAIXO'
        
        # Condições ideais para fungos: 15-25°C e umidade >80%
        if 15 <= temperatura <= 25 and umidade > 80:
            return 'ALTO'
        
        # Condições moderadamente favoráveis: 10-28°C e umidade >60%
        if 10 <= temperatura <= 28 and umidade > 60:
            return 'MEDIO'
        
        return 'BAIXO'
    
    @classmethod
    def gerar_recomendacao_pulverizacao(
        cls,
        temperatura: Optional[float],
        umidade: Optional[int],
        vento: Optional[float],
        condicao: str
    ) -> str:
        """
        Gera recomendação sobre pulverização baseada em condições climáticas.
        
        Avalia temperatura, umidade, velocidade do vento e condição do tempo
        para indicar se é um bom momento para pulverizar defensivos/fertilizantes.
        
        Args:
            temperatura: Temperatura em °C
            umidade: Umidade relativa em % (0-100)
            vento: Velocidade do vento em km/h
            condicao: Descrição da condição (ex: 'Chuva fraca')
            
        Returns:
            String com recomendações formatadas com emojis
        """
        recomendacoes = []
        
        # Avaliação de temperatura (ideal: 18-25°C)
        if temperatura is not None:
            if 18 <= temperatura <= 25:
                recomendacoes.append('✅ Temperatura ideal para pulverização')
            elif temperatura < 15:
                recomendacoes.append('❌ Muito frio (ineficaz)')
            elif temperatura > 30:
                recomendacoes.append('❌ Muito quente (evaporação rápida)')
        
        # Avaliação de umidade (ideal: 60-85%)
        if umidade is not None:
            if 60 <= umidade <= 85:
                recomendacoes.append('✅ Umidade adequada para pulverização')
            elif umidade < 40:
                recomendacoes.append('❌ Umidade baixa (evaporação rápida)')
            elif umidade > 90:
                recomendacoes.append('⚠️ Umidade muito alta (risco de escorrimento)')
        
        # Avaliação de vento (ideal: < 15 km/h)
        if vento is not None:
            if vento < 15:
                recomendacoes.append('✅ Vento baixo (excelente)')
            elif vento < 20:
                recomendacoes.append('⚠️ Vento moderado (possível leve deriva)')
            else:
                recomendacoes.append('❌ Vento forte (alto risco de deriva)')
        
        # Avaliação de condição do tempo
        condicao_lower = condicao.lower() if condicao else ''
        if any(word in condicao_lower for word in ['chuva', 'tempestade', 'aguaceiro']):
            recomendacoes.append('❌ Chuva prevista (adiar pulverização)')
        elif any(word in condicao_lower for word in ['céu claro', 'principalmente claro']):
            recomendacoes.append('✅ Condição do tempo favorável')
        
        return ' | '.join(recomendacoes) if recomendacoes else '⚠️ Condições variáveis'
