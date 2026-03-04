export interface Vencimento {
  id: number;
  titulo: string;
  descricao?: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  tipo: 'despesa' | 'receita';
  talhao?: number;
  talhao_nome?: string;
  conta_bancaria?: number;
  conta_bancaria_nome?: string;
  confirmado_extrato?: boolean;
  content_type?: number;
  object_id?: number;
  origem_tipo?: string;
  origem_descricao?: string;
  criado_por?: number;
  criado_por_nome?: string;
  criado_em: string;
  atualizado_em: string;
  dias_atraso?: number;
  valor_pago?: number;
}

export interface RateioTalhao {
  id: number;
  rateio: number;
  talhao: number;
  talhao_nome?: string;
  talhao_area?: number;
  proporcao_area: number;
  valor_rateado: number;
}

export interface RateioCusto {
  id: number;
  titulo: string;
  descricao?: string;
  valor_total: number;
  data_rateio: string;
  area_total_hectares?: number;
  talhoes: number[];
  criado_por?: number;
  criado_por_nome?: string;
  criado_em: string;
  talhoes_rateio?: RateioTalhao[];
  // New optional fields
  safra?: number;
  centro_custo?: number;
  destino?: 'operacional' | 'manutencao' | 'combustivel' | 'despesa_adm' | 'investimento' | 'benfeitoria' | 'financeiro';
  driver_de_rateio?: 'area' | 'producao' | 'horas_maquina' | 'uniforme';
  origem_display?: string;
  // Inline approval info
  approval_id?: number | null;
  approval_status?: 'pending' | 'approved' | 'rejected' | null;
  approval_aprovado_por_nome?: string | null;
  approval_aprovado_em?: string | null;
}

export interface RateioApproval {
  id: number;
  rateio: number;
  status: 'pending' | 'approved' | 'rejected';
  criado_por?: number;
  criado_em: string;
  aprovado_por?: number;
  aprovado_em?: string;
  comentario?: string;
}

export interface ParcelaFinanciamento {
  id: number;
  numero_parcela: number;
  valor_parcela: number;
  juros: number;
  amortizacao: number;
  saldo_devedor: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  financiamento: number;
}

export interface Financiamento {
  id: number;
  titulo: string;
  descricao?: string;
  valor_total: number;
  valor_entrada: number;
  valor_financiado: number;
  taxa_juros: number;
  frequencia_taxa: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  metodo_calculo: 'price' | 'sac' | 'personalizado';
  numero_parcelas: number;
  prazo_meses: number;
  data_contratacao: string;
  data_primeiro_vencimento: string;
  status: 'ativo' | 'quitado' | 'cancelado' | 'em_analise';
  tipo_financiamento: 'custeio' | 'investimento' | 'comercializacao' | 'industrializacao';
  numero_contrato?: string;
  carencia_meses?: number;
  juros_embutidos?: boolean;
  talhao?: number;
  instituicao_financeira: number;
  criado_por?: number;
  criado_em: string;
  atualizado_em: string;
  parcelas?: ParcelaFinanciamento[];
  valor_pendente?: number;
  parcelas_pendentes?: number;
}

export interface ParcelaEmprestimo {
  id: number;
  numero_parcela: number;
  valor_parcela: number;
  juros: number;
  amortizacao: number;
  saldo_devedor: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  emprestimo: number;
}

export interface ItemEmprestimo {
  id: number;
  emprestimo: number;
  produto: number;
  produto_nome: string;
  produto_unidade: string;
  quantidade: string | number;
  unidade: string;
  valor_unitario: string | number;
  valor_total: string | number;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface Emprestimo {
  id: number;
  titulo: string;
  descricao?: string;
  valor_emprestimo: number;
  valor_entrada: number;
  taxa_juros: number;
  frequencia_taxa: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  metodo_calculo: 'price' | 'sac' | 'personalizado';
  numero_parcelas: number;
  prazo_meses: number;
  data_contratacao: string;
  data_primeiro_vencimento: string;
  status: 'ativo' | 'quitado' | 'cancelado' | 'em_analise';
  tipo_emprestimo: 'pessoal' | 'empresarial' | 'rural' | 'consignado';
  talhao?: number;
  instituicao_financeira: number;
  criado_por?: number;
  criado_em: string;
  atualizado_em: string;
  parcelas?: ParcelaEmprestimo[];
  itens_produtos?: ItemEmprestimo[];
  valor_pendente?: number;
  parcelas_pendentes?: number;
}

export interface ResumoFinanceiro {
  vencimentos: {
    total_pendente: number;
    total_pago: number;
    total_atrasado: number;
    count_pendente: number;
    count_pago: number;
    count_atrasado: number;
  };
  financiamentos: {
    total_financiado: number;
    total_pendente: number;
    count_ativos: number;
  };
  emprestimos: {
    total_emprestado: number;
    total_pendente: number;
    count_ativos: number;
  };
  data_referencia: string;
}

export interface FiltrosFinanceiro {
  status?: string[];
  tipo?: string[];
  talhao?: number[];
  safra?: number | number[];
  data_inicio?: string;
  data_fim?: string;
  busca?: string;
  page_size?: number;
}

// FASE 5: Conciliação Bancária
export interface BankTransaction {
  id: number;
  importacao: number;
  external_id?: string;
  date?: string;
  amount: number;
  description?: string;
  balance?: number;
  raw_payload?: any;
  criado_em: string;
}

export interface BankStatementImport {
  id: number;
  conta: number;
  original_filename?: string;
  formato: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  arquivo?: string;
  arquivo_hash?: string;
  rows_count?: number;
  errors_count?: number;
  criado_por?: number;
  criado_em: string;
  transactions?: BankTransaction[];
}

export interface ItemExtratoBancario {
  id: number;
  conta_bancaria: number;
  conta_bancaria_nome?: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'DEBITO' | 'CREDITO';
  conciliado: boolean;
  conciliado_em?: string;
  conciliado_por?: number;
  conciliado_por_nome?: string;
  vencimento?: number;
  vencimento_titulo?: string;
  transferencia?: number;
  transferencia_descricao?: string;
  arquivo_origem?: string;
  linha_original?: string;
  importado_em: string;
  importado_por?: number;
}

export interface ConciliacaoResult {
  matches_encontrados: number;
  conciliados: number;
  nao_conciliados: number;
  sugestoes: ConciliacaoSugestao[];
}

export interface ConciliacaoSugestao {
  item_id: number;
  item_data: string;
  item_descricao: string;
  item_valor: number;
  vencimento_id: number;
  vencimento_titulo: string;
  vencimento_valor: number;
  similaridade: number;
  diferenca_dias: number;
  diferenca_valor: number;
}
