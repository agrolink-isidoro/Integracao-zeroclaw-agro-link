// ========================================
// TIPOS DO MÓDULO DE CONTRATOS SPLIT
// Divide: Compra | Venda | Produtos Financeiros
// Suporta Barter em Compra e Venda
// ========================================

// ============================================
// TIPOS COMPARTILHADOS
// ============================================

export type TipoOperacao = 'COMPRA_DINHEIRO' | 'COMPRA_ANTECIPADO' | 'COMPRA_BARTER' 
                          | 'VENDA_DINHEIRO' | 'VENDA_PARCELADA' | 'VENDA_ANTECIPADA' 
                          | 'VENDA_FUTURA' | 'VENDA_SPOT' | 'VENDA_BARTER'
                          | 'CONSORCIO' | 'SEGURO' | 'APLICACAO_FINANCEIRA';

export type StatusContrato = 'rascunho' | 'em_negociacao' | 'em_aprovacao' | 'assinado' 
                            | 'em_execucao' | 'recebido' | 'finalizado' | 'cancelado' | 'suspenso';

export type TipoAjusteFinanceiro = 'SEM_AJUSTE' | 'DINHEIRO_AGORA' | 'DESCONTO_PROXIMA' | 'CREDITO_FUTURO';

export interface RepresentanteLegal {
  nome: string;
  cpf: string;
  cargo: string;
  telefone?: string;
  email?: string;
}

export interface CondicaoGeneral {
  tipo_condicao: 'pagamento' | 'entrega' | 'garantia' | 'multa' | 'cancelamento' | 'devolucao' | 'outras';
  descricao: string;
  valor_referencia?: number;
  percentual_referencia?: number;
  prazo_dias?: number;
  obrigatoria: boolean;
  observacoes?: string;
}

// ============================================
// 1. CONTRATO DE COMPRA
// ============================================

export interface ItemCompra {
  id?: string;
  descricao_item: string;
  categoria_item: 'insumo' | 'maquina' | 'servico' | 'outro';
  especificacoes_tecnicas?: string;
  quantidade: number;
  unidade: 'kg' | 'L' | 'un' | 'tonelada' | 'metro' | 'hora' | 'outro';
  valor_unitario: number;
  valor_total_item: number; // Auto-calculado
  desconto_percentual?: number;
  valor_com_desconto?: number; // Auto-calculado
  prazo_entrega_item?: string; // Data específica
  observacoes_item?: string;
}

export interface CondicaoCompra extends CondicaoGeneral {
  tipo_condicao: 'pagamento' | 'entrega' | 'garantia' | 'devolucao' | 'multa' | 'outras';
  garantia_produto_meses?: number;
  responsavel_devolucao?: 'fornecedor' | 'comprador' | 'ambos';
}

export interface DadosBarter {
  fornecedor_origem_id: number;
  fornecedor_origem_nome: string;
  produto_fornecido_descricao: string;
  cliente_barter_id: number;
  cliente_barter_nome: string;
  produto_barter_descricao: string;
  quantidade_barter: number;
  unidade_barter: string;
  valor_produto_barter: number;
  data_entrega_barter: string;
  taxa_ajuste_financeira: number; // Positiva (crédito) ou negativa (desconto)
  tipo_ajuste: TipoAjusteFinanceiro;
  observacoes_barter?: string;
}

export interface ContratoCompra {
  id?: number;
  // Dados Gerais
  numero_contrato: string;
  titulo: string;
  tipo_operacao: 'COMPRA_DINHEIRO' | 'COMPRA_ANTECIPADO' | 'COMPRA_BARTER';
  categoria_compra: 'insumos' | 'maquinas' | 'sementes' | 'defensivos' | 'servicos_agricolas' | 'outros';
  status: StatusContrato;
  valor_total: number;
  
