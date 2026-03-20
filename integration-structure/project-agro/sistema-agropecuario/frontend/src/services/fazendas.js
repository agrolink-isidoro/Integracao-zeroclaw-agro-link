import api from './api';
export const fazendasService = {
    // Proprietários
    async getProprietarios() {
        const response = await api.get('/proprietarios/');
        return response.data;
    },
    async getProprietario(id) {
        const response = await api.get(`/proprietarios/${id}/`);
        return response.data;
    },
    async createProprietario(data) {
        const response = await api.post('/proprietarios/', data);
        return response.data;
    },
    async updateProprietario(id, data) {
        const response = await api.put(`/proprietarios/${id}/`, data);
        return response.data;
    },
    async deleteProprietario(id) {
        await api.delete(`/proprietarios/${id}/`);
    },
    // Fazendas
    async getFazendas() {
        const response = await api.get('/fazendas/');
        return response.data;
    },
    async getFazenda(id) {
        const response = await api.get(`/fazendas/${id}/`);
        return response.data;
    },
    async createFazenda(data) {
        const response = await api.post('/fazendas/', data);
        return response.data;
    },
    async updateFazenda(id, data) {
        const response = await api.put(`/fazendas/${id}/`, data);
        return response.data;
    },
    async deleteFazenda(id) {
        await api.delete(`/fazendas/${id}/`);
    },
    // Áreas
    async getAreas(fazendaId) {
        const url = fazendaId ? `/areas/?fazenda=${fazendaId}` : '/areas/';
        const response = await api.get(url);
        return response.data;
    },
    async getArea(id) {
        const response = await api.get(`/areas/${id}/`);
        return response.data;
    },
    async createArea(data) {
        const response = await api.post('/areas/', data);
        return response.data;
    },
    async updateArea(id, data) {
        const response = await api.put(`/areas/${id}/`, data);
        return response.data;
    },
    async deleteArea(id) {
        await api.delete(`/areas/${id}/`);
    },
    // Talhões
    async getTalhoes(fazendaId) {
        const url = fazendaId ? `/talhoes/?fazenda=${fazendaId}` : '/talhoes/';
        const response = await api.get(url);
        return response.data;
    },
    async getTalhao(id) {
        const response = await api.get(`/talhoes/${id}/`);
        return response.data;
    },
    async createTalhao(data) {
        const response = await api.post('/talhoes/', data);
        return response.data;
    },
    async updateTalhao(id, data) {
        const response = await api.put(`/talhoes/${id}/`, data);
        return response.data;
    },
    async deleteTalhao(id) {
        await api.delete(`/talhoes/${id}/`);
    },
    // Arrendamentos
    async getArrendamentos(fazendaId) {
        const url = fazendaId ? `/arrendamentos/?fazenda=${fazendaId}` : '/arrendamentos/';
        const response = await api.get(url);
        return response.data;
    },
    async getArrendamento(id) {
        const response = await api.get(`/arrendamentos/${id}/`);
        return response.data;
    },
    async createArrendamento(data) {
        const response = await api.post('/arrendamentos/', data);
        return response.data;
    },
    async updateArrendamento(id, data) {
        const response = await api.put(`/arrendamentos/${id}/`, data);
        return response.data;
    },
    async deleteArrendamento(id) {
        await api.delete(`/arrendamentos/${id}/`);
    },
    // Cotações de Saca
    async getCotacoesSaca() {
        const response = await api.get('/cotacoes-saca/');
        return response.data;
    },
    async createCotacaoSaca(data) {
        const response = await api.post('/cotacoes-saca/', data);
        return response.data;
    },
    // Documentos de Arrendamento
    async getDocumentosArrendamento(filters) {
        let url = '/documentos-arrendamento/';
        const params = new URLSearchParams();
        if (filters?.fazenda)
            params.append('fazenda', filters.fazenda.toString());
        if (filters?.arrendador)
            params.append('arrendador', filters.arrendador.toString());
        if (filters?.arrendatario)
            params.append('arrendatario', filters.arrendatario.toString());
        if (filters?.status)
            params.append('status', filters.status);
        if (params.toString())
            url += `?${params.toString()}`;
        const response = await api.get(url);
        return response.data;
    },
    async getDocumentoArrendamento(id) {
        const response = await api.get(`/documentos-arrendamento/${id}/`);
        return response.data;
    },
    async createDocumentoArrendamento(data) {
        const response = await api.post('/documentos-arrendamento/', data);
        return response.data;
    },
    async updateDocumentoArrendamento(id, data) {
        const response = await api.put(`/documentos-arrendamento/${id}/`, data);
        return response.data;
    },
    async cancelarDocumentoArrendamento(id) {
        const response = await api.post(`/documentos-arrendamento/${id}/cancelar/`);
        return response.data;
    },
    async deleteDocumentoArrendamento(id) {
        await api.delete(`/documentos-arrendamento/${id}/`);
    },
    // Parcelas de Arrendamento
    async getParcelasArrendamento(documentoId) {
        const url = documentoId
            ? `/parcelas-arrendamento/?documento=${documentoId}`
            : '/parcelas-arrendamento/';
        const response = await api.get(url);
        return response.data;
    },
    async getParcelaArrendamento(id) {
        const response = await api.get(`/parcelas-arrendamento/${id}/`);
        return response.data;
    },
};
