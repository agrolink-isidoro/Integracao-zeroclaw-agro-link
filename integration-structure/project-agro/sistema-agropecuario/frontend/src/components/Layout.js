import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useTenant } from '../hooks/useTenant';
import Sidebar from './Sidebar';
import Notifications from './common/Notifications';
import ChatWidget from './actions/ChatWidget';
const Layout = () => {
    const { user, logout } = useAuthContext();
    const { tenantName, isSuperuser } = useTenant();
    const handleLogout = async () => {
        await logout();
    };
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (_jsxs("div", { className: "d-flex vh-100 bg-light", children: [_jsx("div", { className: "d-none d-lg-block", children: _jsx(Sidebar, {}) }), sidebarOpen && (_jsxs(_Fragment, { children: [_jsx("div", { className: "position-fixed top-0 start-0 w-100 h-100 d-lg-none", style: { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1040 }, onClick: () => setSidebarOpen(false) }), _jsx("div", { className: "position-fixed top-0 start-0 h-100 d-lg-none", style: { zIndex: 1050, width: '250px' }, children: _jsx(Sidebar, {}) })] })), _jsxs("main", { className: "d-flex flex-column flex-fill overflow-auto", children: [_jsxs("header", { className: "bg-white border-bottom p-3 d-flex flex-wrap justify-content-between align-items-center gap-2", children: [_jsxs("div", { className: "d-flex align-items-center", children: [_jsx("button", { className: "btn btn-outline-secondary d-lg-none me-2", onClick: () => setSidebarOpen(!sidebarOpen), children: _jsx("i", { className: "bi bi-list" }) }), _jsx("h5", { className: "mb-0", children: "Agro-link - Sua gest\u00E3o otimizada via intelig\u00EAncia artificial" })] }), _jsxs("div", { className: "d-flex align-items-center", children: [_jsx(Notifications, {}), tenantName && (_jsxs("span", { className: `badge me-3 ${isSuperuser ? 'bg-warning text-dark' : 'bg-success'}`, title: isSuperuser ? 'Superuser — tenant selecionado' : 'Tenant ativo', children: [_jsx("i", { className: "bi bi-building me-1" }), tenantName] })), _jsxs("span", { className: "me-3", children: ["Ol\u00E1, ", user?.username || 'Usuário'] }), _jsx("button", { className: "btn btn-outline-danger btn-sm", onClick: handleLogout, children: "Sair" })] })] }), _jsx(Outlet, {})] }), _jsx(ChatWidget, {})] }));
};
export default Layout;
