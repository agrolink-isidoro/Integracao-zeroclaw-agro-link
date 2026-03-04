import api from './api';
import type {
  ItemExtratoBancario,
  BankStatementImport,
  ConciliacaoResult
} from '../types/financeiro';

/**
 * FASE 5: Service para conciliação bancária.
 * Integra sistema antigo (BankStatementImport) com novo (ItemExtratoBancario).
 */
class ConciliacaoService {
  // ==================== IMPORTAÇÕES BANCÁRIAS ====================

  async getBankStatementImports(conta?: number): Promise<BankStatementImport[]> {
    try {
      const params = conta ? `?conta=${conta}` : '';
      const response = await api.get(`/financeiro/bank-statements/${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar importações:', error);
      throw error;
    }
  }

  async getBankStatementImportById(id: number): Promise<BankStatementImport> {
    try {
      const response = await api.get(`/financeiro/bank-statements/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar importação:', error);
      throw error;
    }
  }

  /**
   * Concilia uma importação (converte BankTransaction → ItemExtratoBancario + matching).
   * Chamado após importação bem-sucedida.
   */
  async conciliarImportacao(importId: number): Promise<ConciliacaoResult & { itens_criados: number; itens_duplicados: number; erros: string[] }> {
    try {
      const response = await api.post(`/financeiro/bank-statements/${importId}/conciliar/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao conciliar importação:', error);
      throw error;
    }
  }

  // ==================== ITENS DE EXTRATO ====================

  async getItensExtrato(params?: {
    conta_bancaria?: number;
    conciliado?: boolean;
    tipo?: 'DEBITO' | 'CREDITO';
    data?: string;
  }): Promise<ItemExtratoBancario[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.conta_bancaria) queryParams.append('conta_bancaria', String(params.conta_bancaria));
      if (params?.conciliado !== undefined) queryParams.append('conciliado', String(params.conciliado));
      if (params?.tipo) queryParams.append('tipo', params.tipo);
      if (params?.data) queryParams.append('data', params.data);

      const response = await api.get(`/financeiro/itens-extrato/?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar itens de extrato:', error);
      throw error;
    }
  }

  async getItensPendentes(contaBancaria?: number): Promise<ItemExtratoBancario[]> {
    try {
      const params = contaBancaria ? `?conta_bancaria=${contaBancaria}` : '';
      const response = await api.get(`/financeiro/itens-extrato/pendentes/${params}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar itens pendentes:', error);
      throw error;
    }
  }

  async getItemExtratoById(id: number): Promise<ItemExtratoBancario> {
    try {
      const response = await api.get(`/financeiro/itens-extrato/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar item de extrato:', error);
      throw error;
    }
  }

  /**
   * Concilia manualmente um item de extrato com um vencimento.
   */
  async conciliarManual(itemId: number, vencimentoId: number): Promise<ItemExtratoBancario> {
    try {
      const response = await api.post(`/financeiro/itens-extrato/${itemId}/conciliar_manual/`, {
        vencimento_id: vencimentoId
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao conciliar manualmente:', error);
      throw error;
    }
  }

  /**
   * Concilia manualmente um item de extrato com uma transferência.
   */
  async conciliarComTransferencia(itemId: number, transferenciaId: number): Promise<ItemExtratoBancario> {
    try {
      const response = await api.post(`/financeiro/itens-extrato/${itemId}/conciliar_manual/`, {
        transferencia_id: transferenciaId
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao conciliar com transferência:', error);
      throw error;
    }
  }

  /**
   * Remove conciliação de um item de extrato.
   */
  async desconciliar(itemId: number): Promise<ItemExtratoBancario> {
    try {
      const response = await api.post(`/financeiro/itens-extrato/${itemId}/desconciliar/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao desconciliar:', error);
      throw error;
    }
  }

  /**
   * Deleta um item de extrato (admin/correção).
   */
  async deleteItemExtrato(id: number): Promise<void> {
    try {
      await api.delete(`/financeiro/itens-extrato/${id}/`);
    } catch (error) {
      console.error('Erro ao deletar item de extrato:', error);
      throw error;
    }
  }
}

export default new ConciliacaoService();
