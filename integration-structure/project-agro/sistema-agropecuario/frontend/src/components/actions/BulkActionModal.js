import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useCallback } from 'react';
import { MODULE_LABELS } from '../../services/actions';
import ActionStatusBadge from './ActionStatusBadge';
import { ACTION_TYPE_LABELS } from './ActionCard';
import { useActions } from '../../contexts/ActionsContext';
const BulkActionModal = ({ title = 'Revisão em lote', actions, onClose, onDone, }) => {
    const { handleBulkApprove } = useActions();
    const [selected, setSelected] = useState(() => new Set(actions.filter((a) => a.status === 'pending_approval').map((a) => a.id)));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const pendingActions = actions.filter((a) => a.status === 'pending_approval');
    const allSelected = pendingActions.length > 0 && pendingActions.every((a) => selected.has(a.id));
    const toggleAll = () => {
        if (allSelected) {
            setSelected(new Set());
        }
        else {
            setSelected(new Set(pendingActions.map((a) => a.id)));
        }
    };
    const toggleOne = useCallback((id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    }, []);
    const handleApprove = async () => {
        if (selected.size === 0)
            return;
        setIsSubmitting(true);
        try {
            await handleBulkApprove([...selected]);
            setResult({ approved: selected.size, errors: [] });
            onDone?.();
        }
        catch (err) {
            setResult({ approved: 0, errors: [err?.message ?? 'Erro ao aprovar'] });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: "modal d-block", tabIndex: -1, style: { backgroundColor: 'rgba(0,0,0,0.5)' }, onClick: (e) => e.target === e.currentTarget && onClose(), children: _jsx("div", { className: "modal-dialog modal-xl modal-dialog-scrollable", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("i", { className: "bi bi-list-check me-2" }), title] }), _jsx("button", { className: "btn-close", onClick: onClose, "aria-label": "Fechar" })] }), _jsx("div", { className: "modal-body p-0", children: result ? (_jsxs("div", { className: "p-4", children: [result.approved > 0 && (_jsxs("div", { className: "alert alert-success", children: [_jsx("i", { className: "bi bi-check-circle me-2" }), _jsxs("strong", { children: [result.approved, " a\u00E7\u00E3o(\u00F5es) aprovada(s) com sucesso!"] })] })), result.errors.map((e, i) => (_jsxs("div", { className: "alert alert-danger", children: [_jsx("i", { className: "bi bi-x-circle me-2" }), e] }, i)))] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "px-3 py-2 border-bottom border-light bg-light d-flex align-items-center gap-3", children: [_jsxs("div", { className: "form-check mb-0", children: [_jsx("input", { id: "selectAll", type: "checkbox", className: "form-check-input", checked: allSelected, onChange: toggleAll, disabled: pendingActions.length === 0 }), _jsx("label", { htmlFor: "selectAll", className: "form-check-label small fw-semibold", children: "Selecionar todos pendentes" })] }), _jsxs("span", { className: "text-muted small ms-auto", children: [selected.size, " de ", pendingActions.length, " selecionados"] })] }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover align-middle mb-0", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { style: { width: 40 } }), _jsx("th", { children: "Tipo" }), _jsx("th", { children: "M\u00F3dulo" }), _jsx("th", { children: "Resumo" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Criado por" })] }) }), _jsxs("tbody", { children: [actions.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "text-center text-muted py-4", children: "Nenhuma a\u00E7\u00E3o gerada." }) })), actions.map((action) => {
                                                        const isPending = action.status === 'pending_approval';
                                                        const isChecked = selected.has(action.id);
                                                        return (_jsxs("tr", { className: isChecked ? 'table-primary' : '', children: [_jsx("td", { children: isPending ? (_jsx("input", { type: "checkbox", className: "form-check-input", checked: isChecked, onChange: () => toggleOne(action.id) })) : (_jsx("i", { className: "bi bi-dash text-muted" })) }), _jsx("td", { className: "small", children: ACTION_TYPE_LABELS[action.action_type] ?? action.action_type }), _jsx("td", { className: "small", children: MODULE_LABELS[action.module] ?? action.module }), _jsx("td", { className: "small text-muted", style: { maxWidth: 260 }, children: _jsx("span", { className: "text-truncate d-block", children: action.draft_data
                                                                            ? Object.values(action.draft_data).filter(Boolean).slice(0, 3).join(' · ')
                                                                            : '—' }) }), _jsxs("td", { children: [_jsx(ActionStatusBadge, { status: action.status }), action.validation?.erros && action.validation.erros.length > 0 && (_jsx("i", { className: "bi bi-exclamation-triangle text-warning ms-1", title: action.validation.erros.join('; ') }))] }), _jsx("td", { className: "small text-muted", children: action.criado_por_nome ?? '—' })] }, action.id));
                                                    })] })] }) })] })) }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: onClose, children: result ? 'Fechar' : 'Cancelar' }), !result && (_jsx("button", { className: "btn btn-success btn-sm", onClick: handleApprove, disabled: selected.size === 0 || isSubmitting, children: isSubmitting ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-1" }), "Aprovando\u2026"] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-check-all me-1" }), "Aprovar ", selected.size, " selecionadas"] })) }))] })] }) }) }));
};
export default BulkActionModal;
