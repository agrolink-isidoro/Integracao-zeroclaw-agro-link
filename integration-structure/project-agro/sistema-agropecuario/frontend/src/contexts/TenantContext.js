import { jsx as _jsx } from "react/jsx-runtime";
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
import api from '../services/api';
import { getStoredTenant, setStoredTenant, getStoredTokens } from '../hooks/useAuth';
import { tenantsService } from '../services/tenants';
const TenantContext = createContext(undefined);
export const TenantProvider = ({ children, isSuperuser = false }) => {
    const [currentTenant, setCurrentTenantState] = useState(() => getStoredTenant());
    const [tenantList, setTenantList] = useState([]);
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
        if (!isSuperuser || typeof isSuperuser !== 'boolean')
            return;
        // Only attempt if we actually have a token stored
        if (!getStoredTokens()?.access)
            return;
        setLoadingTenants(true);
        try {
            const tenants = await tenantsService.list();
            setTenantList(tenants);
        }
        catch (e) {
            // Silently fail 403 errors for non-superusers — this is expected
            if (e?.response?.status !== 403) {
                console.warn('[TenantContext] Erro ao carregar lista de tenants', e);
            }
        }
        finally {
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
    const switchTenant = useCallback((tenant) => {
        setCurrentTenantState(tenant);
        setStoredTenant(tenant);
        if (tenant?.id) {
            api.defaults.headers.common['X-Tenant-ID'] = tenant.id;
        }
        window.dispatchEvent(new CustomEvent('sistema-agro:tenant-changed'));
    }, []);
    return (_jsx(TenantContext.Provider, { value: { currentTenant, tenantList, loadingTenants, switchTenant, refreshTenants }, children: children }));
};
export const useTenantContext = () => {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenantContext must be used within a TenantProvider');
    }
    return context;
};
