/**
 * services/actions.ts
 *
 * API calls para o Action Queue (fila de aprovação do Isidoro).
 * Usa a instância axios configurada com JWT e base_url /api/.
 */
import api from './api';
// ─────────────────────────────────────────────────────────────────────────────
// Action API
// ─────────────────────────────────────────────────────────────────────────────
/** Lista actions com filtros opcionais. */
export async function listActions(filters = {}) {
    // The api.ts response interceptor normalises paginated DRF responses:
    // it replaces response.data with just the results[] array and saves
    // { count, next, previous } on the non-enumerable response.meta field.
    // We therefore access the response object directly to re-assemble the
    // full PaginatedResponse expected by callers like ActionsPanel.
    const response = await api.get('/actions/', { params: filters });
    const meta = response.meta;
    return {
        count: meta?.count ?? response.data.length,
        next: meta?.next ?? null,
        previous: meta?.previous ?? null,
        results: response.data,
    };
}
/** Lista apenas actions pendentes de aprovação. */
export async function listPendingActions(module) {
    const params = {};
    if (module)
        params.module = module;
    const { data } = await api.get('/actions/pendentes/', { params });
    return data;
}
/** Obtém uma action pelo ID. */
export async function getAction(id) {
    const { data } = await api.get(`/actions/${id}/`);
    return data;
}
/** Aprova uma action pendente. */
export async function approveAction(id) {
    const { data } = await api.post(`/actions/${id}/approve/`);
    return data;
}
/** Rejeita uma action pendente. */
export async function rejectAction(id, motivo = '') {
    const { data } = await api.post(`/actions/${id}/reject/`, { motivo });
    return data;
}
/** Aprova múltiplas actions de uma vez. */
export async function bulkApproveActions(actionIds) {
    const { data } = await api.post('/actions/bulk-approve/', {
        action_ids: actionIds,
    });
    return data;
}
/** Atualiza campos de um draft (apenas se status=pending_approval). */
export async function updateActionDraft(id, draftData) {
    const { data } = await api.patch(`/actions/${id}/`, {
        draft_data: draftData,
    });
    return data;
}
// ─────────────────────────────────────────────────────────────────────────────
// Upload API
// ─────────────────────────────────────────────────────────────────────────────
/** Envia arquivo para análise pelo Isidoro. */
export async function uploadFile(file, module, onProgress) {
    const formData = new FormData();
    formData.append('arquivo', file);
    formData.append('nome_original', file.name);
    formData.append('module', module);
    formData.append('mime_type', file.type || 'application/octet-stream');
    formData.append('tamanho', String(file.size));
    const { data } = await api.post('/actions/uploads/', formData, {
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
export async function getUploadStatus(uploadId) {
    const { data } = await api.get(`/actions/uploads/${uploadId}/status/`);
    return data;
}
/** Lista uploads do tenant. */
export async function listUploads(module) {
    const params = module ? { module } : {};
    const { data } = await api.get('/actions/uploads/', { params });
    return data;
}
// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
/** Rótulos legíveis por status */
export const ACTION_STATUS_LABELS = {
    pending_approval: 'Aguardando Aprovação',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    executed: 'Executado',
    failed: 'Falhou',
    archived: 'Arquivado',
};
/** Bootstrap badge background color name by status */
export const ACTION_STATUS_COLORS = {
    pending_approval: 'warning',
    approved: 'primary',
    rejected: 'danger',
    executed: 'success',
    failed: 'danger',
    archived: 'secondary',
};
/** Rótulos de módulo */
export const MODULE_LABELS = {
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
export const MODULE_ACCEPT_FORMATS = {
    agricultura: '.xlsx,.xls,.csv,.md',
    maquinas: '.xlsx,.xls,.csv,.pdf,.docx',
    estoque: '.xml,.pdf,.xlsx,.xls,.csv',
    fazendas: '.kml,.kmz,.geojson,.gpx,.zip',
};
/** Tamanho máximo de upload por módulo (MB) */
export const MODULE_MAX_SIZE = {
    agricultura: 10,
    maquinas: 10,
    estoque: 10,
    fazendas: 25,
};
