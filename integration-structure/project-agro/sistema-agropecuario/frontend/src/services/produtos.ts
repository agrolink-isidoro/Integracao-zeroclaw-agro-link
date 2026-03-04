import api from './api';
import type { Produto, MovimentacaoEstoque, CategoriaProduto, LocalArmazenagem } from '../types/estoque_maquinas';

// ========================================
// SERVICE DE PRODUTOS
// ========================================

export interface ProdutoFilters {
  search?: string;
  categoria?: string;
  principio_ativo?: string;
  fornecedor?: string;
  status?: string;
  ativo?: boolean;
  local_armazenamento?: number | string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface ProdutoResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Produto[];
}

class ProdutosService {
  async listar(filters?: ProdutoFilters): Promise<ProdutoResponse> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await api.get(`/estoque/produtos/?${params}`);
    const data = response.data;
    // Normalize backend responses: older endpoints sometimes return an array
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

  // Simple search for product suggestions (used by autocomplete)
  async buscarSimples(query: string, page_size = 10): Promise<Produto[]> {
    const params: any = { search: query, page_size };
    const response = await api.get('/estoque/produtos/', { params });
    const data = response.data;
    if (Array.isArray(data)) return data;
    // Paginated response
    return data?.results || [];
  }




  async obter(id: number): Promise<Produto> {
    const response = await api.get(`/estoque/produtos/${id}/`);
    return response.data;
  }

  async criar(produto: Omit<Produto, 'id'>): Promise<Produto> {
    const response = await api.post('/estoque/produtos/', produto);
    return response.data;
  }

  async atualizar(id: number, produto: Partial<Produto>): Promise<Produto> {
    const response = await api.patch(`/estoque/produtos/${id}/`, produto);
    return response.data;
  }

  async deletar(id: number): Promise<void> {
    await api.delete(`/estoque/produtos/${id}/`);
  }

  // Busca inteligente por princípio ativo
  async buscarPorPrincipioAtivo(principioAtivo: string, filtros?: Omit<ProdutoFilters, 'principio_ativo'>): Promise<ProdutoResponse> {
    const params = new URLSearchParams();
    params.append('principio_ativo', principioAtivo);

    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await api.get(`/estoque/produtos/busca-inteligente/?${params}`);
    return response.data;
  }

  // Busca por categoria
  async buscarPorCategoria(categoria: string, filtros?: Omit<ProdutoFilters, 'categoria'>): Promise<ProdutoResponse> {
    const params = new URLSearchParams();
    params.append('categoria', categoria);

    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await api.get(`/estoque/produtos/?${params}`);
    return response.data;
  }

  // Busca por fornecedor
  async buscarPorFornecedor(fornecedor: string): Promise<ProdutoResponse> {
    const response = await api.get('/estoque/produtos/', {
      params: { fornecedor }
    });
    return response.data;
  }

  // Busca produtos com estoque baixo
  async buscarEstoqueBaixo(): Promise<Produto[]> {
    const response = await api.get('/estoque/produtos/estoque-baixo/');
    return response.data;
  }

  // Busca produtos próximos ao vencimento
  async buscarProximosVencimento(dias: number = 30): Promise<Produto[]> {
    const response = await api.get('/estoque/produtos/proximos-vencimento/', {
      params: { dias }
    });
    return response.data;
  }

  // Validação de produto via NCM
  async validarPorNcm(ncm: string): Promise<{
    categoria_sugerida: string;
    validacao: boolean;
    mensagem: string;
  }> {
    const response = await api.post('/estoque/produtos/validar-ncm/', { ncm });
    return response.data;
  }

  // Sugestões de princípio ativo
  async buscarSugestoesPrincipioAtivo(termo: string): Promise<string[]> {
    const response = await api.get('/estoque/produtos/sugestoes-principio/', {
      params: { termo }
    });
    return response.data;
  }
}

// ========================================
// SERVICE DE CATEGORIAS
// ========================================

class CategoriasService {
  async listar(): Promise<CategoriaProduto[]> {
    const response = await api.get('/estoque/categorias/');
    return response.data;
  }

  async obter(id: number): Promise<CategoriaProduto> {
    const response = await api.get(`/estoque/categorias/${id}/`);
    return response.data;
  }

  async criar(categoria: Omit<CategoriaProduto, 'id'>): Promise<CategoriaProduto> {
    const response = await api.post('/estoque/categorias/', categoria);
    return response.data;
  }

