import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import weatherService from '../../services/weather';
export const FavoriteCities = ({ onCitySelect, selectedCity, onClearCity }) => {
    const queryClient = useQueryClient();
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    // Buscar cidades favoritas
    const favoritesQuery = useQuery({
        queryKey: ['favoriteCities'],
        queryFn: () => weatherService.getFavoriteCities(),
        staleTime: 1000 * 60 * 5, // 5 minutos
    });
    // Mutation para adicionar favorita
    const addFavoriteMutation = useMutation({
        mutationFn: (city) => weatherService.addFavoriteCity(city),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['favoriteCities'] });
        },
        onError: (error) => {
            alert(error.response?.data?.detail || 'Erro ao adicionar cidade aos favoritos');
        },
    });
    // Mutation para remover favorita
    const removeFavoriteMutation = useMutation({
        mutationFn: (cityId) => weatherService.removeFavoriteCity(cityId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['favoriteCities'] });
        },
    });
    // Mutation para marcar como ativa
    const setActiveMutation = useMutation({
        mutationFn: (cityId) => weatherService.setActiveCity(cityId),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['favoriteCities'] });
            if (onCitySelect) {
                onCitySelect({
                    ...data,
                    latitude: data.latitude,
                    longitude: data.longitude,
                });
            }
        },
    });
    // Usar geolocalização do dispositivo
    const handleUseCurrentLocation = () => {
        setIsLoadingLocation(true);
        if (!navigator.geolocation) {
            alert('Geolocalização não suportada neste navegador');
            setIsLoadingLocation(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            console.log('[FavoriteCities] Localização obtida:', { latitude, longitude });
            try {
                // Buscar cidade a partir das coordenadas
                // Usar uma API reversa ou apenas salvar as coordenadas
                const cityName = `Localização (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`;
                const newFavorite = {
                    name: cityName,
                    state: 'Localização GPS',
                    country: 'Brasil',
                    lat: latitude,
                    lon: longitude,
                    display_name: cityName,
                };
                await addFavoriteMutation.mutateAsync(newFavorite);
                console.log('[FavoriteCities] Localização salva como favorita');
            }
            catch (error) {
                console.error('[FavoriteCities] Erro ao salvar localização:', error);
            }
            finally {
                setIsLoadingLocation(false);
            }
        }, (error) => {
            console.error('[FavoriteCities] Erro de geolocalização:', error);
            alert(`Erro ao obter localização: ${error.message}`);
            setIsLoadingLocation(false);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        });
    };
    // Adicionar cidade selecionada aos favoritos
    const handleAddSelectedCity = async () => {
        if (!selectedCity)
            return;
        try {
            await addFavoriteMutation.mutateAsync(selectedCity);
            console.log('[FavoriteCities] Cidade adicionada aos favoritos');
        }
        catch (error) {
            console.error('[FavoriteCities] Erro ao adicionar aos favoritos:', error);
        }
    };
    const favorites = favoritesQuery.data || [];
    const isMaxed = favorites.length >= 3;
    const hasSelectedCity = selectedCity && !favorites.some((fav) => fav.latitude === selectedCity.lat && fav.longitude === selectedCity.lon);
    return (_jsx("div", { className: "card", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("h5", { className: "card-title mb-0", children: "\uD83D\uDCCD Locais Favoritos" }), _jsxs("small", { className: "text-muted", children: [favorites.length, "/3"] })] }), selectedCity && (_jsxs("div", { className: "alert alert-primary mb-3 d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), _jsx("strong", { children: selectedCity.display_name }), _jsx("br", {}), _jsxs("small", { className: "text-muted", children: [selectedCity.lat.toFixed(2), "\u00B0, ", selectedCity.lon.toFixed(2), "\u00B0"] })] }), _jsx("button", { className: "btn btn-sm btn-outline-primary", onClick: onClearCity, title: "Limpar sele\u00E7\u00E3o", children: "\u2715" })] })), favorites.length > 0 ? (_jsx("div", { className: "list-group mb-3", style: { maxHeight: '200px', overflowY: 'auto' }, children: favorites.map((city) => (_jsxs("div", { className: `list-group-item d-flex justify-content-between align-items-center ${city.is_active ? 'active' : ''}`, style: { cursor: 'pointer' }, children: [_jsxs("div", { className: "flex-grow-1", onClick: () => setActiveMutation.mutate(city.id), children: [_jsx("div", { className: "fw-bold", children: city.display_name }), _jsxs("small", { className: "text-muted", children: [city.latitude.toFixed(2), "\u00B0, ", city.longitude.toFixed(2), "\u00B0"] })] }), _jsx("button", { className: "btn btn-sm btn-danger", onClick: (e) => {
                                    e.stopPropagation();
                                    if (confirm(`Remover ${city.display_name} dos favoritos?`)) {
                                        removeFavoriteMutation.mutate(city.id);
                                    }
                                }, disabled: removeFavoriteMutation.isPending, children: "\u2715" })] }, city.id))) })) : (_jsx("div", { className: "alert alert-info mb-3", children: "Nenhuma cidade favorita ainda. Use os bot\u00F5es abaixo para adicionar." })), _jsxs("div", { className: "d-grid gap-2", children: [hasSelectedCity && (_jsx("button", { className: "btn btn-success btn-sm", onClick: handleAddSelectedCity, disabled: isMaxed ||
                                addFavoriteMutation.isPending ||
                                !selectedCity, children: addFavoriteMutation.isPending ? 'Adicionando...' : '➕ Adicionar Selecionada' })), _jsx("button", { className: "btn btn-info btn-sm", onClick: handleUseCurrentLocation, disabled: isLoadingLocation || isMaxed, children: isLoadingLocation ? 'Obtendo localização...' : '📍 Usar Minha Localização' })] }), isMaxed && (_jsx("div", { className: "alert alert-warning mt-3 mb-0", children: _jsx("small", { children: "M\u00E1ximo de 3 cidades favoritas atingido. Remova uma para adicionar outra." }) }))] }) }));
};
export default FavoriteCities;
