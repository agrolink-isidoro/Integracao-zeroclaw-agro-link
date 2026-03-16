import api from './api';
class FinanceiroService {
    // ==================== VENCIMENTOS ====================
    async getVencimentos(filtros) {
        try {
            const params = new URLSearchParams();
            if (filtros) {
                if (filtros.status?.length)
                    params.append('status', filtros.status.join(','));
                if (filtros.tipo?.length)
                    params.append('tipo', filtros.tipo.join(','));
                if (filtros.talhao?.length)
                    params.append('talhao', filtros.talhao.join(','));
                if (filtros.data_inicio)
                    params.append('data_vencimento__gte', filtros.data_inicio);
                if (filtros.data_fim)
                    params.append('data_vencimento__lte', filtros.data_fim);
                if (filtros.busca)
                    params.append('search', filtros.busca);
                if (filtros.page_size)
                    params.append('page_size', String(filtros.page_size));
            }
            // Default page_size if not specified
            if (!filtros?.page_size) {
                params.append('page_size', '1000');
            }
            const response = await api.get(`/financeiro/vencimentos/?${params}`);
            // Handle both paginated and non-paginated responses
            return Array.isArray(response.data) ? response.data : (response.data.results || []);
        }
        catch (error) {
            console.error('Erro ao buscar vencimentos:', error);
            throw error;
        }
    }
    async getVencimentoById(id) {
        try {
            const response = await api.get(`/financeiro/vencimentos/${id}/`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao buscar vencimento:', error);
            throw error;
        }
    }
    async createVencimento(vencimento) {
        try {
            const response = await api.post('/financeiro/vencimentos/', vencimento);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao criar vencimento:', error);
            throw error;
        }
    }
    async updateVencimento(id, vencimento) {
        try {
            const response = await api.patch(`/financeiro/vencimentos/${id}/`, vencimento);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao atualizar vencimento:', error);
            throw error;
        }
    }
    async deleteVencimento(id) {
        try {
            await api.delete(`/financeiro/vencimentos/${id}/`);
        }
        catch (error) {
            console.error('Erro ao deletar vencimento:', error);
            throw error;
        }
    }
    async marcarVencimentoPago(id, dataPagamento) {
        try {
            const response = await api.post(`/financeiro/vencimentos/${id}/marcar_pago/`, {
                data_pagamento: dataPagamento
            });
            return response.data;
        }
        catch (error) {
            console.error('Erro ao marcar vencimento como pago:', error);
            throw error;
        }
    }
    async quitarVencimento(id, payload) {
        try {
            const response = await api.post(`/financeiro/vencimentos/${id}/quitar/`, payload);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao quitar vencimento:', error);
            throw error;
        }
    }
    async bulkQuitarVencimentos(ids, payload) {
        try {
            const body = { ids, ...payload };
            const response = await api.post('/financeiro/vencimentos/bulk_quitar/', body);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao quitar vencimentos em lote:', error);
            throw error;
        }
    }
    async marcarVencimentoAtrasado(id) {
        try {
            const response = await api.post(`/financeiro/vencimentos/${id}/marcar_atrasado/`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao marcar vencimento como atrasado:', error);
            throw error;
        }
    }
    async getResumoFinanceiro(dataReferencia) {
        try {
            const params = dataReferencia ? `?data=${dataReferencia}` : '';
            const response = await api.get(`/financeiro/vencimentos/resumo_financeiro/${params}`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao buscar resumo financeiro:', error);
            throw error;
        }
    }
    // LISTAR LANÇAMENTOS (Livro Caixa)
    async getLancamentos(filtros) {
        try {
            const params = new URLSearchParams();
            if (filtros) {
                if (filtros.conta_id)
                    params.append('conta', String(filtros.conta_id));
                if (filtros.data_inicio)
                    params.append('data__gte', filtros.data_inicio);
                if (filtros.data_fim)
                    params.append('data__lte', filtros.data_fim);
                if (typeof filtros.reconciled !== 'undefined')
                    params.append('reconciled', filtros.reconciled ? 'true' : 'false');
                if (filtros.tipo && filtros.tipo.length)
                    params.append('tipo', filtros.tipo.join(','));
                if (filtros.page_size)
                    params.append('page_size', String(filtros.page_size));
            }
            const response = await api.get(`/financeiro/lancamentos/?${params}`);
            // server may return paginated or array
            return Array.isArray(response.data) ? response.data : response.data.results;
        }
        catch (error) {
            console.error('Erro ao buscar lançamentos:', error);
            throw error;
        }
    }
    async reconcileLancamento(id, reconciled) {
        try {
            const response = await api.post(`/financeiro/lancamentos/${id}/reconcile/`, { reconciled });
            return response.data;
        }
        catch (error) {
            console.error('Erro ao reconciliar lançamento:', error);
            throw error;
        }
    }
    async bulkMarcarVencimentosPago(ids) {
        try {
            const response = await api.post('/financeiro/vencimentos/bulk_marcar_pago/', { ids });
            return response.data;
        }
        catch (error) {
            console.error('Erro ao marcar vencimentos em lote:', error);
            throw error;
        }
    }
    async atualizarStatusVencimentos() {
        try {
            const response = await api.post('/financeiro/vencimentos/atualizar_status_vencimentos/');
            return response.data;
        }
        catch (error) {
            console.error('Erro ao atualizar status dos vencimentos:', error);
            throw error;
        }
    }
    // ==================== RATEIOS ====================
    async getRateios(filtros) {
        try {
            const params = new URLSearchParams();
            if (filtros) {
                if (filtros.data_inicio)
                    params.append('data_rateio__gte', filtros.data_inicio);
                if (filtros.data_fim)
                    params.append('data_rateio__lte', filtros.data_fim);
                if (filtros.safra) {
                    if (Array.isArray(filtros.safra))
                        params.append('safra', filtros.safra.join(','));
                    else
                        params.append('safra', String(filtros.safra));
                }
                if (filtros.busca)
                    params.append('search', filtros.busca);
            }
            // return paginated results when server provides them
            const response = await api.get(`/financeiro/rateios/?${params}`);
            return Array.isArray(response.data) ? response.data : response.data.results;
        }
        catch (error) {
            console.error('Erro ao buscar rateios:', error);
            throw error;
        }
    }
    async getRateioById(id) {
        try {
            const response = await api.get(`/financeiro/rateios/${id}/`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao buscar rateio:', error);
            throw error;
        }
    }
    async createRateio(rateio) {
        try {
            const response = await api.post('/financeiro/rateios/', rateio);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao criar rateio:', error);
            throw error;
        }
    }
    async updateRateio(id, rateio) {
        try {
            const response = await api.patch(`/financeiro/rateios/${id}/`, rateio);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao atualizar rateio:', error);
            throw error;
        }
    }
    async deleteRateio(id) {
        try {
            await api.delete(`/financeiro/rateios/${id}/`);
        }
        catch (error) {
            console.error('Erro ao deletar rateio:', error);
            throw error;
        }
    }
    async recalcularRateio(id) {
        try {
            const response = await api.post(`/financeiro/rateios/${id}/recalcular/`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao recalcular rateio:', error);
            throw error;
        }
    }
    async gerarVencimentoFromRateio(id, payload) {
        try {
            const response = await api.post(`/financeiro/rateios/${id}/gerar_vencimento/`, payload || {});
            return response.data;
        }
        catch (error) {
            console.error('Erro ao gerar vencimento do rateio:', error);
            throw error;
        }
    }
    // ==================== RATEIO APPROVALS ====================
    async getRateioApprovals() {
        try {
            const response = await api.get('/financeiro/rateios-approvals/');
            return response.data;
        }
        catch (error) {
            console.error('Erro ao buscar aprovações de rateio:', error);
            throw error;
        }
    }
    async approveRateio(id, comentario) {
        try {
            const response = await api.post(`/financeiro/rateios-approvals/${id}/approve/`, {
                comentario
            });
            return response.data;
        }
        catch (error) {
            console.error('Erro ao aprovar rateio:', error);
            throw error;
        }
    }
    async rejectRateio(id, comentario) {
        try {
            const response = await api.post(`/financeiro/rateios-approvals/${id}/reject/`, {
                comentario
            });
            return response.data;
        }
        catch (error) {
            console.error('Erro ao rejeitar rateio:', error);
            throw error;
        }
    }
    // ==================== FINANCIAMENTOS ====================
    async getFinanciamentos(filtros) {
        try {
            const params = new URLSearchParams();
            if (filtros) {
                if (filtros.status?.length)
                    params.append('status', filtros.status.join(','));
                if (filtros.talhao?.length)
                    params.append('talhao', filtros.talhao.join(','));
                if (filtros.data_inicio)
                    params.append('data_contratacao__gte', filtros.data_inicio);
                if (filtros.data_fim)
                    params.append('data_contratacao__lte', filtros.data_fim);
                if (filtros.busca)
                    params.append('search', filtros.busca);
            }
            const response = await api.get(`/financeiro/financiamentos/?${params}`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao buscar financiamentos:', error);
            throw error;
        }
    }
    async getFinanciamentoById(id) {
        try {
            const response = await api.get(`/financeiro/financiamentos/${id}/`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao buscar financiamento:', error);
            throw error;
        }
    }
    async createFinanciamento(financiamento) {
        try {
            const response = await api.post('/financeiro/financiamentos/', financiamento);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao criar financiamento:', error);
            throw error;
        }
    }
    async updateFinanciamento(id, financiamento) {
        try {
            const response = await api.patch(`/financeiro/financiamentos/${id}/`, financiamento);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao atualizar financiamento:', error);
            throw error;
        }
    }
    async deleteFinanciamento(id) {
        try {
            await api.delete(`/financeiro/financiamentos/${id}/`);
        }
        catch (error) {
            console.error('Erro ao deletar financiamento:', error);
            throw error;
        }
    }
    async gerarParcelasFinanciamento(id) {
        try {
            const response = await api.post(`/financeiro/financiamentos/${id}/gerar_parcelas/`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao gerar parcelas do financiamento:', error);
            throw error;
        }
    }
    async getResumoFinanciamentos() {
        try {
            const response = await api.get('/financeiro/financiamentos/resumo_financiamentos/');
            return response.data;
        }
        catch (error) {
            console.error('Erro ao buscar resumo de financiamentos:', error);
            throw error;
        }
    }
    // ==================== TRANSFERÊNCIAS ====================
    async getTransferencias(filtros) {
        try {
            const params = new URLSearchParams();
            if (filtros) {
                if (filtros.status)
                    params.append('status', filtros.status);
                if (filtros.page_size)
                    params.append('page_size', String(filtros.page_size));
            }
            const response = await api.get(`/financeiro/transferencias/?${params}`);
            return Array.isArray(response.data) ? response.data : response.data.results;
        }
        catch (error) {
            console.error('Erro ao buscar transferencias:', error);
            throw error;
        }
    }
    async marcarTransferenciaSettled(id, payload) {
        try {
            const response = await api.post(`/financeiro/transferencias/${id}/mark_settled/`, payload);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao marcar transferencia como liquidada:', error);
            throw error;
        }
    }
    // ==================== PARCELAS FINANCIAMENTO ====================
    async getParcelasFinanciamento(filtros) {
        try {
            const params = new URLSearchParams();
            if (filtros) {
                if (filtros.status?.length)
                    params.append('status', filtros.status.join(','));
                if (filtros.data_inicio)
                    params.append('data_vencimento__gte', filtros.data_inicio);
                if (filtros.data_fim)
                    params.append('data_vencimento__lte', filtros.data_fim);
                if (filtros.busca)
                    params.append('search', filtros.busca);
            }
            const response = await api.get(`/financeiro/parcelas-financiamento/?${params}`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao buscar parcelas de financiamento:', error);
            throw error;
        }
    }
    async marcarParcelaFinanciamentoPago(id, dataPagamento) {
        try {
            const response = await api.post(`/financeiro/parcelas-financiamento/${id}/marcar_pago/`, {
                data_pagamento: dataPagamento
            });
            return response.data;
        }
        catch (error) {
            console.error('Erro ao marcar parcela como paga:', error);
            throw error;
        }
    }
    // ==================== EMPRÉSTIMOS ====================
    async getEmprestimos(filtros) {
        try {
            const params = new URLSearchParams();
            if (filtros) {
                if (filtros.status?.length)
                    params.append('status', filtros.status.join(','));
                if (filtros.talhao?.length)
                    params.append('talhao', filtros.talhao.join(','));
                if (filtros.data_inicio)
                    params.append('data_contratacao__gte', filtros.data_inicio);
                if (filtros.data_fim)
                    params.append('data_contratacao__lte', filtros.data_fim);
                if (filtros.busca)
                    params.append('search', filtros.busca);
            }
            const response = await api.get(`/financeiro/emprestimos/?${params}`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao buscar empréstimos:', error);
            throw error;
        }
    }
    async getEmprestimoById(id) {
        try {
            const response = await api.get(`/financeiro/emprestimos/${id}/`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao buscar empréstimo:', error);
            throw error;
        }
    }
    async createEmprestimo(emprestimo) {
        try {
            const response = await api.post('/financeiro/emprestimos/', emprestimo);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao criar empréstimo:', error);
            throw error;
        }
    }
    async updateEmprestimo(id, emprestimo) {
        try {
            const response = await api.patch(`/financeiro/emprestimos/${id}/`, emprestimo);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao atualizar empréstimo:', error);
            throw error;
        }
    }
    async deleteEmprestimo(id) {
        try {
            await api.delete(`/financeiro/emprestimos/${id}/`);
        }
        catch (error) {
            console.error('Erro ao deletar empréstimo:', error);
            throw error;
        }
    }
    async gerarParcelasEmprestimo(id) {
        try {
            const response = await api.post(`/financeiro/emprestimos/${id}/gerar_parcelas/`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao gerar parcelas do empréstimo:', error);
            throw error;
        }
    }
    async getResumoEmprestimos() {
        try {
            const response = await api.get('/financeiro/emprestimos/resumo_emprestimos/');
            return response.data;
        }
        catch (error) {
            console.error('Erro ao buscar resumo de empréstimos:', error);
            throw error;
        }
    }
    // ==================== PARCELAS EMPRÉSTIMO ====================
    async getParcelasEmprestimo(filtros) {
        try {
            const params = new URLSearchParams();
            if (filtros) {
                if (filtros.status?.length)
                    params.append('status', filtros.status.join(','));
                if (filtros.data_inicio)
                    params.append('data_vencimento__gte', filtros.data_inicio);
                if (filtros.data_fim)
                    params.append('data_vencimento__lte', filtros.data_fim);
                if (filtros.busca)
                    params.append('search', filtros.busca);
            }
            const response = await api.get(`/financeiro/parcelas-emprestimo/?${params}`);
            return response.data;
        }
        catch (error) {
            console.error('Erro ao buscar parcelas de empréstimo:', error);
            throw error;
        }
    }
    async marcarParcelaEmprestimoPago(id, dataPagamento) {
        try {
            const response = await api.post(`/financeiro/parcelas-emprestimo/${id}/marcar_pago/`, {
                data_pagamento: dataPagamento
            });
            return response.data;
        }
        catch (error) {
            console.error('Erro ao marcar parcela como paga:', error);
            throw error;
        }
    }
}
const financeiroService = new FinanceiroService();
export default financeiroService;
