import api from './api';
import type { 
  Localizacao, 
  ProdutoArmazenado, 
  MovimentarEntreLocalizacoes,
  TipoLocalizacao,
  StatusProdutoArmazenado
} from '../types/estoque_maquinas';

// ========================================
// SERVICE DE LOCALIZAÇÕES (FASE 1)
// ========================================

export interface LocalizacaoFilters {
  search?: string;
  tipo?: TipoLocalizacao;
  ativa?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface LocalizacaoResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Localizacao[];
}

export interface ProdutoArmazenadoFilters {
  produto?: number;
  localizacao?: number;
  lote?: string;
  status?: StatusProdutoArmazenado;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface ProdutoArmazenadoResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProdutoArmazenado[];
}

export interface SaldoPorLocalizacao {
  localizacao: number;
  localizacao_nome: string;
  produto: number;
  produto_nome: string;
  quantidade_total: number;
  lotes: Array<{
    lote: string;
    quantidade: number;
    status: StatusProdutoArmazenado;
  }>;
}

export interface HistoricoMovimentacao {
  id: number;
  data_movimentacao: string;
  tipo: string;
  produto_nome: string;
  quantidade: number;
  localizacao_origem_nome?: string;
  localizacao_destino_nome?: string;
  observacoes?: string;
}

export interface RelatorioLocalizacao {
  total_localizacoes: number;
  localizacoes_ativas: number;
  capacidade_total: number;
  capacidade_ocupada: number;
  capacidade_disponivel: number;
  percentual_ocupacao_medio: number;
  localizacoes_criticas: Localizacao[];
}

class LocalizacoesService {
  // ========================================
  // LOCALIZAÇÕES
  // ========================================

  async listar(filters?: LocalizacaoFilters): Promise<LocalizacaoResponse> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await api.get(`/estoque/localizacoes/?${params}`);
    const data = response.data;
    
    // Handle both array and paginated response formats
    if (Array.isArray(data)) {
      return {
        count: data.length,
        next: null,
        previous: null,
        results: data,
      };
    }
    
    return data;
  }

  async obter(id: number): Promise<Localizacao> {
    const response = await api.get(`/estoque/localizacoes/${id}/`);
    return response.data;
  }

  async criar(data: Partial<Localizacao>): Promise<Localizacao> {
    const response = await api.post('/estoque/localizacoes/', data);
    return response.data;
  }

  async atualizar(id: number, data: Partial<Localizacao>): Promise<Localizacao> {
    const response = await api.put(`/estoque/localizacoes/${id}/`, data);
    return response.data;
  }

  async atualizarParcial(id: number, data: Partial<Localizacao>): Promise<Localizacao> {
    const response = await api.patch(`/estoque/localizacoes/${id}/`, data);
    return response.data;
  }

  async deletar(id: number): Promise<void> {
    await api.delete(`/estoque/localizacoes/${id}/`);
  }

  // ========================================
  // CUSTOM ACTIONS - LOCALIZAÇÕES
  // ========================================

  async obterSaldos(id: number): Promise<SaldoPorLocalizacao[]> {
    const response = await api.get(`/estoque/localizacoes/${id}/saldos/`);
    return response.data;
  }

  async obterHistorico(id: number): Promise<HistoricoMovimentacao[]> {
    const response = await api.get(`/estoque/localizacoes/${id}/historico/`);
    return response.data;
  }

  async obterRelatorio(): Promise<RelatorioLocalizacao> {
    const response = await api.get('/estoque/localizacoes/relatorio/');
    return response.data;
  }

  // ========================================
  // PRODUTOS ARMAZENADOS
  // ========================================

  async listarProdutosArmazenados(filters?: ProdutoArmazenadoFilters): Promise<ProdutoArmazenadoResponse> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await api.get(`/estoque/produtos-armazenados/?${params}`);
    return response.data;
  }

  async obterProdutoArmazenado(id: number): Promise<ProdutoArmazenado> {
    const response = await api.get(`/estoque/produtos-armazenados/${id}/`);
    return response.data;
  }

  async criarProdutoArmazenado(data: Partial<ProdutoArmazenado>): Promise<ProdutoArmazenado> {
    const response = await api.post('/estoque/produtos-armazenados/', data);
    return response.data;
  }

  async atualizarProdutoArmazenado(id: number, data: Partial<ProdutoArmazenado>): Promise<ProdutoArmazenado> {
    const response = await api.patch(`/estoque/produtos-armazenados/${id}/`, data);
    return response.data;
  }

  async deletarProdutoArmazenado(id: number): Promise<void> {
    await api.delete(`/estoque/produtos-armazenados/${id}/`);
  }

  // ========================================
  // MOVIMENTAÇÃO ENTRE LOCALIZAÇÕES
  // ========================================

  async movimentarEntreLocalizacoes(data: MovimentarEntreLocalizacoes): Promise<{ message: string; movimentacao_id: number }> {
    const response = await api.post('/estoque/produtos-armazenados/movimentar/', data);
    return response.data;
  }

  async consultarSaldo(params: { produto: number; localizacao?: number }): Promise<SaldoPorLocalizacao[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('produto', String(params.produto));
    if (params.localizacao) {
      queryParams.append('localizacao', String(params.localizacao));
    }

    const response = await api.get(`/estoque/produtos-armazenados/consultar_saldo/?${queryParams}`);
    return response.data;
  }
}

export default new LocalizacoesService();
