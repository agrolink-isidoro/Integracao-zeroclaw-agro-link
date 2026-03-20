import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useApiQuery, useApiDelete } from '@/hooks/useApi';
const CartaoForm = React.lazy(() => import('@/components/financeiro/CartaoForm'));
const BANDEIRAS = {
    '01': 'Visa',
    '02': 'Mastercard',
    '03': 'Amex',
    '04': 'Sorocred',
    '05': 'Diners',
    '06': 'Elo',
    '07': 'Hipercard',
    '08': 'Aura',
    '09': 'Cabal',
    '99': 'Outros',
};
const CartoesList = () => {
    const { data: cartoes = [], isLoading, isError, error } = useApiQuery(['cartoes'], '/financeiro/cartoes/');
    const del = useApiDelete('/financeiro/cartoes/', [['cartoes']]);
    const [showForm, setShowForm] = React.useState(false);
    const [editing, setEditing] = React.useState(null);
    const formatCurrency = (val) => {
        if (val == null)
            return 'R$ 0,00';
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("h5", { className: "mb-0", children: "Cart\u00F5es de Cr\u00E9dito" }), _jsx("div", { children: _jsx("button", { className: "btn btn-sm btn-primary", onClick: () => { setEditing(null); setShowForm(true); }, children: "Novo Cart\u00E3o" }) })] }), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: isError ? (_jsxs("div", { className: "alert alert-danger", children: ["Erro ao carregar cart\u00F5es: ", error?.message || 'Erro desconhecido'] })) : isLoading ? (_jsx("div", { children: "Carregando cart\u00F5es..." })) : cartoes.length === 0 ? (_jsx("div", { className: "text-muted", children: "Nenhum cart\u00E3o cadastrado." })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover table-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Bandeira" }), _jsx("th", { children: "\u00DAltimos 4" }), _jsx("th", { children: "Conta" }), _jsx("th", { children: "Validade" }), _jsx("th", { children: "Venc. Fatura" }), _jsx("th", { children: "Saldo Devedor" }), _jsx("th", { children: "Pend." }), _jsx("th", { children: "Ativo" }), _jsx("th", {})] }) }), _jsx("tbody", { children: cartoes.map((c) => (_jsxs("tr", { children: [_jsx("td", { children: c.bandeira || (c.bandeira_codigo ? BANDEIRAS[c.bandeira_codigo] || c.bandeira_codigo : '-') }), _jsx("td", { children: c.numero_last4 || '-' }), _jsx("td", { children: c.conta_display || '-' }), _jsx("td", { children: c.validade || '-' }), _jsx("td", { children: c.dia_vencimento_fatura ? `Dia ${c.dia_vencimento_fatura}` : '-' }), _jsx("td", { className: parseFloat(c.saldo_devedor || 0) > 0 ? 'text-danger fw-bold' : '', children: formatCurrency(c.saldo_devedor) }), _jsx("td", { children: c.transacoes_pendentes > 0 && (_jsx("span", { className: "badge bg-warning text-dark", children: c.transacoes_pendentes })) }), _jsx("td", { children: c.ativo ? 'Sim' : 'Não' }), _jsxs("td", { children: [_jsx("button", { className: "btn btn-sm btn-outline-secondary me-2", onClick: () => { setEditing(c); setShowForm(true); }, children: "Editar" }), _jsx("button", { className: "btn btn-sm btn-outline-danger", onClick: async () => { if (!confirm('Excluir cartão?'))
                                                            return; try {
                                                            await del.mutateAsync(c.id);
                                                        }
                                                        catch (e) {
                                                            alert('Falha ao excluir');
                                                        } }, children: "Excluir" })] })] }, c.id))) })] }) })) }) }), showForm && (_jsx("div", { className: "modal d-block", tabIndex: -1, role: "dialog", children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-lg", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: editing ? 'Editar Cartão' : 'Novo Cartão' }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: () => setShowForm(false) })] }), _jsx("div", { className: "modal-body", children: _jsx(React.Suspense, { fallback: _jsx("div", { children: "Carregando formul\u00E1rio..." }), children: _jsx(CartaoForm, { initialData: editing, onClose: () => setShowForm(false), onSaved: () => setShowForm(false) }) }) })] }) }) }))] }));
};
export default CartoesList;
