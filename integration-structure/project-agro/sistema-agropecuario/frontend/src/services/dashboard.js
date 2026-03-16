import api from './api';
// ==================== SERVICE ====================
class DashboardService {
    async getAgricultura() {
        const response = await api.get('/dashboard/agricultura/');
        return response.data;
    }
    async getFinanceiro(period = 30) {
        const response = await api.get(`/dashboard/financeiro/?period=${period}`);
        const respData = response.data || {};
        // Ensure `kpis` object exists
        respData.kpis = respData.kpis || {};
        // Normalization: some backend variants return totals under other keys/nested objects.
        // Map common alternatives into the standardized `kpis.financiamento_total` and `kpis.emprestimos_total`.
        if (respData.kpis.financiamento_total == null) {
            if (respData.financiamentos && typeof respData.financiamentos.total_financiado !== 'undefined') {
                respData.kpis.financiamento_total = respData.financiamentos.total_financiado;
                console.warn('dashboard.getFinanceiro: using respData.financiamentos.total_financiado for kpis.financiamento_total');
            }
            else if (respData.financiamentos && typeof respData.financiamentos.total_pendente !== 'undefined') {
                respData.kpis.financiamento_total = respData.financiamentos.total_pendente;
                console.warn('dashboard.getFinanceiro: using respData.financiamentos.total_pendente for kpis.financiamento_total');
            }
        }
        if (respData.kpis.emprestimos_total == null) {
            if (respData.emprestimos && typeof respData.emprestimos.total_emprestado !== 'undefined') {
                respData.kpis.emprestimos_total = respData.emprestimos.total_emprestado;
                console.warn('dashboard.getFinanceiro: using respData.emprestimos.total_emprestado for kpis.emprestimos_total');
            }
            else if (respData.emprestimos && typeof respData.emprestimos.total_pendente !== 'undefined') {
                respData.kpis.emprestimos_total = respData.emprestimos.total_pendente;
                console.warn('dashboard.getFinanceiro: using respData.emprestimos.total_pendente for kpis.emprestimos_total');
            }
        }
        return respData;
    }
    async getEstoque() {
        const response = await api.get('/dashboard/estoque/');
        return response.data;
    }
    async getComercial() {
        const response = await api.get('/dashboard/comercial/');
        return response.data;
    }
    async getAdministrativo() {
        const response = await api.get('/dashboard/administrativo/');
        return response.data;
    }
    async getMaquinasEquipamentos() {
        const response = await api.get('/maquinas/equipamentos/dashboard/');
        return response.data;
    }
    async getMaquinasAbastecimentos() {
        const response = await api.get('/maquinas/abastecimentos/dashboard/');
        return response.data;
    }
    async getMaquinasOrdens() {
        const response = await api.get('/maquinas/ordens-servico/estatisticas/');
        return response.data;
    }
    async getMaquinasCategorias() {
        const response = await api.get('/maquinas/equipamentos/por_categoria/');
        return response.data;
    }
}
export default new DashboardService();
