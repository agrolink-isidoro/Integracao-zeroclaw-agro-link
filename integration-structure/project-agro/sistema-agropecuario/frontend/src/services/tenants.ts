/**
 * Serviços para gerenciamento de Tenants via API.
 * Apenas superusers/admins podem usar o CRUD completo.
 */

import api from './api';
import type { TenantInfo } from '../types';

// Tipos para operações CRUD

export interface TenantOwnerData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  cargo?: string;
}

export interface TenantCreateData {
  nome: string;
  cnpj?: string;
  cpf?: string;
  slug: string;
  plano: 'basico' | 'profissional' | 'enterprise';
  limite_usuarios?: number;
  modulos_habilitados?: string[];
  /** Usuário proprietário a ser criado atomicamente junto com o tenant. */
  initial_owner?: TenantOwnerData;
}

export interface TenantUpdateData extends Partial<TenantCreateData> {
  ativo?: boolean;
}

export interface TenantDetail extends TenantInfo {
  cnpj: string | null;
  cpf: string | null;
  limite_usuarios: number;
  usuarios_count: number;
  criado_em: string;
  atualizado_em: string;
  /** Presente apenas na resposta de criação com initial_owner. */
  initial_owner_created?: { id: number; username: string; email: string; cargo: string };
}

// ───────────────────────────────────────────────────────────
// Helpers de request
// ───────────────────────────────────────────────────────────

export const tenantsService = {
  /** Lista todos os tenants (admin only). */
  async list(params?: { ativo?: boolean }): Promise<TenantDetail[]> {
    const response = await api.get('/core/tenants/', { params });
    return response.data;
  },

  /** Detalhe de um tenant. */
  async get(id: string): Promise<TenantDetail> {
    const response = await api.get(`/core/tenants/${id}/`);
    return response.data;
  },

  /** Cria um novo tenant. */
  async create(data: TenantCreateData): Promise<TenantDetail> {
    const response = await api.post('/core/tenants/', data);
    return response.data;
  },

  /** Atualiza parcialmente um tenant. */
  async update(id: string, data: TenantUpdateData): Promise<TenantDetail> {
    const response = await api.patch(`/core/tenants/${id}/`, data);
    return response.data;
  },

  /** Desativa (soft-delete) um tenant. */
  async deactivate(id: string): Promise<{ detail: string }> {
    const response = await api.delete(`/core/tenants/${id}/`);
    return response.data;
  },

  /** Reativa um tenant desativado. */
  async reactivate(id: string): Promise<{ detail: string }> {
    const response = await api.post(`/core/tenants/${id}/reativar/`);
    return response.data;
  },

  /** Tenant do usuário atual (via perfil). */
  async getCurrent(): Promise<TenantInfo | null> {
    try {
      const response = await api.get('/core/auth/profile/');
      return (response.data as any)?.tenant_info || null;
    } catch {
      return null;
    }
  },
};

export default tenantsService;
