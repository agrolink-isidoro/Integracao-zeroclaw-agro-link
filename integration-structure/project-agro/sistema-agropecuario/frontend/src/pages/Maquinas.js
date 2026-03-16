import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import EquipamentosList from '../components/maquinas/EquipamentosList';
import DashboardService from '../services/dashboard';
import { formatCurrency } from '../utils/formatters';
const Manutencao = lazy(() => import('./Manutencao'));
const Abastecimentos = lazy(() => import('./maquinas/Abastecimentos'));
const Maquinas = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const activeTab = location.pathname.split('/')[2] || 'dashboard';
    const { data: equipKpis, isLoading: loadEq } = useQuery({
        queryKey: ['maquinas-dashboard-equip'],
        queryFn: () => DashboardService.getMaquinasEquipamentos(),
        staleTime: 30_000,
        enabled: activeTab === 'dashboard',
    });
    const { data: abastKpis, isLoading: loadAb } = useQuery({
        queryKey: ['maquinas-dashboard-abast'],
        queryFn: () => DashboardService.getMaquinasAbastecimentos(),
        staleTime: 30_000,
        enabled: activeTab === 'dashboard',
    });
    const { data: ordensKpis, isLoading: loadOrd } = useQuery({
        queryKey: ['maquinas-dashboard-ordens'],
        queryFn: () => DashboardService.getMaquinasOrdens(),
        staleTime: 30_000,
        enabled: activeTab === 'dashboard',
    });
    const { data: categorias } = useQuery({
        queryKey: ['maquinas-dashboard-categorias'],
        queryFn: () => DashboardService.getMaquinasCategorias(),
        staleTime: 60_000,
        enabled: activeTab === 'dashboard',
    });
    const isLoading = loadEq || loadAb || loadOrd;
    const fmt = (n) => n != null ? n.toLocaleString('pt-BR') : '—';
    const renderDashboard = () => (_jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-start border-primary border-4 h-100", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-gear fs-2 text-primary flex-shrink-0" }), _jsxs("div", { className: "ms-3", children: [_jsx("h6", { className: "card-title mb-1 text-muted", children: "Equipamentos Ativos" }), _jsx("h4", { className: "mb-0", children: isLoading ? _jsx("span", { className: "placeholder col-4" }) : fmt(equipKpis?.equipamentos_ativos) }), _jsx("small", { className: "text-muted", children: equipKpis ? `de ${fmt(equipKpis.total_equipamentos)} total` : '' })] })] }) }) }) }), _jsx("div", { className: "col-lg-3 col-md-6 mb-4", children: _jsx("div", { className: `card border-start border-4 h-100 ${(equipKpis?.equipamentos_manutencao ?? 0) > 0 ? 'border-warning' : 'border-success'}`, children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-tools fs-2 text-warning flex-shrink-0" }), _jsxs("div", { className: "ms-3", children: [_jsx("h6", { className: "card-title mb-1 text-muted", children: "Em Manuten\u00E7\u00E3o" }), _jsx("h4", { className: "mb-0", children: isLoading ? _jsx("span", { className: "placeholder col-4" }) : fmt(equipKpis?.equipamentos_manutencao) }), _jsx("small", { className: "text-muted", children: ordensKpis ? `${fmt(ordensKpis.abertas)} ordens abertas` : '' })] })] }) }) }) }), _jsx("div", { className: "col-lg-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-start border-info border-4 h-100", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-fuel-pump fs-2 text-info flex-shrink-0" }), _jsxs("div", { className: "ms-3", children: [_jsx("h6", { className: "card-title mb-1 text-muted", children: "Custo Combust\u00EDvel/M\u00EAs" }), _jsx("h4", { className: "mb-0", children: isLoading ? _jsx("span", { className: "placeholder col-6" }) : formatCurrency(abastKpis?.custo_total_abastecimentos_mes ?? 0) }), _jsx("small", { className: "text-muted", children: abastKpis ? `${fmt(abastKpis.total_abastecimentos_mes)} abast. · ${Number(abastKpis.consumo_medio_litros_dia ?? 0).toFixed(1)} L/dia` : '' })] })] }) }) }) }), _jsx("div", { className: "col-lg-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-start border-success border-4 h-100", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-check-circle fs-2 text-success flex-shrink-0" }), _jsxs("div", { className: "ms-3", children: [_jsx("h6", { className: "card-title mb-1 text-muted", children: "Ordens de Servi\u00E7o" }), _jsx("h4", { className: "mb-0", children: isLoading ? _jsx("span", { className: "placeholder col-4" }) : fmt(ordensKpis?.total) }), _jsx("small", { className: "text-muted", children: ordensKpis ? `${fmt(ordensKpis.concluidas)} concluídas · ${fmt(ordensKpis.em_andamento)} em andamento` : '' })] })] }) }) }) }), equipKpis && equipKpis.equipamentos_manutencao > 0 && (_jsx("div", { className: "col-12 mb-4", children: _jsxs("div", { className: "alert alert-warning d-flex align-items-center mb-0", children: [_jsx("i", { className: "bi bi-exclamation-triangle fs-4 me-3" }), _jsxs("div", { children: [_jsxs("strong", { children: [fmt(equipKpis.equipamentos_manutencao), " equipamento(s)"] }), " em manuten\u00E7\u00E3o.", ordensKpis && ordensKpis.abertas > 0 && (_jsxs(_Fragment, { children: [" \u00B7 ", _jsxs("strong", { children: [fmt(ordensKpis.abertas), " ordem(ns)"] }), " de servi\u00E7o abertas."] })), _jsx("button", { className: "btn btn-link btn-sm p-0 ms-2", onClick: () => navigate('/maquinas/manutencao'), children: "Ver manuten\u00E7\u00F5es" })] })] }) })), _jsx("div", { className: "col-lg-8 mb-4", children: _jsxs("div", { className: "card h-100", children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center", children: [_jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-grid me-2" }), "Equipamentos por Categoria"] }), _jsxs("button", { className: "btn btn-sm btn-outline-primary", onClick: () => navigate('/maquinas/equipamentos'), children: [_jsx("i", { className: "bi bi-arrow-right me-1" }), " Ver todos"] })] }), _jsx("div", { className: "card-body", children: categorias && categorias.length > 0 ? (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm table-hover mb-0", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Categoria" }), _jsx("th", { children: "Tipo" }), _jsx("th", { className: "text-center", children: "Total" }), _jsx("th", { className: "text-center", children: "Ativos" }), _jsx("th", { className: "text-center", children: "Manuten\u00E7\u00E3o" }), _jsx("th", { className: "text-end", children: "Valor Total" })] }) }), _jsx("tbody", { children: categorias.map((c) => (_jsxs("tr", { children: [_jsx("td", { className: "fw-semibold", children: c.categoria__nome }), _jsx("td", { children: _jsx("span", { className: "badge bg-secondary", children: c.categoria__tipo_mobilidade }) }), _jsx("td", { className: "text-center", children: c.total }), _jsx("td", { className: "text-center text-success", children: c.ativos }), _jsx("td", { className: "text-center", children: c.em_manutencao > 0 ? _jsx("span", { className: "text-warning fw-bold", children: c.em_manutencao }) : _jsx("span", { className: "text-muted", children: "0" }) }), _jsx("td", { className: "text-end", children: formatCurrency(c.valor_total) })] }, c.categoria__id))) })] }) })) : (_jsx("p", { className: "text-muted mb-0", children: "Nenhuma categoria cadastrada." })) })] }) }), _jsx("div", { className: "col-lg-4 mb-4", children: _jsxs("div", { className: "card h-100", children: [_jsx("div", { className: "card-header", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-cash-coin me-2" }), "Resumo Financeiro"] }) }), _jsx("div", { className: "card-body", children: _jsxs("ul", { className: "list-group list-group-flush", children: [_jsxs("li", { className: "list-group-item d-flex justify-content-between align-items-center px-0", children: [_jsx("span", { children: "Patrim\u00F4nio em Equipamentos" }), _jsx("span", { className: "fw-bold", children: formatCurrency(equipKpis?.custo_total_equipamentos ?? 0) })] }), _jsxs("li", { className: "list-group-item d-flex justify-content-between align-items-center px-0", children: [_jsx("span", { children: "Deprecia\u00E7\u00E3o Acumulada" }), _jsx("span", { className: "fw-bold text-danger", children: formatCurrency(equipKpis?.depreciacao_total ?? 0) })] }), _jsxs("li", { className: "list-group-item d-flex justify-content-between align-items-center px-0", children: [_jsx("span", { children: "Custo Ordens de Servi\u00E7o" }), _jsx("span", { className: "fw-bold", children: formatCurrency(ordensKpis?.custo_total ?? 0) })] }), _jsxs("li", { className: "list-group-item d-flex justify-content-between align-items-center px-0", children: [_jsx("span", { children: "Combust\u00EDvel no M\u00EAs" }), _jsx("span", { className: "fw-bold", children: formatCurrency(abastKpis?.custo_total_abastecimentos_mes ?? 0) })] })] }) })] }) })] }));
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return renderDashboard();
            case 'equipamentos':
                return _jsx(EquipamentosList, {});
            case 'manutencao':
                return (_jsx(Suspense, { fallback: _jsx("div", { className: "text-center py-4", children: _jsx("div", { className: "spinner-border", role: "status" }) }), children: _jsx(Manutencao, {}) }));
            case 'abastecimentos':
                return (_jsx(Suspense, { fallback: _jsx("div", { className: "text-center py-4", children: _jsx("div", { className: "spinner-border", role: "status" }) }), children: _jsx(Abastecimentos, {}) }));
            case 'relatorios':
                return (_jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsx("h5", { className: "mb-0", children: "Relat\u00F3rios" }) }), _jsx("div", { className: "card-body", children: _jsx("p", { className: "text-muted", children: "M\u00F3dulo de relat\u00F3rios em desenvolvimento..." }) })] }));
            default:
                return renderDashboard();
        }
    };
    return _jsx(_Fragment, { children: renderContent() });
};
export default Maquinas;
