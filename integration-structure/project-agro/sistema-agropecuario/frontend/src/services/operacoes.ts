import api from './api';

export type Categoria = {
  value: string;
  label: string;
};

export type Tipo = {
  value: string;
  label: string;
};

export type TiposPorCategoriaResponse = {
  categoria: string;
  tipos: Tipo[];
};

export type ProdutoOperacao = {
  produto_id?: number | null;
  dosagem?: number | null;
  unidade_dosagem?: string | null;
};

// Status da Operacao (alinhado com backend Operacao.STATUS_CHOICES)
export type StatusOperacao = 'planejada' | 'em_andamento' | 'concluida' | 'cancelada';

export type OperacaoCreate = {
  categoria: string;
  tipo: string;
  plantio?: number;
  fazenda?: number;
  talhoes: number[];
  trator?: number;
  implemento?: number;
  data_operacao?: string;
  data_inicio: string;
  data_fim?: string;
  status: StatusOperacao;
  observacoes?: string;
  custo_mao_obra?: number;
  custo_maquina?: number;
  custo_insumos?: number;
  produtos_input?: ProdutoOperacao[];
  dados_especificos?: Record<string, any>;
};

export type Operacao = OperacaoCreate & {
  id: number;
  categoria_display: string;
  tipo_display: string;
  status_display?: string;
  area_total_ha: number;
  custo_total?: number;
  criado_em: string;
  atualizado_em?: string;
  cultura_nome?: string | null;
  data_operacao?: string;
};

const operacoesService = {
  // Listar operações
  async listar(params?: any): Promise<Operacao[]> {
    const response = await api.get('/agricultura/operacoes/', { params });
    return response.data.results || response.data;
  },

  // Buscar operação por ID
  async buscar(id: number): Promise<Operacao> {
    const response = await api.get(`/agricultura/operacoes/${id}/`);
    return response.data;
  },

  // Criar nova operação
  async criar(data: OperacaoCreate): Promise<Operacao> {
    const response = await api.post('/agricultura/operacoes/', data);
    return response.data;
  },

  // Atualizar operação
  async atualizar(id: number, data: Partial<OperacaoCreate>): Promise<Operacao> {
    const response = await api.patch(`/agricultura/operacoes/${id}/`, data);
    return response.data;
  },

  // Deletar operação
  async deletar(id: number): Promise<void> {
    await api.delete(`/agricultura/operacoes/${id}/`);
  },

  // Buscar tipos por categoria (para o wizard)
  async tiposPorCategoria(categoria: string): Promise<TiposPorCategoriaResponse> {
    const response = await api.get('/agricultura/operacoes/tipos-por-categoria/', {
      params: { categoria }
    });
    return response.data;
  },

  // Estatísticas
  async estatisticas(params?: any): Promise<any> {
    const response = await api.get('/agricultura/operacoes/estatisticas/', { params });
    return response.data;
  },

  // Estimar quantidades e custos com base em talhões/plantio e dosagens
  async estimate(payload: { plantio?: number; talhoes?: number[]; produtos_input?: ProdutoOperacao[] }): Promise<any> {
    const response = await api.post('/agricultura/operacoes/estimate/', payload);
    return response.data;
  },

  // Forçar contabilização de uma operação específica (Manejo/Plantio/Colheita)
  async contabilizarManejo(id: number): Promise<any> {
    const response = await api.post(`/agricultura/manejos/${id}/contabilizar/`);
    return response.data;
  },

  async contabilizarPlantio(id: number): Promise<any> {
    const response = await api.post(`/agricultura/plantios/${id}/contabilizar/`);
    return response.data;
  },

  async recalcularPlantio(id: number, gerarRateio = false): Promise<any> {
    const response = await api.post(`/agricultura/plantios/${id}/recalcular_custos/`, { gerar_rateio: gerarRateio });
    return response.data;
  },

  async contabilizarColheita(id: number): Promise<any> {
    const response = await api.post(`/agricultura/colheitas/${id}/contabilizar/`);
    return response.data;
  },

  // Categorias disponíveis (hardcoded no frontend para performance)
  getCategorias(): Categoria[] {
    return [
      { value: 'preparacao', label: 'Preparação do Solo' },
      { value: 'adubacao', label: 'Adubação' },
      { value: 'plantio', label: 'Plantio' },
      { value: 'tratos', label: 'Tratos Culturais' },
      { value: 'pulverizacao', label: 'Pulverização (Fitossanitário)' },
      { value: 'mecanicas', label: 'Operações Mecânicas' },
    ];
  },

  // Status disponíveis (alinhado com backend Operacao.STATUS_CHOICES)
  getStatusOptions(): Categoria[] {
    return [
      { value: 'planejada', label: 'Planejada' },
      { value: 'em_andamento', label: 'Em Andamento' },
      { value: 'concluida', label: 'Concluída' },
      { value: 'cancelada', label: 'Cancelada' },
    ];
  },
};

export default operacoesService;
