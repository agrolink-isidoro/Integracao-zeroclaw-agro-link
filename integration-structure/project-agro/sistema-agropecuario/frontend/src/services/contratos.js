import api from './api';
const contratosService = {
    /**
     * Lista todos os contratos com paginação e filtros
     */
    listar: async (params) => {
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
    buscar: async (id) => {
        const response = await api.get(`/comercial/vendas-contrato/${id}/`);
        return response.data;
    },
    /**
     * Cria um novo contrato com geração automática de parcelas
     */
    criarComParcelas: async (dados) => {
        const response = await api.post('/comercial/vendas-contrato/criar_com_parcelas/', dados);
        return response.data;
    },
    /**
     * Atualiza um contrato existente (apenas em rascunho)
     */
    atualizar: async (id, dados) => {
        const response = await api.patch(`/comercial/vendas-contrato/${id}/`, dados);
        return response.data;
    },
    /**
     * Cancela um contrato e seus vencimentos
     */
    cancelar: async (id) => {
        const response = await api.post(`/comercial/vendas-contrato/${id}/cancelar/`);
        return response.data;
    },
    /**
     * Remove um contrato (apenas rascunhos)
     */
    deletar: async (id) => {
        await api.delete(`/comercial/vendas-contrato/${id}/`);
    },
    /**
     * Obtém dados do dashboard de contratos
     */
    dashboard: async () => {
        const response = await api.get('/comercial/vendas-contrato/dashboard/');
        return response.data;
    },
    // ===== Parcelas =====
    /**
     * Lista parcelas de um contrato
     */
    listarParcelas: async (contratoId) => {
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
    parcelasVencendo: async () => {
        const dashboard = await contratosService.dashboard();
        return dashboard.parcelas_vencendo || [];
    }
};
export default contratosService;
