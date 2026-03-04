import api from './api';
import type {
  Vencimento,
  RateioCusto,
  RateioApproval,
  Financiamento,
  ParcelaFinanciamento,
  Emprestimo,
  ParcelaEmprestimo,
  ResumoFinanceiro,
  FiltrosFinanceiro
} from '../types/financeiro';

class FinanceiroService {
  // ==================== VENCIMENTOS ====================

  async getVencimentos(filtros?: FiltrosFinanceiro): Promise<Vencimento[]> {
    try {
      const params = new URLSearchParams();

      if (filtros) {
        if (filtros.status?.length) params.append('status', filtros.status.join(','));
        if (filtros.tipo?.length) params.append('tipo', filtros.tipo.join(','));
        if (filtros.talhao?.length) params.append('talhao', filtros.talhao.join(','));
        if (filtros.data_inicio) params.append('data_vencimento__gte', filtros.data_inicio);
        if (filtros.data_fim) params.append('data_vencimento__lte', filtros.data_fim);
        if (filtros.busca) params.append('search', filtros.busca);
        if (filtros.page_size) params.append('page_size', String(filtros.page_size));
      }

      // Default page_size if not specified
      if (!filtros?.page_size) {
        params.append('page_size', '1000');
      }

      const response = await api.get(`/financeiro/vencimentos/?${params}`);
      // Handle both paginated and non-paginated responses
      return Array.isArray(response.data) ? response.data : (response.data.results || []);
    } catch (error) {
      console.error('Erro ao buscar vencimentos:', error);
      throw error;
    }
  }

