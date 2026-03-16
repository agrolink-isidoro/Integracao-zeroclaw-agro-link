import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import weatherService from '../../services/weather';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import CurrentWeather from './CurrentWeather';
import ForecastChart from './ForecastChart';
import AgriculturalRecommendations from './AgriculturalRecommendations';
import WeatherAlerts from './WeatherAlerts';
import CitySearch from './CitySearch';
import FavoriteCities from './FavoriteCities';
const WeatherWidget = ({ talhaoId }) => {
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    const [selectedCity, setSelectedCity] = useState(null);
    // Fetch weather forecasts
    const forecastsQuery = useQuery({
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
    const alertsQuery = useQuery({
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
        onError: (error) => {
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
    return (_jsxs("div", { className: "weather-widget", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("div", { children: [_jsxs("h3", { className: "mb-1", children: [_jsx("i", { className: "bi bi-cloud-sun me-2" }), "Previs\u00E3o de Clima"] }), lastSync && (_jsxs("small", { className: "text-muted", children: ["\u00DAltima sincroniza\u00E7\u00E3o: ", lastSync] }))] }), _jsxs("button", { className: "btn btn-outline-primary btn-sm", onClick: handleSync, disabled: syncing || forecastsQuery.isLoading, children: [_jsx("i", { className: `bi bi-arrow-clockwise me-2 ${syncing ? 'spinner-border spinner-border-sm' : ''}` }), syncing ? 'Sincronizando...' : 'Atualizar'] })] }), !talhaoId && (_jsxs("div", { className: "mb-4", children: [_jsx("div", { className: "mb-3", children: _jsx(CitySearch, { onCitySelect: (city) => {
                                setSelectedCity(city);
                            }, placeholder: "Buscar cidade para previs\u00E3o de clima..." }) }), _jsx(FavoriteCities, { onCitySelect: (fav) => {
                            setSelectedCity({
                                name: fav.name,
                                state: fav.state,
                                country: fav.country,
                                lat: fav.latitude,
                                lon: fav.longitude,
                                display_name: fav.display_name,
                            });
                        }, selectedCity: selectedCity, onClearCity: () => setSelectedCity(null) })] })), isError && (_jsx(ErrorMessage, { message: "Erro ao carregar previs\u00E3o de clima. Tente novamente." })), isLoading ? (_jsx("div", { className: "text-center py-5", children: _jsx(LoadingSpinner, {}) })) : currentForecast ? (_jsxs(_Fragment, { children: [alerts.length > 0 && (_jsx("div", { className: "mb-4", children: _jsx(WeatherAlerts, { alerts: alerts }) })), _jsxs("div", { className: "row mb-4", children: [_jsxs("div", { className: "col-lg-6", children: [_jsx("div", { className: "row mb-3", children: _jsx("div", { className: "col-12", children: _jsx(CurrentWeather, { forecast: currentForecast }) }) }), _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-sm-6 mb-3", children: _jsx("div", { className: "card h-100", children: _jsxs("div", { className: "card-body", children: [_jsx("h6", { className: "card-title", children: "\uD83D\uDCA7 Umidade" }), _jsxs("p", { className: "display-6 text-info mb-0", children: [currentForecast.umidade_atual, "%"] }), _jsx("small", { className: "text-muted", children: "Umidade relativa" })] }) }) }), _jsx("div", { className: "col-sm-6 mb-3", children: _jsx("div", { className: "card h-100", children: _jsxs("div", { className: "card-body", children: [_jsx("h6", { className: "card-title", children: "\uD83D\uDCA8 Vento" }), _jsx("p", { className: "display-6 text-warning mb-0", children: currentForecast.vento_velocidade.toFixed(1) }), _jsx("small", { className: "text-muted", children: "km/h" })] }) }) }), _jsx("div", { className: "col-sm-6 mb-3", children: _jsx("div", { className: "card h-100", children: _jsxs("div", { className: "card-body", children: [_jsx("h6", { className: "card-title", children: "\u2600\uFE0F UV" }), _jsx("p", { className: "display-6 text-danger mb-0", children: currentForecast.indice_uv?.toFixed(1) || 'N/A' }), _jsx("small", { className: "text-muted", children: "\u00CDndice UV" })] }) }) }), _jsx("div", { className: "col-sm-6 mb-3", children: _jsx("div", { className: "card h-100", children: _jsxs("div", { className: "card-body", children: [_jsx("h6", { className: "card-title", children: "\u2601\uFE0F Nuvens" }), _jsxs("p", { className: "display-6 text-secondary mb-0", children: [currentForecast.cobertura_nuvens, "%"] }), _jsx("small", { className: "text-muted", children: "Cobertura" })] }) }) })] })] }), _jsxs("div", { className: "col-lg-6", children: [_jsx("div", { className: "mb-3", children: _jsx(AgriculturalRecommendations, { forecast: currentForecast }) }), _jsx("div", { className: "card h-100", children: _jsxs("div", { className: "card-body", children: [_jsx("h5", { className: "card-title", children: "\uD83D\uDCCA Informa\u00E7\u00F5es da Localiza\u00E7\u00E3o" }), _jsxs("div", { className: "mb-3", children: [_jsx("small", { className: "text-muted", children: "Localiza\u00E7\u00E3o" }), _jsx("p", { className: "mb-2", children: _jsx("strong", { children: currentForecast.municipio }) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("small", { className: "text-muted", children: "Coordenadas" }), _jsxs("p", { className: "mb-2", children: [_jsxs("strong", { children: [currentForecast.latitude.toFixed(4), "\u00B0"] }), _jsx("br", {}), _jsxs("strong", { children: [currentForecast.longitude.toFixed(4), "\u00B0"] })] })] }), _jsx("hr", {}), _jsxs("div", { className: "mb-3", children: [_jsx("small", { className: "text-muted", children: "Press\u00E3o" }), _jsx("p", { className: "mb-2", children: _jsxs("strong", { children: [currentForecast.pressao?.toFixed(1) || 'N/A', " hPa"] }) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("small", { className: "text-muted", children: "Visibilidade" }), _jsx("p", { className: "mb-2", children: _jsxs("strong", { children: [(currentForecast.visibilidade ? (currentForecast.visibilidade / 1000).toFixed(1) : 'N/A'), " km"] }) })] }), _jsx("hr", {}), _jsxs("div", { children: [_jsx("small", { className: "text-muted", children: "\u00DAltima Atualiza\u00E7\u00E3o" }), _jsx("p", { className: "mb-1 text-xs", children: _jsx("strong", { children: new Date(currentForecast.data_previsao).toLocaleString('pt-BR') }) }), _jsxs("small", { className: "text-muted", children: ["Fonte: ", currentForecast.fonte_dados] })] })] }) })] })] }), _jsx("div", { className: "mb-4", children: _jsx(ForecastChart, { forecast: currentForecast }) })] })) : (_jsxs("div", { className: "alert alert-info", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhuma previs\u00E3o de clima dispon\u00EDvel. Clique em \"Atualizar\" para sincronizar dados."] }))] }));
};
export default WeatherWidget;
