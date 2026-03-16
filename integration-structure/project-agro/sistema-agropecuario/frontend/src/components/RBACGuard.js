import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRBAC } from '../hooks/useRBAC';
/**
 * Component that guards content based on RBAC module permissions.
 * Use this to wrap routes or sections that require specific permissions.
 */
const RBACGuard = ({ module, level = 'can_view', children, redirectTo = '/', showMessage = false, }) => {
    const { hasPermission } = useRBAC();
    if (hasPermission(module, level)) {
        return _jsx(_Fragment, { children: children });
    }
    if (showMessage) {
        return (_jsx("div", { className: "container-fluid py-5", children: _jsxs("div", { className: "text-center", children: [_jsx("i", { className: "bi bi-shield-x text-danger", style: { fontSize: '4rem' } }), _jsx("h4", { className: "mt-3", children: "Acesso Negado" }), _jsxs("p", { className: "text-muted", children: ["Voc\u00EA n\u00E3o tem permiss\u00E3o para acessar este m\u00F3dulo.", _jsx("br", {}), "Entre em contato com o administrador do sistema."] }), _jsxs("a", { href: "/", className: "btn btn-outline-primary", children: [_jsx("i", { className: "bi bi-house me-1" }), " Voltar ao Dashboard"] })] }) }));
    }
    return _jsx(Navigate, { to: redirectTo, replace: true });
};
export default RBACGuard;
