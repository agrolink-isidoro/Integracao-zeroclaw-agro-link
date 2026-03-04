import api from './api';
import type {
  RBACUser,
  UserPayload,
  PermissionGroup,
  PermissionGroupList,
  GroupPermissionEntry,
  UserGroupAssignment,
  ModulePermissionEntry,
  DelegatedPermission,
  PermissionAuditLogEntry,
  EffectivePermissionsResponse,
  RBACModule,
} from '../types/rbac';

// ============================================================
// RBAC API Service
// ============================================================

export const rbacService = {
  // ── Users ──────────────────────────────────────────────
  async getUsers(): Promise<RBACUser[]> {
    const response = await api.get('/core/users/');
    return response.data;
  },

  async getUser(id: number): Promise<RBACUser> {
    const response = await api.get(`/core/users/${id}/`);
    return response.data;
  },

  async createUser(data: UserPayload): Promise<RBACUser> {
    const response = await api.post('/core/users/', data);
    return response.data;
  },

  async updateUser(id: number, data: Partial<UserPayload>): Promise<RBACUser> {
    const response = await api.patch(`/core/users/${id}/`, data);
    return response.data;
  },

  async deleteUser(id: number): Promise<void> {
    await api.delete(`/core/users/${id}/`);
  },

  async getUserEffectivePermissions(userId: number): Promise<EffectivePermissionsResponse> {
    const response = await api.get(`/core/users/${userId}/effective-permissions/`);
    return response.data;
  },

  // ── Permission Groups (Perfis) ────────────────────────
  async getGroups(): Promise<PermissionGroupList[]> {
    const response = await api.get('/core/groups/');
    return response.data;
  },

  async getGroup(id: number): Promise<PermissionGroup> {
    const response = await api.get(`/core/groups/${id}/`);
    return response.data;
  },

  async createGroup(data: { nome: string; descricao?: string }): Promise<PermissionGroup> {
    const response = await api.post('/core/groups/', data);
    return response.data;
  },

  async updateGroup(id: number, data: { nome?: string; descricao?: string }): Promise<PermissionGroup> {
    const response = await api.patch(`/core/groups/${id}/`, data);
    return response.data;
  },

  async deleteGroup(id: number): Promise<void> {
    await api.delete(`/core/groups/${id}/`);
  },

  // ── Group Permissions ─────────────────────────────────
  async getGroupPermissions(groupId?: number): Promise<GroupPermissionEntry[]> {
    const params = groupId ? { group: groupId } : {};
    const response = await api.get('/core/group-permissions/', { params });
    return response.data;
  },

  async setGroupPermission(data: {
    group: number;
    module: RBACModule;
    can_view: boolean;
    can_edit: boolean;
    can_respond: boolean;
  }): Promise<GroupPermissionEntry> {
    const response = await api.post('/core/group-permissions/', data);
    return response.data;
  },

  async updateGroupPermission(
    id: number,
    data: Partial<{ can_view: boolean; can_edit: boolean; can_respond: boolean }>
  ): Promise<GroupPermissionEntry> {
    const response = await api.patch(`/core/group-permissions/${id}/`, data);
    return response.data;
  },

  async deleteGroupPermission(id: number): Promise<void> {
    await api.delete(`/core/group-permissions/${id}/`);
  },

  // ── User-Group Assignments ────────────────────────────
  async getUserGroupAssignments(params?: { user?: number; group?: number }): Promise<UserGroupAssignment[]> {
    const response = await api.get('/core/user-groups/', { params });
    return response.data;
  },

  async assignUserToGroup(userId: number, groupId: number): Promise<UserGroupAssignment> {
    const response = await api.post('/core/user-groups/', { user: userId, group: groupId });
    return response.data;
  },

  async removeUserFromGroup(assignmentId: number): Promise<void> {
    await api.delete(`/core/user-groups/${assignmentId}/`);
  },

  // ── Individual Module Permissions ─────────────────────
  async getModulePermissions(userId?: number): Promise<ModulePermissionEntry[]> {
    const params = userId ? { user: userId } : {};
    const response = await api.get('/core/permissions/', { params });
    return response.data;
  },

  async setModulePermission(data: {
    user: number;
    module: RBACModule;
    can_view: boolean;
    can_edit: boolean;
    can_respond: boolean;
  }): Promise<ModulePermissionEntry> {
    const response = await api.post('/core/permissions/', data);
    return response.data;
  },

  async updateModulePermission(
    id: number,
    data: Partial<{ can_view: boolean; can_edit: boolean; can_respond: boolean }>
  ): Promise<ModulePermissionEntry> {
    const response = await api.patch(`/core/permissions/${id}/`, data);
    return response.data;
  },

  async deleteModulePermission(id: number): Promise<void> {
    await api.delete(`/core/permissions/${id}/`);
  },

  // ── Delegations ───────────────────────────────────────
  async getDelegations(params?: { user?: number; active?: '1' }): Promise<DelegatedPermission[]> {
    const response = await api.get('/core/delegations/', { params });
    return response.data;
  },

  async createDelegation(data: {
    from_user: number;
    to_user: number;
    module: RBACModule;
    can_view: boolean;
    can_edit: boolean;
    can_respond: boolean;
    valid_from: string;
    valid_until: string;
    motivo?: string;
  }): Promise<DelegatedPermission> {
    const response = await api.post('/core/delegations/', data);
    return response.data;
  },

  async revokeDelegation(id: number): Promise<void> {
    await api.post(`/core/delegations/${id}/revogar/`);
  },

    // ── Tenant Owner ─────────────────────────────────────
  /**
   * Vincula um usuário a um tenant como proprietário (root).
   * POST /core/tenants/{tenantId}/set_owner/  { user_id }
   */
  async setTenantOwner(
    tenantId: string,
    userId: number
  ): Promise<{ detail: string; username: string; tenant_nome: string }> {
    const response = await api.post(`/core/tenants/${tenantId}/set_owner/`, { user_id: userId });
    return response.data;
  },

  // ── Audit Log ─────────────────────────────────────────
  async getAuditLog(params?: {
    user?: number;
    target_user?: number;
    action?: string;
    module?: string;
  }): Promise<PermissionAuditLogEntry[]> {
    const response = await api.get('/core/audit-log/', { params });
    return response.data;
  },
};
