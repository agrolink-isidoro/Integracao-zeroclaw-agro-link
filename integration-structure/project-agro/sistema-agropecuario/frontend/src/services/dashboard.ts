import api from './api';

// ==================== TYPES ====================

export interface AgriculturaKpis {
  kpis: {
    plantios_ativos: number;
    plantios_ano: number;
    producao_real_kg: number;
    producao_real_sacas_60kg: number;
    producao_sessoes_kg?: number;
    producao_estimada_kg: number;
    producao_estimada_sacas_60kg: number;
    colheitas_ano: number;
  };
  peso_por_talhao: Array<{
    talhao_id: number;
    talhao_nome: string;
    total_kg: number;
    total_sacas_60kg: number;
  }>;
  last_updated: string;
}

export interface FinanceiroKpis {
  kpis: {
    caixa_periodo: number;
    saldo_contas: number;
    vencimentos_proximos: { count: number; total: number };
    vencimentos_atrasados: { count: number; total: number };
    transferencias_pendentes: { count: number; total: number };
    // Optional extended KPIs (may be provided by backend)
    lucro?: number;
    ebitda?: number;
    gasto_por_hectare?: number;
    faturado_por_hectare?: number;
    financiamento_total?: number;
    emprestimos_total?: number;
  };
  fluxo_caixa_diario: Array<{
    date: string;
    entradas: number;
    saidas: number;
    saldo: number;
  }>;
  fluxo_caixa_mensal: Array<{
    date: string;
    entradas: number;
    saidas: number;
    saldo: number;
  }>;
  last_updated: string;
}

export interface EstoqueKpis {
  kpis: {
    valor_total_estoque: number;
    total_produtos: number;
    abaixo_minimo_count: number;
    abaixo_minimo_itens: Array<{
      id: number;
      nome: string;
      codigo: string;
      quantidade_estoque: number;
      estoque_minimo: number;
      unidade: string;
    }>;
    movimentacoes_7d: { entradas: number; saidas: number; total: number };
  };
  last_updated: string;
}

export interface ComercialKpis {
  kpis: {
    fornecedores_ativos: number;
    fornecedores_total: number;
    vendas_mes: { count: number; total: number };
    compras_mes: { count: number; total: number };
    contratos_vencendo_30d: number;
    contratos_ativos: number;
  };
  last_updated: string;
}

export interface AdministrativoKpis {
  kpis: {
    folha_mes: { total: number; count: number };
    despesas_administrativas_mes: { total: number; count: number };
    funcionarios: { total: number; ativos: number };
  };
  last_updated: string;
}

export interface MaquinasEquipamentosKpis {
  total_equipamentos: number;
  equipamentos_ativos: number;
  equipamentos_manutencao: number;
  custo_total_equipamentos: number;
  depreciacao_total: number;
}

export interface MaquinasAbastecimentoKpis {
  total_abastecimentos_mes: number;
  custo_total_abastecimentos_mes: number;
  consumo_medio_litros_dia: number;
}

export interface MaquinasOrdensKpis {
  total: number;
  abertas: number;
  em_andamento: number;
  concluidas: number;
  custo_total: number;
}

export interface MaquinasCategoriaItem {
  categoria__id: number;
  categoria__nome: string;
  categoria__tipo_mobilidade: string;
  total: number;
  ativos: number;
  em_manutencao: number;
  valor_total: number;
}

// ==================== SERVICE ====================

class DashboardService {
  async getAgricultura(): Promise<AgriculturaKpis> {
    const response = await api.get('/dashboard/agricultura/');
    return response.data;
  }

  async getFinanceiro(period = 30): Promise<FinanceiroKpis> {
    const response = await api.get(`/dashboard/financeiro/?period=${period}`);
    const respData: any = response.data || {};

    // Ensure `kpis` object exists
    respData.kpis = respData.kpis || {};

    // Normalization: some backend variants return totals under other keys/nested objects.
    // Map common alternatives into the standardized `kpis.financiamento_total` and `kpis.emprestimos_total`.
    if (respData.kpis.financiamento_total == null) {
      if (respData.financiamentos && typeof respData.financiamentos.total_financiado !== 'undefined') {
        respData.kpis.financiamento_total = respData.financiamentos.total_financiado;
        console.warn('dashboard.getFinanceiro: using respData.financiamentos.total_financiado for kpis.financiamento_total');
      } else if (respData.financiamentos && typeof respData.financiamentos.total_pendente !== 'undefined') {
        respData.kpis.financiamento_total = respData.financiamentos.total_pendente;
        console.warn('dashboard.getFinanceiro: using respData.financiamentos.total_pendente for kpis.financiamento_total');
      }
    }

    if (respData.kpis.emprestimos_total == null) {
      if (respData.emprestimos && typeof respData.emprestimos.total_emprestado !== 'undefined') {
        respData.kpis.emprestimos_total = respData.emprestimos.total_emprestado;
        console.warn('dashboard.getFinanceiro: using respData.emprestimos.total_emprestado for kpis.emprestimos_total');
      } else if (respData.emprestimos && typeof respData.emprestimos.total_pendente !== 'undefined') {
        respData.kpis.emprestimos_total = respData.emprestimos.total_pendente;
        console.warn('dashboard.getFinanceiro: using respData.emprestimos.total_pendente for kpis.emprestimos_total');
      }
    }

    return respData as FinanceiroKpis;
  }

  async getEstoque(): Promise<EstoqueKpis> {
    const response = await api.get('/dashboard/estoque/');
    return response.data;
  }

  async getComercial(): Promise<ComercialKpis> {
    const response = await api.get('/dashboard/comercial/');
    return response.data;
  }

  async getAdministrativo(): Promise<AdministrativoKpis> {
    const response = await api.get('/dashboard/administrativo/');
    return response.data;
  }

  async getMaquinasEquipamentos(): Promise<MaquinasEquipamentosKpis> {
    const response = await api.get('/maquinas/equipamentos/dashboard/');
    return response.data;
  }

  async getMaquinasAbastecimentos(): Promise<MaquinasAbastecimentoKpis> {
    const response = await api.get('/maquinas/abastecimentos/dashboard/');
    return response.data;
  }

  async getMaquinasOrdens(): Promise<MaquinasOrdensKpis> {
    const response = await api.get('/maquinas/ordens-servico/estatisticas/');
    return response.data;
  }

  async getMaquinasCategorias(): Promise<MaquinasCategoriaItem[]> {
    const response = await api.get('/maquinas/equipamentos/por_categoria/');
    return response.data;
  }
}

export default new DashboardService();
