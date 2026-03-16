import api from './api';
const cargasService = {
    /**
     * Lista todas as cargas
     */
    listar: async (params) => {
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
    buscar: async (id) => {
        const response = await api.get(`/agricultura/movimentacoes-carga/${id}/`);
        return response.data;
    },
    /**
     * Registra chegada de carga com peso da balança
     */
    registrarChegada: async (id, dados) => {
        const response = await api.post(`/agricultura/movimentacoes-carga/${id}/registrar_chegada/`, dados);
        return response.data;
    },
    /**
     * Obtém cargas com diferenças significativas
     */
    diferencasSignificativas: async (limitePercentual = 5) => {
        const response = await api.get('/agricultura/movimentacoes-carga/diferencas_significativas/', {
            params: { limite_percentual: limitePercentual }
        });
        return response.data;
    },
    /**
     * Obtém cargas em trânsito (não reconciliadas)
     */
    emTransito: async () => {
        const response = await api.get('/agricultura/movimentacoes-carga/em_transito/');
        return response.data;
    },
    /**
     * Obtém dashboard com estatísticas
     */
    dashboard: async () => {
        const response = await api.get('/agricultura/movimentacoes-carga/dashboard/');
        return response.data;
    }
};
export default cargasService;