  // Fornecedor
  fornecedor_id: number;
  fornecedor_nome: string;
  fornecedor_cnpj: string;
  fornecedor_tipo_pessoa: 'pj';
  representante_legal?: RepresentanteLegal;
  telefone_fornecedor?: string;
  email_fornecedor?: string;
  endereco_completo?: string;
  
  // Condições de Pagamento
  condicoes_pagamento: 'A_VISTA' | '30_DIAS' | '60_DIAS' | '90_DIAS' | 'PARCELADO_CUSTOMIZADO';
  numero_parcelas?: number; // Se PARCELADO_CUSTOMIZADO
  
  // Datas
  data_emissao: string;
  data_inicio: string; // Início da entrega
  data_fim: string; // Data final da entrega
  prazo_execucao_dias?: number; // Auto-calculado
  
  // Itens
  itens: ItemCompra[];
  
  // Condições
  condicoes: CondicaoCompra[];
  
  // Barter (se aplicável)
  dados_barter?: DadosBarter;
  
  // Entrega
  condicoes_frete: 'CIF' | 'FOB' | 'GRATIS' | 'A_COMBINAR';
  
  // Documentação
  documento_contrato?: File;
  url_documento?: string;
  nota_fiscal_esperada?: boolean;
  
  // Observações
  observacoes_gerais?: string;
  
  // Controle
  criado_em?: string;
  atualizado_em?: string;
  criado_por?: number;
  assinado_em?: string;
}

// ============================================
// 2. CONTRATO DE VENDA
// ============================================

export interface ItemVenda {
  id?: string;
  descricao_produto: string;
  tipo_produto: 'commodity' | 'produto_processado' | 'servico' | 'maquina' | 'outro';
  categoria_produto: 'graos' | 'hortifruti' | 'proteinas' | 'polpas' | 'servicos' | 'outros';
  quantidade: number;
  unidade: 'kg' | 'saca' | 'tonelada' | 'L' | 'un' | 'bushel' | 'alqueire';
  valor_unitario: number;
  desconto_item_percentual?: number;
  desconto_item_valor?: number;
  valor_total_item: number; // Auto-calculado
  lote_numero?: string; // Rastreabilidade
  data_colheita_producao?: string;
  certificacoes?: string; // Orgânico, Fair Trade, etc.
  condicoes_entrega_item?: string;
  observacoes_item?: string;
}

export interface ParcelaVenda {
  numero_parcela: number;
  data_vencimento: string;
  valor: number;
  status?: 'pendente' | 'paga' | 'vencida' | 'cancelada';
}

export interface CondicaoVenda extends CondicaoGeneral {
  tipo_condicao: 'pagamento' | 'entrega' | 'garantia' | 'devolucao' | 'cancelamento' | 'multa' | 'outras';
  juros_mensais?: number; // % de juros se parcelado
  multa_atraso_percentual?: number;
  multa_atraso_valor?: number;
  dias_tolerancia?: number;
  condicoes_cancelamento?: string;
  direito_devolucao_dias?: number;
  seguro_contratado?: boolean;
}

export interface DadosClienteVenda {
  cliente_id: number;
  cliente_nome: string;
  cpf_cnpj: string;
  tipo_pessoa: 'pf' | 'pj';
  representante_legal?: RepresentanteLegal;
  telefone?: string;
  email?: string;
  endereco_entrega?: string;
  historico_cliente?: {
    total_ja_comprado: number;
    data_primeira_compra?: string;
    status_pagamento: 'em_dia' | 'atrasado' | 'vencido';
  };
}

export interface ContratoVenda {
  id?: number;
  // Dados Gerais
  numero_contrato: string;
  titulo: string;
  tipo_operacao: 'VENDA_DINHEIRO' | 'VENDA_PARCELADA' | 'VENDA_ANTECIPADA' | 'VENDA_FUTURA' | 'VENDA_SPOT' | 'VENDA_BARTER';
  categoria_venda: 'commodities' | 'produtos_processados' | 'servicos_agricolas' | 'maquinas_usadas' | 'outros';
  status: StatusContrato;
  valor_total: number;
  desconto_total?: number;
  valor_final?: number; // Auto-calculado
  
