import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { useApiQuery, useApiDelete } from '@/hooks/useApi';
const ContaFormLazy = React.lazy(() => import('@/components/financeiro/ContaForm'));
const ContaDetalhesModalLazy = React.lazy(() => import('@/components/financeiro/ContaDetalhesModal'));
const ContasBancariasList = () => {
    const { data: contas = [], isLoading, isError, error, refetch } = useApiQuery(['contas-bancarias'], '/financeiro/contas/?page_size=1000');
    const del = useApiDelete('/financeiro/contas/', [['contas-bancarias']]);
    const [showForm, setShowForm] = React.useState(false);
    const [editing, setEditing] = React.useState(null);
    const [detalhesContaId, setDetalhesContaId] = React.useState(null);
    const [confirmDelete, setConfirmDelete] = React.useState(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    React.useEffect(() => {
        function handler(e) {
            setDetalhesContaId(e.detail?.contaId || null);
        }
        window.addEventListener('open-conta-detalhes', handler);
        return () => window.removeEventListener('open-conta-detalhes', handler);
    }, []);
    const openDeleteConfirm = (conta) => {
        console.log('[ContasBancariasList] openDeleteConfirm chamado para conta:', conta.id);
        setConfirmDelete(conta);
    };
    const handleDelete = async () => {
        if (!confirmDelete)
            return;
        console.log('[ContasBancariasList] Iniciando exclusão da conta:', confirmDelete.id);
        setIsDeleting(true);
        try {
            console.log('[ContasBancariasList] Chamando mutateAsync para ID:', confirmDelete.id);
            await del.mutateAsync(confirmDelete.id);
            console.log('[ContasBancariasList] Delete finalizado, refetching lista...');
            // Aguarda o refetch completar antes de fechar a modal
            await refetch();
            console.log('[ContasBancariasList] Refetch completo, fechando modal');
            setConfirmDelete(null);
        }
        catch (e) {
            console.error('[ContasBancariasList] Erro ao excluir conta:', e);
            alert('Falha ao excluir conta. Verifique se existem transferências associadas.');
        }
        finally {
            setIsDeleting(false);
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("h5", { className: "mb-0", children: "Contas Banc\u00E1rias" }), _jsx("div", { children: _jsx("button", { className: "btn btn-sm btn-primary", onClick: () => { setEditing(null); setShowForm(true); }, children: "Nova Conta" }) })] }), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: isError ? (_jsxs("div", { className: "alert alert-danger", children: ["Erro ao carregar contas: ", error?.message || 'Erro desconhecido'] })) : isLoading ? (_jsx("div", { children: "Carregando contas..." })) : contas.length === 0 ? (_jsx("div", { className: "text-muted", children: "Nenhuma conta encontrada." })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover table-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Banco" }), _jsx("th", { children: "Ag\u00EAncia" }), _jsx("th", { children: "Conta" }), _jsx("th", { children: "Saldo" }), _jsx("th", { children: "Descri\u00E7\u00E3o" }), _jsx("th", {})] }) }), _jsxs("tbody", { children: [contas.map((c) => (_jsxs("tr", { children: [_jsx("td", { children: c.banco }), _jsx("td", { children: c.agencia }), _jsx("td", { children: c.conta }), _jsx("td", { children: c.current_balance !== undefined ? (Number(c.current_balance || 0)).toFixed(2) : '-' }), _jsx("td", { children: c.descricao || '-' }), _jsxs("td", { children: [_jsx("button", { className: "btn btn-sm btn-outline-secondary me-2", onClick: () => { setEditing(c); setShowForm(true); }, children: "Editar" }), _jsx("button", { className: "btn btn-sm btn-outline-info me-2", onClick: () => { setShowForm(false); window.dispatchEvent(new CustomEvent('open-conta-detalhes', { detail: { contaId: c.id } })); }, children: "Detalhes" }), _jsx("button", { className: "btn btn-sm btn-outline-danger", onClick: () => openDeleteConfirm(c), children: "Excluir" })] })] }, c.id))), _jsxs("tr", { children: [_jsx("td", { colSpan: 3, children: _jsx("strong", { children: "Total" }) }), _jsx("td", { className: "text-end", children: _jsx("strong", { children: (contas.reduce((s, c) => s + (Number(c.current_balance || 0)), 0)).toFixed(2) }) }), _jsx("td", { colSpan: 2 })] })] })] }) })) }) }), showForm && (_jsx("div", { className: "modal d-block", tabIndex: -1, role: "dialog", children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-lg", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: editing ? 'Editar Conta' : 'Nova Conta' }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: () => setShowForm(false) })] }), _jsx("div", { className: "modal-body", children: _jsx(React.Suspense, { fallback: _jsx("div", { children: "Carregando formul\u00E1rio..." }), children: _jsx(ContaFormLazy, { initialData: editing, onClose: () => setShowForm(false), onSaved: () => setShowForm(false) }) }) })] }) }) })), confirmDelete && (_jsxs(_Fragment, { children: [_jsx("div", { className: "modal-backdrop fade show" }), _jsx("div", { className: "modal d-block", tabIndex: -1, role: "dialog", children: _jsx("div", { className: "modal-dialog modal-dialog-centered", role: "document", children: _jsxs("div", { className: "modal-content border-danger", children: [_jsxs("div", { className: "modal-header bg-danger text-white", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("i", { className: "bi bi-exclamation-triangle-fill me-2" }), "Confirmar Exclus\u00E3o de Conta"] }), _jsx("button", { type: "button", className: "btn-close btn-close-white", "aria-label": "Close", onClick: () => setConfirmDelete(null), disabled: isDeleting })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("div", { className: "alert alert-warning mb-3", children: [_jsx("i", { className: "bi bi-exclamation-circle me-2" }), _jsx("strong", { children: "Aten\u00E7\u00E3o: Esta a\u00E7\u00E3o n\u00E3o pode ser desfeita!" })] }), _jsx("h6", { className: "mb-3", children: "Dados da Conta" }), _jsxs("div", { className: "row mb-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("small", { className: "text-muted", children: "Banco" }), _jsx("p", { className: "fw-bold", children: confirmDelete.banco })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("small", { className: "text-muted", children: "Conta" }), _jsx("p", { className: "fw-bold", children: confirmDelete.conta })] })] }), confirmDelete.agencia && (_jsxs("div", { className: "row mb-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("small", { className: "text-muted", children: "Ag\u00EAncia" }), _jsx("p", { className: "fw-bold", children: confirmDelete.agencia })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("small", { className: "text-muted", children: "Saldo Atual" }), _jsxs("p", { className: "fw-bold text-success", children: ["R$ ", (Number(confirmDelete.current_balance || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })] })] })] })), _jsxs("div", { className: "alert alert-danger mt-4 mb-0", children: [_jsxs("h6", { className: "mb-2", children: [_jsx("i", { className: "bi bi-trash-fill me-2" }), "Consequ\u00EAncias da Exclus\u00E3o:"] }), _jsxs("ul", { className: "mb-0 ps-3", children: [_jsxs("li", { children: ["A conta ", _jsxs("strong", { children: [confirmDelete.banco, " - ", confirmDelete.conta] }), " ser\u00E1 ", _jsx("strong", { children: "permanentemente deletada" })] }), _jsxs("li", { children: ["Todas as ", _jsx("strong", { children: "transfer\u00EAncias" }), " vinculadas a esta conta ser\u00E3o ", _jsx("strong", { children: "removidas" })] }), _jsxs("li", { children: ["Os ", _jsx("strong", { children: "lan\u00E7amentos financeiros" }), " (d\u00E9bitos/cr\u00E9ditos) da conta ser\u00E3o ", _jsx("strong", { children: "preservados" })] }), _jsxs("li", { children: ["Esta a\u00E7\u00E3o ", _jsx("strong", { children: "n\u00E3o pode ser desfeita" })] })] })] })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: () => setConfirmDelete(null), disabled: isDeleting, children: "Cancelar" }), _jsx("button", { type: "button", className: "btn btn-danger", onClick: handleDelete, disabled: isDeleting, children: isDeleting ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" }), "Deletando..."] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-trash-fill me-2" }), "Sim, Deletar Conta"] })) })] })] }) }) })] })), detalhesContaId && (_jsx(React.Suspense, { fallback: _jsx("div", { children: "Carregando..." }), children: _jsx(ContaDetalhesModalLazy, { contaId: detalhesContaId, onClose: () => setDetalhesContaId(null) }) }))] }));
};
export default ContasBancariasList;
