// ========================================
// TIPOS DO MÓDULO ESTOQUE
// ========================================

export interface Produto {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string;
  principio_ativo?: string;
  concentracao?: string;
  composicao_quimica?: string;
  quantidade_estoque: number;
  unidade: string;
  vencimento?: string;
  estoque_minimo: number;
  saldo_atual?: number;
  custo_unitario?: number;
  preco_unitario?: number;
  categoria?: number | string;
  // Backward compatible fields (older payloads)
  local_armazenagem?: string;
  local_armazenagem_id?: number;
  // New fields aligned with backend FK: local_armazenamento is FK id, local_armazenamento_nome is display name
  local_armazenamento?: number | null;
  local_armazenamento_nome?: string | null;
  categoria_detail?: CategoriaProduto;
  fornecedor?: number | null;
  fornecedor_nome?: string;
  lote?: string;
  status: 'ativo' | 'inativo' | 'vencido';
  dosagem_padrao?: number;
  unidade_dosagem?: string;
  observacoes?: string;
  ativo: boolean;

  // Campos calculados/computados
  alerta_baixo?: boolean;
  valor_total_estoque?: number;
  dias_para_vencer?: number;

  // Campos de auditoria
  criado_por?: number;
  criado_em?: string;
  atualizado_em?: string;

  // Relacionamentos
  lotes?: any[];
}

export interface CategoriaProduto {
  id: number;
  tag?: string; // chave textual vinda do backend (ex: 'fertilizante')
  nome: string;
  descricao?: string;
  ativo: boolean;
}

export interface MovimentacaoEstoque {
  id: number;
  produto: number;
  produto_detail?: Produto;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  motivo: string;
  data_movimentacao: string;
  valor_unitario?: number;
  valor_total?: number;
  lote?: string;
  documento_referencia?: string;
  observacoes?: string;
  criado_por?: number;
  criado_por_nome?: string;
  criado_em?: string;
}

export interface MovimentacaoStatement {
  id: number;
  movimentacao?: number | null;
  produto: number;
  produto_nome?: string;
  tipo: 'entrada' | 'saida' | 'reserva' | 'liberacao' | 'reversao';
  quantidade: number;
  unidade?: string;
  valor_unitario?: number;
  valor_total?: number;
  data_movimentacao: string;
  documento_referencia?: string;
  motivo?: string;
  observacoes?: string;
  lote?: number | null;
  lote_numero?: string | null;
  fazenda?: number | null;
  fazenda_nome?: string | null;
  talhao?: number | null;
  talhao_nome?: string | null;
  local_armazenamento?: number | null;
  local_armazenamento_nome?: string | null;
  saldo_resultante?: number | null;
  origem?: string | null;
  origem_display?: string | null;
  metadata?: Record<string, any> | null;
  criado_em?: string;
  criado_por?: number | null;
  criado_por_nome?: string | null;
}

export type UnidadeCapacidade = 'kg' | 't' | 'L' | 'saca_60kg' | 'peça' | 'conjunto' | 'unidade' | string;

// Note: 'saca_60kg' represents a 60kg sack. Use conversion helpers to convert between units.
export const UNIDADES_CAPACIDADE: UnidadeCapacidade[] = ['kg', 't', 'L', 'saca_60kg', 'peça', 'conjunto', 'unidade'];

export interface LocalArmazenagem {
  id: number;
  nome: string;
  tipo: 'silo' | 'armazem' | 'galpao' | 'depósito' | 'outro';
  tipo_local: 'interno' | 'externo';
  capacidade_total?: number;
  capacidade_maxima?: number; // legacy/alternate field used in forms
  unidade_capacidade?: UnidadeCapacidade;
  endereco?: string;
  fazenda?: number | null;
  fazenda_nome?: string | null;
  fornecedor?: number | null;
  fornecedor_nome?: string | null;
  ativo: boolean;
  produtos_armazenados?: Array<{
    produto: number;
    produto_nome: string;
    quantidade: number;
    unidade: string;
  }>;
}

// ========================================
// TIPOS DO MÓDULO MÁQUINAS
// ========================================

export interface CategoriaEquipamento {
  id: number;
  nome: string;
  descricao?: string;
  tipo_mobilidade: 'autopropelido' | 'estacionario' | 'rebocado';
  categoria_pai?: number;
  requer_horimetro: boolean;
  requer_potencia: boolean;
  requer_localizacao: boolean;
  requer_acoplamento: boolean;
  ativo: boolean;
  ordem_exibicao: number;
}

