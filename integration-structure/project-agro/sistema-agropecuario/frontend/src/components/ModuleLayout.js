import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
const ModuleLayout = ({ title, subtitle, menuItems }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isTabActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsx("div", { className: "d-flex justify-content-between align-items-center mb-4", children: _jsxs("div", { children: [_jsx("h1", { className: "h3 mb-0", children: title }), _jsx("p", { className: "text-muted", children: subtitle })] }) }), _jsx("div", { className: "d-flex align-items-center mb-4", style: { overflowX: 'auto' }, children: _jsx("ul", { className: "nav nav-tabs mb-0 flex-nowrap", children: menuItems.map((item) => (_jsx("li", { className: "nav-item", children: _jsxs("button", { className: `nav-link ${isTabActive(item.path) ? 'active' : ''}`, onClick: () => navigate(item.path), children: [_jsx("i", { className: `${item.icon} me-2` }), item.label] }) }, item.id))) }) }), _jsx(Outlet, {})] }));
};
export default ModuleLayout;
