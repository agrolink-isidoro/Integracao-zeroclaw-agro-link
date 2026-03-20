import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { listActions, approveAction, rejectAction, MODULE_LABELS, ACTION_STATUS_LABELS, } from '../../services/actions';
import ActionCard from './ActionCard';
import ActionStatusBadge from './ActionStatusBadge';
import TaskModal from './TaskModal';
const PAGE_SIZE = 20;
const ALL_STATUSES = [
    'pending_approval',
    'approved',
    'rejected',
    'executed',
    'failed',
    'archived',
];
const ALL_MODULES = [
    'agricultura',
    'maquinas',
    'estoque',
    'fazendas',
    'comercial',
    'financeiro',
    'fiscal',
    'administrativo',
];
const ActionsPanel = () => {
    const queryClient = useQueryClient();
    // Filters
    const [filters, setFilters] = useState({ status: 'pending_approval' });
    const [page, setPage] = useState(1);
    const [selectedAction, setSelectedAction] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectMotivo, setRejectMotivo] = useState('');
    const [viewMode, setViewMode] = useState('cards');
    // Fetch actions
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['actions', filters, page],
        queryFn: () => listActions({ ...filters, page, page_size: PAGE_SIZE }),
        placeholderData: (prev) => prev,
    });
    const actions = data?.results ?? [];
    const totalCount = data?.count ?? 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: (action) => approveAction(action.id),
        onSuccess: (_, action) => {
            toast.success(`Ação "${action.action_type}" aprovada!`);
            queryClient.invalidateQueries({ queryKey: ['actions'] });
            setSelectedAction(null);
        },
        onError: () => toast.error('Erro ao aprovar ação.'),
    });
    // Reject mutation
    const rejectMutation = useMutation({
        mutationFn: ({ action, motivo }) => rejectAction(action.id, motivo || undefined),
        onSuccess: (_, { action }) => {
            toast.success(`Ação "${action.action_type}" rejeitada.`);
            queryClient.invalidateQueries({ queryKey: ['actions'] });
            setRejectTarget(null);
            setRejectMotivo('');
            setSelectedAction(null);
        },
        onError: () => toast.error('Erro ao rejeitar ação.'),
    });
    const handleApprove = useCallback((action) => {
        approveMutation.mutate(action);
    }, [approveMutation]);
    const handleReject = useCallback((action) => {
        setRejectTarget(action);
        setRejectMotivo('');
    }, []);
    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value || undefined,
        }));
        setPage(1);
    };
    const activeFiltersCount = Object.values(filters).filter((v) => v !== undefined && v !== '' && v !== 'pending_approval').length;
    // Hard refresh
    const handleHardRefresh = useCallback(() => {
        queryClient.refetchQueries({ queryKey: ['actions'] });
    }, [queryClient]);
    return (_jsxs("div", { className: "h-100", children: [_jsx("div", { className: "card border-0 shadow-sm mb-3", children: _jsx("div", { className: "card-body py-2 px-3", children: _jsxs("div", { className: "row g-2 align-items-center", children: [_jsx("div", { className: "col-sm-auto", children: _jsxs("select", { className: "form-select form-select-sm", value: filters.status ?? '', onChange: (e) => handleFilterChange('status', e.target.value), children: [_jsx("option", { value: "", children: "Todos os status" }), ALL_STATUSES.map((s) => (_jsx("option", { value: s, children: ACTION_STATUS_LABELS[s] }, s)))] }) }), _jsx("div", { className: "col-sm-auto", children: _jsxs("select", { className: "form-select form-select-sm", value: filters.module ?? '', onChange: (e) => handleFilterChange('module', e.target.value), children: [_jsx("option", { value: "", children: "Todos os m\u00F3dulos" }), ALL_MODULES.map((m) => (_jsx("option", { value: m, children: MODULE_LABELS[m] }, m)))] }) }), activeFiltersCount > 0 && (_jsx("div", { className: "col-auto", children: _jsxs("button", { className: "btn btn-sm btn-outline-secondary", onClick: () => { setFilters({ status: 'pending_approval' }); setPage(1); }, children: [_jsx("i", { className: "bi bi-x me-1" }), "Limpar filtros"] }) })), _jsxs("div", { className: "col ms-auto d-flex justify-content-end align-items-center gap-2", children: [_jsxs("span", { className: "text-muted small", children: [totalCount, " ", totalCount === 1 ? 'ação' : 'ações', isFetching && _jsx("span", { className: "spinner-border spinner-border-sm ms-2" })] }), _jsxs("button", { className: "btn btn-sm btn-outline-primary", onClick: handleHardRefresh, disabled: isFetching, title: "Recarregar lista de a\u00E7\u00F5es", children: [_jsx("i", { className: `bi bi-arrow-clockwise ${isFetching ? 'spinning' : ''}` }), _jsx("span", { className: "d-none d-sm-inline ms-1", children: "Atualizar" })] }), _jsxs("div", { className: "btn-group btn-group-sm", children: [_jsx("button", { className: `btn btn-outline-secondary ${viewMode === 'cards' ? 'active' : ''}`, onClick: () => setViewMode('cards'), title: "Cart\u00F5es", children: _jsx("i", { className: "bi bi-grid-3x3-gap" }) }), _jsx("button", { className: `btn btn-outline-secondary ${viewMode === 'table' ? 'active' : ''}`, onClick: () => setViewMode('table'), title: "Tabela", children: _jsx("i", { className: "bi bi-list-ul" }) })] })] })] }) }) }), isLoading ? (_jsxs("div", { className: "text-center py-5", children: [_jsx("div", { className: "spinner-border text-primary", role: "status" }), _jsx("p", { className: "text-muted mt-2", children: "Carregando a\u00E7\u00F5es\u2026" })] })) : actions.length === 0 ? (_jsxs("div", { className: "text-center py-5 text-muted", children: [_jsx("i", { className: "bi bi-inbox fs-1 d-block mb-2" }), "Nenhuma a\u00E7\u00E3o encontrada."] })) : viewMode === 'cards' ? (_jsx("div", { className: "row g-3", children: actions.map((action) => (_jsx("div", { className: "col-xl-4 col-lg-6", children: _jsx(ActionCard, { action: action, onView: setSelectedAction, onApprove: handleApprove, onReject: handleReject, loading: approveMutation.isPending || rejectMutation.isPending }) }, action.id))) })) : (_jsx("div", { className: "card border-0 shadow-sm", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover align-middle mb-0", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { children: "Tipo" }), _jsx("th", { children: "M\u00F3dulo" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Criado por" }), _jsx("th", { children: "Data" }), _jsx("th", {})] }) }), _jsx("tbody", { children: actions.map((action) => (_jsxs("tr", { children: [_jsx("td", { className: "small fw-medium", children: action.action_type.replace(/_/g, ' ') }), _jsx("td", { className: "small text-muted", children: MODULE_LABELS[action.module] ?? action.module }), _jsx("td", { children: _jsx(ActionStatusBadge, { status: action.status }) }), _jsx("td", { className: "small text-muted", children: action.criado_por_nome ?? '—' }), _jsx("td", { className: "small text-muted", children: new Date(action.criado_em).toLocaleDateString('pt-BR') }), _jsx("td", { className: "text-end", children: _jsxs("div", { className: "d-flex gap-1 justify-content-end", children: [_jsx("button", { className: "btn btn-sm btn-outline-secondary", onClick: () => setSelectedAction(action), children: _jsx("i", { className: "bi bi-eye" }) }), action.status === 'pending_approval' && (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn btn-sm btn-outline-danger", onClick: () => handleReject(action), children: _jsx("i", { className: "bi bi-x" }) }), _jsx("button", { className: "btn btn-sm btn-success", onClick: () => handleApprove(action), children: _jsx("i", { className: "bi bi-check" }) })] }))] }) })] }, action.id))) })] }) }) })), totalPages > 1 && (_jsx("nav", { className: "mt-3 d-flex justify-content-center", children: _jsxs("ul", { className: "pagination pagination-sm mb-0", children: [_jsx("li", { className: `page-item ${page <= 1 ? 'disabled' : ''}`, children: _jsx("button", { className: "page-link", onClick: () => setPage((p) => Math.max(1, p - 1)), children: _jsx("i", { className: "bi bi-chevron-left" }) }) }), Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            const p = i + 1;
                            return (_jsx("li", { className: `page-item ${p === page ? 'active' : ''}`, children: _jsx("button", { className: "page-link", onClick: () => setPage(p), children: p }) }, p));
                        }), _jsx("li", { className: `page-item ${page >= totalPages ? 'disabled' : ''}`, children: _jsx("button", { className: "page-link", onClick: () => setPage((p) => Math.min(totalPages, p + 1)), children: _jsx("i", { className: "bi bi-chevron-right" }) }) })] }) })), selectedAction && (_jsx(TaskModal, { action: selectedAction, onClose: () => setSelectedAction(null), onApprove: handleApprove, onReject: handleReject })), rejectTarget && (_jsx("div", { className: "modal d-block", tabIndex: -1, style: { backgroundColor: 'rgba(0,0,0,0.5)' }, onClick: (e) => e.target === e.currentTarget && setRejectTarget(null), children: _jsx("div", { className: "modal-dialog", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("i", { className: "bi bi-x-circle text-danger me-2" }), "Rejeitar a\u00E7\u00E3o"] }), _jsx("button", { className: "btn-close", onClick: () => setRejectTarget(null) })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("p", { className: "text-muted small mb-3", children: ["Tem certeza que deseja rejeitar a a\u00E7\u00E3o ", _jsx("strong", { children: rejectTarget.action_type }), "?"] }), _jsxs("div", { className: "mb-0", children: [_jsx("label", { className: "form-label small", children: "Motivo (opcional)" }), _jsx("textarea", { className: "form-control form-control-sm", rows: 3, placeholder: "Descreva o motivo da rejei\u00E7\u00E3o\u2026", value: rejectMotivo, onChange: (e) => setRejectMotivo(e.target.value) })] })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setRejectTarget(null), disabled: rejectMutation.isPending, children: "Cancelar" }), _jsx("button", { className: "btn btn-danger btn-sm", onClick: () => rejectMutation.mutate({ action: rejectTarget, motivo: rejectMotivo }), disabled: rejectMutation.isPending, children: rejectMutation.isPending
                                            ? _jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-1" }), "Rejeitando\u2026"] })
                                            : 'Confirmar rejeição' })] })] }) }) }))] }));
};
export default ActionsPanel;
