import api from './api';
class ProdutosService {
    async listar(filters) {
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
    async buscarSimples(query, page_size = 10) {
        const params = { search: query, page_size };
        const response = await api.get('/estoque/produtos/', { params });
        const data = response.data;
        if (Array.isArray(data))
            return data;
        // Paginated response
        return data?.results || [];
    }
    async obter(id) {
        const response = await api.get(`/estoque/produtos/${id}/`);
        return response.data;
    }
    async criar(produto) {
        const response = await api.post('/estoque/produtos/', produto);
        return response.data;
    }
    async atualizar(id, produto) {
        const response = await api.patch(`/estoque/produtos/${id}/`, produto);
        return response.data;
    }
    async deletar(id) {
        await api.delete(`/estoque/produtos/${id}/`);
    }
    // Busca inteligente por princípio ativo
    async buscarPorPrincipioAtivo(principioAtivo, filtros) {
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
    async buscarPorCategoria(categoria, filtros) {
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
    async buscarPorFornecedor(fornecedor) {
        const response = await api.get('/estoque/produtos/', {
            params: { fornecedor }
        });
        return response.data;
    }
    // Busca produtos com estoque baixo
    async buscarEstoqueBaixo() {
        const response = await api.get('/estoque/produtos/estoque-baixo/');
        return response.data;
    }
    // Busca produtos próximos ao vencimento
    async buscarProximosVencimento(dias = 30) {
        const response = await api.get('/estoque/produtos/proximos-vencimento/', {
            params: { dias }
        });
        return response.data;
    }
    // Validação de produto via NCM
    async validarPorNcm(ncm) {
        const response = await api.post('/estoque/produtos/validar-ncm/', { ncm });
        return response.data;
    }
    // Sugestões de princípio ativo
    async buscarSugestoesPrincipioAtivo(termo) {
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
    async listar() {
        const response = await api.get('/estoque/categorias/');
        return response.data;
    }
    async obter(id) {
        const response = await api.get(`/estoque/categorias/${id}/`);
        return response.data;
    }
    async criar(categoria) {
        const response = await api.post('/estoque/categorias/', categoria);
        return response.data;
    }
    async atualizar(id, categoria) {
        const response = await api.patch(`/estoque/categorias/${id}/`, categoria);
        return response.data;
    }
    async deletar(id) {
        await api.delete(`/estoque/categorias/${id}/`);
    }
}
// ========================================
// SERVICE DE LOCAIS DE ARMAZENAGEM
// ========================================
export class LocaisArmazenagemService {
    // Note: backend endpoint is `/estoque/locais-armazenamento/`
    async listar(params) {
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
    async listarComSaldo() {
        const response = await api.get('/estoque/locais-armazenamento/com-saldo/');
        const data = response.data;
        return Array.isArray(data) ? data : [];
    }
    async obter(id) {
        const response = await api.get(`/estoque/locais-armazenamento/${id}/`);
        return response.data;
    }
    async criar(local) {
        const response = await api.post('/estoque/locais-armazenamento/', local);
        return response.data;
    }
    async atualizar(id, local) {
        const response = await api.patch(`/estoque/locais-armazenamento/${id}/`, local);
        return response.data;
    }
    async deletar(id) {
        await api.delete(`/estoque/locais-armazenamento/${id}/`);
    }
}
// ========================================
// SERVICE DE MOVIMENTAÇÕES
// ========================================
class MovimentacoesService {
    async listar(produtoId, filtros) {
        const params = {};
        if (produtoId)
            params.produto = produtoId;
        if (filtros)
            Object.assign(params, filtros);
        const response = await api.get('/estoque/movimentacoes/', { params });
        return response.data;
    }
    async criar(movimentacao) {
        const response = await api.post('/estoque/movimentacoes/', movimentacao);
        return response.data;
    }
    async deletar(id) {
        await api.delete(`/estoque/movimentacoes/${id}/`);
    }
    // Relatório de movimentações
    async relatorio(dataInicio, dataFim) {
        const response = await api.get('/estoque/movimentacoes/relatorio/', {
            params: { data_inicio: dataInicio, data_fim: dataFim }
        });
        return response.data;
    }
    // List MovimentacaoStatement (audit statements)
    async listarStatements(filtros) {
        const params = {};
        if (filtros)
            Object.assign(params, filtros);
        const response = await api.get('/estoque/movimentacao-statements/', { params });
        // The global response interceptor (api.ts) normalises paginated responses:
        // it replaces response.data with the results array and stores the pagination
        // metadata (count, next, previous) in a non-enumerable response.meta property.
        // We reconstruct the paginated envelope here so callers get {count, results, …}.
        const meta = response.meta;
        if (meta) {
            return { count: meta.count, next: meta.next, previous: meta.previous, results: response.data };
        }
        // Fallback: if data is already a paginated envelope (e.g. interceptor skipped)
        const data = response.data;
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
export { produtosService, categoriasService, locaisService, movimentacoesService };
export default produtosService;
