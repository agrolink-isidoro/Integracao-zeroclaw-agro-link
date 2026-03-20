// ========================================
// TIPOS DO MÓDULO AGRICULTURA
// ========================================

export interface Cultura {
  id: number;
  nome: string;
  tipo: 'graos' | 'hortalicas' | 'fruticultura' | 'outros';
  descricao?: string;
  ciclo_dias?: number;
  zoneamento_apto: boolean;
  ativo: boolean;
  unidade_producao: 'saca_60kg' | 'tonelada' | 'kg' | 'caixa';
  variedades?: string;
}

export interface Plantio {
  id: number;
  fazenda?: number;
  fazenda_nome?: string;
  // FLEXÍVEL: Um Plantio = N Talhões = "Safra da Cultura"
  talhoes: number[]; // Array de IDs dos talhões (read-only; use talhoes_variedades para escrita)
  talhoes_info?: Array<{
    id: number;
    nome: string;
    area_hectares: number;
    variedade: string; // variedade cultivada neste talhão nesta safra
  }>;
  /** Campo de escrita: lista de {talhao, variedade} por talhão selecionado */
  talhoes_variedades?: Array<{
    talhao: number;
    variedade?: string;
  }>;
  cultura: number;
  cultura_nome?: string;
  data_plantio: string; // ISO date
  area_total_ha?: number; // Calculado automaticamente (soma dos talhões)
  nome_safra?: string; // Ex: "Safra Soja"
  quantidade_sementes?: number;
  produto_semente?: number;
  observacoes?: string;
  status: 'planejado' | 'em_andamento' | 'colhido' | 'perdido';
  criado_por?: number;
  criado_por_nome?: string;
  criado_em?: string;
}

export interface Colheita {
  id: number;
  plantio: number;
  plantio_cultura?: string;
  plantio_talhoes?: string; // Lista de nomes dos talhões
  plantio_fazenda?: string;
  data_colheita: string; // ISO date
  quantidade_colhida: number; // Kg ou unidades
  unidade: string; // 'kg', 'ton', 'sacas', etc.
  qualidade?: string; // 'premium', 'standard', 'descarte', etc.
  observacoes?: string;
  status: 'colhida' | 'armazenada' | 'comercializada' | 'vendida' | 'finalizada';
  area_total?: number;
  
  // Transportes (novo)
  transportes?: ColheitaTransporte[];
  // Lista de itens por talhão caso a colheita inclua múltiplos talhões
  itens?: Array<{ talhao: number; quantidade_colhida?: number }>;
  // Destino / integração com armazenagem/comercialização
  destino_tipo?: 'armazenagem_interna' | 'contrato_industria' | 'armazenagem_geral';
  local_tipo?: string | null;
  local_destino?: number | null;
  empresa_destino?: number | null;
  nf_provisoria?: string | null;
  peso_estimado?: number | null;
  _session_item?: number | null;
  
  // Integrações
  movimentacao_estoque?: number;
  movimentacao_estoque_info?: {
    id: number;
    local_armazenamento?: string;
    quantidade: number;
    data_movimentacao: string;
    lote?: string;
  };
  carga_comercial?: number;
  carga_comercial_info?: {
    id: number;
    tipo_colheita?: string;
    peso_total: number;
    data_colheita: string;
    cliente?: string;
  };
  pode_enviar_comercial?: boolean;
  valor_total_estimado?: number;
  // custos
  custo_mao_obra?: number;
  custo_maquina?: number;
  custo_combustivel?: number;
  custo_insumos?: number;
  custo_outros?: number;
  custo_total?: number;
  contabilizado?: boolean;
  
  criado_por?: number;
  criado_por_nome?: string;
  criado_em?: string;
}

export interface ColheitaTransporte {
  id?: number;
  placa?: string;
  motorista?: string;
  tara?: number;
  peso_bruto?: number;
  descontos?: number;
  peso_liquido?: number;
  custo_transporte?: number;
  // Unidade do custo: 'unidade' | 'saca' | 'tonelada'
  custo_transporte_unidade?: 'unidade' | 'saca' | 'tonelada' | 'total';
  criado_em?: string;
}

export interface ManejoProduto {
  id: number;
  manejo: number;
  produto: number;
  produto_nome?: string;
  dosagem: number;
  unidade_dosagem: string;
  quantidade: number;
  unidade: string;
}

export interface Manejo {
  id?: number;
  // Tipos expandidos para cobrir todo o ciclo
  tipo: 'preparo_solo' | 'aracao' | 'gradagem' | 'subsolagem' | 'correcao_solo' | 'calagem' |
        'adubacao_base' | 'adubacao_cobertura' | 'adubacao_foliar' |
        'dessecacao' | 'plantio_direto' | 'plantio_convencional' |
        'irrigacao' | 'poda' | 'desbaste' | 'amontoa' |
        'controle_pragas' | 'controle_doencas' | 'controle_plantas_daninhas' |
        'pulverizacao' | 'aplicacao_herbicida' | 'aplicacao_fungicida' | 'aplicacao_inseticida' |
        'capina' | 'rocada' | 'cultivo_mecanico' | 'outro';
  
