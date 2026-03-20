import api from './api';
const weatherService = {
    /**
     * Get weather forecasts for all talhões (plots) in the tenant
     */
    async getForecasts(recentOnly = true) {
        const response = await api.get('/agricultura-weather/forecasts/', {
            params: { recent_only: recentOnly }
        });
        return response.data;
    },
    /**
     * Get weather forecast for a specific talhão
     */
    async getForecastForTalhao(talhaoId) {
        const response = await api.get(`/agricultura-weather/forecasts/for_talhao/`, {
            params: { talhao_id: talhaoId }
        });
        return response.data;
    },
    /**
     * Sync weather forecasts for all tenant talhões
     */
    async syncForecasts() {
        const response = await api.post('/agricultura-weather/forecasts/sync_now/');
        return response.data;
    },
    /**
     * Get weather alerts
     */
    async getAlerts(activeOnly = true) {
        const response = await api.get('/agricultura-weather/alerts/', {
            params: { active_only: activeOnly }
        });
        return response.data;
    },
    /**
     * Get weather alerts for a specific talhão
     */
    async getAlertsForTalhao(talhaoId) {
        const response = await api.get('/agricultura-weather/alerts/', {
            params: { talhao_id: talhaoId, active_only: true }
        });
        return response.data;
    },
    /**
     * Get weather forecast for specific coordinates
     */
    async getForecastByCoordinates(latitude, longitude) {
        const response = await api.get(`/agricultura-weather/forecasts/by_coordinates/`, {
            params: { latitude, longitude }
        });
        return response.data;
    },
    /**
     * Search for cities by name
     */
    async searchCities(query, limit = 5) {
        console.log('[weatherService] searchCities called with:', query, limit);
        try {
            const response = await api.get('/agricultura-weather/cities/search/', {
                params: { q: query, limit }
            });
            console.log('[weatherService] searchCities response:', response.data);
            // Note: axios interceptor already extracts the 'results' array from the response
            return response.data;
        }
        catch (error) {
            console.error('[weatherService] searchCities error:', error);
            throw error;
        }
    },
    /**
     * Get user's favorite cities
     */
    async getFavoriteCities() {
        try {
            const response = await api.get('/agricultura-weather/favorite-cities/');
            return response.data;
        }
        catch (error) {
            console.error('[weatherService] getFavoriteCities error:', error);
            throw error;
        }
    },
    /**
     * Get active (selected) favorite city
     */
    async getActiveCity() {
        try {
            const response = await api.get('/agricultura-weather/favorite-cities/active/');
            return response.data;
        }
        catch (error) {
            console.error('[weatherService] getActiveCity error:', error);
            throw error;
        }
    },
    /**
     * Add a city to favorites
     */
    async addFavoriteCity(city) {
        try {
            const response = await api.post('/agricultura-weather/favorite-cities/', {
                name: city.name,
                state: city.state,
                country: city.country,
                latitude: city.lat,
                longitude: city.lon,
                display_name: city.display_name,
            });
            return response.data;
        }
        catch (error) {
            console.error('[weatherService] addFavoriteCity error:', error);
            throw error;
        }
    },
    /**
     * Remove a city from favorites
     */
    async removeFavoriteCity(cityId) {
        try {
            await api.delete(`/agricultura-weather/favorite-cities/${cityId}/`);
        }
        catch (error) {
            console.error('[weatherService] removeFavoriteCity error:', error);
            throw error;
        }
    },
    /**
     * Set a favorite city as active
     */
    async setActiveCity(cityId) {
        try {
            const response = await api.post(`/agricultura-weather/favorite-cities/${cityId}/set_active/`);
            return response.data;
        }
        catch (error) {
            console.error('[weatherService] setActiveCity error:', error);
            throw error;
        }
    },
};
export default weatherService;
