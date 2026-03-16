import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import LoadingSpinner from '@/components/common/LoadingSpinner';
const DESTINO_LABEL = {
    operacional: 'Operacional',
    manutencao: 'Manutenção',
    combustivel: 'Combustível',
    despesa_adm: 'Desp. Adm.',
    investimento: 'Investimento',
    benfeitoria: 'Benfeitoria',
    financeiro: 'Financeiro',
};
const DESTINO_COLOR = {
    operacional: 'success',
    manutencao: 'warning',
    combustivel: 'info',
    despesa_adm: 'secondary',
    investimento: 'primary',
    benfeitoria: 'dark',
    financeiro: 'danger',
};
function formatCurrency(value) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(dateStr) {
    if (!dateStr)
        return '—';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}
const RateioCard = ({ rateio, onApprove, isPending, approving }) => {
    const rateioNum = String(rateio.id).padStart(4, '0');
    const destino = rateio.destino || 'operacional';
    return (_jsx("div", { className: `card mb-2 border-start border-4 border-${DESTINO_COLOR[destino] || 'secondary'}`, children: _jsx("div", { className: "card-body py-2 px-3", children: _jsxs("div", { className: "row align-items-center g-2", children: [_jsx("div", { className: "col-12 col-md-5", children: _jsxs("div", { className: "d-flex align-items-start gap-2", children: [_jsxs("span", { className: "badge bg-secondary font-monospace", children: ["#", rateioNum] }), _jsxs("div", { children: [_jsx("div", { className: "fw-semibold lh-sm", children: rateio.titulo }), rateio.descricao && (_jsx("small", { className: "text-muted", children: rateio.descricao })), rateio.origem_display && (_jsxs("small", { className: "text-muted d-block", children: [_jsx("i", { className: "bi bi-link-45deg me-1" }), rateio.origem_display] }))] })] }) }), _jsxs("div", { className: "col-6 col-md-2", children: [_jsx("span", { className: `badge bg-${DESTINO_COLOR[destino] || 'secondary'} bg-opacity-10 text-${DESTINO_COLOR[destino] || 'secondary'} border border-${DESTINO_COLOR[destino] || 'secondary'} border-opacity-25`, children: DESTINO_LABEL[destino] || destino }), _jsx("div", { className: "small text-muted mt-1", children: formatDate(rateio.data_rateio) })] }), _jsxs("div", { className: "col-6 col-md-2 text-end text-md-start", children: [_jsx("span", { className: "fw-bold text-dark", children: formatCurrency(rateio.valor_total) }), rateio.area_total_hectares && (_jsxs("div", { className: "small text-muted", children: [Number(rateio.area_total_hectares).toFixed(2), " ha"] }))] }), _jsx("div", { className: "col-12 col-md-3 d-flex align-items-center justify-content-md-end gap-2", children: isPending ? (_jsx(_Fragment, { children: rateio.approval_id ? (_jsxs("button", { className: "btn btn-sm btn-success", onClick: () => onApprove?.(rateio.approval_id), disabled: approving, title: "Confirmar / Aprovar rateio", children: [approving ? (_jsx("span", { className: "spinner-border spinner-border-sm me-1" })) : (_jsx("i", { className: "bi bi-check-circle me-1" })), "Confirmar"] })) : (_jsxs("span", { className: "badge bg-warning text-dark", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-1" }), "Sem aprova\u00E7\u00E3o"] })) })) : (_jsxs("div", { className: "text-end", children: [_jsxs("span", { className: "badge bg-success", children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Aprovado"] }), rateio.approval_aprovado_em && (_jsxs("div", { className: "small text-muted mt-1", children: [rateio.approval_aprovado_por_nome && (_jsxs("span", { children: [rateio.approval_aprovado_por_nome, " \u2014 "] })), new Date(rateio.approval_aprovado_em).toLocaleDateString('pt-BR')] }))] })) })] }) }) }));
};
const RateiosList = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('pendentes');
    const [approvingId, setApprovingId] = useState(null);
    const { data = [], isLoading, error } = useQuery({
        queryKey: ['financeiro', 'rateios'],
        queryFn: () => financeiroService.getRateios(),
    });
    const approveMutation = useMutation({
        mutationFn: (approvalId) => financeiroService.approveRateio(approvalId),
        onMutate: (approvalId) => setApprovingId(approvalId),
        onSettled: () => {
            setApprovingId(null);
            queryClient.invalidateQueries({ queryKey: ['financeiro', 'rateios'] });
        },
    });
    if (isLoading)
        return _jsx(LoadingSpinner, {});
    if (error)
        return _jsx("div", { className: "alert alert-danger", children: "Erro ao carregar rateios" });
    const pendentes = data.filter(r => r.approval_status === 'pending' || r.approval_status === null);
    const aprovados = data.filter(r => r.approval_status === 'approved');
    const rejeitados = data.filter(r => r.approval_status === 'rejected');
    const totalPendente = pendentes.reduce((s, r) => s + Number(r.valor_total), 0);
    const totalAprovado = aprovados.reduce((s, r) => s + Number(r.valor_total), 0);
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("div", { children: [_jsxs("h4", { className: "mb-0", children: [_jsx("i", { className: "bi bi-diagram-3 me-2 text-primary" }), "Rateios de Custo"] }), _jsxs("small", { className: "text-muted", children: [data.length, " rateio(s) total"] })] }), _jsxs("button", { className: "btn btn-primary btn-sm", onClick: () => window.location.href = '/financeiro/rateios/create', children: [_jsx("i", { className: "bi bi-plus-circle me-1" }), "Novo Rateio"] })] }), _jsxs("div", { className: "row g-3 mb-4", children: [_jsx("div", { className: "col-sm-6 col-md-4", children: _jsx("div", { className: "card border-warning", children: _jsxs("div", { className: "card-body text-center py-2", children: [_jsx("div", { className: "h5 mb-0 text-warning fw-bold", children: pendentes.length }), _jsx("div", { className: "small text-muted", children: "Pendentes" }), _jsx("div", { className: "fw-semibold", children: formatCurrency(totalPendente) })] }) }) }), _jsx("div", { className: "col-sm-6 col-md-4", children: _jsx("div", { className: "card border-success", children: _jsxs("div", { className: "card-body text-center py-2", children: [_jsx("div", { className: "h5 mb-0 text-success fw-bold", children: aprovados.length }), _jsx("div", { className: "small text-muted", children: "Aprovados" }), _jsx("div", { className: "fw-semibold", children: formatCurrency(totalAprovado) })] }) }) }), rejeitados.length > 0 && (_jsx("div", { className: "col-sm-6 col-md-4", children: _jsx("div", { className: "card border-danger", children: _jsxs("div", { className: "card-body text-center py-2", children: [_jsx("div", { className: "h5 mb-0 text-danger fw-bold", children: rejeitados.length }), _jsx("div", { className: "small text-muted", children: "Rejeitados" })] }) }) }))] }), _jsxs("ul", { className: "nav nav-tabs mb-3", children: [_jsx("li", { className: "nav-item", children: _jsxs("button", { className: `nav-link ${activeTab === 'pendentes' ? 'active' : ''}`, onClick: () => setActiveTab('pendentes'), children: [_jsx("i", { className: "bi bi-hourglass-split me-1 text-warning" }), "Pendentes", pendentes.length > 0 && (_jsx("span", { className: "badge bg-warning text-dark ms-2", children: pendentes.length }))] }) }), _jsx("li", { className: "nav-item", children: _jsxs("button", { className: `nav-link ${activeTab === 'aprovados' ? 'active' : ''}`, onClick: () => setActiveTab('aprovados'), children: [_jsx("i", { className: "bi bi-check-circle me-1 text-success" }), "Confirmados", aprovados.length > 0 && (_jsx("span", { className: "badge bg-success ms-2", children: aprovados.length }))] }) })] }), activeTab === 'pendentes' && (_jsx("div", { children: pendentes.length === 0 ? (_jsxs("div", { className: "alert alert-success d-flex align-items-center gap-2", children: [_jsx("i", { className: "bi bi-check-circle-fill fs-5" }), _jsx("span", { children: "Nenhum rateio pendente de confirma\u00E7\u00E3o." })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "alert alert-warning d-flex align-items-center gap-2 py-2", children: [_jsx("i", { className: "bi bi-exclamation-triangle-fill" }), _jsxs("span", { children: [_jsxs("strong", { children: [pendentes.length, " rateio(s)"] }), " aguardando confirma\u00E7\u00E3o \u2014", ' ', "total de ", formatCurrency(totalPendente), "."] })] }), pendentes.map(r => (_jsx(RateioCard, { rateio: r, isPending: true, onApprove: (approvalId) => approveMutation.mutate(approvalId), approving: approvingId === r.approval_id }, r.id)))] })) })), activeTab === 'aprovados' && (_jsx("div", { children: aprovados.length === 0 ? (_jsx("div", { className: "alert alert-info", children: "Nenhum rateio confirmado ainda." })) : (aprovados.map(r => (_jsx(RateioCard, { rateio: r, isPending: false }, r.id)))) }))] }));
};
export default RateiosList;
