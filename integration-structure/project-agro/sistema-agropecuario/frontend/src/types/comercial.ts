// ========================================
// TIPOS DO MÓDULO COMERCIAL
// ========================================

export interface Endereco {
  id?: number;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  pais?: string;
  latitude?: number;
  longitude?: number;
}

export interface Contato {
  id?: number;
  telefone_principal: string;
  telefone_secundario?: string;
  email_principal: string;
  email_secundario?: string;
  site?: string;
  observacoes?: string;
}

export interface Documento {
  id?: number;
  tipo: 'cpf' | 'cnpj' | 'rg' | 'cnh' | 'contrato_social' | 'certificado' | 'outros';
  numero: string;
  data_emissao?: string;
  data_validade?: string;
  orgao_emissor?: string;
  arquivo?: File;
  url_arquivo?: string;
  observacoes?: string;
}

export interface DadosBancarios {
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo_conta?: 'corrente' | 'poupanca' | '';
  titular?: string;
  chave_pix?: string;
  tipo_chave_pix?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | '';
}

export interface Fornecedor {
  id?: number;
  tipo_pessoa: 'pf' | 'pj';
  cpf_cnpj: string;
  nome_completo?: string; // Para PF
  razao_social?: string; // Para PJ
  nome_fantasia?: string; // Para PJ
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  endereco: Endereco;
  contato: Contato;
  documentos: Documento[];
  dados_bancarios?: DadosBancarios;
  status: 'ativo' | 'inativo' | 'bloqueado' | 'pendente';
  categoria_fornecedor: 'insumos' | 'servicos' | 'maquinas' | 'transporte' | 'produtos_agricolas' | 'combustiveis' | 'ti' | 'manutencao' | 'prestador_servicos' | 'fabricante' | 'outros';
  ramo_atividade?: string;
  prazo_pagamento_padrao?: number; // dias
  limite_credito?: number;
  observacoes?: string;
  criado_em?: string;
  atualizado_em?: string;
  criado_por?: number;
}

export interface PrestadorServico {
  id?: number;
  tipo_pessoa: 'pf' | 'pj';
  cpf_cnpj: string;
  nome_completo?: string; // Para PF
  razao_social?: string; // Para PJ
  nome_fantasia?: string; // Para PJ
  inscricao_estadual?: string;
  endereco: Endereco;
  contato: Contato;
  documentos: Documento[];
  status: 'ativo' | 'inativo' | 'bloqueado' | 'pendente';
  categoria_servico: 'agricola' | 'mecanica' | 'transporte' | 'consultoria' | 'manutencao' | 'outros';
  especialidades: string[]; // Array de especialidades
  certificacoes?: string[];
  prazo_pagamento_padrao?: number; // dias
  valor_hora_padrao?: number;
  disponibilidade: 'integral' | 'meio_periodo' | 'sob_demanda';
  observacoes?: string;
  criado_em?: string;
  atualizado_em?: string;
  criado_por?: number;
}

