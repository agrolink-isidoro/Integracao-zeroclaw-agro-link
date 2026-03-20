/**
 * useTenant — hook de conveniência para acesso ao TenantContext.
 *
 * Uso:
 *   const { currentTenant, isSuperuser, switchTenant } = useTenant();
 */
import { useTenantContext } from '../contexts/TenantContext';
import { useAuthContext } from '../contexts/AuthContext';
export function useTenant() {
    const { currentTenant, tenantList, loadingTenants, switchTenant, refreshTenants } = useTenantContext();
    const { user } = useAuthContext();
    const isSuperuser = !!user?.is_superuser || !!user?.is_staff;
    return {
        /** Tenant ativo atual */
        currentTenant,
        /** Nome amigável do tenant ativo */
        tenantName: currentTenant?.nome ?? null,
        /** Slug do tenant ativo */
        tenantSlug: currentTenant?.slug ?? null,
        /** UUID do tenant ativo */
        tenantId: currentTenant?.id ?? null,
        /** Lista de tenants disponíveis (somente superusers/admins) */
        tenantList,
        /** Está carregando a lista de tenants */
        loadingTenants,
        /** Troca o tenant ativo (somente superusers) */
        switchTenant,
        /** Recarrega a lista de tenants */
        refreshTenants,
        /** Se o usuário é superuser (com acesso a todos os tenants) */
        isSuperuser,
        /** Verifica se um módulo está habilitado no tenant atual */
        isModuleEnabled: (moduleName) => currentTenant?.modulos_habilitados?.includes(moduleName) ?? true,
    };
}
export default useTenant;
