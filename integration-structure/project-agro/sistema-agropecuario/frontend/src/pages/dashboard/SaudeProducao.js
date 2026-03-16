import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, } from 'chart.js';
import KpisService from '../../services/kpis';
import LoadingSpinner from '../../components/common/LoadingSpinner';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);
const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const CATEGORY_COLORS = [
    '#1a7340',
    '#2d6a4f',
    '#40916c',
    '#52b788',
    '#74c69d',
    '#95d5b2',
    '#b7e4c7',
    '#0d5c32',
    '#155d27',
    '#081c15',
];
export default function SaudeProducao() {
    const [searchParams, setSearchParams] = useSearchParams();
    const safraId = useMemo(() => {
        const raw = searchParams.get('safraId');
        return raw ? Number(raw) : null;
    }, [searchParams]);
    const { data: safras = [], isLoading: loadingSafras } = useQuery({
        queryKey: ['safras-list'],
        queryFn: () => KpisService.listSafras(),
        staleTime: 10 * 60 * 1000,
    });
    const { data: kpis, isLoading, isError, error } = useQuery({
        queryKey: ['safra-kpis', safraId],
        queryFn: () => KpisService.getSafraKPIs(safraId),
        enabled: !!safraId,
        staleTime: 5 * 60 * 1000,
    });
    const handleSafraChange = (e) => {
        const val = e.target.value;
        setSearchParams(val ? { safraId: val } : {});
    };
    const pieData = useMemo(() => {
        if (!kpis?.costs_by_category?.length)
            return null;
        return {
            labels: kpis.costs_by_category.map((c) => c.category),
            datasets: [{
                    data: kpis.costs_by_category.map((c) => c.total),
                    backgroundColor: kpis.costs_by_category.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
                    borderWidth: 1,
                }],
        };
    }, [kpis]);
    const barData = useMemo(() => {
        if (!kpis?.costs_by_category?.length)
            return null;
        return {
            labels: kpis.costs_by_category.map((c) => c.category),
            datasets: [{
                    label: 'R$/ha',
                    data: kpis.costs_by_category.map((c) => c.per_ha),
                    backgroundColor: kpis.costs_by_category.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
                }],
        };
    }, [kpis]);
    const safraInfo = useMemo(() => safras.find((s) => s.id === safraId), [safras, safraId]);
    // Auto-select most relevant safra when user visits the production page without a query param.
    useEffect(() => {
        if (safras.length === 0)
            return;
        if (safraId)
            return; // user already selected
        // Prefer an active/ongoing safra, otherwise pick the most recent by plantio date
        const inProgress = safras.find((s) => s.status === 'em_andamento');
        const mostRecent = safras.reduce((a, b) => {
            const da = new Date(a.data_plantio || 0).getTime();
            const db = new Date(b.data_plantio || 0).getTime();
            return db > da ? b : a;
        }, safras[0]);
        const defaultSafra = inProgress ?? mostRecent ?? safras[0];
        // set query param so subsequent KPI query runs
        setSearchParams({ safraId: String(defaultSafra.id) });
    }, [safras, safraId, setSearchParams]);
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsx("div", { className: "d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2", children: _jsxs("div", { children: [_jsxs(Link, { to: "/dashboard/inteligencia", className: "text-decoration-none text-muted small", children: [_jsx("i", { className: "bi bi-arrow-left me-1" }), "Central de Intelig\u00EAncia"] }), _jsxs("h2", { className: "mb-0 mt-1", style: { color: '#2d6a4f' }, children: [_jsx("i", { className: "bi bi-graph-up me-2" }), "Dados de Produ\u00E7\u00E3o"] })] }) }), _jsx("div", { className: "card border-0 shadow-sm mb-4", style: { borderLeft: '4px solid #198754' }, children: _jsx("div", { className: "card-body py-3", children: _jsxs("div", { className: "row align-items-center", children: [_jsx("div", { className: "col-auto", children: _jsxs("label", { htmlFor: "safra-select", className: "form-label mb-0 fw-semibold", children: [_jsx("i", { className: "bi bi-tree me-1" }), "Safra"] }) }), _jsx("div", { className: "col-sm-6 col-md-4", children: _jsxs("select", { id: "safra-select", className: "form-select form-select-sm", value: safraId ?? '', onChange: handleSafraChange, disabled: loadingSafras, children: [_jsx("option", { value: "", children: "\u2014 Selecione uma safra \u2014" }), safras.map((s) => (_jsxs("option", { value: s.id, children: [s.nome_safra || s.cultura_nome, " \u2014 ", s.fazenda_nome, " (", s.status, ")"] }, s.id)))] }) }), safraInfo && (_jsxs("div", { className: "col-auto text-muted small", children: ["Plantio: ", safraInfo.data_plantio, " | \u00C1rea: ", safraInfo.area_total_ha, " ha"] }))] }) }) }), !safraId && !loadingSafras && (_jsxs("div", { className: "alert alert-info border-0", style: { backgroundColor: '#d1e7dd' }, children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Selecione uma safra acima para visualizar os KPIs de produ\u00E7\u00E3o."] })), isLoading && _jsx(LoadingSpinner, {}), isError && (_jsxs("div", { className: "alert alert-danger", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), "Erro ao carregar KPIs: ", error?.message ?? 'Erro desconhecido'] })), kpis && (_jsxs(_Fragment, { children: [_jsx("div", { className: "row g-3 mb-4", children: [
                            { label: 'Custo Total', value: fmt(kpis.custo_total), icon: 'bi-cash-stack', color: '' },
                            { label: 'Custo / ha', value: fmt(kpis.custo_por_ha), icon: 'bi-rulers', color: '' },
                            {
                                label: 'Produtividade',
                                value: kpis.unidade_producao === 'saca_60kg'
                                    ? `${(kpis.produtividade_display ?? kpis.produtividade_t_ha).toFixed(1)} sc/ha`
                                    : kpis.unidade_producao === 'kg'
                                        ? `${kpis.produtividade_t_ha.toFixed(1)} kg/ha`
                                        : `${kpis.produtividade_t_ha.toFixed(2)} t/ha`,
                                icon: 'bi-graph-up-arrow', color: '',
                            },
                            { label: 'Margem Bruta', value: `${kpis.margem_bruta_pct.toFixed(1)}%`, icon: 'bi-percent', color: kpis.margem_bruta_pct >= 0 ? 'text-success' : 'text-danger' },
                        ].map((card) => (_jsx("div", { className: "col-sm-6 col-lg-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "d-flex align-items-center mb-1", children: [_jsx("i", { className: `bi ${card.icon} me-2 text-muted` }), _jsx("h6", { className: "card-subtitle text-muted mb-0", children: card.label })] }), _jsx("h4", { className: `card-title mb-0 ${card.color}`, children: card.value })] }) }) }, card.label))) }), _jsx("div", { className: "row g-3 mb-4", children: [
                            { label: 'Área (ha)', value: kpis.area_ha.toFixed(1), icon: 'bi-map', color: '' },
                            {
                                label: kpis.unidade_producao === 'saca_60kg' ? 'Produção (sacas)' : 'Produção (t)',
                                value: kpis.unidade_producao === 'saca_60kg'
                                    ? `${(kpis.producao_sacas ?? 0).toFixed(0)} sc`
                                    : `${kpis.producao_t.toFixed(1)} t`,
                                icon: 'bi-box-fill', color: '',
                            },
                            { label: 'Preço Médio (R$/t)', value: fmt(kpis.preco_medio_r_ton), icon: 'bi-tag', color: '' },
                            { label: 'Custo / Tonelada', value: fmt(kpis.custo_por_ton), icon: 'bi-box-seam', color: '' },
                        ].map((card) => (_jsx("div", { className: "col-sm-6 col-lg-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "d-flex align-items-center mb-1", children: [_jsx("i", { className: `bi ${card.icon} me-2 text-muted` }), _jsx("h6", { className: "card-subtitle text-muted mb-0", children: card.label })] }), _jsx("h5", { className: `card-title mb-0 ${card.color}`, children: card.value })] }) }) }, card.label))) }), _jsxs("div", { className: "card border-0 shadow-sm mb-4", children: [_jsx("div", { className: "card-header bg-white border-0", children: _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-truck me-2" }), "Colheita e Log\u00EDstica (Sess\u00F5es)"] }) }), _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-6 col-md-3 text-center", children: [_jsx("small", { className: "text-muted d-block", children: "Carregamentos" }), _jsx("h5", { className: "mb-0", children: kpis.carregamentos_count ?? 0 })] }), _jsxs("div", { className: "col-6 col-md-3 text-center", children: [_jsx("small", { className: "text-muted d-block", children: "Volume Colhido (sess\u00F5es)" }), _jsx("h5", { className: "mb-0", children: kpis.unidade_producao === 'saca_60kg'
                                                            ? `${(((kpis.producao_session_kg ?? 0) / 60)).toFixed(0)} sc`
                                                            : `${((kpis.producao_session_kg ?? 0) / 1000).toFixed(1)} t` })] }), _jsxs("div", { className: "col-6 col-md-3 text-center", children: [_jsx("small", { className: "text-muted d-block", children: "Volume (Colheitas registradas)" }), _jsx("h5", { className: "mb-0", children: kpis.unidade_producao === 'saca_60kg'
                                                            ? `${(((kpis.producao_colheita_kg ?? 0) / 60)).toFixed(0)} sc`
                                                            : `${((kpis.producao_colheita_kg ?? 0) / 1000).toFixed(1)} t` })] }), _jsxs("div", { className: "col-6 col-md-3 text-center", children: [_jsx("small", { className: "text-muted d-block", children: "Custo de Transporte" }), _jsx("h5", { className: "mb-0 text-warning", children: fmt(kpis.custo_transporte_total ?? 0) })] })] }), (kpis.custo_transporte_total ?? 0) > 0 && kpis.producao_t > 0 && (_jsxs("div", { className: "mt-3 text-muted small", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Custo m\u00E9dio de transporte: ", fmt((kpis.custo_transporte_total ?? 0) / kpis.producao_t), " / t", kpis.area_ha > 0 && ` • ${fmt((kpis.custo_transporte_total ?? 0) / kpis.area_ha)} / ha`] }))] })] }), _jsxs("div", { className: "row g-3 mb-4", children: [pieData && (_jsx("div", { className: "col-12 col-md-5", children: _jsxs("div", { className: "card border-0 shadow-sm h-100", children: [_jsx("div", { className: "card-header bg-white border-0", children: _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-pie-chart me-2" }), "Distribui\u00E7\u00E3o de Custos"] }) }), _jsx("div", { className: "card-body d-flex justify-content-center align-items-center", children: _jsx("div", { style: { maxWidth: 300 }, children: _jsx(Pie, { data: pieData, options: {
                                                        responsive: true,
                                                        plugins: {
                                                            legend: { position: 'bottom', labels: { boxWidth: 12 } },
                                                            tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmt(ctx.parsed)}` } },
                                                        },
                                                    } }) }) })] }) })), barData && (_jsx("div", { className: "col-12 col-md-7", children: _jsxs("div", { className: "card border-0 shadow-sm h-100", children: [_jsx("div", { className: "card-header bg-white border-0", children: _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-bar-chart me-2" }), "Custo por ha \u2014 Categorias"] }) }), _jsx("div", { className: "card-body", children: _jsx(Bar, { data: barData, options: {
                                                    responsive: true,
                                                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${fmt(ctx.parsed.y)} /ha` } } },
                                                    scales: { y: { beginAtZero: true, ticks: { callback: (v) => `R$ ${v}` } } },
                                                } }) })] }) }))] }), kpis.costs_by_category.length > 0 && (_jsxs("div", { className: "card border-0 shadow-sm mb-4", children: [_jsxs("div", { className: "card-header bg-white d-flex justify-content-between align-items-center border-0", children: [_jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-table me-2" }), "Detalhamento por Categoria"] }), _jsxs("span", { className: "badge", style: { backgroundColor: '#198754' }, children: [kpis.costs_by_category.length, " categorias"] })] }), _jsx("div", { className: "card-body p-0", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover mb-0", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { children: "Categoria" }), _jsx("th", { className: "text-end", children: "Total (R$)" }), _jsx("th", { className: "text-end", children: "Por ha (R$/ha)" }), _jsx("th", { className: "text-end", children: "% do custo" })] }) }), _jsx("tbody", { children: kpis.costs_by_category.map((c) => (_jsxs("tr", { children: [_jsx("td", { children: c.category }), _jsx("td", { className: "text-end", children: fmt(c.total) }), _jsx("td", { className: "text-end", children: fmt(c.per_ha) }), _jsxs("td", { className: "text-end", children: [kpis.custo_total ? ((c.total / kpis.custo_total) * 100).toFixed(1) : 0, "%"] })] }, c.category))) }), _jsx("tfoot", { className: "table-light fw-bold", children: _jsxs("tr", { children: [_jsx("td", { children: "Total" }), _jsx("td", { className: "text-end", children: fmt(kpis.custo_total) }), _jsx("td", { className: "text-end", children: fmt(kpis.custo_por_ha) }), _jsx("td", { className: "text-end", children: "100%" })] }) })] }) }) })] })), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-sm-6 col-md-4", children: _jsx(Link, { to: `/financeiro/rateios?safra=${safraId}`, className: "card border-0 shadow-sm text-decoration-none h-100", children: _jsxs("div", { className: "card-body text-center py-4", children: [_jsx("i", { className: "bi bi-receipt-cutoff fs-2 d-block mb-2", style: { color: '#198754' } }), _jsx("h6", { className: "mb-1", children: "Rateios da Safra" }), _jsxs("small", { className: "text-muted", children: [kpis.rateios_pendentes, " pendente", kpis.rateios_pendentes !== 1 ? 's' : ''] })] }) }) }), _jsx("div", { className: "col-sm-6 col-md-4", children: _jsx(Link, { to: "/financeiro/vencimentos", className: "card border-0 shadow-sm text-decoration-none h-100", children: _jsxs("div", { className: "card-body text-center py-4", children: [_jsx("i", { className: "bi bi-calendar-event fs-2 text-warning d-block mb-2" }), _jsx("h6", { className: "mb-1", children: "Vencimentos" }), _jsxs("small", { className: "text-muted", children: [fmt(kpis.vencimentos_pendentes), " pendentes"] })] }) }) }), _jsx("div", { className: "col-sm-6 col-md-4", children: _jsx(Link, { to: "/agricultura/safras", className: "card border-0 shadow-sm text-decoration-none h-100", children: _jsxs("div", { className: "card-body text-center py-4", children: [_jsx("i", { className: "bi bi-tree fs-2 d-block mb-2", style: { color: '#2d6a4f' } }), _jsx("h6", { className: "mb-1", children: "Detalhe da Safra" }), _jsx("small", { className: "text-muted", children: kpis.unidade_producao === 'saca_60kg'
                                                    ? `${(kpis.producao_sacas ?? 0).toFixed(0)} sacas produzidas`
                                                    : `${kpis.producao_t.toFixed(1)} t produzidas` })] }) }) }), _jsx("div", { className: "col-sm-6 col-md-4", children: _jsx(Link, { to: "/agricultura/colheitas", className: "card border-0 shadow-sm text-decoration-none h-100", children: _jsxs("div", { className: "card-body text-center py-4", children: [_jsx("i", { className: "bi bi-truck fs-2 d-block mb-2", style: { color: '#8B4513' } }), _jsx("h6", { className: "mb-1", children: "Sess\u00F5es de Colheita" }), _jsx("small", { className: "text-muted", children: (kpis.carregamentos_count ?? 0) > 0
                                                    ? `${kpis.carregamentos_count} carregamento${(kpis.carregamentos_count ?? 0) !== 1 ? 's' : ''}`
                                                    : 'Ver sessões' })] }) }) })] })] }))] }));
}
