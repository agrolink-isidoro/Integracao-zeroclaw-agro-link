/* eslint-disable react-refresh/only-export-components */
/**
 * TenantContext — fornece informações do tenant atual para toda a aplicação.
 *
 * Responsabilidades:
 * - Lê o tenant salvo no localStorage ao inicializar
 * - Expõe `currentTenant` e `setCurrentTenant` para componentes filhos
 * - Para superusers: carrega lista de tenants disponíveis para seleção
 * - Sincroniza o header X-Tenant-ID da API quando o tenant muda
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import { getStoredTenant, setStoredTenant, getStoredTokens } from '../hooks/useAuth';
import { tenantsService } from '../services/tenants';
import type { TenantInfo } from '../types';
import type { TenantDetail } from '../services/tenants';

interface TenantContextType {
  /** Tenant atual do usuário autenticado */
  currentTenant: TenantInfo | null;
  /** Lista de tenants disponíveis (apenas para superusers) */
  tenantList: TenantDetail[];
  /** Indica se a lista de tenants está carregando */
  loadingTenants: boolean;
  /** Troca o tenant ativo (apenas para superusers) */
  switchTenant: (tenant: TenantInfo) => void;
  /** Recarrega a lista de tenants */
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
  /** Se o usuário atual é superuser (para habilitar gerenciamento de tenants) */
  isSuperuser?: boolean;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children, isSuperuser = false }) => {
  const [currentTenant, setCurrentTenantState] = useState<TenantInfo | null>(
    () => getStoredTenant()
  );
  const [tenantList, setTenantList] = useState<TenantDetail[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  // Sincroniza estado React com localStorage quando login/logout muda o tenant
  useEffect(() => {
    const handler = () => {
      setCurrentTenantState(getStoredTenant());
    };
    window.addEventListener('sistema-agro:tenant-changed', handler);
    return () => window.removeEventListener('sistema-agro:tenant-changed', handler);
  }, []);

  const refreshTenants = useCallback(async () => {
    // Only load tenants for authenticated superusers
    // Note: isSuperuser should be 'true' boolean, not just truthy
    if (isSuperuser !== true) {
      console.debug('[TenantContext] Skipping tenant list: isSuperuser is not true', { isSuperuser });
      return;
    }
    
    // Only attempt if we actually have a token stored
    const tokens = getStoredTokens();
    if (!tokens?.access) {
      console.debug('[TenantContext] Skipping tenant list: no access token available');
      return;
    }
    
    setLoadingTenants(true);
    try {
      const tenants = await tenantsService.list();
      setTenantList(tenants);
      console.debug('[TenantContext] Tenant list loaded successfully', { count: tenants?.length });
    } catch (e) {
      // Silently fail 403 errors for non-superusers — this is expected
      // 403 means the user doesn't have admin permissions, which is normal for regular users
      if ((e as any)?.response?.status === 403) {
        console.debug('[TenantContext] Access denied to tenant list (403) — user does not have admin permissions');
      } else {
        console.warn('[TenantContext] Erro ao carregar lista de tenants', e);
      }
    } finally {
      setLoadingTenants(false);
    }
  }, [isSuperuser]);

  // Carregar lista de tenants para superusers only
  useEffect(() => {
    // Extra guard: only call if explicitly boolean true
    if (isSuperuser === true) {
      refreshTenants();
    }
  }, [isSuperuser, refreshTenants]);

  const switchTenant = useCallback((tenant: TenantInfo) => {
    setCurrentTenantState(tenant);
    setStoredTenant(tenant);
    if (tenant?.id) {
      api.defaults.headers.common['X-Tenant-ID'] = tenant.id;
    }
    window.dispatchEvent(new CustomEvent('sistema-agro:tenant-changed'));
  }, []);

  return (
    <TenantContext.Provider value={{ currentTenant, tenantList, loadingTenants, switchTenant, refreshTenants }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenantContext = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }
  return context;
};
