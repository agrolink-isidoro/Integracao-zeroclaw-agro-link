import api from './api';

export type CurrentWeather = {
  latitude: number;
  longitude: number;
  municipio: string;
  temperatura_atual: number;
  temperatura_sensacao?: number;
  umidade_atual: number;
  condicao_atual: string;
  descricao_clima: string;
  vento_velocidade: number;
  vento_direcao?: number;
  indice_uv?: number;
  ponto_orvalho?: number;
  pressao?: number;
  visibilidade?: number;
  cobertura_nuvens: number;
  chance_precipitacao: number;
};

export type DayForecast = {
  data: string;
  temperatura_maxima: number;
  temperatura_minima: number;
  umidade_media: number;
  condicao: string;
  chance_precipitacao: number;
  vento_velocidade: number;
};

export type WeatherForecast = CurrentWeather & {
  id: number;
  talhao?: number;
  talhao_name?: string;
  forecast_7dias: DayForecast[];
  risco_doenca_fungica: 'BAIXO' | 'MEDIO' | 'ALTO';
  recomendacao_pulverizacao: string;
  indice_aridez: number;
  data_previsao: string;
  proxima_atualizacao: string;
  fonte_dados: string;
};

export type WeatherAlert = {
  id: number;
  talhao?: number;
  talhao_name?: string;
  tipo: string;
  tipo_display: string;
  severidade: string;
  descricao: string;
  data_inicio_prevista: string;
  data_fim_prevista: string;
  ativo: boolean;
};

export type City = {
  name: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
  display_name: string;
};

export type FavoriteCidade = {
  id: number;
  name: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  display_name: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
};

const weatherService = {
  /**
   * Get weather forecasts for all talhões (plots) in the tenant
   */
  async getForecasts(recentOnly: boolean = true) {
    const response = await api.get<WeatherForecast[]>(
      '/agricultura-weather/forecasts/',
      {
        params: { recent_only: recentOnly }
      }
    );
    return response.data;
  },

  /**
   * Get weather forecast for a specific talhão
   */
  async getForecastForTalhao(talhaoId: number) {
    const response = await api.get<WeatherForecast>(
      `/agricultura-weather/forecasts/for_talhao/`,
      {
        params: { talhao_id: talhaoId }
      }
    );
    return response.data;
  },

  /**
   * Sync weather forecasts for all tenant talhões
   */
  async syncForecasts() {
    const response = await api.post<{ updated_count: number; message: string }>(
      '/agricultura-weather/forecasts/sync_now/'
    );
    return response.data;
  },

  /**
   * Get weather alerts
   */
  async getAlerts(activeOnly: boolean = true) {
    const response = await api.get<WeatherAlert[]>(
      '/agricultura-weather/alerts/',
      {
        params: { active_only: activeOnly }
      }
    );
    return response.data;
  },

  /**
   * Get weather alerts for a specific talhão
   */
  async getAlertsForTalhao(talhaoId: number) {
    const response = await api.get<WeatherAlert[]>(
      '/agricultura-weather/alerts/',
      {
        params: { talhao_id: talhaoId, active_only: true }
      }
    );
    return response.data;
  },

  /**
   * Get weather forecast for specific coordinates
   */
  async getForecastByCoordinates(latitude: number, longitude: number) {
    const response = await api.get<WeatherForecast>(
      `/agricultura-weather/forecasts/by_coordinates/`,
      {
        params: { latitude, longitude }
      }
    );
    return response.data;
  },

  /**
   * Search for cities by name
   */
  async searchCities(query: string, limit: number = 5) {
    console.log('[weatherService] searchCities called with:', query, limit);
    try {
      const response = await api.get<City[]>(
        '/agricultura-weather/cities/search/',
        {
          params: { q: query, limit }
        }
      );
      console.log('[weatherService] searchCities response:', response.data);
      // Note: axios interceptor already extracts the 'results' array from the response
      return response.data;
    } catch (error) {
      console.error('[weatherService] searchCities error:', error);
      throw error;
    }
  },

  /**
   * Get user's favorite cities
   */
  async getFavoriteCities() {
    try {
      const response = await api.get<FavoriteCidade[]>('/agricultura-weather/favorite-cities/');
      return response.data;
    } catch (error) {
      console.error('[weatherService] getFavoriteCities error:', error);
      throw error;
    }
  },

  /**
   * Get active (selected) favorite city
   */
  async getActiveCity() {
    try {
      const response = await api.get<FavoriteCidade | null>('/agricultura-weather/favorite-cities/active/');
      return response.data;
    } catch (error) {
      console.error('[weatherService] getActiveCity error:', error);
      throw error;
    }
  },

  /**
   * Add a city to favorites
   */
  async addFavoriteCity(city: City) {
    try {
      const response = await api.post<FavoriteCidade>('/agricultura-weather/favorite-cities/', {
        name: city.name,
        state: city.state,
        country: city.country,
        latitude: city.lat,
        longitude: city.lon,
        display_name: city.display_name,
      });
      return response.data;
    } catch (error) {
      console.error('[weatherService] addFavoriteCity error:', error);
      throw error;
    }
  },

  /**
   * Remove a city from favorites
   */
  async removeFavoriteCity(cityId: number) {
    try {
      await api.delete(`/agricultura-weather/favorite-cities/${cityId}/`);
    } catch (error) {
      console.error('[weatherService] removeFavoriteCity error:', error);
      throw error;
    }
  },

  /**
   * Set a favorite city as active
   */
  async setActiveCity(cityId: number) {
    try {
      const response = await api.post<FavoriteCidade>(
        `/agricultura-weather/favorite-cities/${cityId}/set_active/`
      );
      return response.data;
    } catch (error) {
      console.error('[weatherService] setActiveCity error:', error);
      throw error;
    }
  },
};

export default weatherService;
