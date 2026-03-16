import api from './api';
class LocalizacoesService {
    // ========================================
    // LOCALIZAÇÕES
    // ========================================
    async listar(filters) {
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
    async obter(id) {
        const response = await api.get(`/estoque/localizacoes/${id}/`);
        return response.data;
    }
    async criar(data) {
        const response = await api.post('/estoque/localizacoes/', data);
        return response.data;
    }
    async atualizar(id, data) {
        const response = await api.put(`/estoque/localizacoes/${id}/`, data);
        return response.data;
    }
    async atualizarParcial(id, data) {
        const response = await api.patch(`/estoque/localizacoes/${id}/`, data);
        return response.data;
    }
    async deletar(id) {
        await api.delete(`/estoque/localizacoes/${id}/`);
    }
    // ========================================
    // CUSTOM ACTIONS - LOCALIZAÇÕES
    // ========================================
    async obterSaldos(id) {
        const response = await api.get(`/estoque/localizacoes/${id}/saldos/`);
        return response.data;
    }
    async obterHistorico(id) {
        const response = await api.get(`/estoque/localizacoes/${id}/historico/`);
        return response.data;
    }
    async obterRelatorio() {
        const response = await api.get('/estoque/localizacoes/relatorio/');
        return response.data;
    }
    // ========================================
    // PRODUTOS ARMAZENADOS
    // ========================================
    async listarProdutosArmazenados(filters) {
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
    async obterProdutoArmazenado(id) {
        const response = await api.get(`/estoque/produtos-armazenados/${id}/`);
        return response.data;
    }
    async criarProdutoArmazenado(data) {
        const response = await api.post('/estoque/produtos-armazenados/', data);
        return response.data;
    }
    async atualizarProdutoArmazenado(id, data) {
        const response = await api.patch(`/estoque/produtos-armazenados/${id}/`, data);
        return response.data;
    }
    async deletarProdutoArmazenado(id) {
        await api.delete(`/estoque/produtos-armazenados/${id}/`);
    }
    // ========================================
    // MOVIMENTAÇÃO ENTRE LOCALIZAÇÕES
    // ========================================
    async movimentarEntreLocalizacoes(data) {
        const response = await api.post('/estoque/produtos-armazenados/movimentar/', data);
        return response.data;
    }
    async consultarSaldo(params) {
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
