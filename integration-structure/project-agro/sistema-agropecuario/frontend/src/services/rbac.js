import api from './api';
// ============================================================
// RBAC API Service
// ============================================================
export const rbacService = {
    // ── Users ──────────────────────────────────────────────
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
        const response = await api.patch(`/core/users/${id}/`, data);
        return response.data;
    },
    async deleteUser(id) {
        await api.delete(`/core/users/${id}/`);
    },
    async getUserEffectivePermissions(userId) {
        const response = await api.get(`/core/users/${userId}/effective-permissions/`);
        return response.data;
    },
    // ── Permission Groups (Perfis) ────────────────────────
    async getGroups() {
        const response = await api.get('/core/groups/');
        return response.data;
    },
    async getGroup(id) {
        const response = await api.get(`/core/groups/${id}/`);
        return response.data;
    },
    async createGroup(data) {
        const response = await api.post('/core/groups/', data);
        return response.data;
    },
    async updateGroup(id, data) {
        const response = await api.patch(`/core/groups/${id}/`, data);
        return response.data;
    },
    async deleteGroup(id) {
        await api.delete(`/core/groups/${id}/`);
    },
    // ── Group Permissions ─────────────────────────────────
    async getGroupPermissions(groupId) {
        const params = groupId ? { group: groupId } : {};
        const response = await api.get('/core/group-permissions/', { params });
        return response.data;
    },
    async setGroupPermission(data) {
        const response = await api.post('/core/group-permissions/', data);
        return response.data;
    },
    async updateGroupPermission(id, data) {
        const response = await api.patch(`/core/group-permissions/${id}/`, data);
        return response.data;
    },
    async deleteGroupPermission(id) {
        await api.delete(`/core/group-permissions/${id}/`);
    },
    // ── User-Group Assignments ────────────────────────────
    async getUserGroupAssignments(params) {
        const response = await api.get('/core/user-groups/', { params });
        return response.data;
    },
    async assignUserToGroup(userId, groupId) {
        const response = await api.post('/core/user-groups/', { user: userId, group: groupId });
        return response.data;
    },
    async removeUserFromGroup(assignmentId) {
        await api.delete(`/core/user-groups/${assignmentId}/`);
    },
    // ── Individual Module Permissions ─────────────────────
    async getModulePermissions(userId) {
        const params = userId ? { user: userId } : {};
        const response = await api.get('/core/permissions/', { params });
        return response.data;
    },
    async setModulePermission(data) {
        const response = await api.post('/core/permissions/', data);
        return response.data;
    },
    async updateModulePermission(id, data) {
        const response = await api.patch(`/core/permissions/${id}/`, data);
        return response.data;
    },
    async deleteModulePermission(id) {
        await api.delete(`/core/permissions/${id}/`);
    },
    // ── Delegations ───────────────────────────────────────
    async getDelegations(params) {
        const response = await api.get('/core/delegations/', { params });
        return response.data;
    },
    async createDelegation(data) {
        const response = await api.post('/core/delegations/', data);
        return response.data;
    },
    async revokeDelegation(id) {
        await api.post(`/core/delegations/${id}/revogar/`);
    },
    // ── Tenant Owner ─────────────────────────────────────
    /**
     * Vincula um usuário a um tenant como proprietário (root).
     * POST /core/tenants/{tenantId}/set_owner/  { user_id }
     */
    async setTenantOwner(tenantId, userId) {
        const response = await api.post(`/core/tenants/${tenantId}/set_owner/`, { user_id: userId });
        return response.data;
    },
    // ── Audit Log ─────────────────────────────────────────
    async getAuditLog(params) {
        const response = await api.get('/core/audit-log/', { params });
        return response.data;
    },
};