  async atualizar(id: number, categoria: Partial<CategoriaProduto>): Promise<CategoriaProduto> {
    const response = await api.patch(`/estoque/categorias/${id}/`, categoria);
    return response.data;
  }

  async deletar(id: number): Promise<void> {
    await api.delete(`/estoque/categorias/${id}/`);
  }
}

// ========================================
// SERVICE DE LOCAIS DE ARMAZENAGEM
// ========================================

export class LocaisArmazenagemService {
  // Note: backend endpoint is `/estoque/locais-armazenamento/`
  async listar(params?: { fazenda?: number; ativo?: boolean }): Promise<LocalArmazenagem[]> {
    const response = await api.get('/estoque/locais-armazenamento/', { params });
    // Backend returns paginated response {count, next, previous, results}
    const data = response.data;
    if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
      return data.results;
    }
    // Fallback for direct array response
    return Array.isArray(data) ? data : [];
  }

  /** Retorna apenas locais que têm produtos com saldo > 0 (filtráveis na listagem). */
  async listarComSaldo(): Promise<LocalArmazenagem[]> {
    const response = await api.get('/estoque/locais-armazenamento/com-saldo/');
    const data = response.data;
    return Array.isArray(data) ? data : [];
  }

  async obter(id: number): Promise<LocalArmazenagem> {
    const response = await api.get(`/estoque/locais-armazenamento/${id}/`);
    return response.data;
  }

  async criar(local: Omit<LocalArmazenagem, 'id'>): Promise<LocalArmazenagem> {
    const response = await api.post('/estoque/locais-armazenamento/', local);
    return response.data;
  }

  async atualizar(id: number, local: Partial<LocalArmazenagem>): Promise<LocalArmazenagem> {
    const response = await api.patch(`/estoque/locais-armazenamento/${id}/`, local);
    return response.data;
  }

  async deletar(id: number): Promise<void> {
    await api.delete(`/estoque/locais-armazenamento/${id}/`);
  }
}

// ========================================
// SERVICE DE MOVIMENTAÇÕES
// ========================================

class MovimentacoesService {
  async listar(produtoId?: number, filtros?: { tipo?: string; data_inicio?: string; data_fim?: string }): Promise<MovimentacaoEstoque[]> {
    const params: any = {};
    if (produtoId) params.produto = produtoId;
    if (filtros) Object.assign(params, filtros);

    const response = await api.get('/estoque/movimentacoes/', { params });
    return response.data;
  }

  async criar(movimentacao: Omit<MovimentacaoEstoque, 'id'>): Promise<MovimentacaoEstoque> {
    const response = await api.post('/estoque/movimentacoes/', movimentacao);
    return response.data;
  }

  async deletar(id: number): Promise<void> {
    await api.delete(`/estoque/movimentacoes/${id}/`);
  }

  // Relatório de movimentações
  async relatorio(dataInicio: string, dataFim: string): Promise<MovimentacaoEstoque[]> {
    const response = await api.get('/estoque/movimentacoes/relatorio/', {
      params: { data_inicio: dataInicio, data_fim: dataFim }
    });
    return response.data;
  }

  // List MovimentacaoStatement (audit statements)
  async listarStatements(filtros?: { produto?: number; tipo?: string; data_inicio?: string; data_fim?: string; page?: number; page_size?: number }): Promise<any> {
    const params: any = {};
    if (filtros) Object.assign(params, filtros);
    const response = await api.get('/estoque/movimentacao-statements/', { params });
    // The global response interceptor (api.ts) normalises paginated responses:
    // it replaces response.data with the results array and stores the pagination
    // metadata (count, next, previous) in a non-enumerable response.meta property.
    // We reconstruct the paginated envelope here so callers get {count, results, …}.
    const meta = (response as any).meta;
    if (meta) {
      return { count: meta.count, next: meta.next, previous: meta.previous, results: response.data };
    }
    // Fallback: if data is already a paginated envelope (e.g. interceptor skipped)
    const data = response.data as any;
    if (data && typeof data === 'object' && Array.isArray(data.results)) {
      return data;
    }
    // Last resort: data is a plain array
    return { count: Array.isArray(data) ? data.length : 0, results: Array.isArray(data) ? data : [] };
  }
}

const produtosService = new ProdutosService();
const categoriasService = new CategoriasService();
const locaisService = new LocaisArmazenagemService();
const movimentacoesService = new MovimentacoesService();

export {
  produtosService,
  categoriasService,
  locaisService,
  movimentacoesService
};
export default produtosService;