/**
 * Serviços para gerenciamento de Tenants via API.
 * Apenas superusers/admins podem usar o CRUD completo.
 */
import api from './api';
// ───────────────────────────────────────────────────────────
// Helpers de request
// ───────────────────────────────────────────────────────────
export const tenantsService = {
    /** Lista todos os tenants (admin only). */
    async list(params) {
        const response = await api.get('/core/tenants/', { params });
        return response.data;
    },
    /** Detalhe de um tenant. */
    async get(id) {
        const response = await api.get(`/core/tenants/${id}/`);
        return response.data;
    },
    /** Cria um novo tenant. */
    async create(data) {
        const response = await api.post('/core/tenants/', data);
        return response.data;
    },
    /** Atualiza parcialmente um tenant. */
    async update(id, data) {
        const response = await api.patch(`/core/tenants/${id}/`, data);
        return response.data;
    },
    /** Desativa (soft-delete) um tenant. */
    async deactivate(id) {
        const response = await api.delete(`/core/tenants/${id}/`);
        return response.data;
    },
    /** Reativa um tenant desativado. */
    async reactivate(id) {
        const response = await api.post(`/core/tenants/${id}/reativar/`);
        return response.data;
    },
    /** Tenant do usuário atual (via perfil). */
    async getCurrent() {
        try {
            const response = await api.get('/core/auth/profile/');
            return response.data?.tenant_info || null;
        }
        catch {
            return null;
        }
    },
};
export default tenantsService;
