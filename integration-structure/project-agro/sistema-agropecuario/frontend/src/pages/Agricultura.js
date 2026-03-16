import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import OperacoesList from '../components/agricultura/OperacoesList';
import WeatherWidget from '../components/agricultura/WeatherWidget';
import DashboardService from '../services/dashboard';
import { formatCurrency } from '../utils/formatters';
const SafrasList = lazy(() => import('./agricultura/SafrasList'));
const CulturasList = lazy(() => import('./agricultura/CulturasList'));
const ColheitasList = lazy(() => import('./agricultura/ColheitasList'));
const Agricultura = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const activeTab = location.pathname.split('/')[2] || 'dashboard';
    const { data: dash, isLoading } = useQuery({
        queryKey: ['dashboard-agricultura'],
        queryFn: () => DashboardService.getAgricultura(),
        staleTime: 30_000,
        enabled: activeTab === 'dashboard',
    });
    const kpis = dash?.kpis;
    const fmt = (n) => n != null ? n.toLocaleString('pt-BR') : '—';
    const fmtDec = (n) => n != null ? n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—';
    const pctProd = kpis && kpis.producao_estimada_sacas_60kg > 0
        ? ((kpis.producao_real_sacas_60kg / kpis.producao_estimada_sacas_60kg) * 100)
        : null;
    const renderDashboard = () => (_jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-start border-primary border-4 h-100", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-calendar-event fs-2 text-primary flex-shrink-0" }), _jsxs("div", { className: "ms-3", children: [_jsx("h6", { className: "card-title mb-1 text-muted", children: "Plantios Ativos" }), _jsx("h4", { className: "mb-0", children: isLoading ? _jsx("span", { className: "placeholder col-4" }) : fmt(kpis?.plantios_ativos) }), _jsx("small", { className: "text-muted", children: kpis ? `${fmt(kpis.plantios_ano)} no ano` : '' })] })] }) }) }) }), _jsx("div", { className: "col-lg-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-start border-success border-4 h-100", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-box-seam fs-2 text-success flex-shrink-0" }), _jsxs("div", { className: "ms-3", children: [_jsx("h6", { className: "card-title mb-1 text-muted", children: "Produ\u00E7\u00E3o Real" }), _jsx("h4", { className: "mb-0", children: isLoading ? _jsx("span", { className: "placeholder col-6" }) : `${fmtDec(kpis?.producao_real_sacas_60kg)} sc` }), _jsx("small", { className: "text-muted", children: kpis ? `${fmtDec(kpis.producao_real_kg)} kg` : '' })] })] }) }) }) }), _jsx("div", { className: "col-lg-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-start border-warning border-4 h-100", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-clipboard-check fs-2 text-warning flex-shrink-0" }), _jsxs("div", { className: "ms-3", children: [_jsx("h6", { className: "card-title mb-1 text-muted", children: "Produ\u00E7\u00E3o Estimada" }), _jsx("h4", { className: "mb-0", children: isLoading ? _jsx("span", { className: "placeholder col-6" }) : `${fmtDec(kpis?.producao_estimada_sacas_60kg)} sc` }), _jsx("small", { className: "text-muted", children: kpis ? `${fmtDec(kpis.producao_estimada_kg)} kg` : '' })] })] }) }) }) }), _jsx("div", { className: "col-lg-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-start border-info border-4 h-100", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-trophy fs-2 text-info flex-shrink-0" }), _jsxs("div", { className: "ms-3", children: [_jsx("h6", { className: "card-title mb-1 text-muted", children: "Colheitas no Ano" }), _jsx("h4", { className: "mb-0", children: isLoading ? _jsx("span", { className: "placeholder col-4" }) : fmt(kpis?.colheitas_ano) }), _jsx("small", { className: pctProd != null ? (pctProd >= 100 ? 'text-success' : 'text-warning') : 'text-muted', children: pctProd != null ? `${pctProd.toFixed(0)}% da meta atingida` : '' })] })] }) }) }) }), _jsx("div", { className: "col-12 mb-4", children: _jsx(WeatherWidget, {}) }), _jsx("div", { className: "col-lg-8 mb-4", children: _jsxs("div", { className: "card h-100", children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center", children: [_jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-bar-chart me-2" }), "Produ\u00E7\u00E3o por Talh\u00E3o (sacas 60kg)"] }), _jsxs("button", { className: "btn btn-sm btn-outline-primary", onClick: () => navigate('/agricultura/colheitas'), children: [_jsx("i", { className: "bi bi-arrow-right me-1" }), " Ver colheitas"] })] }), _jsx("div", { className: "card-body", children: isLoading ? (_jsx("div", { className: "text-center py-4", children: _jsx("div", { className: "spinner-border spinner-border-sm", role: "status" }) })) : dash?.peso_por_talhao && dash.peso_por_talhao.length > 0 ? (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm table-hover mb-0", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Talh\u00E3o" }), _jsx("th", { className: "text-end", children: "Sacas (60kg)" }), _jsx("th", { className: "text-end", children: "Peso (kg)" }), _jsx("th", { style: { width: '30%' }, children: "Propor\u00E7\u00E3o" })] }) }), _jsx("tbody", { children: dash.peso_por_talhao.slice(0, 8).map((t) => {
                                                const maxSacas = Math.max(...dash.peso_por_talhao.map(x => x.total_sacas_60kg), 1);
                                                const pct = (t.total_sacas_60kg / maxSacas) * 100;
                                                return (_jsxs("tr", { children: [_jsx("td", { children: t.talhao_nome }), _jsx("td", { className: "text-end fw-semibold", children: fmtDec(t.total_sacas_60kg) }), _jsx("td", { className: "text-end text-muted", children: fmtDec(t.total_kg) }), _jsx("td", { children: _jsx("div", { className: "progress", style: { height: '8px' }, children: _jsx("div", { className: "progress-bar bg-success", style: { width: `${pct}%` } }) }) })] }, t.talhao_id));
                                            }) })] }) })) : (_jsx("p", { className: "text-muted mb-0", children: "Nenhuma produ\u00E7\u00E3o registrada ainda." })) })] }) }), _jsx("div", { className: "col-lg-4 mb-4", children: _jsxs("div", { className: "card h-100", children: [_jsx("div", { className: "card-header", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-lightning me-2" }), "A\u00E7\u00F5es R\u00E1pidas"] }) }), _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-grid gap-2", children: [_jsxs("button", { className: "btn btn-outline-primary btn-sm", onClick: () => navigate('/agricultura/safras'), children: [_jsx("i", { className: "bi bi-calendar-event me-2" }), " Gerenciar Safras"] }), _jsxs("button", { className: "btn btn-outline-success btn-sm", onClick: () => navigate('/agricultura/operacoes'), children: [_jsx("i", { className: "bi bi-list-check me-2" }), " Gerenciar Opera\u00E7\u00F5es"] }), _jsxs("button", { className: "btn btn-outline-info btn-sm", onClick: () => navigate('/agricultura/culturas'), children: [_jsx("i", { className: "bi bi-flower1 me-2" }), " Gerenciar Culturas"] }), _jsxs("button", { className: "btn btn-outline-warning btn-sm", onClick: () => navigate('/agricultura/colheitas'), children: [_jsx("i", { className: "bi bi-box-seam me-2" }), " Gerenciar Colheitas"] })] }) })] }) })] }));
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return renderDashboard();
            case 'operacoes':
                return (_jsxs("div", { children: [_jsx("div", { className: "d-flex justify-content-between align-items-center mb-3", children: _jsx("h5", { className: "mb-0", children: "Opera\u00E7\u00F5es Agr\u00EDcolas" }) }), _jsx(OperacoesList, {})] }));
            case 'safras':
                return (_jsx(Suspense, { fallback: _jsx("div", { className: "text-center py-4", children: _jsx("div", { className: "spinner-border", role: "status" }) }), children: _jsx(SafrasList, {}) }));
            case 'culturas':
                return (_jsx(Suspense, { fallback: _jsx("div", { className: "text-center py-4", children: _jsx("div", { className: "spinner-border", role: "status" }) }), children: _jsx(CulturasList, {}) }));
            case 'colheitas':
                return (_jsx(Suspense, { fallback: _jsx("div", { className: "text-center py-4", children: _jsx("div", { className: "spinner-border", role: "status" }) }), children: _jsx(ColheitasList, {}) }));
            case 'relatorios':
                return (_jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsx("h5", { className: "mb-0", children: "Relat\u00F3rios" }) }), _jsx("div", { className: "card-body", children: _jsx("p", { className: "text-muted", children: "M\u00F3dulo de relat\u00F3rios em desenvolvimento..." }) })] }));
            default:
                return renderDashboard();
        }
    };
    return _jsx(_Fragment, { children: renderContent() });
};
export default Agricultura;
