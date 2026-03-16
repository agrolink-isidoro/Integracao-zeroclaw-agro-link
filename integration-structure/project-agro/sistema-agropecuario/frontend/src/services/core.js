import api from './api';
export const coreService = {
    async getUsers() {
        const response = await api.get('/core/users/');
        return response.data;
    },
    async getUser(id) {
        const response = await api.get(`/core/users/${id}/`);
        return response.data;
    },
    async createUser(data) {
        const response = await api.post('/core/users/', data);
        return response.data;
    },
    async updateUser(id, data) {
        const response = await api.put(`/core/users/${id}/`, data);
        return response.data;
    },
    async deleteUser(id) {
        await api.delete(`/core/users/${id}/`);
    },
    async getPermissions() {
        const response = await api.get('/core/permissions/');
        return response.data;
    },
};
