import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
const PERMISSIONS_KEY = 'sistema_agro_permissions';
function getStoredPermissions() {
    try {
        const raw = localStorage.getItem(PERMISSIONS_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
function setStoredPermissions(perms) {
    try {
        if (perms)
            localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));
        else
            localStorage.removeItem(PERMISSIONS_KEY);
    }
    catch { /* ignore */ }
}
/**
 * Hook that provides RBAC permission checks for the current user.
 *
 * Permissions are loaded from the login response (stored in localStorage)
 * and from the user profile. Superusers bypass all checks.
 */
export function useRBAC() {
    const { user } = useAuthContext();
    const [permissions, setPermissions] = useState(() => getStoredPermissions() || {});
    // Load permissions from login response user data
    useEffect(() => {
        if (!user) {
            setPermissions({});
            setStoredPermissions(null);
            return;
        }
        // Permissions come from the login response stored in localStorage
        try {
            const raw = localStorage.getItem('sistema_agro_user');
            if (raw) {
                const stored = JSON.parse(raw);
                if (stored?.permissions && typeof stored.permissions === 'object') {
                    setPermissions(stored.permissions);
                    setStoredPermissions(stored.permissions);
                    return;
                }
            }
        }
        catch { /* ignore */ }
        // Fallback: use whatever we have stored
        const stored = getStoredPermissions();
        if (stored)
            setPermissions(stored);
    }, [user]);
    const isSuperuser = useMemo(() => {
        // Helper that tests a parsed user object for owner-level access
        const isOwnerLevel = (u) => !!u?.is_superuser ||
            u?.is_staff === true ||
            (typeof u?.cargo === 'string' &&
                ['proprietário', 'proprietario', 'owner', 'admin'].includes(u.cargo.trim().toLowerCase()));
        // Check from live user object first
        if (user && isOwnerLevel(user))
            return true;
        // Check from stored user data (covers page-reload before profile fetch)
        try {
            const raw = localStorage.getItem('sistema_agro_user');
            if (raw) {
                const stored = JSON.parse(raw);
                if (isOwnerLevel(stored))
                    return true;
            }
        }
        catch { /* ignore */ }
        return false;
    }, [user]);
    /**
     * Check if current user has a specific permission level on a module.
     * Superusers always return true.
     */
    const hasPermission = useCallback((module, level = 'can_view') => {
        if (isSuperuser)
            return true;
        return !!permissions[module]?.[level];
    }, [permissions, isSuperuser]);
    /**
     * Check if user can view a module.
     */
    const canView = useCallback((module) => hasPermission(module, 'can_view'), [hasPermission]);
    /**
     * Check if user can edit in a module.
     */
    const canEdit = useCallback((module) => hasPermission(module, 'can_edit'), [hasPermission]);
    /**
     * Check if user can respond (approve/reject) in a module.
     */
    const canRespond = useCallback((module) => hasPermission(module, 'can_respond'), [hasPermission]);
    /**
     * Check if the current user has access to user management.
     */
    const isAdmin = useMemo(() => isSuperuser || hasPermission('user_management', 'can_view'), [isSuperuser, hasPermission]);
    /**
     * Get the list of modules the user can view (for sidebar filtering).
     */
    const visibleModules = useMemo(() => {
        if (isSuperuser) {
            return [
                'dashboard', 'fazendas', 'agricultura', 'pecuaria', 'estoque',
                'maquinas', 'financeiro', 'administrativo', 'fiscal', 'comercial',
                'user_management', 'actions',
            ];
        }
        const modules = ['dashboard']; // Dashboard always visible
        for (const [mod, flags] of Object.entries(permissions)) {
            if (flags?.can_view && mod !== 'dashboard') {
                modules.push(mod);
            }
        }
        // Administrativo is always visible if user has any permission (it's their profile area)
        if (!modules.includes('administrativo')) {
            modules.push('administrativo');
        }
        return modules;
    }, [permissions, isSuperuser]);
    /**
     * Update stored permissions (called after login or profile refresh).
     */
    const updatePermissions = useCallback((newPerms) => {
        setPermissions(newPerms);
        setStoredPermissions(newPerms);
    }, []);
    return {
        permissions,
        isSuperuser,
        isAdmin,
        hasPermission,
        canView,
        canEdit,
        canRespond,
        visibleModules,
        updatePermissions,
    };
}
