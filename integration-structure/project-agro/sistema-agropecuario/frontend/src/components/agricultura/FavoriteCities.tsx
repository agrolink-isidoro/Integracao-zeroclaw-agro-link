import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import weatherService from '../../services/weather';
import type { FavoriteCidade, City } from '../../services/weather';

interface FavoriteCitiesProps {
  onCitySelect?: (city: FavoriteCidade) => void;
  selectedCity?: City;
  onClearCity?: () => void;
}

export const FavoriteCities: React.FC<FavoriteCitiesProps> = ({ onCitySelect, selectedCity, onClearCity }) => {
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
    mutationFn: (city: City) => weatherService.addFavoriteCity(city),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteCities'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Erro ao adicionar cidade aos favoritos');
    },
  });

  // Mutation para remover favorita
  const removeFavoriteMutation = useMutation({
    mutationFn: (cityId: number) => weatherService.removeFavoriteCity(cityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteCities'] });
    },
  });

  // Mutation para marcar como ativa
  const setActiveMutation = useMutation({
    mutationFn: (cityId: number) => weatherService.setActiveCity(cityId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['favoriteCities'] });
      if (onCitySelect) {
        onCitySelect({
          ...data,
          latitude: data.latitude,
          longitude: data.longitude,
        } as FavoriteCidade);
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

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('[FavoriteCities] Localização obtida:', { latitude, longitude });

        try {
          // Buscar cidade a partir das coordenadas
          // Usar uma API reversa ou apenas salvar as coordenadas
          const cityName = `Localização (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`;

          const newFavorite: City = {
            name: cityName,
            state: 'Localização GPS',
            country: 'Brasil',
            lat: latitude,
            lon: longitude,
            display_name: cityName,
          };

          await addFavoriteMutation.mutateAsync(newFavorite);
          console.log('[FavoriteCities] Localização salva como favorita');
        } catch (error) {
          console.error('[FavoriteCities] Erro ao salvar localização:', error);
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        console.error('[FavoriteCities] Erro de geolocalização:', error);
        alert(`Erro ao obter localização: ${error.message}`);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Adicionar cidade selecionada aos favoritos
  const handleAddSelectedCity = async () => {
    if (!selectedCity) return;

    try {
      await addFavoriteMutation.mutateAsync(selectedCity);
      console.log('[FavoriteCities] Cidade adicionada aos favoritos');
    } catch (error) {
      console.error('[FavoriteCities] Erro ao adicionar aos favoritos:', error);
    }
  };

  const favorites = favoritesQuery.data || [];
  const isMaxed = favorites.length >= 3;
  const hasSelectedCity = selectedCity && !favorites.some(
    (fav) => fav.latitude === selectedCity.lat && fav.longitude === selectedCity.lon
  );

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="card-title mb-0">📍 Locais Favoritos</h5>
          <small className="text-muted">{favorites.length}/3</small>
        </div>

        {/* Selected city display */}
        {selectedCity && (
          <div className="alert alert-primary mb-3 d-flex justify-content-between align-items-center">
            <div>
              <i className="bi bi-geo-alt me-2"></i>
              <strong>{selectedCity.display_name}</strong>
              <br />
              <small className="text-muted">
                {selectedCity.lat.toFixed(2)}°, {selectedCity.lon.toFixed(2)}°
              </small>
            </div>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={onClearCity}
              title="Limpar seleção"
            >
              ✕
            </button>
          </div>
        )}

        {/* Lista de favoritas */}
        {favorites.length > 0 ? (
          <div className="list-group mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {favorites.map((city) => (
              <div
                key={city.id}
                className={`list-group-item d-flex justify-content-between align-items-center ${
                  city.is_active ? 'active' : ''
                }`}
                style={{ cursor: 'pointer' }}
              >
                <div className="flex-grow-1" onClick={() => setActiveMutation.mutate(city.id)}>
                  <div className="fw-bold">{city.display_name}</div>
                  <small className="text-muted">
                    {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                  </small>
                </div>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remover ${city.display_name} dos favoritos?`)) {
                      removeFavoriteMutation.mutate(city.id);
                    }
                  }}
                  disabled={removeFavoriteMutation.isPending}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="alert alert-info mb-3">
            Nenhuma cidade favorita ainda. Use os botões abaixo para adicionar.
          </div>
        )}

        {/* Botões de ação */}
        <div className="d-grid gap-2">
          {hasSelectedCity && (
            <button
              className="btn btn-success btn-sm"
              onClick={handleAddSelectedCity}
              disabled={
                isMaxed ||
                addFavoriteMutation.isPending ||
                !selectedCity
              }
            >
              {addFavoriteMutation.isPending ? 'Adicionando...' : '➕ Adicionar Selecionada'}
            </button>
          )}

          <button
            className="btn btn-info btn-sm"
            onClick={handleUseCurrentLocation}
            disabled={isLoadingLocation || isMaxed}
          >
            {isLoadingLocation ? 'Obtendo localização...' : '📍 Usar Minha Localização'}
          </button>
        </div>

        {isMaxed && (
          <div className="alert alert-warning mt-3 mb-0">
            <small>Máximo de 3 cidades favoritas atingido. Remova uma para adicionar outra.</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoriteCities;