export interface InstituicaoFinanceira {
  id?: number;
  codigo_bacen: string;
  nome: string;
  nome_fantasia?: string;
  segmento: 'banco_comercial' | 'banco_multiplo' | 'banco_investimento' | 'soc_credito' | 'financ_desenvolvimento' | 'caixa_economica' | 'banco_central' | 'conglomerado' | 'outros';
  cnpj: string;
  endereco: Endereco;
  contato: Contato;
  status: 'ativo' | 'inativo';
  produtos_oferecidos: string[]; // ['financiamento', 'emprestimo', 'consorcio', etc.]
  taxas_referencia?: {
    financiamento_rural?: number;
    custeio?: number;
    investimento?: number;
  };
  observacoes?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface ParteContrato {
  id?: number;
  tipo_parte: 'fornecedor' | 'prestador' | 'instituicao' | 'proprietario' | 'outros';
  entidade_id: number;
  entidade_nome: string;
  entidade_tipo_pessoa: 'pf' | 'pj';
  entidade_cpf_cnpj: string;
  papel_contrato: 'contratante' | 'contratado' | 'fiador' | 'avalista' | 'interveniente';
  representante_nome?: string;
  representante_cpf?: string;
  representante_cargo?: string;
}

export interface ItemContrato {
  id?: number;
  tipo_item: 'produto' | 'servico' | 'financiamento' | 'outros';
  descricao: string;
  quantidade?: number;
  unidade?: string;
  valor_unitario?: number;
  valor_total: number;
  especificacoes?: string;
  prazo_entrega?: string;
  condicoes_pagamento?: string;
}

export interface CondicaoContrato {
  id?: number;
  tipo_condicao: 'pagamento' | 'entrega' | 'garantia' | 'multa' | 'rescisao' | 'outras';
  descricao: string;
  valor_referencia?: number;
  percentual_referencia?: number;
  prazo_dias?: number;
  obrigatoria: boolean;
}

export interface ContratoComercial {
  id?: number;
  numero_contrato: string;
  titulo: string;
  tipo_contrato: 'compra' | 'venda' | 'venda_futura' | 'venda_spot' | 'bater' | 'servico' | 'fornecimento' | 'parceria' | 'outros';
  categoria: 'insumos' | 'maquinas' | 'servicos' | 'financiamento' | 'arrendamento' | 'outros';
  status: 'rascunho' | 'em_negociacao' | 'assinado' | 'em_execucao' | 'concluido' | 'cancelado' | 'suspenso';

  // Partes envolvidas
  partes: ParteContrato[];

  // Objeto do contrato
  itens: ItemContrato[];
  valor_total: number;

  // Prazos
  data_inicio: string;
  data_fim?: string;
  prazo_execucao_dias?: number;

  // Condições
  condicoes: CondicaoContrato[];

  // Responsáveis
  responsavel_interno?: number;
  responsavel_interno_nome?: string;

  // Documentação
  documento?: File;
  url_documento?: string;
  observacoes?: string;

  // Controle
  criado_em?: string;
  atualizado_em?: string;
  criado_por?: number;
  assinado_em?: string;
  aprovado_por?: number;
}

export interface VendaCompra {
  id?: number;
  tipo_operacao: 'venda' | 'compra';
  numero_documento: string;
  data_operacao: string;
  entidade_tipo: 'fornecedor' | 'cliente' | 'prestador';
  entidade_id: number;
  entidade_nome: string;
  entidade_cpf_cnpj: string;

  // Itens da operação
  itens: Array<{
    id?: number;
    produto_id?: number;
    produto_nome: string;
    quantidade: number;
    unidade: string;
    valor_unitario: number;
    valor_total: number;
    desconto?: number;
  }>;

  // Totais
  valor_bruto: number;
  valor_desconto: number;
  valor_impostos: number;
  valor_liquido: number;

  // Pagamento
  forma_pagamento: 'avista' | 'prazo' | 'cartao' | 'boleto' | 'cheque' | 'financiamento';
  condicoes_pagamento?: string;
  data_vencimento?: string;
  parcela_unica?: boolean;

  // Status
  status: 'pendente' | 'aprovada' | 'entregue' | 'paga' | 'cancelada';

  // Integrações
  contrato_referencia?: number;
  nota_fiscal?: string;
  observacoes?: string;

  criado_em?: string;
  atualizado_em?: string;
  criado_por?: number;
}

// Tipos para filtros e buscas
export interface FiltrosComerciais {
  status?: string[];
  categoria?: string[];
  tipo_pessoa?: string[];
  estado?: string[];
  data_inicio?: string;
  data_fim?: string;
  valor_minimo?: number;
  valor_maximo?: number;
  busca?: string;
}

export interface StatusComercial {
  ativo: number;
  inativo: number;
  bloqueado: number;
  pendente: number;
  total: number;
}

// Tipos para relatórios
export interface RelatorioComercial {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: {
    total_fornecedores: number;
    total_prestadores: number;
    total_instituicoes: number;
    total_contratos: number;
    valor_total_contratos: number;
    vendas_periodo: number;
    compras_periodo: number;
  };
  top_fornecedores: Array<{
    id: number;
    nome: string;
    valor_total: number;
    numero_operacoes: number;
  }>;
  contratos_por_status: Record<string, number>;
  vendas_por_mes: Array<{
    mes: string;
    vendas: number;
    compras: number;
  }>;
}