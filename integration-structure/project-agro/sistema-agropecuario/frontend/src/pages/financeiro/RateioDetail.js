import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import { useAuthContext } from '@/contexts/AuthContext';
import { useApiQuery } from '@/hooks/useApi';
import { getStoredTokens } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/common/LoadingSpinner';
const RateioDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const rateioId = Number(id || 0);
    const { data: rateio, isLoading, error } = useQuery({
        queryKey: ['financeiro', 'rateio', rateioId],
        queryFn: () => financeiroService.getRateioById(rateioId),
        enabled: !!rateioId,
    });
    const { data: approvals } = useQuery({
        queryKey: ['financeiro', 'rateio-approvals'],
        queryFn: () => financeiroService.getRateioApprovals(),
        enabled: !!rateioId,
    });
    // permissions for current user
    const { data: permissions } = useApiQuery(['rateios-approvals', 'permissions'], '/financeiro/rateios-approvals/permissions/');
    const { refreshToken } = useAuthContext();
    const ensureAuth = async () => {
        const tokens = getStoredTokens();
        if (tokens?.access)
            return true;
        try {
            const refreshed = await refreshToken();
            return !!refreshed;
        }
        catch (e) {
            return false;
        }
    };
    const handleApprove = async (approvalId) => {
        try {
            const ok = await ensureAuth();
            if (!ok) {
                alert('Sua sessão expirou. Faça login novamente.');
                if (typeof window !== 'undefined')
                    window.location.href = '/login';
                return;
            }
            await financeiroService.approveRateio(approvalId);
            queryClient.invalidateQueries({ queryKey: ['financeiro', 'rateio', rateioId] });
            queryClient.invalidateQueries({ queryKey: ['financeiro', 'rateio-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] });
            // Also refresh despesas list so any linked Despesa reflects updated pendente_rateio
            queryClient.invalidateQueries({ queryKey: ['despesas'] });
        }
        catch (e) {
            console.error('Erro ao aprovar rateio', e);
            alert('Erro ao aprovar rateio');
        }
    };
    const handleReject = async (approvalId) => {
        try {
            const ok = await ensureAuth();
            if (!ok) {
                alert('Sua sessão expirou. Faça login novamente.');
                if (typeof window !== 'undefined')
                    window.location.href = '/login';
                return;
            }
            await financeiroService.rejectRateio(approvalId);
            queryClient.invalidateQueries({ queryKey: ['financeiro', 'rateio', rateioId] });
            queryClient.invalidateQueries({ queryKey: ['financeiro', 'rateio-approvals'] });
        }
        catch (e) {
            console.error('Erro ao rejeitar rateio', e);
            alert('Erro ao rejeitar rateio');
        }
    };
    const handleGerarVencimento = async () => {
        if (!rateio)
            return;
        try {
            const ok = await ensureAuth();
            if (!ok) {
                alert('Sua sessão expirou. Faça login novamente.');
                if (typeof window !== 'undefined')
                    window.location.href = '/login';
                return;
            }
            const vencimento = await financeiroService.gerarVencimentoFromRateio(rateio.id);
            queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] });
            alert(`Vencimento criado com sucesso! ID: ${vencimento.id}, Valor: R$ ${vencimento.valor}`);
            navigate('/financeiro/vencimentos');
        }
        catch (e) {
            console.error('Erro ao gerar vencimento', e);
            const msg = e?.response?.data?.error || 'Erro ao gerar vencimento';
            alert(msg);
        }
    };
    if (isLoading)
        return _jsx(LoadingSpinner, {});
    if (error)
        return _jsx("div", { className: "alert alert-danger", children: "Erro ao carregar rateio" });
    if (!rateio)
        return _jsx("div", { className: "alert alert-warning", children: "Rateio n\u00E3o encontrado" });
    const approval = approvals?.find(a => a.rateio === rateio.id);
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("div", { children: [_jsx("h3", { children: rateio.titulo }), _jsx("p", { className: "text-muted mb-0", children: rateio.descricao })] }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-outline-secondary me-2", onClick: () => navigate('/financeiro/rateios'), children: "Voltar" }), approval && approval.status === 'pending' && (permissions === undefined ? (_jsx("button", { className: "btn btn-outline-secondary", disabled: true, children: "Carregando..." })) : permissions?.can_approve === false ? (_jsx("button", { className: "btn btn-secondary", disabled: true, title: "Voc\u00EA n\u00E3o tem permiss\u00E3o para aprovar", children: "Sem permiss\u00E3o" })) : (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn btn-success me-2", onClick: () => handleApprove(approval.id), children: "Aprovar" }), _jsx("button", { className: "btn btn-danger", onClick: () => handleReject(approval.id), children: "Rejeitar" })] })))] })] }), _jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-md-8", children: [_jsxs("div", { className: "card mb-3", children: [_jsx("div", { className: "card-header", children: "Detalhes" }), _jsxs("div", { className: "card-body", children: [_jsxs("p", { children: [_jsx("strong", { children: "Data do rateio:" }), " ", rateio.data_rateio] }), _jsxs("p", { children: [_jsx("strong", { children: "Valor total:" }), " R$ ", rateio.valor_total] }), _jsxs("p", { children: [_jsx("strong", { children: "\u00C1rea total (ha):" }), " ", rateio.area_total_hectares] })] })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: "Rateios por Talh\u00E3o" }), _jsx("div", { className: "card-body", children: _jsx("div", { className: "list-group", children: rateio.talhoes_rateio?.map((t) => (_jsxs("div", { className: "list-group-item d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("strong", { children: t.talhao_nome }), _jsx("div", { children: _jsxs("small", { children: [t.talhao_area, " ha"] }) })] }), _jsxs("div", { className: "text-end", children: [_jsxs("div", { children: ["R$ ", t.valor_rateado] }), _jsx("div", { children: _jsxs("small", { children: [(Number(t.proporcao_area || 0) * 100).toFixed(2), "%"] }) })] })] }, t.id))) }) })] })] }), _jsxs("div", { className: "col-md-4", children: [_jsxs("div", { className: "card mb-3", children: [_jsx("div", { className: "card-header", children: "Aprova\u00E7\u00E3o" }), _jsx("div", { className: "card-body", children: approval ? (_jsxs("div", { children: [_jsxs("p", { children: [_jsx("strong", { children: "Status: " }), " ", approval.status] }), _jsx("p", { children: _jsxs("small", { children: ["Criado em: ", approval.criado_em] }) })] })) : (_jsx("p", { children: "Nenhuma solicita\u00E7\u00E3o de aprova\u00E7\u00E3o vinculada." })) })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: "A\u00E7\u00F5es" }), _jsxs("div", { className: "card-body", children: [_jsx("button", { className: "btn btn-outline-primary mb-2 w-100", onClick: handleGerarVencimento, children: "Gerar vencimento" }), _jsx("button", { className: "btn btn-outline-secondary w-100", onClick: () => window.open(`/financeiro/rateios/${rateio.id}/print`, '_blank'), children: "Exportar" })] })] })] })] })] }));
};
export default RateioDetail;
