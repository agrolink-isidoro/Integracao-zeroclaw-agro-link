import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { MODULE_LABELS } from '../../services/actions';
import ActionStatusBadge from './ActionStatusBadge';
export const ACTION_TYPE_LABELS = {
    operacao_agricola: 'Operação Agrícola',
    colheita: 'Colheita',
    manutencao_maquina: 'Manutenção de Máquina',
    abastecimento: 'Abastecimento',
    parada_maquina: 'Parada de Máquina',
    entrada_estoque: 'Entrada de Estoque',
    saida_estoque: 'Saída de Estoque',
    ajuste_estoque: 'Ajuste de Estoque',
    criar_item_estoque: 'Criar Item de Estoque',
    criar_talhao: 'Criar Talhão',
    atualizar_talhao: 'Atualizar Talhão',
    criar_area: 'Criar Área',
};
/** Returns a short human-readable summary of draft_data for card preview */
function draftSummary(draft) {
    const exclude = ['tenant', 'id'];
    const entries = Object.entries(draft)
        .filter(([k, v]) => !exclude.includes(k) && v !== null && v !== '' && v !== undefined)
        .slice(0, 4)
        .map(([k, v]) => `${k}: ${String(v)}`);
    return entries.join(' · ');
}
const ActionCard = ({ action, onView, onApprove, onReject, loading }) => {
    const isPending = action.status === 'pending_approval';
    return (_jsxs("div", { className: "card h-100 shadow-sm border-0", children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center bg-white border-bottom", children: [_jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx(ActionStatusBadge, { status: action.status }), _jsxs("span", { className: "text-muted small", children: [_jsx("i", { className: "bi bi-grid me-1" }), MODULE_LABELS[action.module] ?? action.module] })] }), _jsx("span", { className: "text-muted small", children: new Date(action.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) })] }), _jsxs("div", { className: "card-body", children: [_jsx("h6", { className: "card-title mb-1", children: ACTION_TYPE_LABELS[action.action_type] ?? action.action_type }), action.criado_por_nome && (_jsxs("p", { className: "text-muted small mb-2", children: [_jsx("i", { className: "bi bi-person me-1" }), action.criado_por_nome] })), action.draft_data && Object.keys(action.draft_data).length > 0 && (_jsx("p", { className: "card-text small text-truncate text-muted", title: draftSummary(action.draft_data), children: draftSummary(action.draft_data) })), action.validation?.erros && action.validation.erros.length > 0 && (_jsxs("div", { className: "alert alert-warning py-1 px-2 small mb-0 mt-2", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-1" }), action.validation.erros[0], action.validation.erros.length > 1 && ` +${action.validation.erros.length - 1} mais`] }))] }), _jsxs("div", { className: "card-footer bg-white border-top d-flex gap-2 justify-content-end", children: [_jsxs("button", { className: "btn btn-sm btn-outline-secondary", onClick: () => onView(action), disabled: loading, children: [_jsx("i", { className: "bi bi-eye me-1" }), "Ver"] }), isPending && (_jsxs(_Fragment, { children: [_jsxs("button", { className: "btn btn-sm btn-outline-danger", onClick: () => onReject(action), disabled: loading, children: [_jsx("i", { className: "bi bi-x-circle me-1" }), "Rejeitar"] }), _jsxs("button", { className: "btn btn-sm btn-success", onClick: () => onApprove(action), disabled: loading, children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Aprovar"] })] }))] })] }));
};
export default ActionCard;
