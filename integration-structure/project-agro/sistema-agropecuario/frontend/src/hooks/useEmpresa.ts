import { useQuery } from '@tanstack/react-query';
import ComercialService from '@/services/comercial';

export function useEmpresa(id: number) {
  return useQuery({
    queryKey: ['empresa', id],
    queryFn: () => ComercialService.getEmpresaById(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useEmpresaDespesas(id: number, params = {}) {
  return useQuery({
    queryKey: ['empresa', id, 'despesas', params],
    queryFn: () => ComercialService.getEmpresaDespesas(id, params),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useEmpresaAgregados(id: number, periodo?: string) {
  return useQuery({
    queryKey: ['empresa', id, 'agregados', periodo],
    queryFn: () => ComercialService.getEmpresaAgregados(id, periodo || ''),
    enabled: !!id && !!periodo,
    staleTime: 60 * 1000,
  });
}