  // Plantio agora é opcional (permite operações pré-plantio)
  plantio?: number;
  plantio_cultura?: string;
  
  // Fazenda para operações não vinculadas a plantio
  fazenda?: number;
  fazenda_nome?: string;
  
  data_manejo: string; // ISO date
  descricao?: string;
  custo?: number;
  custo_mao_obra?: number;
  custo_maquinas?: number;
  custo_insumos?: number;
  custo_outros?: number;
  custo_total?: number;
  contabilizado?: boolean;
  produtos_utilizados?: ManejoProduto[];
  usuario_responsavel?: number;
  equipamento?: string;
  talhoes?: number[]; // IDs dos talhões onde o manejo foi aplicado
  talhoes_info?: Array<{
    id: number;
    nome: string;
    area_hectares: number;
  }>;
  criado_por?: number;
  criado_em?: string;
}

export interface OrdemServico {
  id?: number;
  fazenda?: number;
  fazenda_nome?: string;
  // FLEXÍVEL: Uma OS pode abranger múltiplos talhões
  talhoes: number[]; // Array de IDs dos talhões
  talhoes_info?: Array<{
    id: number;
    nome: string;
    area_hectares: number;
  }>;
  area_total_ha?: number; // Calculado automaticamente (soma dos talhões)
  tipo_manual: boolean;
  tarefa: string;
  maquina?: string;
  insumos?: Array<{
    id: number;
    nome: string;
    quantidade: number;
    unidade: string;
  }>;
  data_inicio: string; // ISO datetime
  data_fim?: string; // ISO datetime
  status: 'pendente' | 'aprovada' | 'ativa' | 'finalizada';
  aprovacao_ia?: boolean | null;
  custo_total: number;
  criado_por?: number;
  criado_por_nome?: string;
  criado_em?: string;
}

export interface Insumo {
  id: number;
  nome: string;
  quantidade_estoque: number;
  unidade: string; // 'kg', 'litros', 'unidades', etc.
  vencimento?: string; // ISO date
}

// ========================================
// CONSTANTES E HELPERS
// ========================================

export const TIPO_CULTURA_CHOICES = [
  { value: 'graos', label: 'Grãos' },
  { value: 'hortalicas', label: 'Hortaliças' },
  { value: 'fruticultura', label: 'Fruticultura' },
  { value: 'outros', label: 'Outros' },
] as const;

export const UNIDADE_PRODUCAO_CHOICES = [
  { value: 'saca_60kg', label: 'Saca de 60 kg (grãos)', suffix: 'sc' },
  { value: 'tonelada', label: 'Tonelada (t)', suffix: 't' },
  { value: 'kg', label: 'Quilograma (kg)', suffix: 'kg' },
  { value: 'caixa', label: 'Caixa / Unidade', suffix: 'cx' },
] as const;

export const STATUS_PLANTIO_CHOICES = [
  { value: 'planejado', label: 'Planejado', color: 'secondary' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'primary' },
  { value: 'colhido', label: 'Colhido', color: 'success' },
  { value: 'perdido', label: 'Perdido', color: 'danger' },
] as const;

export const STATUS_COLHEITA_CHOICES = [
  { value: 'colhida', label: 'Colhida', color: 'warning' },
  { value: 'armazenada', label: 'Armazenada', color: 'info' },
  { value: 'comercializada', label: 'Comercializada', color: 'primary' },
  { value: 'vendida', label: 'Vendida', color: 'success' },
] as const;

export const TIPO_MANEJO_CHOICES = [
  { value: 'poda', label: 'Poda', icon: 'scissors' },
  { value: 'adubacao', label: 'Adubação', icon: 'droplet-fill' },
  { value: 'irrigacao', label: 'Irrigação', icon: 'droplet' },
  { value: 'controle_pragas', label: 'Controle de Pragas', icon: 'bug' },
  { value: 'outro', label: 'Outro', icon: 'gear' },
] as const;

export const STATUS_ORDEM_SERVICO_CHOICES = [
  { value: 'pendente', label: 'Pendente', color: 'secondary' },
  { value: 'aprovada', label: 'Aprovada', color: 'info' },
  { value: 'ativa', label: 'Ativa', color: 'primary' },
  { value: 'finalizada', label: 'Finalizada', color: 'success' },
] as const;

// Helper para obter cor do badge baseado no status
export const getStatusColor = (
  status: string,
  choices: readonly { value: string; label: string; color: string }[]
): string => {
  const choice = choices.find(c => c.value === status);
  return choice?.color || 'secondary';
};

// Helper para obter label do status
export const getStatusLabel = (
  status: string,
  choices: readonly { value: string; label: string }[]
): string => {
  const choice = choices.find(c => c.value === status);
  return choice?.label || status;
};
