/**
 * draftFieldConfig.ts
 *
 * Configuração dos campos do draft_data por action_type.
 *
 * Define quais campos devem ser renderizados como <select> (referenciando
 * entidades cadastradas) em vez de <input type="text"> no TaskModal.
 *
 * "source" indica de onde buscar as opções:
 *   equipamentos  → GET /maquinas/equipamentos/       → nome
 *   produtos      → GET /estoque/produtos/             → nome
 *   fazendas      → GET /fazendas/                     → name
 *   areas         → GET /areas/                        → name
 *   talhoes       → GET /talhoes/                      → name
 *   safras        → GET /agricultura/plantios/         → cultura_nome + talhoes_nomes
 *   proprietarios → GET /proprietarios/                → nome
 *   categorias_eq → GET /maquinas/categorias/          → nome
 *   locais        → GET /estoque/locais-armazenamento/ → nome
 *   static        → opções fixas definidas em "options"
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type FieldSource =
  | 'equipamentos'
  | 'produtos'
  | 'fazendas'
  | 'areas'
  | 'talhoes'
  | 'safras'
  | 'proprietarios'
  | 'categorias_eq'
  | 'locais'
  | 'static';

export interface SelectFieldDef {
  /** Label legível para o campo */
  label: string;
  /** Origem dos dados do dropdown */
  source: FieldSource;
  /** Opções fixas (quando source === 'static') */
  options?: { value: string; label: string }[];
  /** Campo da entidade a ser exibido como label (default: 'nome') */
  displayField?: string;
  /** Campo da entidade a ser usado como value (default: displayField) */
  valueField?: string;
}

/** Configuração de campo com busca dinâmica (autocomplete via API) */
export interface DynamicFieldDef {
  /** Endpoint relativo da API (ex: '/estoque/produtos/') */
  endpoint: string;
  /** Parâmetro de busca (ex: 'search') */
  searchParam: string;
  /** Campo da resposta a usar como label */
  displayField: string;
  /** Campo da resposta a usar como value */
  valueField: string;
  /** Número máximo de resultados */
  pageSize?: number;
}

export interface FieldDef {
  label: string;
  /** Se definido, renderiza como select dropdown estático */
  select?: SelectFieldDef;
  /** Se definido, renderiza como campo de busca dinâmica (autocomplete) */
  dynamic?: DynamicFieldDef;
  /** Se true, campo oculto (não exibir) */
  hidden?: boolean;
}

// ─── Configuração de campos por action_type ──────────────────────────────────

/**
 * Mapeamento: action_type → { campo_draft_data → FieldDef }
 * Campos não listados aqui são renderizados como input text padrão.
 */