  // Cliente
  cliente: DadosClienteVenda;
  
  // Datas
  data_emissao: string;
  data_inicio_producao: string;
  data_entrega_prevista: string;
  
  // Pagamento
  tipo_pagamento: 'A_VISTA' | 'PARCELADO' | 'CONTRA_ENTREGA' | 'ANTECIPADO';
  numero_parcelas?: number; // Se PARCELADO
  periodicidade_parcelas?: 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'BIMESTRAL';
  
  // Itens
  itens: ItemVenda[];
  
  // Parcelas (se PARCELADO)
  parcelas?: ParcelaVenda[];
  
  // Condições
  condicoes: CondicaoVenda[];
  
  // Entrega
  transportadora?: string;
  codigo_rastreamento?: string;
  prazo_transito_dias?: number;
  observacoes_entrega?: string;
  
  // Barter (se aplicável)
  dados_barter?: DadosBarter;
  
  // Documentação
  documento_contrato?: File;
  url_documento?: string;
  numero_nf_esperada?: string;
  
  // Observações
  observacoes_gerais?: string;
  
  // Controle
  criado_em?: string;
  atualizado_em?: string;
  criado_por?: number;
  assinado_em?: string;
}

// ============================================
// 3. CONTRATO DE PRODUTOS FINANCEIROS
// ============================================

export type TipoConsorcio = 'mecanizacao' | 'transporte' | 'irrigacao' | 'construcao' | 'outro';
export type TipoSeguro = 'SEGURO_SAFRA' | 'SEGURO_RESPONSABILIDADE_CIVIL' | 'SEGURO_EQUIPAMENTOS' 
                        | 'SEGURO_VIDA' | 'SEGURO_INCENDIO' | 'OUTRO';
export type TipoAplicacao = 'POUPANCA' | 'CDB' | 'LCI' | 'LCA' | 'CRI' | 'CRA' | 'TESOURO_DIRETO' 
                           | 'FUNDO_RENDA_FIXA' | 'FUNDO_MULTIMERCADO' | 'OUTRO';
export type TaxaRemuneracao = 'PREFIXADA' | 'POSPIXADA' | 'FLUTUANTE';
export type IndiceCorracao = 'SELIC' | 'CDI' | 'IPCA' | 'IGPM' | 'NENHUM';

export interface DadosBeneficiario {
  tipo_beneficiario: 'pessoa_fisica' | 'pessoa_juridica' | 'ambas';
  cpf_beneficiario?: string;
  cnpj_beneficiario?: string;
  nome_beneficiario: string;
  data_nascimento?: string;
  profissao?: string; // Se PF
  endereco_completo: string;
  telefone: string;
  email: string;
  renda_mensal_estimada?: number;
  area_propriedade_hectares?: number;
}

export interface DadosConsorcio {
  bem_consortiado: string;
  categoria_bem: TipoConsorcio;
  numero_cotas: number;
  valor_cota: number;
  valor_total_consorcio?: number; // Auto-calculado
  numero_meses: number;
  valor_mensalidade: number;
  taxa_administracao_percentual: number;
  seguro_obrigatorio: boolean;
  valor_seguro_mensal?: number;
  fundo_rateio_percentual: number;
  taxa_juros_atraso: number;
  numero_sorteios_anuais: number;
  data_primeiro_sorteio: string;
  ordem_consorcio: number;
  ja_foi_sorteado: boolean;
  data_recebimento_bem?: string;
  condicoes_inadimplencia?: string;
}

export interface DadosSeguro {
  tipo_seguro: TipoSeguro;
  objeto_segurado: string;
  area_segurada_hectares?: number;
  valor_cobertura: number;
  valor_premio_mensal: number;
  valor_fracionado?: number;
  numero_parcelas_premio: number;
  data_vencimento_apolicе: string;
  numero_apolicе: string;
  franquia_percentual: number;
  franquia_minima: number;
  indenizacoes_previas?: string;
  cobertura_adicional_1?: string;
  cobertura_adicional_2?: string;
  telefone_sinistro_24h?: string;
  documentos_necessarios?: string;
}

