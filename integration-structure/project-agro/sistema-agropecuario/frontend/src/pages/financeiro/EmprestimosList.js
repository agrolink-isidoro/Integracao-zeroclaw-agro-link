import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import financeiroService from '@/services/financeiro';
import EmprestimoCreate from '@/pages/financeiro/EmprestimoCreate';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toCSV, downloadCSV } from '@/utils/csv';
import { useToast } from '@/hooks/useToast';
const EmprestimosList = () => {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const { showSuccess, showError } = useToast();
    const { data, isLoading, error } = useQuery({
        queryKey: ['financeiro', 'emprestimos'],
        queryFn: () => financeiroService.getEmprestimos(),
    });
    const gerarMutation = useMutation({
        mutationFn: (id) => financeiroService.gerarParcelasEmprestimo(id),
        onSuccess: () => {
            showSuccess('Parcelas geradas com sucesso');
            qc.invalidateQueries({ queryKey: ['financeiro', 'emprestimos'] });
            qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-emprestimo'] });
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
        return _jsx("div", { className: "alert alert-danger", children: "Erro ao carregar empr\u00E9stimos" });
    }
    const exportCsv = () => {
        const rows = (data || []).map(e => ({ id: e.id, descricao: e.descricao || '', valor_total: e.valor_emprestimo ?? 0, parcelas: e.numero_parcelas ?? 0, data_contratacao: e.data_contratacao }));
        const csv = toCSV(rows, ['id', 'descricao', 'valor_total', 'parcelas', 'data_contratacao']);
        downloadCSV('emprestimos.csv', csv);
    };
    const handleGerarParcelas = async (id) => {
        if (!window.confirm('Confirma gerar parcelas para este empréstimo?'))
            return;
        try {
            await financeiroService.gerarParcelasEmprestimo(id);
            showSuccess('Parcelas geradas com sucesso');
            qc.invalidateQueries({ queryKey: ['financeiro', 'emprestimos'] });
            qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-emprestimo'] });
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
            await financeiroService.deleteEmprestimo(deleteConfirm.id);
            showSuccess('Empréstimo excluído');
            qc.invalidateQueries({ queryKey: ['financeiro', 'emprestimos'] });
            setDeleteConfirm(null);
        }
        catch (e) {
            console.error('Erro ao deletar empréstimo:', e);
            showError('Erro ao excluir empréstimo');
        }
        finally {
            setDeleteLoading(false);
        }
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("h4", { className: "mb-0", children: "Empr\u00E9stimos" }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-sm btn-outline-primary me-2", onClick: () => setShowForm(true), children: "Novo" }), _jsx("button", { className: "btn btn-sm btn-outline-secondary", onClick: exportCsv, children: "Exportar CSV" })] })] }), showForm && (_jsx("div", { className: "card mb-3", children: _jsx("div", { className: "card-body", children: _jsx(EmprestimoCreate, { onCancel: () => setShowForm(false), onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['financeiro', 'emprestimos'] }); showSuccess('Empréstimo criado'); } }) }) })), _jsxs("div", { className: "list-group", children: [data?.map((e) => (_jsxs("div", { className: "list-group-item list-group-item-action d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("strong", { children: e.descricao || `#${e.id}` }), _jsx("div", { children: _jsxs("small", { children: ["R$ ", e.valor_emprestimo ?? 0, " \u2014 ", e.numero_parcelas ?? 0, " parcelas"] }) })] }), _jsxs("div", { className: "d-flex gap-1", children: [_jsx("button", { className: "btn btn-sm btn-outline-primary", onClick: () => navigate(`/financeiro/emprestimos/${e.id}`), children: "Ver" }), _jsx("button", { className: "btn btn-sm btn-outline-secondary", disabled: gerarMutation.isLoading, onClick: () => handleGerarParcelas(e.id), children: "Gerar Parcelas" }), _jsx("button", { className: "btn btn-sm btn-outline-danger", title: "Deletar", onClick: () => setDeleteConfirm({ id: e.id, nome: e.descricao || `#${e.id}` }), children: _jsx("i", { className: "bi bi-trash" }) })] })] }, e.id))), !data || data.length === 0 ? _jsx("div", { className: "text-muted mt-2", children: "Nenhum empr\u00E9stimo encontrado." }) : null] }), deleteConfirm && (_jsx("div", { className: "modal d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title text-danger", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), "Confirmar exclus\u00E3o"] }), _jsx("button", { className: "btn-close", onClick: () => setDeleteConfirm(null), disabled: deleteLoading })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("p", { children: ["Excluir empr\u00E9stimo ", _jsx("strong", { children: deleteConfirm.nome }), "?"] }), _jsx("p", { className: "text-muted small mb-0", children: "Esta a\u00E7\u00E3o n\u00E3o pode ser desfeita." })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setDeleteConfirm(null), disabled: deleteLoading, children: "Cancelar" }), _jsxs("button", { className: "btn btn-danger", onClick: handleDelete, disabled: deleteLoading, children: [deleteLoading ? _jsx("span", { className: "spinner-border spinner-border-sm me-1" }) : _jsx("i", { className: "bi bi-trash me-1" }), "Deletar"] })] })] }) }) }))] }));
};
export default EmprestimosList;
