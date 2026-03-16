import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import weatherService from '../../services/weather';
import type { WeatherForecast, WeatherAlert, City } from '../../services/weather';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import CurrentWeather from './CurrentWeather';
import ForecastChart from './ForecastChart';
import AgriculturalRecommendations from './AgriculturalRecommendations';
import WeatherAlerts from './WeatherAlerts';
import CitySearch from './CitySearch';
import FavoriteCities from './FavoriteCities';

interface WeatherWidgetProps {
  /**
   * Talhão ID to show weather for. If not provided, shows dashboard for all talhões
   */
  talhaoId?: number;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ talhaoId }) => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  // Fetch weather forecasts
  const forecastsQuery = useQuery<WeatherForecast[]>({
    queryKey: ['weather-forecasts', talhaoId, selectedCity?.lat, selectedCity?.lon],
    queryFn: async () => {
      if (selectedCity) {
        // Fetch by coordinates when city is selected
        const forecast = await weatherService.getForecastByCoordinates(selectedCity.lat, selectedCity.lon);
        return [forecast];
      }
      if (talhaoId) {
        const forecast = await weatherService.getForecastForTalhao(talhaoId);
        return [forecast];
      }
      return weatherService.getForecasts(true);
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });

  // Fetch weather alerts
  const alertsQuery = useQuery<WeatherAlert[]>({
    queryKey: ['weather-alerts', talhaoId],
    queryFn: async () => {
      if (talhaoId) {
        return weatherService.getAlertsForTalhao(talhaoId);
      }
      return weatherService.getAlerts(true);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => weatherService.syncForecasts(),
    onSuccess: (data) => {
      setLastSync(new Date().toLocaleString('pt-BR'));
      // Refetch forecasts after sync
      forecastsQuery.refetch();
      setSyncing(false);
    },
    onError: (error: any) => {
      console.error('Error syncing weather:', error);
      setSyncing(false);
    },
  });

  const handleSync = () => {
    setSyncing(true);
    syncMutation.mutate();
  };

  const isLoading = forecastsQuery.isLoading || alertsQuery.isLoading;
  const isError = forecastsQuery.isError || alertsQuery.isError;
  const currentForecast = forecastsQuery.data?.[0];
  const alerts = alertsQuery.data || [];

  return (
    <div className="weather-widget">
      {/* Header with sync button */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-1">
            <i className="bi bi-cloud-sun me-2"></i>
            Previsão de Clima
          </h3>
          {lastSync && (
            <small className="text-muted">Última sincronização: {lastSync}</small>
          )}
        </div>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={handleSync}
          disabled={syncing || forecastsQuery.isLoading}
        >
          <i className={`bi bi-arrow-clockwise me-2 ${syncing ? 'spinner-border spinner-border-sm' : ''}`}></i>
          {syncing ? 'Sincronizando...' : 'Atualizar'}
        </button>
      </div>

      {/* City search and favorite cities */}
      {!talhaoId && (
        <div className="mb-4">
          {/* Search - Full width */}
          <div className="mb-3">
            <CitySearch
              onCitySelect={(city) => {
                setSelectedCity(city);
              }}
              placeholder="Buscar cidade para previsão de clima..."
            />
          </div>
          
          {/* Favorite cities - Full width, compact */}
          <FavoriteCities
            onCitySelect={(fav) => {
              setSelectedCity({
                name: fav.name,
                state: fav.state,
                country: fav.country,
                lat: fav.latitude,
                lon: fav.longitude,
                display_name: fav.display_name,
              });
            }}
            selectedCity={selectedCity ?? undefined}
            onClearCity={() => setSelectedCity(null)}
          />
        </div>
      )}

      {/* Error handling */}
      {isError && (
        <ErrorMessage message="Erro ao carregar previsão de clima. Tente novamente." />
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="text-center py-5">
          <LoadingSpinner />
        </div>
      ) : currentForecast ? (
        <>
          {/* Alerts section - Full width */}
          {alerts.length > 0 && (
            <div className="mb-4">
              <WeatherAlerts alerts={alerts} />
            </div>
          )}

          {/* Weather data in grid layout - 2 columns */}
          <div className="row mb-4">
            {/* Left column: Current Weather + Metrics */}
            <div className="col-lg-6">
              <div className="row mb-3">
                <div className="col-12">
                  <CurrentWeather forecast={currentForecast} />
                </div>
              </div>
              
              {/* Additional metrics cards */}
              <div className="row">
                <div className="col-sm-6 mb-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <h6 className="card-title">💧 Umidade</h6>
                      <p className="display-6 text-info mb-0">{currentForecast.umidade_atual}%</p>
                      <small className="text-muted">Umidade relativa</small>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6 mb-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <h6 className="card-title">💨 Vento</h6>
                      <p className="display-6 text-warning mb-0">{currentForecast.vento_velocidade.toFixed(1)}</p>
                      <small className="text-muted">km/h</small>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6 mb-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <h6 className="card-title">☀️ UV</h6>
                      <p className="display-6 text-danger mb-0">{currentForecast.indice_uv?.toFixed(1) || 'N/A'}</p>
                      <small className="text-muted">Índice UV</small>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6 mb-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <h6 className="card-title">☁️ Nuvens</h6>
                      <p className="display-6 text-secondary mb-0">{currentForecast.cobertura_nuvens}%</p>
                      <small className="text-muted">Cobertura</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Recommendations + Info */}
            <div className="col-lg-6">
              <div className="mb-3">
                <AgriculturalRecommendations forecast={currentForecast} />
              </div>

              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">📊 Informações da Localização</h5>
                  <div className="mb-3">
                    <small className="text-muted">Localização</small>
                    <p className="mb-2">
                      <strong>{currentForecast.municipio}</strong>
                    </p>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted">Coordenadas</small>
                    <p className="mb-2">
                      <strong>{currentForecast.latitude.toFixed(4)}°</strong><br />
                      <strong>{currentForecast.longitude.toFixed(4)}°</strong>
                    </p>
                  </div>
                  <hr />
                  <div className="mb-3">
                    <small className="text-muted">Pressão</small>
                    <p className="mb-2">
                      <strong>{currentForecast.pressao?.toFixed(1) || 'N/A'} hPa</strong>
                    </p>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted">Visibilidade</small>
                    <p className="mb-2">
                      <strong>{(currentForecast.visibilidade ? (currentForecast.visibilidade / 1000).toFixed(1) : 'N/A')} km</strong>
                    </p>
                  </div>
                  <hr />
                  <div>
                    <small className="text-muted">Última Atualização</small>
                    <p className="mb-1 text-xs">
                      <strong>{new Date(currentForecast.data_previsao).toLocaleString('pt-BR')}</strong>
                    </p>
                    <small className="text-muted">Fonte: {currentForecast.fonte_dados}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 7-day forecast chart - Full width */}
          <div className="mb-4">
            <ForecastChart forecast={currentForecast} />
          </div>
        </>
      ) : (
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          Nenhuma previsão de clima disponível. Clique em "Atualizar" para sincronizar dados.
        </div>
      )}
    </div>
  );
};

export default WeatherWidget;
