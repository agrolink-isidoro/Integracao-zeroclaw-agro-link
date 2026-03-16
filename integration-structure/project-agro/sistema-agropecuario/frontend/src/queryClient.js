/**
 * Instância global do QueryClient do React Query.
 *
 * Exportada aqui para que useAuth.ts possa chamar queryClient.clear()
 * ao fazer login/logout, evitando que dados cacheados de um usuário/tenant
 * vazem para a sessão do próximo usuário.
 */
import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutos
        },
    },
});
