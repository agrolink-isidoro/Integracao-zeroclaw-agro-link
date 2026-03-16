import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import useApi from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
const ContaDetalhesModal = ({ contaId, onClose }) => {
    const api = useApi();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    useEffect(() => {
        if (!contaId)
            return;
        setLoading(true);
        (async () => {
            try {
                const resp = await api.client.get(`/financeiro/contas/${contaId}/extrato/`);
                setData(resp.data);
            }
            catch (e) {
                console.error('Erro carregar detalhes conta', e);
                alert('Falha ao carregar detalhes da conta');
            }
            finally {
                setLoading(false);
            }
        })();
    }, [contaId]);
    if (!contaId)
        return null;
    if (loading)
        return _jsx("div", { className: "modal d-block", tabIndex: -1, children: _jsx("div", { className: "modal-dialog", children: _jsx("div", { className: "modal-content", children: _jsx("div", { className: "modal-body", children: _jsx(LoadingSpinner, {}) }) }) }) });
    if (!data)
        return null;
    return (_jsx("div", { className: "modal d-block", tabIndex: -1, role: "dialog", children: _jsx("div", { className: "modal-dialog modal-xl", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Detalhes da Conta" }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: onClose })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("div", { className: "row mb-3", children: [_jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "card p-3", children: [_jsx("h6", { className: "mb-1", children: "Saldo Atual" }), _jsxs("h4", { children: ["R$ ", Number(data.saldo).toFixed(2)] })] }) }), _jsx("div", { className: "col-md-8", children: _jsxs("div", { className: "card p-3", children: [_jsx("h6", { className: "mb-1", children: "Resumo" }), _jsxs("div", { children: ["Transa\u00E7\u00F5es importadas: ", data.bank_transactions.length] }), _jsxs("div", { children: ["Lan\u00E7amentos internos: ", data.lancamentos.length] })] }) })] }), _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "card mb-3", children: [_jsx("div", { className: "card-header", children: "Extrato Interno" }), _jsx("div", { className: "card-body", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm table-hover", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Data" }), _jsx("th", { children: "Tipo" }), _jsx("th", { children: "Valor" }), _jsx("th", { children: "Descri\u00E7\u00E3o" }), _jsx("th", { children: "Reconc." })] }) }), _jsx("tbody", { children: data.lancamentos.map((l) => (_jsxs("tr", { className: l.reconciled ? 'table-success' : '', children: [_jsx("td", { children: l.data }), _jsx("td", { children: l.tipo }), _jsxs("td", { children: ["R$ ", Number(l.valor).toFixed(2)] }), _jsx("td", { children: l.descricao || '-' }), _jsx("td", { children: l.reconciled ? 'Sim' : 'Não' })] }, l.id))) })] }) }) })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "card mb-3", children: [_jsx("div", { className: "card-header", children: "Extrato Importado" }), _jsx("div", { className: "card-body", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm table-hover", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Data" }), _jsx("th", { children: "Descri\u00E7\u00E3o" }), _jsx("th", { children: "Valor" }), _jsx("th", { children: "Balance" })] }) }), _jsx("tbody", { children: data.bank_transactions.map((t) => (_jsxs("tr", { children: [_jsx("td", { children: t.date }), _jsx("td", { children: t.description || '-' }), _jsxs("td", { children: ["R$ ", Number(t.amount).toFixed(2)] }), _jsx("td", { children: t.balance !== null ? `R$ ${Number(t.balance).toFixed(2)}` : '-' })] }, t.id))) })] }) }) })] }) })] })] }), _jsx("div", { className: "modal-footer", children: _jsx("button", { className: "btn btn-secondary", onClick: onClose, children: "Fechar" }) })] }) }) }));
};
export default ContaDetalhesModal;