export interface Equipamento {
  id: number;
  nome: string;
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  ano_fabricacao: number;
  categoria: number;
  categoria_detail?: CategoriaEquipamento;
  tipo_mobilidade: 'autopropelido' | 'estacionario' | 'rebocado';

  // Campos comuns
  data_aquisicao?: string;
  valor_aquisicao?: number;
  status: 'ativo' | 'inativo' | 'manutenção' | 'vendido';
  observacoes?: string;

  // Campos dinâmicos por tipo de mobilidade
  // Autopropelidos
  horimetro_atual?: number;
  potencia_cv?: number;
  capacidade_litros?: number;
  capacidade_tanque?: number;
  consumo_medio?: number;
  gps_tracking?: boolean;
  placa?: string;
  quilometragem_atual?: number;

  // Estacionários
  local_instalacao?: string;
  potencia_kw?: number;
  tensao_volts?: number;
  frequencia_hz?: number;
  fases?: number;

  // Rebocados/Implementos
  maquina_principal?: number;
  maquina_principal_detail?: Equipamento;
  largura_trabalho?: number;
  tipo_implemento?: string;
  compatibilidade?: number[]; // IDs de equipamentos compatíveis

  // Campos calculados
  horas_trabalhadas_mes?: number;
  custo_hora_operacao?: number;
  proxima_manutencao?: string;
}

export interface Abastecimento {
  id: number;
  equipamento: number;
  equipamento_detail?: Equipamento;
  data_abastecimento: string;
  tipo_combustivel: 'diesel' | 'gasolina' | 'eletrico' | 'outro';
  quantidade_litros: number;
  valor_unitario: number;
  valor_total: number;
  horimetro_km?: number;
  local_abastecimento?: string;
  responsavel?: string;
  observacoes?: string;
  criado_por?: number;
  criado_por_nome?: string;
  criado_em?: string;
}

export interface Manutencao {
  id: number;
  equipamento: number;
  equipamento_detail?: Equipamento;
  tipo: 'preventiva' | 'corretiva' | 'emergencial';
  data_manutencao: string;
  descricao: string;
  pecas_utilizadas?: Array<{
    nome: string;
    quantidade: number;
    valor_unitario: number;
  }>;
  mao_obra_horas?: number;
  valor_mao_obra?: number;
  valor_total: number;
  responsavel?: string;
  proxima_manutencao?: string;
  observacoes?: string;
  status: 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';
  criado_por?: number;
  criado_por_nome?: string;
  criado_em?: string;
}

// OrdemServico specific to máquinas module
export interface OrdemServicoMaquina {
  id: number;
  numero_os: string;
  equipamento: number;
  equipamento_detail?: Equipamento;
  tipo: 'preventiva' | 'corretiva' | 'melhoria' | 'emergencial';
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';
  data_abertura?: string;
  data_previsao?: string;
  data_conclusao?: string;
  descricao_problema: string;
  diagnostico?: string;
  servicos_realizados?: string;
  custo_mao_obra?: number;
  custo_pecas?: number;
  custo_total?: number;
  // insumos: array de produtos selecionados da base de estoque
  insumos?: Array<{ produto_id: number; quantidade: number; valor_unitario?: number | null }>;
  // NFes vinculadas (IDs) — adicionadas na integração Máquinas <> Fiscal
  nfes?: number[];
  prestador_servico?: number;
  fornecedor?: number;
  responsavel_abertura?: number;
  responsavel_execucao?: number;
  observacoes?: string;
  criado_em?: string;
  atualizado_em?: string;
}
export interface ConfiguracaoAlerta {
  id: number;
  equipamento: number;
  equipamento_detail?: Equipamento;
  componente: string;
  intervalo: number; // horas para horímetro, dias para calendário
  tipo_intervalo: 'horimetro' | 'calendario';
  ativo: boolean;
  ultima_manutencao?: string;
  criado_em?: string;
}

// ========================================
// TIPOS AUXILIARES E ENUMS
// ========================================

export type TipoMobilidade = 'autopropelido' | 'estacionario' | 'rebocado';

export type StatusEquipamento = 'ativo' | 'inativo' | 'manutenção' | 'vendido';

export type TipoMovimentacao = 'entrada' | 'saida';

export type TipoManutencao = 'preventiva' | 'corretiva' | 'emergencial';

export type StatusManutencao = 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';

export type TipoCombustivel = 'diesel' | 'gasolina' | 'eletrico' | 'outro';

export type TipoLocalArmazenagem = 'silo' | 'armazem' | 'depósito' | 'outro';

// ========================================
// FASE 1 - LOCALIZAÇÃO DE ESTOQUE
// ========================================

export type TipoLocalizacao = 'interna' | 'externa';

