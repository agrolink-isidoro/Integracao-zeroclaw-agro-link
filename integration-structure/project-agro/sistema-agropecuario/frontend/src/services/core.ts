import api from './api';
import type { CustomUser, ModulePermission } from '../types';

export const coreService = {
  async getUsers(): Promise<CustomUser[]> {
    const response = await api.get('/core/users/');
    return response.data;
  },

  async getUser(id: number): Promise<CustomUser> {
    const response = await api.get(`/core/users/${id}/`);
    return response.data;
  },

  async createUser(data: Partial<CustomUser>): Promise<CustomUser> {
    const response = await api.post('/core/users/', data);
    return response.data;
  },

  async updateUser(id: number, data: Partial<CustomUser>): Promise<CustomUser> {
    const response = await api.put(`/core/users/${id}/`, data);
    return response.data;
  },

  async deleteUser(id: number): Promise<void> {
    await api.delete(`/core/users/${id}/`);
  },

  async getPermissions(): Promise<ModulePermission[]> {
    const response = await api.get('/core/permissions/');
    return response.data;
  },
};