import api from './api';
import type {
  MovimentacaoCarga,
  RegistrarChegadaRequest,
  DiferencaCarga,
  DashboardCargas
} from '../types/estoque_maquinas';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const cargasService = {
  /**
   * Lista todas as cargas
   */
  listar: async (params?: {
    page?: number;
    destino_tipo?: string;
    reconciled?: boolean;
  }): Promise<PaginatedResponse<MovimentacaoCarga>> => {
    const response = await api.get('/agricultura/movimentacoes-carga/', { params });
    const data = response.data;
    
    if (Array.isArray(data)) {
      return {
        count: data.length,
        next: null,
        previous: null,
        results: data
      };
    }
    
    return data;
  },

  /**
   * Busca uma carga específica
   */
  buscar: async (id: number): Promise<MovimentacaoCarga> => {
    const response = await api.get(`/agricultura/movimentacoes-carga/${id}/`);
    return response.data;
  },

  /**
   * Registra chegada de carga com peso da balança
   */
  registrarChegada: async (id: number, dados: RegistrarChegadaRequest): Promise<MovimentacaoCarga> => {
    const response = await api.post(`/agricultura/movimentacoes-carga/${id}/registrar_chegada/`, dados);
    return response.data;
  },

  /**
   * Obtém cargas com diferenças significativas
   */
  diferencasSignificativas: async (limitePercentual: number = 5): Promise<{
    count: number;
    limite_percentual: number;
    results: DiferencaCarga[];
  }> => {
    const response = await api.get('/agricultura/movimentacoes-carga/diferencas_significativas/', {
      params: { limite_percentual: limitePercentual }
    });
    return response.data;
  },

  /**
   * Obtém cargas em trânsito (não reconciliadas)
   */
  emTransito: async (): Promise<{
    count: number;
    results: MovimentacaoCarga[];
  }> => {
    const response = await api.get('/agricultura/movimentacoes-carga/em_transito/');
    return response.data;
  },

  /**
   * Obtém dashboard com estatísticas
   */
  dashboard: async (): Promise<DashboardCargas> => {
    const response = await api.get('/agricultura/movimentacoes-carga/dashboard/');
    return response.data;
  }
};

export default cargasService;
