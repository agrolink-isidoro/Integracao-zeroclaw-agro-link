import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { queryClient } from '../queryClient';
import { authService } from '../services/auth';
const STORAGE_KEY = 'sistema_agro_tokens';
const USER_KEY = 'sistema_agro_user';
const TENANT_KEY = 'sistema_agro_tenant';
export function getStoredTokens() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
export function setStoredTokens(tokens) {
    try {
        const serialized = JSON.stringify(tokens || {});
        console.debug('[Auth] Storing tokens:', { hasAccess: !!tokens?.access, hasRefresh: !!tokens?.refresh, length: serialized.length });
        localStorage.setItem(STORAGE_KEY, serialized);
        // Verify immediately
        const verify = localStorage.getItem(STORAGE_KEY);
        console.debug('[Auth] Verification read:', { exists: !!verify, matches: verify === serialized });
    }
    catch (err) {
        console.error('[Auth] Error storing tokens:', err);
    }
}
export function clearTokens() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    }
    catch { }
}
export function getStoredUser() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
export function setStoredUser(user) {
    try {
        if (user)
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        else
            localStorage.removeItem(USER_KEY);
    }
    catch { }
}
export function getStoredTenant() {
    try {
        const raw = localStorage.getItem(TENANT_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
export function setStoredTenant(tenant) {
    try {
        if (tenant)
            localStorage.setItem(TENANT_KEY, JSON.stringify(tenant));
        else
            localStorage.removeItem(TENANT_KEY);
    }
    catch { }
}
export function clearStoredTenant() {
    try {
        localStorage.removeItem(TENANT_KEY);
    }
    catch { }
}
import axios from 'axios';
export function refreshAccessToken(refresh) {
    // Use a raw axios call to avoid circular import and ensure the correct path
    // Use a relative URL so refresh works regardless of host/port mappings (docker/dev)
    return axios.post('/api/core/auth/refresh/', { refresh });
}
export default function useAuth() {
    const [user, setUser] = useState(() => getStoredUser());
    const [loading, setLoading] = useState(true);
    const setTokensAndHeader = useCallback((tokens) => {
        if (!tokens)
            return;
        console.debug('Setting tokens and header:', { hasAccess: !!tokens.access, hasRefresh: !!tokens.refresh });
        setStoredTokens(tokens);
        if (tokens.access) {
            api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
            console.debug('Authorization header set on api.defaults');
        }
    }, []);
    const logout = useCallback(async () => {
        clearTokens();
        setStoredUser(null);
        clearStoredTenant();
        delete api.defaults.headers.common['Authorization'];
        delete api.defaults.headers.common['X-Tenant-ID'];
        setUser(null);
        // Limpar cache React Query — dados do tenant anterior não devem vazar
        queryClient.clear();
        // Notifica TenantProvider para limpar currentTenant do estado React
        window.dispatchEvent(new CustomEvent('sistema-agro:tenant-changed'));
    }, []);
    const refreshToken = useCallback(async () => {
        const tokens = getStoredTokens();
        const refresh = tokens?.refresh;
        if (!refresh)
            return false;
        try {
            const resp = await refreshAccessToken(refresh);
            const { access } = resp.data;
            setTokensAndHeader({ ...(tokens || {}), access });
            return true;
        }
        catch {
            await logout();
            return false;
        }
    }, [logout, setTokensAndHeader]);
    useEffect(() => {
        const init = async () => {
            const tokens = getStoredTokens();
            const storedUser = getStoredUser();
            if (tokens?.access) {
                // We have an access token - set header and validate profile
                api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
                // Restaurar header X-Tenant-ID do localStorage
                const storedTenant = getStoredTenant();
                if (storedTenant?.id) {
                    api.defaults.headers.common['X-Tenant-ID'] = storedTenant.id;
                }
                try {
                    const profile = await authService.getCurrentUser();
                    // Validate profile - backend sometimes returns a 200-with-error payload (e.g., { code: 403 })
                    const hasValidUser = profile && (typeof profile === 'object') && (('id' in profile) || ('username' in profile) || ('email' in profile));
                    if (!hasValidUser || profile?.code === 403) {
                        console.debug('useAuth: invalid profile payload, attempting token refresh', profile);
                        await refreshToken();
                    }
                    else {
                        setUser(profile);
                        // Atualizar tenant do perfil fresco
                        const freshTenant = profile?.tenant_info || null;
                        setStoredTenant(freshTenant);
                        if (freshTenant?.id) {
                            api.defaults.headers.common['X-Tenant-ID'] = freshTenant.id;
                        }
                    }
                }
                catch (err) {
                    console.debug('useAuth: error fetching profile, attempting refresh', err);
                    await refreshToken();
                }
            }
            else if (storedUser) {
                // We have a stored user but no tokens - try to refresh before allowing the app to render
                console.debug('useAuth: stored user exists but no tokens; attempting refresh');
                const ok = await refreshToken();
                if (!ok) {
                    // refresh failed -> clear stored user to avoid false-positive isAuthenticated and redirect to login
                    clearTokens();
                    setStoredUser(null);
                    setUser(null);
                    if (typeof window !== 'undefined')
                        window.location.href = '/login';
                }
                else {
                    // refresh success will have set tokens and api header; fetch profile
                    try {
                        const profile = await authService.getCurrentUser();
                        setUser(profile);
                    }
                    catch (err) {
                        console.debug('useAuth: error fetching profile after refresh', err);
                        // best effort - leave user null
                        setUser(null);
                    }
                }
            }
            setLoading(false);
        };
        init();
    }, [refreshToken]);
    // isAuthenticated should be true only when we have a user *and* an access token
    const isAuthenticated = !!user && !!getStoredTokens()?.access;
    const login = useCallback(async (username, password) => {
        try {
            const data = { username, password };
            console.debug('[Auth] attempting login with', data);
            const resp = await authService.login(data);
            console.debug('Login response:', resp);
            const { access, refresh, user: userData } = resp;
            if (!access || !refresh) {
                console.error('Login response missing tokens:', { access: !!access, refresh: !!refresh });
                return { success: false, error: 'Resposta de login inválida (tokens ausentes)' };
            }
            setTokensAndHeader({ access, refresh });
            setStoredUser(userData || null);
            setUser(userData || null);
            // Salvar informações do tenant para injeção nos headers das requisições
            const tenantInfo = userData?.tenant_info || null;
            setStoredTenant(tenantInfo);
            // SEMPRE atualizar (ou remover) o header em memória — evita que o tenant
            // de uma sessão anterior vaze para a sessão do novo usuário.
            if (tenantInfo?.id) {
                api.defaults.headers.common['X-Tenant-ID'] = tenantInfo.id;
            }
            else {
                delete api.defaults.headers.common['X-Tenant-ID'];
            }
            // Limpar cache React Query — dados cacheados do tenant anterior não devem
            // aparecer para o novo usuário.
            queryClient.clear();
            // Notifica TenantProvider para sincronizar estado React com novo tenant
            window.dispatchEvent(new CustomEvent('sistema-agro:tenant-changed'));
            // Ensure CSRF cookie exists for subsequent multipart/form-data posts
            try {
                await api.get('/core/csrf/');
                console.debug('[Auth] Ensured CSRF cookie via /core/csrf/');
            }
            catch (e) {
                console.warn('[Auth] Failed to ensure CSRF cookie (non-fatal)', e);
            }
            console.debug('Login successful, tokens stored');
            return { success: true };
        }
        catch (err) {
            const e = err;
            console.error('Login error (status', e?.response?.status, '):', e?.response?.data);
            let message = 'Erro ao autenticar';
            if (e?.response?.status === 400) {
                message = 'Credenciais inválidas';
            }
            return { success: false, error: message };
        }
    }, [setTokensAndHeader]);
    const register = useCallback(async (username, email, password) => {
        try {
            const resp = await api.post('/core/auth/register/', { username, email, password });
            const { access, refresh, user: userData } = resp.data;
            setTokensAndHeader({ access, refresh });
            setStoredUser(userData || null);
            setUser(userData || null);
            return { success: true };
        }
        catch (err) {
            const e = err;
            return { success: false, error: e?.response?.data?.detail || 'Erro ao registrar' };
        }
    }, [setTokensAndHeader]);
    // Debug helper - expor no window para debugging
    if (typeof window !== 'undefined') {
        window.debugAuth = () => {
            const tokens = getStoredTokens();
            const userData = getStoredUser();
            console.log('=== DEBUG AUTH ===');
            console.log('Tokens in localStorage:', tokens);
            console.log('User in localStorage:', userData);
            console.log('Auth header:', api.defaults.headers.common['Authorization']);
            console.log('Current user state:', user);
            return { tokens, userData, header: api.defaults.headers.common['Authorization'], user };
        };
    }
    return {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        register,
        refreshToken,
    };
}
