import api from './api';
import type { LoginData, AuthResponse } from '../types';

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
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