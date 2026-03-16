import api from './api';
const operacoesService = {
    // Listar operações
    async listar(params) {
        const response = await api.get('/agricultura/operacoes/', { params });
        return response.data.results || response.data;
    },
    // Buscar operação por ID
    async buscar(id) {
        const response = await api.get(`/agricultura/operacoes/${id}/`);
        return response.data;
    },
    // Criar nova operação
    async criar(data) {
        const response = await api.post('/agricultura/operacoes/', data);
        return response.data;
    },
    // Atualizar operação
    async atualizar(id, data) {
        const response = await api.patch(`/agricultura/operacoes/${id}/`, data);
        return response.data;
    },
    // Deletar operação
    async deletar(id) {
        await api.delete(`/agricultura/operacoes/${id}/`);
    },
    // Buscar tipos por categoria (para o wizard)
    async tiposPorCategoria(categoria) {
        const response = await api.get('/agricultura/operacoes/tipos-por-categoria/', {
            params: { categoria }
        });
        return response.data;
    },
    // Estatísticas
    async estatisticas(params) {
        const response = await api.get('/agricultura/operacoes/estatisticas/', { params });
        return response.data;
    },
    // Estimar quantidades e custos com base em talhões/plantio e dosagens
    async estimate(payload) {
        const response = await api.post('/agricultura/operacoes/estimate/', payload);
        return response.data;
    },
    // Forçar contabilização de uma operação específica (Manejo/Plantio/Colheita)
    async contabilizarManejo(id) {
        const response = await api.post(`/agricultura/manejos/${id}/contabilizar/`);
        return response.data;
    },
    async contabilizarPlantio(id) {
        const response = await api.post(`/agricultura/plantios/${id}/contabilizar/`);
        return response.data;
    },
    async recalcularPlantio(id, gerarRateio = false) {
        const response = await api.post(`/agricultura/plantios/${id}/recalcular_custos/`, { gerar_rateio: gerarRateio });
        return response.data;
    },
    async contabilizarColheita(id) {
        const response = await api.post(`/agricultura/colheitas/${id}/contabilizar/`);
        return response.data;
    },
    // Categorias disponíveis (hardcoded no frontend para performance)
    getCategorias() {
        return [
            { value: 'preparacao', label: 'Preparação do Solo' },
            { value: 'adubacao', label: 'Adubação' },
            { value: 'plantio', label: 'Plantio' },
            { value: 'tratos', label: 'Tratos Culturais' },
            { value: 'pulverizacao', label: 'Pulverização (Fitossanitário)' },
            { value: 'mecanicas', label: 'Operações Mecânicas' },
        ];
    },
    // Status disponíveis (alinhado com backend Operacao.STATUS_CHOICES)
    getStatusOptions() {
        return [
            { value: 'planejada', label: 'Planejada' },
            { value: 'em_andamento', label: 'Em Andamento' },
            { value: 'concluida', label: 'Concluída' },
            { value: 'cancelada', label: 'Cancelada' },
        ];
    },
};
export default operacoesService;
