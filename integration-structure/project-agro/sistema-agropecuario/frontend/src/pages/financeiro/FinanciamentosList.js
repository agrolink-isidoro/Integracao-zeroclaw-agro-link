import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import financeiroService from '@/services/financeiro';
import FinanciamentoCreate from '@/pages/financeiro/FinanciamentoCreate';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toCSV, downloadCSV } from '@/utils/csv';
import { useToast } from '@/hooks/useToast';
const FinanciamentosList = () => {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const { showSuccess, showError } = useToast();
    const { data, isLoading, error } = useQuery({
        queryKey: ['financeiro', 'financiamentos'],
        queryFn: () => financeiroService.getFinanciamentos(),
    });
    const gerarMutation = useMutation({
        mutationFn: (id) => financeiroService.gerarParcelasFinanciamento(id),
        onSuccess: () => {
            showSuccess('Parcelas geradas com sucesso');
            qc.invalidateQueries({ queryKey: ['financeiro', 'financiamentos'] });
            qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-financiamento'] });
        },
        onError: (err) => {
            console.error('Erro ao gerar parcelas', err);
            showError('Erro ao gerar parcelas');
        }
    });
    if (isLoading)
        return _jsx(LoadingSpinner, {});
    if (error) {
        const status = error?.response?.status;
        if (status === 403) {
            return (_jsxs("div", { className: "alert alert-warning", children: ["Acesso negado. Por favor, ", _jsx("a", { href: "/login", children: "fa\u00E7a login" }), " com uma conta que tenha permiss\u00E3o."] }));
        }
        return _jsx("div", { className: "alert alert-danger", children: "Erro ao carregar financiamentos" });
    }
    const exportCsv = () => {
        const rows = (data || []).map(f => ({ id: f.id, descricao: f.descricao || '', valor_total: f.valor_financiado ?? 0, parcelas: f.numero_parcelas ?? 0, data_contratacao: f.data_contratacao }));
        const csv = toCSV(rows, ['id', 'descricao', 'valor_total', 'parcelas', 'data_contratacao']);
        downloadCSV('financiamentos.csv', csv);
    };
    const handleGerarParcelas = async (id) => {
        if (!window.confirm('Confirma gerar parcelas para este financiamento?'))
            return;
        try {
            await financeiroService.gerarParcelasFinanciamento(id);
            showSuccess('Parcelas geradas com sucesso');
            qc.invalidateQueries({ queryKey: ['financeiro', 'financiamentos'] });
            qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-financiamento'] });
        }
        catch (err) {
            console.error('Erro ao gerar parcelas', err);
            showError('Erro ao gerar parcelas');
        }
    };
    const handleDelete = async () => {
        if (!deleteConfirm)
            return;
        setDeleteLoading(true);
        try {
            await financeiroService.deleteFinanciamento(deleteConfirm.id);
            showSuccess('Financiamento excluído');
            qc.invalidateQueries({ queryKey: ['financeiro', 'financiamentos'] });
            setDeleteConfirm(null);
        }
        catch (e) {
            console.error('Erro ao deletar financiamento:', e);
            showError('Erro ao excluir financiamento');
        }
        finally {
            setDeleteLoading(false);
        }
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("h4", { className: "mb-0", children: "Financiamentos" }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-sm btn-outline-primary me-2", onClick: () => setShowForm(true), children: "Novo" }), _jsx("button", { className: "btn btn-sm btn-outline-secondary", onClick: exportCsv, children: "Exportar CSV" })] })] }), showForm && (_jsx("div", { className: "card mb-3", children: _jsx("div", { className: "card-body", children: _jsx(FinanciamentoCreate, { onCancel: () => setShowForm(false), onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['financeiro', 'financiamentos'] }); showSuccess('Financiamento criado'); } }) }) })), _jsxs("div", { className: "list-group", children: [data?.map((f) => {
                        const toNum = (v) => {
                            const n = Number(v);
                            return Number.isFinite(n) ? n : 0;
                        };
                        const valorFin = toNum(f.valor_financiado ?? f.valor_total ?? 0);
                        const taxa = toNum(f.taxa_juros ?? 0);
                        const prazo = toNum(f.prazo_meses ?? f.numero_parcelas ?? 0);
                        const jurosEstimado = toNum(f.juros ?? (valorFin * (taxa / 100) * (prazo / 12)));
                        const valorFinalEstimado = valorFin + jurosEstimado;
                        return (_jsxs("div", { className: "list-group-item list-group-item-action d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("strong", { children: f.titulo || f.descricao || `#${f.id}` }), _jsx("div", { children: _jsxs("small", { children: ["R$ ", valorFin, " \u2014 ", f.numero_parcelas ?? 0, " parcelas \u2022 Taxa: ", taxa, "%/", f.frequencia_taxa || 'mensal'] }) }), _jsx("div", { children: _jsxs("small", { className: "text-muted", children: ["Juros acumulado (est.): R$ ", jurosEstimado.toFixed(2), " \u2022 Valor final (est.): R$ ", valorFinalEstimado.toFixed(2)] }) }), _jsx("div", { children: _jsxs("small", { className: "text-muted", children: ["1\u00BA Venc.: ", f.data_primeiro_vencimento || f.data_contratacao || '-'] }) })] }), _jsxs("div", { children: [_jsx("a", { className: "btn btn-sm btn-outline-primary me-2", onClick: () => navigate(`/financeiro/financiamentos/${f.id}`), children: "Ver" }), _jsx("button", { className: "btn btn-sm btn-outline-secondary", disabled: gerarMutation.isLoading, onClick: () => handleGerarParcelas(f.id), children: "Gerar Parcelas" }), _jsx("button", { className: "btn btn-sm btn-outline-danger ms-1", title: "Deletar", onClick: () => setDeleteConfirm({ id: f.id, nome: f.titulo || f.descricao || `#${f.id}` }), children: _jsx("i", { className: "bi bi-trash" }) })] })] }, f.id));
                    }), !data || data.length === 0 ? _jsx("div", { className: "text-muted mt-2", children: "Nenhum financiamento encontrado." }) : null] }), deleteConfirm && (_jsx("div", { className: "modal d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title text-danger", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), "Confirmar exclus\u00E3o"] }), _jsx("button", { className: "btn-close", onClick: () => setDeleteConfirm(null), disabled: deleteLoading })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("p", { children: ["Excluir financiamento ", _jsx("strong", { children: deleteConfirm.nome }), "?"] }), _jsx("p", { className: "text-muted small mb-0", children: "Esta a\u00E7\u00E3o n\u00E3o pode ser desfeita." })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setDeleteConfirm(null), disabled: deleteLoading, children: "Cancelar" }), _jsxs("button", { className: "btn btn-danger", onClick: handleDelete, disabled: deleteLoading, children: [deleteLoading ? _jsx("span", { className: "spinner-border spinner-border-sm me-1" }) : _jsx("i", { className: "bi bi-trash me-1" }), "Deletar"] })] })] }) }) }))] }));
};
export default FinanciamentosList;
