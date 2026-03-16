import api from './api';
/**
 * Serviço de KPIs de Safra — usa a instância axios `api` com JWT e baseURL /api/.
 */
const KpisService = {
    /** Busca KPIs agregados de uma safra (plantio) */
    async getSafraKPIs(safraId) {
        const response = await api.get(`/agricultura/plantios/${safraId}/kpis/`);
        return response.data;
    },
    /** Lista safras (plantios) para o seletor */
    async listSafras() {
        const response = await api.get('/agricultura/plantios/');
        // Normalize paginated DRF response
        const data = response.data;
        return data.results ?? data;
    },
};
export default KpisService;
