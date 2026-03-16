import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const ItemEmprestimoList = ({ items, onRemoveItem, onEditItem }) => {
    const totalValue = items.reduce((sum, item) => {
        const valor = parseFloat(String(item.valor_total || 0));
        return sum + (isNaN(valor) ? 0 : valor);
    }, 0);
    if (items.length === 0) {
        return (_jsxs("div", { className: "alert alert-info", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhum produto adicionado ao empr\u00E9stimo."] }));
    }
    return (_jsxs("div", { className: "card mb-3", children: [_jsx("div", { className: "card-header bg-light", children: _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-list-check me-2" }), "Produtos do Empr\u00E9stimo (", items.length, ")"] }) }), _jsx("div", { className: "card-body p-0", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm table-hover mb-0", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { children: "Produto" }), _jsx("th", { children: "Quantidade" }), _jsx("th", { children: "Valor Unit\u00E1rio" }), _jsx("th", { children: "Valor Total" }), _jsx("th", { width: "100", children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: items.map((item, index) => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("div", { children: [_jsx("strong", { children: item.produto_nome }), item.observacoes && (_jsx("div", { className: "small text-muted", children: item.observacoes }))] }) }), _jsxs("td", { children: [item.quantidade, " ", item.produto_unidade] }), _jsxs("td", { className: "text-end", children: ["R$ ", parseFloat(String(item.valor_unitario || 0)).toFixed(2)] }), _jsx("td", { className: "text-end", children: _jsxs("strong", { children: ["R$ ", parseFloat(String(item.valor_total || 0)).toFixed(2)] }) }), _jsx("td", { className: "text-center", children: _jsx("button", { className: "btn btn-sm btn-danger", onClick: () => onRemoveItem(index), title: "Remover produto", children: _jsx("i", { className: "bi bi-trash" }) }) })] }, index))) }), _jsx("tfoot", { className: "table-light", children: _jsxs("tr", { children: [_jsx("td", { colSpan: 3, className: "text-end", children: _jsx("strong", { children: "Total:" }) }), _jsx("td", { className: "text-end", children: _jsxs("h6", { className: "mb-0", children: ["R$ ", totalValue.toFixed(2)] }) }), _jsx("td", {})] }) })] }) }) })] }));
};
export default ItemEmprestimoList;