export interface DadosAplicacaoFinanceira {
  tipo_aplicacao: TipoAplicacao;
  instituicao_emissora: string;
  valor_investido: number;
  taxa_remuneracao_anual: number;
  taxa_remuneracao_tipo: TaxaRemuneracao;
  indice_correcao: IndiceCorracao;
  percentual_indice?: number;
  data_resgate_prevista: string;
  prazo_minimo_dias: number;
  carencia_dias: number;
  valor_minimo_investimento: number;
  valor_minimo_resgate: number;
  liquido_resgate_parcial: boolean;
  liquidacao_automatica: boolean;
  imposto_renda_aliquota: number;
  possui_garantia_fgc: boolean;
  limite_fgc?: number;
  rentabilidade_acumulada?: number;
  data_proximo_pagamento_juros?: string;
  observacoes_investimento?: string;
}

export interface CondicaoFinanceira {
  id?: string;
  tipo_condicao: 'pagamento' | 'rescisao' | 'penalidade' | 'outras';
  descricao: string;
  forma_pagamento: 'BOLETO' | 'DEBITO_AUTOMATICO' | 'TRANSFERENCIA' | 'CARTAO_CREDITO' | 'DINHEIRO' | 'CHEQUE';
  banco_agencia_cc?: string;
  taxa_atraso_percentual?: number;
  juros_atraso_percentual?: number;
  condicoes_rescisao?: string;
  penalidade_resgate_antecipado?: string;
  documentos_necessarios?: string;
}

export interface ContratoFinanceiro {
  id?: number;
  // Dados Gerais
  numero_contrato: string;
  titulo: string;
  tipo_produto_financeiro: 'CONSORCIO' | 'SEGURO' | 'APLICACAO_FINANCEIRA';
  status: StatusContrato;
  valor_total: number;
  valor_entrada?: number;
  
  // Beneficiário
  beneficiario: DadosBeneficiario;
  
  // Instituição Financeira
  instituicao_financeira_id: number;
  instituicao_financeira_nome: string;
  
  // Datas
  data_assinatura: string;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  
  // Dados Específicos (apenas 1 será preenchido)
  dados_consorcio?: DadosConsorcio;
  dados_seguro?: DadosSeguro;
  dados_aplicacao_financeira?: DadosAplicacaoFinanceira;
  
  // Condições
  condicoes: CondicaoFinanceira[];
  
  // Responsável
  responsavel_vendedor?: string;
  telefone_vendedor?: string;
  
  // Documentação
  documento_contrato?: File;
  url_documento?: string;
  documento_proposta?: File;
  documento_identidade?: File;
  documento_cpf_cnpj?: File;
  comprovante_renda?: File;
  comprovante_endereco?: File;
  documentos_adicionais?: File[];
  observacoes_documentacao?: string;
  
  // Observações
  observacoes_gerais?: string;
  
  // Controle
  criado_em?: string;
  atualizado_em?: string;
  criado_por?: number;
  assinado_em?: string;
}

// ============================================
// TIPOS DE FORMULÁRIO UNIFICADO
// ============================================

export type ContratoQualquer = ContratoCompra | ContratoVenda | ContratoFinanceiro;

export interface FormularioContrato {
  tipo_forma: 'COMPRA' | 'VENDA' | 'FINANCEIRO';
  dados: ContratoQualquer;
}

// ============================================
// TIPOS DE RESPOSTA DE API
// ============================================

export interface RespostaPaginada<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface ErroAPI {
  detalhe?: string;
  erros?: Record<string, string[]>;
  mensagem?: string;
}

export interface SucessoAPI<T> {
  sucesso: boolean;
  dados?: T;
  mensagem?: string;
}
