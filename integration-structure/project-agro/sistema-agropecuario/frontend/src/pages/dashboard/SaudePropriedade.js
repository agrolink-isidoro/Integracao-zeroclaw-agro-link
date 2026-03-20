import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Title, } from 'chart.js';
import DashboardService from '../../services/dashboard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Title);
const fmt = (v) => v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ —';
const fmtPct = (v) => v != null ? `${v.toFixed(1)}%` : '—';
export default function SaudePropriedade() {
    const { data: finData, isLoading: finLoading, isError: finError } = useQuery({
        queryKey: ['dashboard-financeiro-kpis-ci'],
        queryFn: () => DashboardService.getFinanceiro(90),
        staleTime: 5 * 60 * 1000,
    });
    const { data: admData, isLoading: admLoading } = useQuery({
        queryKey: ['dashboard-administrativo-ci'],
        queryFn: () => DashboardService.getAdministrativo(),
        staleTime: 5 * 60 * 1000,
    });
    const kpis = finData?.kpis;
    const admKpis = admData?.kpis;
    const isLoading = finLoading || admLoading;
    // Fluxo de Caixa chart data
    const fluxoChartData = useMemo(() => {
        const fluxo = finData?.fluxo_caixa_mensal ?? finData?.fluxo_caixa_diario ?? [];
        if (!fluxo.length)
            return null;
        return {
            labels: fluxo.map((f) => f.date),
            datasets: [
                {
                    label: 'Entradas',
                    data: fluxo.map((f) => f.entradas),
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    fill: true,
                    tension: 0.3,
                },
                {
                    label: 'Saídas',
                    data: fluxo.map((f) => f.saidas),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: true,
                    tension: 0.3,
                },
                {
                    label: 'Saldo',
                    data: fluxo.map((f) => f.saldo),
                    borderColor: '#0d6efd',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    tension: 0.3,
                },
            ],
        };
    }, [finData]);
    // Despesas pie data
    const despesasPieData = useMemo(() => {
        if (!admKpis || !kpis)
            return null;
        const items = [
            { label: 'Folha Pagamento', value: admKpis.folha_mes?.total ?? 0 },
            { label: 'Despesas Adm.', value: admKpis.despesas_administrativas_mes?.total ?? 0 },
            { label: 'Financiamentos', value: kpis.financiamento_total ?? 0 },
            { label: 'Empréstimos', value: kpis.emprestimos_total ?? 0 },
        ].filter(i => i.value > 0);
        if (!items.length)
            return null;
        return {
            labels: items.map(i => i.label),
            datasets: [{
                    data: items.map(i => i.value),
                    backgroundColor: ['#198754', '#8B4513', '#ffc107', '#dc3545'],
                    borderWidth: 1,
                }],
        };
    }, [kpis, admKpis]);
    // Vencimentos status
    const vencAtrasados = kpis?.vencimentos_atrasados;
    const vencProximos = kpis?.vencimentos_proximos;
    // Dívida ratio indicator (simplified)
    const dividaTotal = (kpis?.financiamento_total ?? 0) + (kpis?.emprestimos_total ?? 0);
    const saldoContas = kpis?.saldo_contas ?? 0;
    const dividaRatio = saldoContas > 0 ? (dividaTotal / saldoContas * 100) : 0;
    const dividaStatus = dividaRatio < 30 ? 'success' : dividaRatio < 60 ? 'warning' : 'danger';
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2", children: [_jsxs("div", { children: [_jsxs(Link, { to: "/dashboard/inteligencia", className: "text-decoration-none text-muted small", children: [_jsx("i", { className: "bi bi-arrow-left me-1" }), "Central de Intelig\u00EAncia"] }), _jsxs("h2", { className: "mb-0 mt-1", style: { color: '#198754' }, children: [_jsx("i", { className: "bi bi-bank me-2" }), "Dados Financeiros"] })] }), _jsx("div", { className: "d-flex gap-2", children: _jsxs(Link, { to: "/financeiro", className: "btn btn-outline-secondary btn-sm", children: [_jsx("i", { className: "bi bi-cash-coin me-1" }), "Ir ao Financeiro"] }) })] }), isLoading && _jsx(LoadingSpinner, {}), finError && (_jsxs("div", { className: "alert alert-danger", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), "Erro ao carregar dados financeiros."] })), kpis && (_jsxs(_Fragment, { children: [_jsx("div", { className: "row g-3 mb-4", children: [
                            { label: 'Saldo Total Contas', value: fmt(kpis.saldo_contas), icon: 'bi-wallet2', color: (kpis.saldo_contas ?? 0) >= 0 ? 'text-success' : 'text-danger' },
                            { label: 'Caixa Período (90d)', value: fmt(kpis.caixa_periodo), icon: 'bi-cash-stack', color: (kpis.caixa_periodo ?? 0) >= 0 ? 'text-success' : 'text-danger' },
                            { label: 'Dívida Total', value: fmt(dividaTotal), icon: 'bi-credit-card-2-front', color: `text-${dividaStatus}` },
                            { label: 'Razão Dívida/Saldo', value: fmtPct(dividaRatio), icon: 'bi-speedometer2', color: `text-${dividaStatus}` },
                        ].map((card) => (_jsx("div", { className: "col-sm-6 col-lg-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "d-flex align-items-center mb-1", children: [_jsx("i", { className: `bi ${card.icon} me-2 text-muted` }), _jsx("h6", { className: "card-subtitle text-muted mb-0 small", children: card.label })] }), _jsx("h4", { className: `card-title mb-0 ${card.color}`, children: card.value })] }) }) }, card.label))) }), _jsx("div", { className: "row g-3 mb-4", children: [
                            { label: 'EBITDA', value: fmt(kpis.ebitda), icon: 'bi-graph-up', color: '' },
                            { label: 'Gasto / Hectare', value: fmt(kpis.gasto_por_hectare), icon: 'bi-rulers', color: '' },
                            { label: 'Venc. Atrasados', value: `${vencAtrasados?.count ?? 0} (${fmt(vencAtrasados?.total ?? 0)})`, icon: 'bi-exclamation-triangle', color: (vencAtrasados?.count ?? 0) > 0 ? 'text-danger' : 'text-success' },
                            { label: 'Venc. Próximos', value: `${vencProximos?.count ?? 0} (${fmt(vencProximos?.total ?? 0)})`, icon: 'bi-calendar-check', color: 'text-warning' },
                        ].map((card) => (_jsx("div", { className: "col-sm-6 col-lg-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "d-flex align-items-center mb-1", children: [_jsx("i", { className: `bi ${card.icon} me-2 text-muted` }), _jsx("h6", { className: "card-subtitle text-muted mb-0 small", children: card.label })] }), _jsx("h5", { className: `card-title mb-0 ${card.color}`, children: card.value })] }) }) }, card.label))) }), dividaRatio > 50 && (_jsxs("div", { className: "alert alert-warning border-0 d-flex align-items-center mb-4", role: "alert", children: [_jsx("i", { className: "bi bi-exclamation-triangle-fill me-2 fs-5" }), _jsxs("div", { children: [_jsx("strong", { children: "Aten\u00E7\u00E3o:" }), " A raz\u00E3o d\u00EDvida/saldo est\u00E1 em ", fmtPct(dividaRatio), " \u2014 acima do recomendado (50%). Considere renegociar prazos ou reduzir endividamento."] })] })), _jsxs("div", { className: "row g-3 mb-4", children: [fluxoChartData && (_jsx("div", { className: "col-12 col-lg-7", children: _jsxs("div", { className: "card border-0 shadow-sm h-100", children: [_jsx("div", { className: "card-header bg-white border-0", children: _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-graph-up me-2" }), "Fluxo de Caixa"] }) }), _jsx("div", { className: "card-body", children: _jsx(Line, { data: fluxoChartData, options: {
                                                    responsive: true,
                                                    interaction: { intersect: false, mode: 'index' },
                                                    plugins: {
                                                        legend: { position: 'bottom', labels: { boxWidth: 12 } },
                                                        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y ?? 0)}` } },
                                                    },
                                                    scales: {
                                                        y: { ticks: { callback: (v) => `R$ ${Number(v).toLocaleString('pt-BR')}` } },
                                                        x: { ticks: { maxTicksLimit: 8 } },
                                                    },
                                                } }) })] }) })), despesasPieData && (_jsx("div", { className: "col-12 col-lg-5", children: _jsxs("div", { className: "card border-0 shadow-sm h-100", children: [_jsx("div", { className: "card-header bg-white border-0", children: _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-pie-chart me-2" }), "Composi\u00E7\u00E3o de Despesas"] }) }), _jsx("div", { className: "card-body d-flex justify-content-center align-items-center", children: _jsx("div", { style: { maxWidth: 300 }, children: _jsx(Pie, { data: despesasPieData, options: {
                                                        responsive: true,
                                                        plugins: {
                                                            legend: { position: 'bottom', labels: { boxWidth: 12 } },
                                                            tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmt(ctx.parsed)}` } },
                                                        },
                                                    } }) }) })] }) }))] }), admKpis && (_jsxs("div", { className: "card border-0 shadow-sm mb-4", children: [_jsx("div", { className: "card-header bg-white border-0", children: _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-people me-2" }), "Resumo Administrativo (M\u00EAs)"] }) }), _jsx("div", { className: "card-body p-0", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover mb-0", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { children: "Item" }), _jsx("th", { className: "text-end", children: "Qtde" }), _jsx("th", { className: "text-end", children: "Valor (R$)" })] }) }), _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsxs("td", { children: [_jsx("i", { className: "bi bi-person-badge me-2" }), "Funcion\u00E1rios Ativos"] }), _jsx("td", { className: "text-end", children: admKpis.funcionarios?.ativos ?? '—' }), _jsx("td", { className: "text-end", children: "\u2014" })] }), _jsxs("tr", { children: [_jsxs("td", { children: [_jsx("i", { className: "bi bi-cash me-2" }), "Folha de Pagamento"] }), _jsx("td", { className: "text-end", children: admKpis.folha_mes?.count ?? '—' }), _jsx("td", { className: "text-end", children: fmt(admKpis.folha_mes?.total) })] }), _jsxs("tr", { children: [_jsxs("td", { children: [_jsx("i", { className: "bi bi-receipt me-2" }), "Despesas Administrativas"] }), _jsx("td", { className: "text-end", children: admKpis.despesas_administrativas_mes?.count ?? '—' }), _jsx("td", { className: "text-end", children: fmt(admKpis.despesas_administrativas_mes?.total) })] })] })] }) }) })] })), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-sm-6 col-md-3", children: _jsx(Link, { to: "/financeiro/vencimentos", className: "card border-0 shadow-sm text-decoration-none h-100", children: _jsxs("div", { className: "card-body text-center py-3", children: [_jsx("i", { className: "bi bi-calendar-event fs-3 d-block mb-1", style: { color: '#198754' } }), _jsx("h6", { className: "mb-0 small", children: "Vencimentos" })] }) }) }), _jsx("div", { className: "col-sm-6 col-md-3", children: _jsx(Link, { to: "/financeiro/contas-bancarias", className: "card border-0 shadow-sm text-decoration-none h-100", children: _jsxs("div", { className: "card-body text-center py-3", children: [_jsx("i", { className: "bi bi-bank fs-3 d-block mb-1", style: { color: '#8B4513' } }), _jsx("h6", { className: "mb-0 small", children: "Contas Banc\u00E1rias" })] }) }) }), _jsx("div", { className: "col-sm-6 col-md-3", children: _jsx(Link, { to: "/financeiro/operacoes", className: "card border-0 shadow-sm text-decoration-none h-100", children: _jsxs("div", { className: "card-body text-center py-3", children: [_jsx("i", { className: "bi bi-arrow-left-right fs-3 d-block mb-1 text-primary" }), _jsx("h6", { className: "mb-0 small", children: "Opera\u00E7\u00F5es" })] }) }) }), _jsx("div", { className: "col-sm-6 col-md-3", children: _jsx(Link, { to: "/financeiro/fluxo-caixa", className: "card border-0 shadow-sm text-decoration-none h-100", children: _jsxs("div", { className: "card-body text-center py-3", children: [_jsx("i", { className: "bi bi-graph-up fs-3 d-block mb-1 text-warning" }), _jsx("h6", { className: "mb-0 small", children: "Fluxo de Caixa" })] }) }) })] })] }))] }));
}
