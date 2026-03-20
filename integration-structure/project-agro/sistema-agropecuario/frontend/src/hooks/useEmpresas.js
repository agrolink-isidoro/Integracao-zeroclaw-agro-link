import { useQuery } from '@tanstack/react-query';
import ComercialService from '@/services/comercial';
export function useEmpresas(params = {}) {
    return useQuery({
        queryKey: ['empresas', params],
        queryFn: () => ComercialService.getEmpresas(params),
        staleTime: 60 * 1000, // 1 minute
    });
}
