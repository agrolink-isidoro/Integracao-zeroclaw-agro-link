/**
 * services/actions.ts
 *
 * API calls para o Action Queue (fila de aprovação do Isidoro).
 * Usa a instância axios configurada com JWT e base_url /api/.
 */

import api from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ActionStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed'
  | 'archived';

export type ActionModule =
  | 'agricultura'
  | 'maquinas'
  | 'estoque'
  | 'fazendas'
  | 'financeiro'
  | 'comercial'
  | 'fiscal'
  | 'administrativo';

export type ActionType =
  | 'operacao_agricola'
  | 'colheita'
  | 'manutencao_maquina'
  | 'abastecimento'
  | 'parada_maquina'
  | 'entrada_estoque'
  | 'saida_estoque'
  | 'ajuste_estoque'
  | 'criar_item_estoque'
  | 'criar_talhao'
  | 'atualizar_talhao';

export type UploadStatus =
  | 'uploaded'
  | 'processing'
  | 'parsed'
  | 'drafts_created'
  | 'completed'
  | 'failed'
  | 'error';

export interface ActionValidation {
  warnings?: string[];
  avisos?: string[];
  erros?: string[];
  errors?: string[];
  is_valid?: boolean;
}

export interface Action {
  id: string;
  module: ActionModule;
  action_type: ActionType;
  status: ActionStatus;
  draft_data: Record<string, unknown>;
  validation: ActionValidation;
  criado_por: string | null;
  criado_por_nome: string;
  aprovado_por: string | null;
  aprovado_por_nome: string | null;
  motivo_rejeicao: string;
  upload: string | null;
  upload_nome: string | null;
  criado_em: string;
  aprovado_em: string | null;
  executado_em: string | null;
  resultado_execucao: Record<string, unknown>;
  meta: Record<string, unknown>;
}

export interface UploadedFile {
  id: string;
  nome_original: string;
  tamanho: number;
  mime_type: string;
  module: ActionModule;
  status: UploadStatus;
  criado_por: string | null;
  criado_por_nome: string | null;
  resultado_parse: Record<string, unknown>;
  mensagem_erro: string;
  criado_em: string;
  processado_em: string | null;
  drafts_count: number;
}

export interface ActionFilters {
  status?: ActionStatus;
  module?: ActionModule;
  action_type?: ActionType;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface BulkApproveResult {
  aprovadas: number;
  erros: Array<{ id: string; erro: string }>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Action API
// ─────────────────────────────────────────────────────────────────────────────

/** Lista actions com filtros opcionais. */
export async function listActions(
  filters: ActionFilters = {}
): Promise<PaginatedResponse<Action>> {
  // The api.ts response interceptor normalises paginated DRF responses:
  // it replaces response.data with just the results[] array and saves
  // { count, next, previous } on the non-enumerable response.meta field.
  // We therefore access the response object directly to re-assemble the
  // full PaginatedResponse expected by callers like ActionsPanel.
  const response = await api.get<Action[]>('/actions/', { params: filters });
  const meta = (response as unknown as { meta?: { count?: number; next?: string | null; previous?: string | null } }).meta;
  return {
    count: meta?.count ?? response.data.length,
    next: meta?.next ?? null,
    previous: meta?.previous ?? null,
    results: response.data,
  };
}

/** Lista apenas actions pendentes de aprovação. */
export async function listPendingActions(module?: ActionModule): Promise<Action[]> {
  const params: Record<string, string> = {};
  if (module) params.module = module;
  const { data } = await api.get<Action[]>('/actions/pendentes/', { params });
  return data;
}

/** Obtém uma action pelo ID. */
export async function getAction(id: string): Promise<Action> {
  const { data } = await api.get<Action>(`/actions/${id}/`);
  return data;
}

/** Aprova uma action pendente. */
export async function approveAction(id: string): Promise<Action> {
  const { data } = await api.post<Action>(`/actions/${id}/approve/`);
  return data;
}

/** Rejeita uma action pendente. */
export async function rejectAction(id: string, motivo = ''): Promise<Action> {
  const { data } = await api.post<Action>(`/actions/${id}/reject/`, { motivo });
  return data;
}

/** Aprova múltiplas actions de uma vez. */
export async function bulkApproveActions(
  actionIds: string[]
): Promise<BulkApproveResult> {
  const { data } = await api.post<BulkApproveResult>('/actions/bulk-approve/', {
    action_ids: actionIds,
  });
  return data;
}

/** Atualiza campos de um draft (apenas se status=pending_approval). */
export async function updateActionDraft(
  id: string,
  draftData: Record<string, unknown>
): Promise<Action> {
  const { data } = await api.patch<Action>(`/actions/${id}/`, {
    draft_data: draftData,
  });
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload API
// ─────────────────────────────────────────────────────────────────────────────

/** Envia arquivo para análise pelo Isidoro. */
export async function uploadFile(
  file: File,
  module: ActionModule,
  onProgress?: (percent: number) => void
): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('arquivo', file);
  formData.append('nome_original', file.name);
  formData.append('module', module);
  formData.append('mime_type', file.type || 'application/octet-stream');
  formData.append('tamanho', String(file.size));

  const { data } = await api.post<UploadedFile>('/actions/uploads/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return data;
}

/** Consulta status do parse de um upload. */
export async function getUploadStatus(uploadId: string): Promise<
  UploadedFile & { actions_geradas: Array<{ id: string; action_type: ActionType; status: ActionStatus; criado_em: string }> }
> {
  const { data } = await api.get(`/actions/uploads/${uploadId}/status/`);
  return data;
}

/** Lista uploads do tenant. */
export async function listUploads(
  module?: ActionModule
): Promise<PaginatedResponse<UploadedFile>> {
  const params = module ? { module } : {};
  const { data } = await api.get<PaginatedResponse<UploadedFile>>(
    '/actions/uploads/',
    { params }
  );
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Rótulos legíveis por status */
export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  pending_approval: 'Aguardando Aprovação',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  executed: 'Executado',
  failed: 'Falhou',
  archived: 'Arquivado',
};

/** Bootstrap badge background color name by status */
export const ACTION_STATUS_COLORS: Record<ActionStatus, string> = {
  pending_approval: 'warning',
  approved: 'primary',
  rejected: 'danger',
  executed: 'success',
  failed: 'danger',
  archived: 'secondary',
};

/** Rótulos de módulo */
export const MODULE_LABELS: Record<ActionModule, string> = {
  agricultura: 'Agricultura',
  maquinas: 'Máquinas',
  estoque: 'Estoque',
  fazendas: 'Fazendas',
  financeiro: 'Financeiro',
  comercial: 'Comercial',
  fiscal: 'Fiscal',
  administrativo: 'Administrativo',
};

/** Formatos de arquivo aceitos por módulo */
export const MODULE_ACCEPT_FORMATS: Record<string, string> = {
  agricultura: '.xlsx,.xls,.csv,.md',
  maquinas: '.xlsx,.xls,.csv,.pdf,.docx',
  estoque: '.xml,.pdf,.xlsx,.xls,.csv',
  fazendas: '.kml,.kmz,.geojson,.gpx,.zip',
};

/** Tamanho máximo de upload por módulo (MB) */
export const MODULE_MAX_SIZE: Record<string, number> = {
  agricultura: 10,
  maquinas: 10,
  estoque: 10,
  fazendas: 25,
};
