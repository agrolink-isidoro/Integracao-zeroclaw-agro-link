import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CentrosCustoList from '@/components/administrativo/CentrosCustoList';
import CentroCustoForm from '@/components/administrativo/CentroCustoForm';
import FuncionariosList from '@/components/administrativo/FuncionariosList';
import FolhaPagamento from '@/components/administrativo/FolhaPagamento';
import { useRBAC } from '@/hooks/useRBAC';
import { useAuthContext } from '@/contexts/AuthContext';
const FolhaSummaryCards = React.lazy(() => import('@/components/administrativo/FolhaSummaryCards'));
const GestaoUsuarios = React.lazy(() => import('@/components/administrativo/GestaoUsuarios'));
const PerfisPermissao = React.lazy(() => import('@/components/administrativo/PerfisPermissao'));
const LogAuditoria = React.lazy(() => import('@/components/administrativo/LogAuditoria'));
const GestaoTenants = React.lazy(() => import('@/components/administrativo/GestaoTenants'));
const Administrativo = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const { isAdmin, isSuperuser } = useRBAC();
    const { user } = useAuthContext();
    const navigate = useNavigate();
    // isSystemAdmin: only true Django staff users can manage tenants globally.
    // NOTE: is_superuser is synthetically set to true for proprietário (farm owner)
    // users by the RBAC serializer — do NOT use it here. Only real Django is_staff
    // (system administrators) should be able to see and manage tenant configuration.
    const isSystemAdmin = !!user?.is_staff;
    // Simplified menu for Administrative app: only tabs we implement in MVP
    const menuItems = [
        { id: 'dashboard', label: 'Visão Geral', icon: 'bi bi-speedometer2' },
        { id: 'funcionarios', label: 'Funcionários', icon: 'bi bi-people' },
        { id: 'folha', label: 'Folha de Pagamento', icon: 'bi bi-cash' },
        // RBAC tabs — visible only for admins / superusers
        ...(isAdmin || isSuperuser
            ? [
                { id: 'usuarios', label: 'Gestão de Usuários', icon: 'bi bi-person-gear' },
                { id: 'perfis', label: 'Perfis de Permissão', icon: 'bi bi-shield-lock' },
                { id: 'auditoria', label: 'Log de Auditoria', icon: 'bi bi-journal-text' },
            ]
            : []),
        // Tenant management — visible only for actual system admins (is_staff or is_superuser)
        ...(isSystemAdmin
            ? [{ id: 'tenants', label: 'Tenants', icon: 'bi bi-building' }]
            : []),
    ];
    // Small wrapper to show list + create modal for Centros de Custo
    const CentroCustoBlock = () => {
        const [open, setOpen] = useState(false);
        return (_jsxs("div", { children: [_jsx(CentrosCustoList, { onOpenCreate: () => setOpen(true) }), open && (_jsx("div", { className: "modal d-block", tabIndex: -1, role: "dialog", "aria-modal": "true", children: _jsx("div", { className: "modal-dialog modal-dialog-centered", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Novo Centro de Custo" }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: () => setOpen(false) })] }), _jsx("div", { className: "modal-body", children: _jsx(CentroCustoForm, { onClose: () => setOpen(false) }) })] }) }) }))] }));
    };
    // Simplified dashboard layout focused on active MVP features
    const renderDashboard = () => (_jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-lg-8 mb-4", children: [_jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center", children: [_jsx("h5", { className: "mb-0", children: "Funcion\u00E1rios" }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-sm btn-outline-primary me-2", onClick: () => setActiveTab('funcionarios'), children: "Ver todos" }), _jsx("button", { className: "btn btn-sm btn-primary", onClick: () => setActiveTab('funcionarios'), children: "Novo" })] })] }), _jsxs("div", { className: "card-body", children: [_jsx("p", { className: "text-muted", children: "Lista e gerenciamento de funcion\u00E1rios (cadastro, edi\u00E7\u00E3o e remo\u00E7\u00E3o)." }), _jsx(FuncionariosList, {})] })] }), _jsxs("div", { className: "card mt-4", children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center", children: [_jsx("h5", { className: "mb-0", children: "Centros de Custo" }), _jsx("small", { className: "text-muted", children: "Usados por Despesas e Rateios" })] }), _jsx("div", { className: "card-body", children: _jsx(CentroCustoBlock, {}) })] })] }), _jsxs("div", { className: "col-lg-4 mb-4", children: [_jsxs("div", { className: "card border-0 shadow-sm h-100 bg-primary bg-gradient text-white mb-3", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center px-3 py-2", children: [_jsxs("div", { children: [_jsx("h5", { className: "mb-0 text-white", children: "Folha \u2014 m\u00EAs anterior" }), _jsx("small", { className: "text-white-50", children: "Resumo consolidado" })] }), _jsx("div", { children: _jsx("small", { className: "text-white-50", children: "Vis\u00E3o r\u00E1pida" }) })] }), _jsx("div", { className: "card-body p-2", children: _jsx("div", { children: _jsx(React.Suspense, { fallback: _jsx("div", { className: "text-center text-white-50", children: "Carregando..." }), children: _jsx(FolhaSummaryCards, {}) }) }) })] }), _jsx("div", { className: "card mt-3", children: _jsxs("div", { className: "card-body", children: [_jsx("h6", { children: "Atalhos" }), _jsxs("div", { className: "d-grid gap-2", children: [_jsx("button", { className: "btn btn-outline-primary", onClick: () => navigate('/financeiro'), children: "Ir para Financeiro" }), _jsx("button", { className: "btn btn-outline-primary", onClick: () => navigate('/fiscal'), children: "Ir para Fiscal" }), _jsx("button", { className: "btn btn-outline-primary", onClick: () => navigate('/administrativo'), children: "Configura\u00E7\u00F5es Administrativo" })] })] }) })] })] }));
    const renderFuncionarios = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header d-flex justify-content-between align-items-center", children: _jsx("h5", { className: "mb-0", children: "Funcion\u00E1rios" }) }), _jsx("div", { className: "card-body", children: _jsx(FuncionariosList, {}) })] }) }) }));
    const renderDepartamentos = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center", children: [_jsx("h5", { className: "mb-0", children: "Departamentos" }), _jsxs("button", { className: "btn btn-sm btn-primary", children: [_jsx("i", { className: "bi bi-plus-circle me-1" }), " Novo Departamento"] })] }), _jsx("div", { className: "card-body", children: _jsx("p", { className: "text-muted", children: "M\u00F3dulo de departamentos em desenvolvimento..." }) })] }) }) }));
    const renderDocumentos = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center", children: [_jsx("h5", { className: "mb-0", children: "Documentos" }), _jsxs("button", { className: "btn btn-sm btn-primary", children: [_jsx("i", { className: "bi bi-plus-circle me-1" }), " Novo Documento"] })] }), _jsx("div", { className: "card-body", children: _jsx("p", { className: "text-muted", children: "M\u00F3dulo de documentos em desenvolvimento..." }) })] }) }) }));
    const renderRelatorios = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsx("h5", { className: "mb-0", children: "Relat\u00F3rios Administrativos" }) }), _jsx("div", { className: "card-body", children: _jsx("p", { className: "text-muted", children: "M\u00F3dulo de relat\u00F3rios em desenvolvimento..." }) })] }) }) }));
    const renderUsuarios = () => (_jsx(React.Suspense, { fallback: _jsx("div", { className: "text-center py-4", children: _jsx("div", { className: "spinner-border", role: "status" }) }), children: _jsx(GestaoUsuarios, {}) }));
    const renderPerfis = () => (_jsx(React.Suspense, { fallback: _jsx("div", { className: "text-center py-4", children: _jsx("div", { className: "spinner-border", role: "status" }) }), children: _jsx(PerfisPermissao, {}) }));
    const renderAuditoria = () => (_jsx(React.Suspense, { fallback: _jsx("div", { className: "text-center py-4", children: _jsx("div", { className: "spinner-border", role: "status" }) }), children: _jsx(LogAuditoria, {}) }));
    const renderTenants = () => (_jsx(React.Suspense, { fallback: _jsx("div", { className: "text-center py-4", children: _jsx("div", { className: "spinner-border", role: "status" }) }), children: _jsx(GestaoTenants, {}) }));
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return renderDashboard();
            case 'funcionarios':
                return renderFuncionarios();
            case 'folha':
                return _jsxs("div", { children: [renderFuncionarios() /* keep list above */, _jsx("div", { className: "mt-4", children: _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: _jsx(FolhaPagamento, {}) }) }) })] });
            case 'usuarios':
                return renderUsuarios();
            case 'perfis':
                return renderPerfis();
            case 'auditoria':
                return renderAuditoria();
            case 'tenants':
                return renderTenants();
            case 'departamentos':
                return renderDepartamentos();
            case 'documentos':
                return renderDocumentos();
            case 'relatorios':
                return renderRelatorios();
            default:
                return renderDashboard();
        }
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsx("div", { className: "d-flex justify-content-between align-items-center mb-4", children: _jsxs("div", { children: [_jsx("h1", { className: "h3 mb-0", children: "Administrativo" }), _jsx("p", { className: "text-muted", children: "Gest\u00E3o de recursos humanos e administra\u00E7\u00E3o" })] }) }), _jsx("div", { className: "d-flex align-items-center mb-4", style: { overflowX: 'auto' }, children: _jsx("ul", { className: "nav nav-tabs mb-0 flex-nowrap", children: menuItems.map((item) => (_jsx("li", { className: "nav-item", children: _jsxs("button", { className: `nav-link ${activeTab === item.id ? 'active' : ''}`, onClick: () => setActiveTab(item.id), children: [_jsx("i", { className: `${item.icon} me-2` }), item.label] }) }, item.id))) }) }), renderContent()] }));
};
export default Administrativo;