export type StatusProdutoArmazenado = 'disponivel' | 'reservado' | 'bloqueado';

export interface Localizacao {
  id: number;
  nome: string;
  tipo: TipoLocalizacao;
  endereco?: string;
  capacidade_total: number;
  capacidade_ocupada: number;
  capacidade_disponivel: number;
  percentual_ocupacao: number;
  ativa: boolean;
  criado_em?: string;
  atualizado_em?: string;
}

export interface ProdutoArmazenado {
  id: number;
  produto: number;
  produto_nome?: string;
  produto_codigo?: string;
  produto_unidade?: string;
  localizacao: number;
  localizacao_nome?: string;
  lote?: string;
  quantidade: number;
  status: StatusProdutoArmazenado;
  criado_em?: string;
  atualizado_em?: string;
}

export interface MovimentarEntreLocalizacoes {
  produto: number;
  localizacao_origem: number;
  localizacao_destino: number;
  quantidade: number;
  lote?: string;
  observacao?: string;
}

// ========================================
// TIPOS DO MÓDULO COMERCIAL - CONTRATOS
// ========================================

export type TipoContrato = 'A_VISTA' | 'PARCELADO' | 'ANTECIPADO' | 'FUTURO';
export type StatusContrato = 'RASCUNHO' | 'ATIVO' | 'ENCERRADO' | 'CANCELADO';
export type PeriodicidadeParcela = 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL';

export interface VendaContrato {
  id: number;
  numero_contrato: string;
  cliente: number;
  cliente_nome?: string;
  produto: number;
  produto_nome?: string;
  quantidade_total: number;
  preco_unitario: number;
  valor_total: number;
  tipo: TipoContrato;
  status: StatusContrato;
  data_contrato: string;
  data_entrega_prevista?: string | null;
  numero_parcelas: number;
  periodicidade_parcelas: PeriodicidadeParcela;
  observacoes?: string | null;
  parcelas?: ParcelaContrato[];
  criado_por?: number;
  criado_por_nome?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface ParcelaContrato {
  id: number;
  contrato: number;
  numero_parcela: number;
  valor: number;
  data_vencimento: string;
  vencimento?: number | null;
  vencimento_titulo?: string;
  vencimento_status?: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  criado_em?: string;
}

export interface CriarContratoRequest {
  numero_contrato: string;
  cliente: number;
  produto: number;
  quantidade_total: number;
  preco_unitario: number;
  valor_total: number;
  tipo: TipoContrato;
  data_contrato: string;
  data_entrega_prevista?: string;
  numero_parcelas: number;
  periodicidade_parcelas: PeriodicidadeParcela;
  observacoes?: string;
}

export interface DashboardContratos {
  total_contratos_ativos: number;
  valor_total_contratos_ativos: number;
  contratos_por_tipo: Array<{
    tipo: TipoContrato;
    count: number;
    total: number;
  }>;
  parcelas_vencendo: ParcelaContrato[];
}

// ========================================
// TIPOS DO MÓDULO AGRICULTURA - MOVIMENTAÇÃO DE CARGA
// ========================================

export type OrigemCarga = 'COLHEITA' | 'COMPRA' | 'TRANSFERENCIA';
export type StatusCarga = 'PENDENTE' | 'EM_TRANSITO' | 'ENTREGUE' | 'CANCELADA';
export type DestinoTipoCarga = 'armazenagem_interna' | 'armazenagem_externa' | 'venda_direta';

export interface MovimentacaoCarga {
  id: number;
  placa?: string;
  motorista?: string;
  tara?: number;
  peso_bruto?: number;
  peso_liquido?: number;
  descontos?: number;
  condicoes_graos?: string;
  custo_transporte?: number;
  custo_transporte_unidade?: 'unidade' | 'saca' | 'tonelada';
  destino_tipo?: DestinoTipoCarga;
  local_destino?: number;
  local_destino_nome?: string;
  empresa_destino?: number;
  empresa_destino_nome?: string;
  contrato_ref?: string;
  reconciled: boolean;
  reconciled_at?: string;
  reconciled_by?: number;
  criado_por?: number;
  criado_em?: string;
}

export interface RegistrarChegadaRequest {
  peso_balanca: number;
}

export interface DiferencaCarga {
  id: number;
  placa: string;
  peso_estimado: number;
  peso_balanca: number;
  diferenca: number;
  percentual: number;
  data: string;
}

export interface DashboardCargas {
  total_cargas: number;
  cargas_reconciliadas: number;
  cargas_pendentes: number;
  peso_total_kg: number;
  peso_medio_kg: number;
  diferencas_significativas_count: number;
  diferencas_recentes: DiferencaCarga[];
}

