export interface User {
  id: number;
  username: string;
  email: string;
}

export interface TenantInfo {
  id: string; // UUID
  nome: string;
  slug: string;
  plano: 'basico' | 'profissional' | 'enterprise' | string;
  ativo: boolean;
  modulos_habilitados: string[];
}

export interface CustomUser extends User {
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
  groups?: string[];
  cargo?: string;
  is_active?: boolean;
  tenant?: string | null;     // UUID do tenant
  tenant_info?: TenantInfo | null;
}

export interface Proprietario {
  id: number;
  nome: string;
  cpf_cnpj: string;
  telefone?: string;
  email?: string;
  endereco?: string;
}

export interface Fazenda {
  id: number;
  name: string;
  matricula: string;
  proprietario?: number;
  proprietario_detail?: Proprietario;
  proprietario_nome?: string;
  areas?: Area[];
  areas_count?: number;
  total_hectares?: number;
}

export interface Area {
  id: number;
  fazenda: number;
  fazenda_detail?: Fazenda;
  fazenda_nome?: string;
  name: string;
  geom: string; // WKT or GeoJSON
  proprietario?: number;
  proprietario_detail?: Proprietario;
  proprietario_nome?: string;
  tipo?: 'propria' | 'arrendada';
  custo_arrendamento?: number;
  area_hectares?: number; // Calculado pelo backend via PostGIS
}

// GeoJSON Feature wrapper for Area
export interface AreaFeature {
  type: 'Feature';
  id: number;
  geometry: any;
  properties: Area;
}

export interface Talhao {
  id: number;
  area: number;
  area_detail?: Area;
  area_nome?: string;
  fazenda_id?: number;
  fazenda_nome?: string;
  name: string;
  area_size: number;
  area_hectares?: number; // Calculado pelo backend via PostGIS
}

export interface Arrendamento {
  id: number;
  arrendador: number;
  arrendador_detail?: Proprietario;
  arrendatario: number;
  arrendatario_detail?: Proprietario;
  fazenda: number;
  fazenda_detail?: Fazenda;
  areas: number[];
  areas_details?: Area[];
  start_date: string;
  end_date?: string;
  custo_sacas_hectare: number;
  custo_total_atual?: number; // Calculado pelo backend
}

export interface CotacaoSaca {
  id: number;
  cultura: 'soja' | 'milho' | 'sorgo' | 'trigo';
  data: string;
  preco_por_saca: number;
  fonte: string;
}

export interface DocumentoArrendamento {
  id: number;
  numero_documento: string;
  fazenda: number;
  fazenda_nome?: string;
  arrendador: number;
  arrendador_nome?: string;
  arrendatario: number;
  arrendatario_nome?: string;
  talhoes: number[];
  talhoes_list?: Array<{
    id: number;
    name: string;
    area_hectares: number;
  }>;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  numero_parcelas: number;
  periodicidade: 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  status: 'RASCUNHO' | 'ATIVO' | 'ENCERRADO' | 'CANCELADO';
  observacoes?: string;
  criado_por?: number;
  criado_em?: string;
  atualizado_em?: string;
  parcelas?: ParcelaArrendamento[];
  valor_pago?: number;
  valor_pendente?: number;
}

export interface ParcelaArrendamento {
  id: number;
  documento: number;
  numero_parcela: number;
  valor: number;
  data_vencimento: string;
  vencimento?: number;
  vencimento_id?: number;
  vencimento_status?: string;
  criado_em?: string;
}

export interface OrdemServico {
  id: number;
  talhao: number;
  tipo_manual: boolean;
  tarefa: string;
  maquina: string;
  insumos: unknown[];
  data_inicio: string;
  data_fim?: string;
  status: string;
  aprovacao_ia?: boolean;
  custo_total: number;
}

export interface Insumo {
  id: number;
  nome: string;
  quantidade_estoque: number;
  unidade: string;
  vencimento?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: CustomUser;
  token: string;
}

export interface ModulePermission {
  module: string;
  permissions: string[];
}

// Re-export tipos de módulos específicos
export * from './agricultura';
export * from './estoque_maquinas';
export * from './financeiro';
export * from './rbac';