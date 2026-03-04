export interface CategoryCost {
  category: string;
  total: number;
  per_ha: number;
}

export interface SafraKPIs {
  safra_id: number;
  area_ha: number;
  producao_t: number;
  producao_sacas: number;
  producao_display: number;
  unidade_producao: 'saca_60kg' | 'tonelada' | 'kg' | 'caixa';
  unidade_label: string;
  produtividade_t_ha: number;
  produtividade_display: number;
  custo_total: number;
  custo_por_ha: number;
  custo_por_ton: number;
  receita_total: number;
  preco_medio_r_ton: number;
  margem_bruta_pct: number;
  vencimentos_pendentes: number;
  rateios_pendentes: number;
  costs_by_category: CategoryCost[];
  // Dados de sessões de colheita e transportes
  producao_colheita_kg?: number;
  producao_session_kg?: number;
  custo_transporte_total?: number;
  carregamentos_count?: number;
  updated_at: string;
}
