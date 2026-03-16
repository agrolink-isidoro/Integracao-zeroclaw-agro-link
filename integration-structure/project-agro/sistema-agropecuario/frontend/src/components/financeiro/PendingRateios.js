import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { useApiQuery } from '@/hooks/useApi';
import api from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { getStoredTokens } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
const PendingRateios = () => {
    // only fetch pending approvals to keep list in sync with actions
    const { data: approvals = [], isLoading, error, refetch } = useApiQuery(['rateios-approvals'], '/financeiro/rateios-approvals/?status=pending');
    // permissions for current user
    const { data: permissions } = useApiQuery(['rateios-approvals', 'permissions'], '/financeiro/rateios-approvals/permissions/');
    const queryClient = useQueryClient();
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
    const { showError, showSuccess } = useToast();
    const approveMutation = useMutation({
        mutationFn: async (id) => {
            const ok = await ensureAuth();
            if (!ok) {
                showError('Sua sessão expirou. Faça login novamente.');
                if (typeof window !== 'undefined')
                    window.location.href = '/login';
                throw new Error('No auth token');
            }
            await api.post(`/financeiro/rateios-approvals/${id}/approve/`);
        },
        onSuccess: (_, variables) => {
            // Immediately remove the approved item from cached pending approvals
            queryClient.setQueryData(['rateios-approvals'], (old = []) => old.filter(a => a.id !== variables));
            // Refresh related lists (vencimentos/despesas) so UI reflects changes
            queryClient.invalidateQueries({ queryKey: ['despesas'] });
            queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] });
            showSuccess('Rateio aprovado com sucesso');
        },
        onError: (err) => {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Erro ao aprovar';
            if (status === 403) {
                showError('Você não tem permissão para aprovar este rateio. Contate o administrador.');
            }
            else {
                showError(`Erro ao aprovar: ${detail}`);
            }
            console.error('Erro ao aprovar rateio:', err);
        }
    });
    const rejectMutation = useMutation({
        mutationFn: async (id) => {
            const ok = await ensureAuth();
            if (!ok) {
                showError('Sua sessão expirou. Faça login novamente.');
                if (typeof window !== 'undefined')
                    window.location.href = '/login';
                throw new Error('No auth token');
            }
            await api.post(`/financeiro/rateios-approvals/${id}/reject/`);
        },
        onSuccess: (_, variables) => {
            // remove rejected item from pending approvals cache immediately
            queryClient.setQueryData(['rateios-approvals'], (old = []) => old.filter(a => a.id !== variables));
            queryClient.invalidateQueries({ queryKey: ['despesas'] });
            showSuccess('Rateio rejeitado');
        },
        onError: (err) => {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Erro ao rejeitar';
            if (status === 403) {
                showError('Você não tem permissão para rejeitar este rateio. Contate o administrador.');
            }
            else {
                showError(`Erro ao rejeitar: ${detail}`);
            }
            console.error('Erro ao rejeitar rateio:', err);
        }
    });
    return (_jsxs("div", { children: [isLoading && _jsx("div", { children: "Carregando..." }), error && (_jsxs("div", { className: "text-danger", children: [_jsx("div", { children: _jsx("strong", { children: "Erro ao carregar aprova\u00E7\u00F5es" }) }), error?.response?.status && (_jsx("div", { className: "mt-1", children: _jsxs("small", { children: ["Status: ", error.response.status, " \u2014 ", error.response.data?.detail ?? JSON.stringify(error.response.data)] }) }))] })), approvals.length === 0 && !isLoading && _jsx("div", { className: "text-muted", children: "Nenhuma aprova\u00E7\u00E3o pendente." }), approvals.length > 0 && (_jsx("ul", { className: "list-group", children: approvals.map(a => {
                    const valorFmt = a.rateio?.valor_total
                        ? Number(a.rateio.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : null;
                    const dataFmt = a.rateio?.data_rateio
                        ? new Date(a.rateio.data_rateio + 'T00:00:00').toLocaleDateString('pt-BR')
                        : null;
                    const isBusy = approveMutation.isPending || rejectMutation.isPending;
                    return (_jsx("li", { className: "list-group-item", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { className: "me-3 flex-grow-1", children: [_jsxs("div", { className: "fw-bold", children: ["#", a.rateio?.id ?? a.id, a.rateio?.titulo ? ` — ${a.rateio.titulo}` : ''] }), _jsxs("div", { className: "mt-1", children: [valorFmt && _jsx("span", { className: "badge bg-primary me-2", children: valorFmt }), a.rateio?.destino && _jsx("span", { className: "badge bg-secondary me-2", children: a.rateio.destino }), dataFmt && _jsxs("small", { className: "text-muted me-2", children: ["Data: ", dataFmt] })] }), _jsxs("small", { className: "text-muted", children: ["Solicitado por ", a.criado_por_nome || 'usuário', " em ", new Date(a.criado_em).toLocaleString('pt-BR')] })] }), _jsx("div", { className: "d-flex align-items-center gap-2 flex-shrink-0", children: permissions === undefined ? (_jsx("button", { className: "btn btn-sm btn-outline-secondary", disabled: true, children: "Carregando..." })) : permissions?.can_approve === false ? (_jsx("button", { className: "btn btn-sm btn-secondary", title: "Voc\u00EA n\u00E3o tem permiss\u00E3o para aprovar", disabled: true, children: "Sem permiss\u00E3o" })) : (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn btn-sm btn-success", onClick: () => approveMutation.mutate(a.id), disabled: isBusy, children: "Aprovar" }), _jsx("button", { className: "btn btn-sm btn-danger", onClick: () => rejectMutation.mutate(a.id), disabled: isBusy, children: "Rejeitar" })] })) })] }) }, a.id));
                }) })), _jsx("div", { className: "mt-2", children: _jsx("button", { className: "btn btn-sm btn-outline-secondary", onClick: () => refetch(), children: "Atualizar" }) })] }));
};
export default PendingRateios;