export const DRAFT_FIELD_CONFIG: Record<string, Record<string, FieldDef>> = {

  // ═══ MÓDULO MÁQUINAS ═══════════════════════════════════════════════════════

  abastecimento: {
    maquina_nome: {
      label: 'Máquina',
      select: { label: 'Máquina', source: 'equipamentos', displayField: 'nome', valueField: 'nome' },
    },
    quantidade_litros: { label: 'Quantidade (litros)' },
    valor_unitario: { label: 'Valor Unitário (R$)' },
    data: { label: 'Data' },
    horimetro: { label: 'Horímetro' },
    responsavel: { label: 'Responsável' },
    local_abastecimento: { label: 'Local do Abastecimento' },
    observacoes: { label: 'Observações' },
  },

  manutencao_maquina: {
    maquina_nome: {
      label: 'Máquina',
      select: { label: 'Máquina', source: 'equipamentos', displayField: 'nome', valueField: 'nome' },
    },
    tipo_registro: {
      label: 'Tipo de Registro',
      select: {
        label: 'Tipo de Registro',
        source: 'static',
        options: [
          { value: 'manutencao', label: 'Manutenção' },
          { value: 'revisao', label: 'Revisão' },
          { value: 'reparo', label: 'Reparo' },
          { value: 'troca_oleo', label: 'Troca de Óleo' },
          { value: 'abastecimento', label: 'Abastecimento' },
          { value: 'parada', label: 'Parada' },
        ],
      },
    },
    data: { label: 'Data' },
    descricao: { label: 'Descrição' },
    custo: { label: 'Custo (R$)' },
    tecnico: { label: 'Técnico' },
    horas_trabalhadas: { label: 'Horímetro (horas)' },
    km_rodados: { label: 'Km Rodados' },
    prestador_servico: { label: 'Prestador de Serviço' },
    prioridade: {
      label: 'Prioridade',
      select: {
        label: 'Prioridade',
        source: 'static',
        options: [
          { value: 'baixa', label: 'Baixa' },
          { value: 'media', label: 'Média' },
          { value: 'alta', label: 'Alta' },
          { value: 'critica', label: 'Crítica' },
        ],
      },
    },
    observacoes: { label: 'Observações' },
  },

  ordem_servico_maquina: {
    equipamento: {
      label: 'Equipamento',
      select: { label: 'Equipamento', source: 'equipamentos', displayField: 'nome', valueField: 'nome' },
    },
    descricao_problema: { label: 'Descrição do Problema' },
    tipo: {
      label: 'Tipo',
      select: {
        label: 'Tipo',
        source: 'static',
        options: [
          { value: 'corretiva', label: 'Corretiva' },
          { value: 'preventiva', label: 'Preventiva' },
          { value: 'preditiva', label: 'Preditiva' },
          { value: 'melhoria', label: 'Melhoria' },
        ],
      },
    },
    prioridade: {
      label: 'Prioridade',
      select: {
        label: 'Prioridade',
        source: 'static',
        options: [
          { value: 'baixa', label: 'Baixa' },
          { value: 'media', label: 'Média' },
          { value: 'alta', label: 'Alta' },
          { value: 'critica', label: 'Crítica' },
        ],
      },
    },
    status: {
      label: 'Status',
      select: {
        label: 'Status',
        source: 'static',
        options: [
          { value: 'aberta', label: 'Aberta' },
          { value: 'em_andamento', label: 'Em Andamento' },
          { value: 'aguardando_pecas', label: 'Aguardando Peças' },
          { value: 'concluida', label: 'Concluída' },
          { value: 'cancelada', label: 'Cancelada' },
        ],
      },
    },
    data_previsao: { label: 'Data Prevista' },
    custo_mao_obra: { label: 'Custo de Mão de Obra (R$)' },
    responsavel: { label: 'Responsável' },
    prestador_servico: { label: 'Prestador de Serviço' },
    observacoes: { label: 'Observações' },
  },

  parada_maquina: {
    maquina_nome: {
      label: 'Máquina',
      select: { label: 'Máquina', source: 'equipamentos', displayField: 'nome', valueField: 'nome' },
    },
    data: { label: 'Data' },
    descricao: { label: 'Descrição' },
    observacoes: { label: 'Observações' },
  },

  criar_equipamento: {
    nome: { label: 'Nome' },
    categoria: {
      label: 'Categoria',
      select: { label: 'Categoria', source: 'categorias_eq', displayField: 'nome', valueField: 'nome' },
    },
    marca: { label: 'Marca' },
    modelo: { label: 'Modelo' },
    ano_fabricacao: { label: 'Ano de Fabricação' },
    numero_serie: { label: 'Número de Série' },
    potencia_cv: { label: 'Potência (CV)' },
    capacidade_litros: { label: 'Capacidade (litros)' },
    horimetro_atual: { label: 'Horímetro Atual' },
    valor_aquisicao: { label: 'Valor de Aquisição (R$)' },
    data_aquisicao: { label: 'Data de Aquisição' },
    status: {
      label: 'Status',
      select: {
        label: 'Status',
        source: 'static',
        options: [
          { value: 'ativo', label: 'Ativo' },
          { value: 'inativo', label: 'Inativo' },
          { value: 'manutenção', label: 'Em Manutenção' },
          { value: 'vendido', label: 'Vendido' },
        ],
      },
    },
    local_instalacao: { label: 'Local de Instalação' },
    observacoes: { label: 'Observações' },
  },

  // ═══ MÓDULO ESTOQUE ════════════════════════════════════════════════════════

  entrada_estoque: {
    nome_produto: {
      label: 'Produto',
      dynamic: { endpoint: '/estoque/produtos/', searchParam: 'search', displayField: 'nome', valueField: 'nome', pageSize: 15 },
    },
    codigo_produto: { label: 'Código do Produto' },
    quantidade: { label: 'Quantidade' },
    unidade: { label: 'Unidade' },
    data: { label: 'Data' },
    fornecedor: { label: 'Fornecedor' },
    valor_unitario: { label: 'Valor Unitário (R$)' },
    numero_nf: { label: 'Número NF' },
    local_armazenamento: {
      label: 'Local de Armazenamento',
      select: { label: 'Local', source: 'locais', displayField: 'nome', valueField: 'nome' },
    },
    motivo: { label: 'Motivo' },
    documento_referencia: { label: 'Documento Referência' },
    observacoes: { label: 'Observações' },
  },

  saida_estoque: {
    nome_produto: {
      label: 'Produto',
      dynamic: { endpoint: '/estoque/produtos/', searchParam: 'search', displayField: 'nome', valueField: 'nome', pageSize: 15 },
    },
    codigo_produto: { label: 'Código do Produto' },
    quantidade: { label: 'Quantidade' },
    unidade: { label: 'Unidade' },
    data: { label: 'Data' },
    destino: { label: 'Destino' },
    local_armazenamento: {
      label: 'Local de Armazenamento',
      select: { label: 'Local', source: 'locais', displayField: 'nome', valueField: 'nome' },
    },
    motivo: { label: 'Motivo' },
    documento_referencia: { label: 'Documento Referência' },
    observacoes: { label: 'Observações' },
  },

  ajuste_estoque: {
    nome_produto: {
      label: 'Produto',
      dynamic: { endpoint: '/estoque/produtos/', searchParam: 'search', displayField: 'nome', valueField: 'nome', pageSize: 15 },
    },
    codigo_produto: { label: 'Código do Produto' },
    quantidade: { label: 'Quantidade' },
    data: { label: 'Data' },
    motivo: { label: 'Motivo' },
    observacoes: { label: 'Observações' },
  },

  criar_item_estoque: {
    nome: { label: 'Nome' },
    codigo: { label: 'Código' },
    categoria: {
      label: 'Categoria',
      select: {
        label: 'Categoria',
        source: 'static',
        options: [
          { value: 'semente', label: 'Semente' },
          { value: 'fertilizante', label: 'Fertilizante' },
          { value: 'defensivo', label: 'Defensivo' },
          { value: 'combustivel', label: 'Combustível' },
          { value: 'peca_reposicao', label: 'Peça de Reposição' },
          { value: 'outros', label: 'Outros' },
        ],
      },
    },
    unidade: { label: 'Unidade' },
    estoque_minimo: { label: 'Estoque Mínimo' },
    custo_unitario: { label: 'Custo Unitário (R$)' },
    preco_unitario: { label: 'Preço Unitário (R$)' },
    local_armazenamento: {
      label: 'Local de Armazenamento',
      select: { label: 'Local', source: 'locais', displayField: 'nome', valueField: 'nome' },
    },
    fornecedor_nome: { label: 'Fornecedor' },
    vencimento: { label: 'Vencimento' },
    lote: { label: 'Lote' },
    principio_ativo: { label: 'Princípio Ativo' },
    dosagem_padrao: { label: 'Dosagem Padrão' },
    unidade_dosagem: { label: 'Unidade de Dosagem' },
    observacoes: { label: 'Observações' },
  },

  movimentacao_interna: {
    produto: {
      label: 'Produto',
      dynamic: { endpoint: '/estoque/produtos/', searchParam: 'search', displayField: 'nome', valueField: 'nome', pageSize: 15 },
    },
    quantidade: { label: 'Quantidade' },
    localizacao_origem: { label: 'Origem' },
    localizacao_destino: {
      label: 'Destino',
      select: { label: 'Destino', source: 'locais', displayField: 'nome', valueField: 'nome' },
    },
    lote: { label: 'Lote' },
    observacao: { label: 'Observação' },
  },

  // ═══ MÓDULO FAZENDAS ═══════════════════════════════════════════════════════

  criar_fazenda: {
    name: { label: 'Nome' },
    matricula: { label: 'Matrícula' },
    proprietario: {
      label: 'Proprietário',
      select: { label: 'Proprietário', source: 'proprietarios', displayField: 'nome', valueField: 'nome' },
    },
  },

  criar_area: {
    name: { label: 'Nome' },
    fazenda: {
      label: 'Fazenda',
      select: { label: 'Fazenda', source: 'fazendas', displayField: 'name', valueField: 'name' },
    },
    proprietario: {
      label: 'Proprietário',
      select: { label: 'Proprietário', source: 'proprietarios', displayField: 'nome', valueField: 'nome' },
    },
    tipo: {
      label: 'Tipo',
      select: {
        label: 'Tipo',
        source: 'static',
        options: [
          { value: 'propria', label: 'Própria' },
          { value: 'arrendada', label: 'Arrendada' },
        ],
      },
    },
    custo_arrendamento: { label: 'Custo de Arrendamento' },
    observacoes: { label: 'Observações' },
  },

  criar_talhao: {
    nome: { label: 'Nome' },
    area_ha: { label: 'Área (ha)' },
    area_nome: {
      label: 'Área',
      select: { label: 'Área', source: 'areas', displayField: 'name', valueField: 'name' },
    },
    fazenda: {
      label: 'Fazenda',
      select: { label: 'Fazenda', source: 'fazendas', displayField: 'name', valueField: 'name' },
    },
    codigo: { label: 'Código' },
    custo_arrendamento: { label: 'Custo Arrendamento' },
    observacoes: { label: 'Observações' },
  },

  atualizar_talhao: {
    nome: { label: 'Nome' },
    area_ha: { label: 'Área (ha)' },
    area_nome: {
      label: 'Área',
      select: { label: 'Área', source: 'areas', displayField: 'name', valueField: 'name' },
    },
    observacoes: { label: 'Observações' },
  },

  criar_proprietario: {
    nome: { label: 'Nome' },
    cpf_cnpj: { label: 'CPF/CNPJ' },
    telefone: { label: 'Telefone' },
    email: { label: 'Email' },
    endereco: { label: 'Endereço' },
  },

  registrar_arrendamento: {
    arrendador: {
      label: 'Arrendador',
      select: { label: 'Arrendador', source: 'proprietarios', displayField: 'nome', valueField: 'nome' },
    },
    arrendatario: {
      label: 'Arrendatário',
      select: { label: 'Arrendatário', source: 'proprietarios', displayField: 'nome', valueField: 'nome' },
    },
    fazenda: {
      label: 'Fazenda',
      select: { label: 'Fazenda', source: 'fazendas', displayField: 'name', valueField: 'name' },
    },
    areas: { label: 'Áreas' },
    start_date: { label: 'Data de Início' },
    end_date: { label: 'Data de Término' },
    custo_sacas_hectare: { label: 'Custo (sacas/ha)' },
  },

  // ═══ MÓDULO AGRICULTURA ════════════════════════════════════════════════════

  criar_safra: {
    fazenda: {
      label: 'Fazenda',
      select: { label: 'Fazenda', source: 'fazendas', displayField: 'name', valueField: 'name' },
    },
    cultura: { label: 'Cultura' },
    data_plantio: { label: 'Data de Plantio' },
    talhoes: {
      label: 'Talhões',
      select: { label: 'Talhões', source: 'talhoes', displayField: 'name', valueField: 'name' },
    },
    variedades: { label: 'Variedades' },
    status: {
      label: 'Status',
      select: {
        label: 'Status',
        source: 'static',
        options: [
          { value: 'planejado', label: 'Planejado' },
          { value: 'em_andamento', label: 'Em Andamento' },
          { value: 'colhido', label: 'Colhido' },
          { value: 'perdido', label: 'Perdido' },
        ],
      },
    },
    observacoes: { label: 'Observações' },
  },

  colheita: {
    safra: {
      label: 'Safra/Plantio',
      select: { label: 'Safra', source: 'safras', displayField: 'cultura_nome', valueField: 'cultura_nome' },
    },
    talhao: {
      label: 'Talhão',
      select: { label: 'Talhão', source: 'talhoes', displayField: 'name', valueField: 'name' },
    },
    data_colheita: { label: 'Data da Colheita' },
    producao_total: { label: 'Produção Total' },
    unidade: {
      label: 'Unidade',
      select: {
        label: 'Unidade',
        source: 'static',
        options: [
          { value: 'sc', label: 'Sacas (sc)' },
          { value: 'kg', label: 'Quilogramas (kg)' },
          { value: 't', label: 'Toneladas (t)' },
        ],
      },
    },
    area_ha: { label: 'Área (ha)' },
    umidade_perc: { label: 'Umidade (%)' },
    qualidade: { label: 'Qualidade' },
    placa: { label: 'Placa' },
    motorista: { label: 'Motorista' },
    tara: { label: 'Tara (kg)' },
    peso_bruto: { label: 'Peso Bruto (kg)' },
    custo_transporte: { label: 'Custo Transporte (R$)' },
    destino_tipo: {
      label: 'Tipo de Destino',
      select: {
        label: 'Tipo de Destino',
        source: 'static',
        options: [
          { value: 'armazenagem_interna', label: 'Armazenagem Interna' },
          { value: 'contrato_industria', label: 'Contrato/Indústria' },
          { value: 'armazenagem_geral', label: 'Armazenagem Geral' },
        ],
      },
    },
    local_destino: {
      label: 'Local de Destino',
      select: { label: 'Local', source: 'locais', displayField: 'nome', valueField: 'nome' },
    },
    empresa_destino: { label: 'Empresa Destino' },
    nf_provisoria: { label: 'NF Provisória' },
    peso_estimado: { label: 'Peso Estimado (kg)' },
    observacoes: { label: 'Observações' },
  },

  operacao_agricola: {
    safra: {
      label: 'Safra/Plantio',
      select: { label: 'Safra', source: 'safras', displayField: 'cultura_nome', valueField: 'cultura_nome' },
    },
    talhao: {
      label: 'Talhão',
      select: { label: 'Talhão', source: 'talhoes', displayField: 'name', valueField: 'name' },
    },
    data_operacao: { label: 'Data da Operação' },
    atividade: { label: 'Atividade' },
    insumo: { label: 'Insumo' },
    quantidade: { label: 'Quantidade' },
    unidade: { label: 'Unidade' },
    custo_unitario: { label: 'Custo Unitário (R$)' },
    area_ha: { label: 'Área (ha)' },
    observacoes: { label: 'Observações' },
  },

  registrar_manejo: {
    tipo: { label: 'Tipo de Manejo' },
    data_manejo: { label: 'Data do Manejo' },
    descricao: { label: 'Descrição' },
    talhoes: {
      label: 'Talhões',
      select: { label: 'Talhões', source: 'talhoes', displayField: 'name', valueField: 'name' },
    },
    safra: {
      label: 'Safra/Plantio',
      select: { label: 'Safra', source: 'safras', displayField: 'cultura_nome', valueField: 'cultura_nome' },
    },
    equipamento: {
      label: 'Equipamento',
      select: { label: 'Equipamento', source: 'equipamentos', displayField: 'nome', valueField: 'nome' },
    },
    observacoes: { label: 'Observações' },
  },

  ordem_servico_agricola: {
    tarefa: { label: 'Tarefa' },
    data_inicio: { label: 'Data de Início' },
    talhoes: {
      label: 'Talhões',
      select: { label: 'Talhões', source: 'talhoes', displayField: 'name', valueField: 'name' },
    },
    safra: {
      label: 'Safra/Plantio',
      select: { label: 'Safra', source: 'safras', displayField: 'cultura_nome', valueField: 'cultura_nome' },
    },
    maquina: {
      label: 'Máquina',
      select: { label: 'Máquina', source: 'equipamentos', displayField: 'nome', valueField: 'nome' },
    },
    data_fim: { label: 'Data de Término' },
    status: {
      label: 'Status',
      select: {
        label: 'Status',
        source: 'static',
        options: [
          { value: 'aberta', label: 'Aberta' },
          { value: 'em_andamento', label: 'Em Andamento' },
          { value: 'concluida', label: 'Concluída' },
          { value: 'cancelada', label: 'Cancelada' },
        ],
      },
    },
    observacoes: { label: 'Observações' },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Retorna as sources (não-static) necessárias para um dado action_type.
 * Usado para carregar apenas os dados necessários via API.
 */
export function getRequiredSources(actionType: string): FieldSource[] {
  const config = DRAFT_FIELD_CONFIG[actionType];
  if (!config) return [];

  const sources = new Set<FieldSource>();
  for (const field of Object.values(config)) {
    if (field.select && field.select.source !== 'static') {
      sources.add(field.select.source);
    }
  }
  return Array.from(sources);
}

/**
 * Retorna o label legível de um campo, usando config se houver,
 * senão faz um fallback humanizado (replace _ por espaço + capitalize).
 */
export function getFieldLabel(actionType: string, fieldKey: string): string {
  const config = DRAFT_FIELD_CONFIG[actionType];
  if (config?.[fieldKey]?.label) return config[fieldKey].label;
  // Fallback: humanize
  return fieldKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
