import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { MODULE_LABELS, updateActionDraft } from '../../services/actions';
import ActionStatusBadge from './ActionStatusBadge';
import { ACTION_TYPE_LABELS } from './ActionCard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DRAFT_FIELD_CONFIG, getFieldLabel } from './draftFieldConfig';
import { useDraftOptions } from './useDraftOptions';
import DynamicSearchSelect from './DynamicSearchSelect';
const TaskModal = ({ action, onClose, onApprove, onReject }) => {
    const queryClient = useQueryClient();
    const [editedDraft, setEditedDraft] = useState({});
    const [draftEdited, setDraftEdited] = useState(false);
    // Carrega opções de dropdown para o action_type atual
    const { optionsMap, isLoading: optionsLoading } = useDraftOptions(action?.action_type);
    useEffect(() => {
        if (action) {
            setEditedDraft({ ...(action.draft_data ?? {}) });
            setDraftEdited(false);
        }
    }, [action]);
    const saveMutation = useMutation({
        mutationFn: () => updateActionDraft(action.id, editedDraft),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['actions'] });
            setDraftEdited(false);
        },
    });
    if (!action)
        return null;
    const isPending = action.status === 'pending_approval';
    const handleFieldChange = (key, value) => {
        setEditedDraft((prev) => ({ ...prev, [key]: value }));
        setDraftEdited(true);
    };
    /** Resolve as opções para um campo select */
    const getSelectOptions = (actionType, fieldKey) => {
        const config = DRAFT_FIELD_CONFIG[actionType];
        const fieldDef = config?.[fieldKey];
        if (!fieldDef?.select)
            return null;
        const { source, options: staticOptions } = fieldDef.select;
        if (source === 'static' && staticOptions) {
            return staticOptions.map((o) => ({ value: o.value, label: o.label }));
        }
        return optionsMap[source] ?? [];
    };
    /** Resolve config dinâmica para um campo */
    const getDynamicConfig = (actionType, fieldKey) => {
        const config = DRAFT_FIELD_CONFIG[actionType];
        return config?.[fieldKey]?.dynamic ?? null;
    };
    const renderDraftFields = () => {
        const entries = Object.entries(editedDraft);
        if (entries.length === 0)
            return _jsx("p", { className: "text-muted small", children: "Sem dados de rascunho." });
        return (_jsx("div", { className: "row g-2", children: entries.map(([key, value]) => {
                const label = getFieldLabel(action.action_type, key);
                const selectOptions = getSelectOptions(action.action_type, key);
                const dynamicConfig = getDynamicConfig(action.action_type, key);
                return (_jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label small text-muted mb-1", children: label }), isPending ? (dynamicConfig !== null ? (
                        // ── Busca dinâmica (autocomplete) ───────────────────
                        _jsx(DynamicSearchSelect, { config: dynamicConfig, value: String(value ?? ''), onChange: (v) => handleFieldChange(key, v), placeholder: `Buscar ${label.toLowerCase()}…` })) : selectOptions !== null ? (
                        // ── Select dropdown estático ────────────────────────
                        _jsxs("select", { className: "form-select form-select-sm", value: String(value ?? ''), onChange: (e) => handleFieldChange(key, e.target.value), disabled: optionsLoading, children: [_jsx("option", { value: "", children: optionsLoading ? 'Carregando...' : '— Selecione —' }), selectOptions.map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value))), !!value && !selectOptions.some((o) => o.value === String(value)) && (_jsxs("option", { value: String(value), children: [String(value), " (valor atual)"] }))] })) : (
                        // ── Input text padrão ───────────────────────────────
                        _jsx("input", { type: "text", className: "form-control form-control-sm", value: String(value ?? ''), onChange: (e) => handleFieldChange(key, e.target.value) }))) : (_jsx("p", { className: "form-control-plaintext form-control-sm py-0 small", children: String(value ?? '—') }))] }, key));
            }) }));
    };
    return (_jsx("div", { className: "modal d-block", tabIndex: -1, style: { backgroundColor: 'rgba(0,0,0,0.5)' }, onClick: (e) => e.target === e.currentTarget && onClose(), children: _jsx("div", { className: "modal-dialog modal-lg modal-dialog-scrollable", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("div", { children: [_jsx("h5", { className: "modal-title mb-1", children: ACTION_TYPE_LABELS[action.action_type] ?? action.action_type }), _jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx(ActionStatusBadge, { status: action.status }), _jsx("span", { className: "text-muted small", children: MODULE_LABELS[action.module] ?? action.module })] })] }), _jsx("button", { className: "btn-close", onClick: onClose, "aria-label": "Fechar" })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("div", { className: "mb-3 d-flex flex-wrap gap-3 small text-muted", children: [action.criado_por_nome && (_jsxs("span", { children: [_jsx("i", { className: "bi bi-person me-1" }), "Criado por: ", _jsx("strong", { children: action.criado_por_nome })] })), _jsxs("span", { children: [_jsx("i", { className: "bi bi-calendar me-1" }), new Date(action.criado_em).toLocaleString('pt-BR')] }), action.aprovado_por_nome && (_jsxs("span", { children: [_jsx("i", { className: "bi bi-check-circle me-1 text-success" }), "Aprovado por: ", _jsx("strong", { children: action.aprovado_por_nome })] })), action.upload_nome && (_jsxs("span", { children: [_jsx("i", { className: "bi bi-file-earmark me-1" }), "Arquivo: ", _jsx("strong", { children: action.upload_nome })] }))] }), action.validation?.avisos && action.validation.avisos.length > 0 && (_jsxs("div", { className: "alert alert-warning small mb-3", children: [_jsxs("strong", { children: [_jsx("i", { className: "bi bi-exclamation-triangle me-1" }), "Avisos de valida\u00E7\u00E3o:"] }), _jsx("ul", { className: "mb-0 mt-1 ps-3", children: action.validation.avisos.map((aviso, i) => (_jsx("li", { children: aviso }, i))) })] })), action.validation?.erros && action.validation.erros.length > 0 && (_jsxs("div", { className: "alert alert-danger small mb-3", children: [_jsxs("strong", { children: [_jsx("i", { className: "bi bi-x-circle me-1" }), "Erros de valida\u00E7\u00E3o:"] }), _jsx("ul", { className: "mb-0 mt-1 ps-3", children: action.validation.erros.map((erro, i) => (_jsx("li", { children: erro }, i))) })] })), _jsxs("h6", { className: "text-muted mb-2", children: [_jsx("i", { className: "bi bi-pencil-square me-1" }), "Dados da a\u00E7\u00E3o"] }), renderDraftFields(), action.status === 'rejected' && action.meta?.motivo_rejeicao && (_jsxs("div", { className: "alert alert-secondary mt-3 small", children: [_jsx("i", { className: "bi bi-chat-left-text me-1" }), _jsx("strong", { children: "Motivo da rejei\u00E7\u00E3o:" }), " ", action.meta.motivo_rejeicao] })), action.resultado_execucao && (_jsxs("div", { className: "mt-3", children: [_jsxs("h6", { className: "text-muted mb-2", children: [_jsx("i", { className: "bi bi-terminal me-1" }), "Resultado da execu\u00E7\u00E3o"] }), _jsx("pre", { className: "bg-light p-2 rounded small", style: { maxHeight: 120, overflow: 'auto' }, children: JSON.stringify(action.resultado_execucao, null, 2) })] }))] }), _jsxs("div", { className: "modal-footer", children: [draftEdited && isPending && (_jsx("button", { className: "btn btn-outline-primary btn-sm me-auto", disabled: saveMutation.isPending, onClick: () => saveMutation.mutate(), children: saveMutation.isPending
                                    ? _jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-1" }), "Salvando\u2026"] })
                                    : _jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-save me-1" }), "Salvar rascunho"] }) })), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: onClose, children: "Fechar" }), isPending && (_jsxs(_Fragment, { children: [_jsxs("button", { className: "btn btn-outline-danger btn-sm", onClick: () => onReject(action), disabled: saveMutation.isPending, children: [_jsx("i", { className: "bi bi-x-circle me-1" }), "Rejeitar"] }), _jsxs("button", { className: "btn btn-success btn-sm", onClick: () => {
                                            if (draftEdited)
                                                saveMutation.mutate();
                                            onApprove(action);
                                        }, disabled: saveMutation.isPending, children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Aprovar"] })] }))] })] }) }) }));
};
export default TaskModal;
