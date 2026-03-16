import api from './api';
export const authService = {
    async login(data) {
        const response = await api.post('/core/auth/login/', data);
        return response.data;
    },
    async getCurrentUser() {
        const response = await api.get('/core/auth/profile/');
        return response.data;
    },
    logout() {
        // Keep logout consistent with stored keys used by hooks/useAuth
        localStorage.removeItem('sistema_agro_tokens');
        localStorage.removeItem('sistema_agro_user');
    },
};
