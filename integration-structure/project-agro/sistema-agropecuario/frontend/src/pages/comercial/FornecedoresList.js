import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import FornecedorList from '@/components/comercial/FornecedorList';
const FornecedoresPage = () => {
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsx("div", { className: "d-flex justify-content-between align-items-center mb-4", children: _jsxs("div", { children: [_jsx("h1", { className: "h3 mb-0", children: "Fornecedores" }), _jsx("p", { className: "text-muted", children: "Lista de fornecedores \u2014 pesquisar, cadastrar, editar e gerenciar documentos." })] }) }), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: _jsx(FornecedorList, { onEdit: () => { } }) }) })] }));
};
export default FornecedoresPage;
