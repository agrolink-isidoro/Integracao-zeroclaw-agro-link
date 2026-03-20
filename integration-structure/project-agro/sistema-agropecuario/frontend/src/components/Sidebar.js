import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRBAC } from '../hooks/useRBAC';
import { useActions } from '../contexts/ActionsContext';
const allMenuItems = [
    { name: 'Dashboard', path: '/', icon: 'bi-house-door', rbacModule: 'dashboard' },
    { name: 'Isidoro IA', path: '/actions', icon: 'bi-robot', rbacModule: 'actions', title: 'Fila de ações geradas por IA' },
    { name: 'Central de Inteligência', path: '/dashboard/inteligencia', icon: 'bi-lightbulb-fill', rbacModule: 'dashboard', title: 'Visão consolidada da propriedade' },
    {
        name: 'Fazendas',
        path: '/fazendas',
        icon: 'bi-building',
        rbacModule: 'fazendas',
        subItems: [
            { name: 'Visão Geral', path: '/fazendas/dashboard' },
            { name: 'Mapa', path: '/fazendas/mapa' },
            { name: 'Fazendas', path: '/fazendas/fazendas' },
            { name: 'Proprietários', path: '/fazendas/proprietarios' },
            { name: 'Áreas', path: '/fazendas/areas' },
            { name: 'Talhões', path: '/fazendas/talhoes' },
            { name: 'Arrendamentos', path: '/fazendas/arrendamentos' },
        ]
    },
    {
        name: 'Agricultura',
        path: '/agricultura',
        icon: 'bi-tree',
        rbacModule: 'agricultura',
        subItems: [
            { name: 'Visão Geral', path: '/agricultura/dashboard' },
            { name: 'Safras', path: '/agricultura/safras' },
            { name: 'Operações', path: '/agricultura/operacoes' },
            { name: 'Culturas', path: '/agricultura/culturas' },
            { name: 'Colheitas', path: '/agricultura/colheitas' },
        ]
    },
    { name: 'Máquinas', path: '/maquinas', icon: 'bi-truck', rbacModule: 'maquinas',
        subItems: [
            { name: 'Visão Geral', path: '/maquinas/dashboard' },
            { name: 'Equipamentos', path: '/maquinas/equipamentos' },
            { name: 'Manutenção', path: '/maquinas/manutencao' },
            { name: 'Abastecimentos', path: '/maquinas/abastecimentos' },
        ]
    },
    { name: 'Estoque', path: '/estoque', icon: 'bi-box-seam', rbacModule: 'estoque',
        subItems: [
            { name: 'Visão Geral', path: '/estoque/dashboard' },
            { name: 'Produtos', path: '/estoque/produtos' },
            { name: 'Locais de Armazenagem', path: '/estoque/locais' },
            { name: 'Movimentações', path: '/estoque/movimentacoes' },
        ]
    },
    { name: 'Comercial', path: '/comercial', icon: 'bi-cart', rbacModule: 'comercial',
        subItems: [
            { name: 'Visão Geral', path: '/comercial/dashboard' },
            { name: 'Vendas', path: '/comercial/vendas' },
            { name: 'Contratos', path: '/comercial/contratos' },
            { name: 'Clientes', path: '/comercial/clientes' },
            { name: 'Fornecedores', path: '/comercial/fornecedores' },
        ]
    },
    { name: 'Financeiro', path: '/financeiro', icon: 'bi-cash-coin', rbacModule: 'financeiro',
        subItems: [
            { name: 'Visão Geral', path: '/financeiro/dashboard' },
            { name: 'Despesas & Rateios', path: '/financeiro/rateios' },
            { name: 'Operações', path: '/financeiro/operacoes' },
            { name: 'Fluxo de Caixa', path: '/financeiro/fluxo-caixa' },
            { name: 'Contas Bancárias', path: '/financeiro/contas-bancarias' },
            { name: 'Vencimentos', path: '/financeiro/vencimentos' },
        ]
    },
    { name: 'Administrativo', path: '/administrativo', icon: 'bi-people', rbacModule: 'administrativo' },
    { name: 'Fiscal', path: '/fiscal', icon: 'bi-receipt', rbacModule: 'fiscal' },
];
const Sidebar = () => {
    const location = useLocation();
    const [openMenu, setOpenMenu] = useState(null);
    const { visibleModules } = useRBAC();
    const { pendingCount } = useActions();
    // Filter menu items based on RBAC permissions
    const menuItems = useMemo(() => {
        return allMenuItems.filter((item) => {
            if (!item.rbacModule)
                return true; // No module restriction
            return visibleModules.includes(item.rbacModule);
        });
    }, [visibleModules]);
    const toggleMenu = (menuName) => {
        setOpenMenu(openMenu === menuName ? null : menuName);
    };
    const isPathActive = (path) => {
        // Root path '/' must be an exact match to avoid highlighting Dashboard for every route
        if (path === '/')
            return location.pathname === '/';
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };
    return (_jsxs("div", { className: "bg-dark text-white", style: { width: '250px', minWidth: '250px', maxWidth: '250px', minHeight: '100vh' }, children: [_jsx("div", { className: "p-3", children: _jsx("h4", { className: "mb-0", children: "Agro-link" }) }), _jsx("hr", { className: "bg-light" }), _jsx("nav", { className: "nav flex-column", children: menuItems.map((item) => {
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isActive = isPathActive(item.path);
                    const isOpen = openMenu === item.name || isActive;
                    return (_jsx("div", { children: hasSubItems ? (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => toggleMenu(item.name), className: `nav-link text-white w-100 text-start border-0 d-flex justify-content-between align-items-center ${isActive ? 'bg-primary' : ''}`, style: { background: 'transparent' }, title: item.title ?? '', children: [_jsxs("span", { children: [_jsx("i", { className: `bi ${item.icon} me-2` }), item.name] }), _jsx("i", { className: `bi bi-chevron-${isOpen ? 'down' : 'right'}` })] }), isOpen && (_jsx("div", { className: "ps-4", children: (item.subItems ?? []).map((subItem) => (_jsxs(Link, { to: subItem.path, className: `nav-link text-white-50 ${(location.pathname === subItem.path || location.pathname.startsWith(subItem.path + '/')) ? 'bg-secondary text-white' : ''}`, style: { fontSize: '0.9rem' }, title: subItem.name, children: [_jsx("i", { className: "bi bi-dot me-1" }), subItem.name] }, subItem.path))) }))] })) : (_jsxs(Link, { to: item.path, className: `nav-link text-white d-flex justify-content-between align-items-center ${isActive ? 'bg-primary' : ''}`, title: item.title ?? '', style: item.path === '/dashboard/inteligencia'
                                ? { background: isActive ? undefined : 'linear-gradient(90deg, rgba(253,126,20,0.06), transparent)', borderLeft: '4px solid #fd7e14' }
                                : item.path === '/actions'
                                    ? { background: isActive ? undefined : 'rgba(25,135,84,0.08)', borderLeft: '4px solid #198754' }
                                    : undefined, children: [_jsxs("span", { children: [_jsx("i", { className: `bi ${item.icon} me-2`, style: item.path === '/dashboard/inteligencia'
                                                ? { color: '#fd7e14' }
                                                : item.path === '/actions'
                                                    ? { color: '#198754' }
                                                    : undefined }), item.name] }), item.path === '/actions' && pendingCount > 0 && (_jsx("span", { className: "badge bg-warning text-dark", style: { fontSize: '0.65rem' }, children: pendingCount > 99 ? '99+' : pendingCount }))] })) }, item.path));
                }) })] }));
};
export default Sidebar;