  async getVencimentoById(id: number): Promise<Vencimento> {
    try {
      const response = await api.get(`/financeiro/vencimentos/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar vencimento:', error);
      throw error;
    }
  }

  async createVencimento(vencimento: Omit<Vencimento, 'id' | 'criado_em' | 'atualizado_em' | 'dias_atraso' | 'valor_pago'>): Promise<Vencimento> {
    try {
      const response = await api.post('/financeiro/vencimentos/', vencimento);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar vencimento:', error);
      throw error;
    }
  }

  async updateVencimento(id: number, vencimento: Partial<Vencimento>): Promise<Vencimento> {
    try {
      const response = await api.patch(`/financeiro/vencimentos/${id}/`, vencimento);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar vencimento:', error);
      throw error;
    }
  }

  async deleteVencimento(id: number): Promise<void> {
    try {
      await api.delete(`/financeiro/vencimentos/${id}/`);
    } catch (error) {
      console.error('Erro ao deletar vencimento:', error);
      throw error;
    }
  }

  async marcarVencimentoPago(id: number, dataPagamento?: string): Promise<Vencimento> {
    try {
      const response = await api.post(`/financeiro/vencimentos/${id}/marcar_pago/`, {
        data_pagamento: dataPagamento
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar vencimento como pago:', error);
      throw error;
    }
  }

  async quitarVencimento(id: number, payload: { valor_pago?: number; conta_id?: number; data_pagamento?: string; reconciliar?: boolean }): Promise<any> {
    try {
      const response = await api.post(`/financeiro/vencimentos/${id}/quitar/`, payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao quitar vencimento:', error);
      throw error;
    }
  }

  async bulkQuitarVencimentos(ids: number[], payload: { conta_id?: number; data_pagamento?: string; reconciliar?: boolean }): Promise<any> {
    try {
      const body = { ids, ...payload };
      const response = await api.post('/financeiro/vencimentos/bulk_quitar/', body);
      return response.data;
    } catch (error) {
      console.error('Erro ao quitar vencimentos em lote:', error);
      throw error;
    }
  }

  async marcarVencimentoAtrasado(id: number): Promise<Vencimento> {
    try {
      const response = await api.post(`/financeiro/vencimentos/${id}/marcar_atrasado/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar vencimento como atrasado:', error);
      throw error;
    }
  }

  async getResumoFinanceiro(dataReferencia?: string): Promise<ResumoFinanceiro> {
    try {
      const params = dataReferencia ? `?data=${dataReferencia}` : '';
      const response = await api.get(`/financeiro/vencimentos/resumo_financeiro/${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar resumo financeiro:', error);
      throw error;
    }
  }

  // LISTAR LANÇAMENTOS (Livro Caixa)
  async getLancamentos(filtros?: { conta_id?: number; data_inicio?: string; data_fim?: string; reconciled?: boolean; tipo?: string[]; page_size?: number }): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (filtros) {
        if (filtros.conta_id) params.append('conta', String(filtros.conta_id));
        if (filtros.data_inicio) params.append('data__gte', filtros.data_inicio);
        if (filtros.data_fim) params.append('data__lte', filtros.data_fim);
        if (typeof filtros.reconciled !== 'undefined') params.append('reconciled', filtros.reconciled ? 'true' : 'false');
        if (filtros.tipo && filtros.tipo.length) params.append('tipo', filtros.tipo.join(','));
        if (filtros.page_size) params.append('page_size', String(filtros.page_size));
      }
      const response = await api.get(`/financeiro/lancamentos/?${params}`);
      // server may return paginated or array
      return Array.isArray(response.data) ? response.data : response.data.results;
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
      throw error;
    }
  }

  async reconcileLancamento(id: number, reconciled: boolean) {
    try {
      const response = await api.post(`/financeiro/lancamentos/${id}/reconcile/`, { reconciled });
      return response.data;
    } catch (error) {
      console.error('Erro ao reconciliar lançamento:', error);
      throw error;
    }
  }

  async bulkMarcarVencimentosPago(ids: number[]): Promise<{ message: string; atualizados: number[] }> {
    try {
      const response = await api.post('/financeiro/vencimentos/bulk_marcar_pago/', { ids });
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar vencimentos em lote:', error);
      throw error;
    }
  }

  async atualizarStatusVencimentos(): Promise<{ message: string }> {
    try {
      const response = await api.post('/financeiro/vencimentos/atualizar_status_vencimentos/');
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar status dos vencimentos:', error);
      throw error;
    }
  }

  // ==================== RATEIOS ====================

  async getRateios(filtros?: FiltrosFinanceiro): Promise<RateioCusto[]> {
    try {
      const params = new URLSearchParams();

      if (filtros) {
        if (filtros.data_inicio) params.append('data_rateio__gte', filtros.data_inicio);
        if (filtros.data_fim) params.append('data_rateio__lte', filtros.data_fim);
        if (filtros.safra) {
          if (Array.isArray(filtros.safra)) params.append('safra', filtros.safra.join(','));
          else params.append('safra', String(filtros.safra));
        }
        if (filtros.busca) params.append('search', filtros.busca);
      }

      // return paginated results when server provides them
      const response = await api.get(`/financeiro/rateios/?${params}`);
      return Array.isArray(response.data) ? response.data : response.data.results;
    } catch (error) {
      console.error('Erro ao buscar rateios:', error);
      throw error;
    }
  }

  async getRateioById(id: number): Promise<RateioCusto> {
    try {
      const response = await api.get(`/financeiro/rateios/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar rateio:', error);
      throw error;
    }
  }

  async createRateio(rateio: Omit<RateioCusto, 'id' | 'criado_em' | 'area_total_hectares' | 'talhoes_rateio'>): Promise<RateioCusto> {
    try {
      const response = await api.post('/financeiro/rateios/', rateio);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar rateio:', error);
      throw error;
    }
  }

  async updateRateio(id: number, rateio: Partial<RateioCusto>): Promise<RateioCusto> {
    try {
      const response = await api.patch(`/financeiro/rateios/${id}/`, rateio);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar rateio:', error);
      throw error;
    }
  }

  async deleteRateio(id: number): Promise<void> {
    try {
      await api.delete(`/financeiro/rateios/${id}/`);
    } catch (error) {
      console.error('Erro ao deletar rateio:', error);
      throw error;
    }
  }

  async recalcularRateio(id: number): Promise<RateioCusto> {
    try {
      const response = await api.post(`/financeiro/rateios/${id}/recalcular/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao recalcular rateio:', error);
      throw error;
    }
  }

  async gerarVencimentoFromRateio(id: number, payload?: { data_vencimento?: string; descricao?: string }): Promise<Vencimento> {
    try {
      const response = await api.post(`/financeiro/rateios/${id}/gerar_vencimento/`, payload || {});
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar vencimento do rateio:', error);
      throw error;
    }
  }

  // ==================== RATEIO APPROVALS ====================

  async getRateioApprovals(): Promise<RateioApproval[]> {
    try {
      const response = await api.get('/financeiro/rateios-approvals/');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar aprovações de rateio:', error);
      throw error;
    }
  }

  async approveRateio(id: number, comentario?: string): Promise<{ status: string }> {
    try {
      const response = await api.post(`/financeiro/rateios-approvals/${id}/approve/`, {
        comentario
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao aprovar rateio:', error);
      throw error;
    }
  }

  async rejectRateio(id: number, comentario?: string): Promise<{ status: string }> {
    try {
      const response = await api.post(`/financeiro/rateios-approvals/${id}/reject/`, {
        comentario
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao rejeitar rateio:', error);
      throw error;
    }
  }

  // ==================== FINANCIAMENTOS ====================

  async getFinanciamentos(filtros?: FiltrosFinanceiro): Promise<Financiamento[]> {
    try {
      const params = new URLSearchParams();

      if (filtros) {
        if (filtros.status?.length) params.append('status', filtros.status.join(','));
        if (filtros.talhao?.length) params.append('talhao', filtros.talhao.join(','));
        if (filtros.data_inicio) params.append('data_contratacao__gte', filtros.data_inicio);
        if (filtros.data_fim) params.append('data_contratacao__lte', filtros.data_fim);
        if (filtros.busca) params.append('search', filtros.busca);
      }

      const response = await api.get(`/financeiro/financiamentos/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar financiamentos:', error);
      throw error;
    }
  }

  async getFinanciamentoById(id: number): Promise<Financiamento> {
    try {
      const response = await api.get(`/financeiro/financiamentos/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar financiamento:', error);
      throw error;
    }
  }

  async createFinanciamento(financiamento: Omit<Financiamento, 'id' | 'criado_em' | 'atualizado_em' | 'parcelas' | 'valor_pendente' | 'parcelas_pendentes'>): Promise<Financiamento> {
    try {
      const response = await api.post('/financeiro/financiamentos/', financiamento);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar financiamento:', error);
      throw error;
    }
  }

  async updateFinanciamento(id: number, financiamento: Partial<Financiamento>): Promise<Financiamento> {
    try {
      const response = await api.patch(`/financeiro/financiamentos/${id}/`, financiamento);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar financiamento:', error);
      throw error;
    }
  }

  async deleteFinanciamento(id: number): Promise<void> {
    try {
      await api.delete(`/financeiro/financiamentos/${id}/`);
    } catch (error) {
      console.error('Erro ao deletar financiamento:', error);
      throw error;
    }
  }

  async gerarParcelasFinanciamento(id: number): Promise<Financiamento> {
    try {
      const response = await api.post(`/financeiro/financiamentos/${id}/gerar_parcelas/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar parcelas do financiamento:', error);
      throw error;
    }
  }

  async getResumoFinanciamentos(): Promise<ResumoFinanceiro['financiamentos']> {
    try {
      const response = await api.get('/financeiro/financiamentos/resumo_financiamentos/');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar resumo de financiamentos:', error);
      throw error;
    }
  }
  // ==================== TRANSFERÊNCIAS ====================
  async getTransferencias(filtros?: { status?: string; page_size?: number }): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (filtros) {
        if (filtros.status) params.append('status', filtros.status);
        if (filtros.page_size) params.append('page_size', String(filtros.page_size));
      }
      const response = await api.get(`/financeiro/transferencias/?${params}`);
      return Array.isArray(response.data) ? response.data : response.data.results;
    } catch (error) {
      console.error('Erro ao buscar transferencias:', error);
      throw error;
    }
  }

  async marcarTransferenciaSettled(id: number, payload: { external_reference?: string; taxa_bancaria?: string; payment_metadata?: any; settlement_date?: string }): Promise<any> {
    try {
      const response = await api.post(`/financeiro/transferencias/${id}/mark_settled/`, payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar transferencia como liquidada:', error);
      throw error;
    }
  }
  // ==================== PARCELAS FINANCIAMENTO ====================

  async getParcelasFinanciamento(filtros?: FiltrosFinanceiro): Promise<ParcelaFinanciamento[]> {
    try {
      const params = new URLSearchParams();

      if (filtros) {
        if (filtros.status?.length) params.append('status', filtros.status.join(','));
        if (filtros.data_inicio) params.append('data_vencimento__gte', filtros.data_inicio);
        if (filtros.data_fim) params.append('data_vencimento__lte', filtros.data_fim);
        if (filtros.busca) params.append('search', filtros.busca);
      }

      const response = await api.get(`/financeiro/parcelas-financiamento/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar parcelas de financiamento:', error);
      throw error;
    }
  }

  async marcarParcelaFinanciamentoPago(id: number, dataPagamento?: string): Promise<ParcelaFinanciamento> {
    try {
      const response = await api.post(`/financeiro/parcelas-financiamento/${id}/marcar_pago/`, {
        data_pagamento: dataPagamento
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar parcela como paga:', error);
      throw error;
    }
  }

  // ==================== EMPRÉSTIMOS ====================

  async getEmprestimos(filtros?: FiltrosFinanceiro): Promise<Emprestimo[]> {
    try {
      const params = new URLSearchParams();

      if (filtros) {
        if (filtros.status?.length) params.append('status', filtros.status.join(','));
        if (filtros.talhao?.length) params.append('talhao', filtros.talhao.join(','));
        if (filtros.data_inicio) params.append('data_contratacao__gte', filtros.data_inicio);
        if (filtros.data_fim) params.append('data_contratacao__lte', filtros.data_fim);
        if (filtros.busca) params.append('search', filtros.busca);
      }

      const response = await api.get(`/financeiro/emprestimos/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar empréstimos:', error);
      throw error;
    }
  }

  async getEmprestimoById(id: number): Promise<Emprestimo> {
    try {
      const response = await api.get(`/financeiro/emprestimos/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar empréstimo:', error);
      throw error;
    }
  }

  async createEmprestimo(emprestimo: Omit<Emprestimo, 'id' | 'criado_em' | 'atualizado_em' | 'parcelas' | 'valor_pendente' | 'parcelas_pendentes'>): Promise<Emprestimo> {
    try {
      const response = await api.post('/financeiro/emprestimos/', emprestimo);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar empréstimo:', error);
      throw error;
    }
  }

  async updateEmprestimo(id: number, emprestimo: Partial<Emprestimo>): Promise<Emprestimo> {
    try {
      const response = await api.patch(`/financeiro/emprestimos/${id}/`, emprestimo);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar empréstimo:', error);
      throw error;
    }
  }

  async deleteEmprestimo(id: number): Promise<void> {
    try {
      await api.delete(`/financeiro/emprestimos/${id}/`);
    } catch (error) {
      console.error('Erro ao deletar empréstimo:', error);
      throw error;
    }
  }

  async gerarParcelasEmprestimo(id: number): Promise<Emprestimo> {
    try {
      const response = await api.post(`/financeiro/emprestimos/${id}/gerar_parcelas/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar parcelas do empréstimo:', error);
      throw error;
    }
  }

  async getResumoEmprestimos(): Promise<ResumoFinanceiro['emprestimos']> {
    try {
      const response = await api.get('/financeiro/emprestimos/resumo_emprestimos/');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar resumo de empréstimos:', error);
      throw error;
    }
  }

  // ==================== PARCELAS EMPRÉSTIMO ====================

  async getParcelasEmprestimo(filtros?: FiltrosFinanceiro): Promise<ParcelaEmprestimo[]> {
    try {
      const params = new URLSearchParams();

      if (filtros) {
        if (filtros.status?.length) params.append('status', filtros.status.join(','));
        if (filtros.data_inicio) params.append('data_vencimento__gte', filtros.data_inicio);
        if (filtros.data_fim) params.append('data_vencimento__lte', filtros.data_fim);
        if (filtros.busca) params.append('search', filtros.busca);
      }

      const response = await api.get(`/financeiro/parcelas-emprestimo/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar parcelas de empréstimo:', error);
      throw error;
    }
  }

  async marcarParcelaEmprestimoPago(id: number, dataPagamento?: string): Promise<ParcelaEmprestimo> {
    try {
      const response = await api.post(`/financeiro/parcelas-emprestimo/${id}/marcar_pago/`, {
        data_pagamento: dataPagamento
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar parcela como paga:', error);
      throw error;
    }
  }
}

const financeiroService = new FinanceiroService();
export default financeiroService;