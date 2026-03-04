import api from './api';
import type { 
  VendaContrato, 
  ParcelaContrato, 
  CriarContratoRequest,
  DashboardContratos 
} from '../types/estoque_maquinas';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const contratosService = {
  /**
   * Lista todos os contratos com paginação e filtros
   */
  listar: async (params?: {
    page?: number;
    status?: string;
    tipo?: string;
    cliente?: number;
    search?: string;
  }): Promise<PaginatedResponse<VendaContrato>> => {
    const response = await api.get('/comercial/vendas-contrato/', { params });
    const data = response.data;
    
    // Normalizar resposta (caso backend retorne array direto)
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
   * Busca um contrato específico por ID
   */
  buscar: async (id: number): Promise<VendaContrato> => {
    const response = await api.get(`/comercial/vendas-contrato/${id}/`);
    return response.data;
  },

  /**
   * Cria um novo contrato com geração automática de parcelas
   */
  criarComParcelas: async (dados: CriarContratoRequest): Promise<VendaContrato> => {
    const response = await api.post('/comercial/vendas-contrato/criar_com_parcelas/', dados);
    return response.data;
  },

  /**
   * Atualiza um contrato existente (apenas em rascunho)
   */
  atualizar: async (id: number, dados: Partial<VendaContrato>): Promise<VendaContrato> => {
    const response = await api.patch(`/comercial/vendas-contrato/${id}/`, dados);
    return response.data;
  },

  /**
   * Cancela um contrato e seus vencimentos
   */
  cancelar: async (id: number): Promise<VendaContrato> => {
    const response = await api.post(`/comercial/vendas-contrato/${id}/cancelar/`);
    return response.data;
  },

  /**
   * Remove um contrato (apenas rascunhos)
   */
  deletar: async (id: number): Promise<void> => {
    await api.delete(`/comercial/vendas-contrato/${id}/`);
  },

  /**
   * Obtém dados do dashboard de contratos
   */
  dashboard: async (): Promise<DashboardContratos> => {
    const response = await api.get('/comercial/vendas-contrato/dashboard/');
    return response.data;
  },

  // ===== Parcelas =====

  /**
   * Lista parcelas de um contrato
   */
  listarParcelas: async (contratoId: number): Promise<ParcelaContrato[]> => {
    const response = await api.get('/comercial/parcelas-contrato/', {
      params: { contrato: contratoId }
    });
    
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    return response.data.results || [];
  },

  /**
   * Busca parcelas vencendo nos próximos dias
   */
  parcelasVencendo: async (): Promise<ParcelaContrato[]> => {
    const dashboard = await contratosService.dashboard();
    return dashboard.parcelas_vencendo || [];
  }
};

export default contratosService;
