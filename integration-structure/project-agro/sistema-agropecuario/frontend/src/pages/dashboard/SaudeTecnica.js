import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, } from 'chart.js';
import DashboardService from '../../services/dashboard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);
const fmt = (v) => v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ —';
const fmtNum = (v) => v != null ? v.toLocaleString('pt-BR') : '—';
export default function SaudeTecnica() {
    const { data: agriData, isLoading: agriLoading } = useQuery({
        queryKey: ['dashboard-agricultura-ci'],
        queryFn: () => DashboardService.getAgricultura(),
        staleTime: 5 * 60 * 1000,
    });
    const { data: equipData, isLoading: equipLoading } = useQuery({
        queryKey: ['dashboard-maquinas-equip-ci'],
        queryFn: () => DashboardService.getMaquinasEquipamentos(),
        staleTime: 5 * 60 * 1000,
    });
    const { data: abastData, isLoading: abastLoading } = useQuery({
        queryKey: ['dashboard-maquinas-abast-ci'],
        queryFn: () => DashboardService.getMaquinasAbastecimentos(),
        staleTime: 5 * 60 * 1000,
    });
    const { data: ordensData, isLoading: ordensLoading } = useQuery({
        queryKey: ['dashboard-maquinas-ordens-ci'],
        queryFn: () => DashboardService.getMaquinasOrdens(),
        staleTime: 5 * 60 * 1000,
    });
    const { data: estoqueData, isLoading: estoqueLoading } = useQuery({
        queryKey: ['dashboard-estoque-ci'],
        queryFn: () => DashboardService.getEstoque(),
        staleTime: 5 * 60 * 1000,
    });
    const isLoading = agriLoading || equipLoading || abastLoading || ordensLoading || estoqueLoading;
    const agri = agriData?.kpis;
    const estoque = estoqueData?.kpis;
    // Produção por talhão chart
    const talhaoChartData = useMemo(() => {
        const talhoes = agriData?.peso_por_talhao ?? [];
        if (!talhoes.length)
            return null;
        const sorted = [...talhoes].sort((a, b) => b.total_sacas_60kg - a.total_sacas_60kg).slice(0, 15);
        return {
            labels: sorted.map(t => t.talhao_nome),
            datasets: [{
                    label: 'Sacas 60kg',
                    data: sorted.map(t => t.total_sacas_60kg),
                    backgroundColor: '#198754',
                    borderRadius: 4,
                }],
        };
    }, [agriData]);
    // Equipment status doughnut
    const equipDoughnutData = useMemo(() => {
        if (!equipData)
            return null;
        return {
            labels: ['Ativos', 'Manutenção', 'Inativos'],
            datasets: [{
                    data: [
                        equipData.equipamentos_ativos,
                        equipData.equipamentos_manutencao,
                        Math.max(0, equipData.total_equipamentos - equipData.equipamentos_ativos - equipData.equipamentos_manutencao),
                    ],
                    backgroundColor: ['#198754', '#ffc107', '#dc3545'],
                    borderWidth: 1,
                }],
        };
    }, [equipData]);
    // Ordens de Serviço breakdown
    const ordensBarData = useMemo(() => {
        if (!ordensData)
            return null;
        return {
            labels: ['Abertas', 'Em Andamento', 'Concluídas'],
            datasets: [{
                    label: 'Ordens de Serviço',
                    data: [ordensData.abertas, ordensData.em_andamento, ordensData.concluidas],
                    backgroundColor: ['#dc3545', '#ffc107', '#198754'],
                    borderRadius: 4,
                }],
        };
    }, [ordensData]);
    // alerts
    const alertItems = [];
    if (equipData && equipData.equipamentos_manutencao > 0) {
        alertItems.push({
            text: `${equipData.equipamentos_manutencao} equipamento(s) em manutenção`,
            variant: 'warning',
        });
    }
    if (ordensData && ordensData.abertas > 0) {
        alertItems.push({
            text: `${ordensData.abertas} ordem(ns) de serviço aberta(s)`,
            variant: 'danger',
        });
    }
    if (estoque && estoque.abaixo_minimo_count > 0) {
        alertItems.push({
            text: `${estoque.abaixo_minimo_count} produto(s) abaixo do estoque mínimo`,
            variant: 'danger',
        });
    }
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2", children: [_jsxs("div", { children: [_jsxs(Link, { to: "/dashboard/inteligencia", className: "text-decoration-none text-muted small", children: [_jsx("i", { className: "bi bi-arrow-left me-1" }), "Central de Intelig\u00EAncia"] }), _jsxs("h2", { className: "mb-0 mt-1", style: { color: '#8B4513' }, children: [_jsx("i", { className: "bi bi-tractor me-2" }), "Dados T\u00E9cnico da Fazenda"] })] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsxs(Link, { to: "/agricultura/safras", className: "btn btn-outline-secondary btn-sm", children: [_jsx("i", { className: "bi bi-flower2 me-1" }), "Safras"] }), _jsxs(Link, { to: "/maquinas", className: "btn btn-outline-secondary btn-sm", children: [_jsx("i", { className: "bi bi-gear me-1" }), "M\u00E1quinas"] })] })] }), isLoading && _jsx(LoadingSpinner, {}), alertItems.length > 0 && (_jsx("div", { className: "mb-4", children: alertItems.map((al, i) => (_jsxs("div", { className: `alert alert-${al.variant} border-0 d-flex align-items-center py-2 mb-2`, children: [_jsx("i", { className: "bi bi-exclamation-triangle-fill me-2" }), al.text] }, i))) })), agri && (_jsxs(_Fragment, { children: [_jsxs("h5", { className: "mb-3", style: { color: '#2d6a4f' }, children: [_jsx("i", { className: "bi bi-flower2 me-2" }), "Agricultura"] }), _jsx("div", { className: "row g-3 mb-4", children: [
                            { label: 'Plantios Ativos', value: fmtNum(agri.plantios_ativos), icon: 'bi-tree' },
                            { label: 'Plantios (Ano)', value: fmtNum(agri.plantios_ano), icon: 'bi-calendar-range' },
                            { label: 'Produção Real (kg)', value: fmtNum(agri.producao_real_kg), icon: 'bi-box-seam' },
                            { label: 'Produção Real (sacas)', value: fmtNum(agri.producao_real_sacas_60kg), icon: 'bi-basket3' },
                            { label: 'Prod. Estimada (kg)', value: fmtNum(agri.producao_estimada_kg), icon: 'bi-clipboard-data' },
                            { label: 'Colheitas (Ano)', value: fmtNum(agri.colheitas_ano), icon: 'bi-truck' },
                        ].map((card) => (_jsx("div", { className: "col-6 col-lg-2", children: _jsx("div", { className: "card border-0 shadow-sm h-100", style: { borderLeft: '3px solid #198754' }, children: _jsxs("div", { className: "card-body py-2 px-3", children: [_jsxs("div", { className: "d-flex align-items-center mb-1", children: [_jsx("i", { className: `bi ${card.icon} me-2 text-muted` }), _jsx("small", { className: "text-muted", children: card.label })] }), _jsx("h5", { className: "mb-0", children: card.value })] }) }) }, card.label))) }), talhaoChartData && (_jsxs("div", { className: "card border-0 shadow-sm mb-4", children: [_jsx("div", { className: "card-header bg-white border-0", children: _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-bar-chart me-2" }), "Produ\u00E7\u00E3o por Talh\u00E3o (sacas 60kg)"] }) }), _jsx("div", { className: "card-body", children: _jsx(Bar, { data: talhaoChartData, options: {
                                        responsive: true,
                                        indexAxis: 'y',
                                        plugins: { legend: { display: false } },
                                        scales: { x: { ticks: { callback: (v) => `${Number(v).toLocaleString('pt-BR')} sc` } } },
                                    } }) })] }))] })), equipData && (_jsxs(_Fragment, { children: [_jsxs("h5", { className: "mb-3", style: { color: '#8B4513' }, children: [_jsx("i", { className: "bi bi-gear me-2" }), "M\u00E1quinas & Equipamentos"] }), _jsx("div", { className: "row g-3 mb-4", children: [
                            { label: 'Total Equipamentos', value: fmtNum(equipData.total_equipamentos), icon: 'bi-tools', color: '' },
                            { label: 'Ativos', value: fmtNum(equipData.equipamentos_ativos), icon: 'bi-check-circle', color: 'text-success' },
                            { label: 'Em Manutenção', value: fmtNum(equipData.equipamentos_manutencao), icon: 'bi-wrench', color: equipData.equipamentos_manutencao > 0 ? 'text-warning' : '' },
                            { label: 'Custo Total Equip.', value: fmt(equipData.custo_total_equipamentos), icon: 'bi-cash', color: '' },
                            { label: 'Depreciação Total', value: fmt(equipData.depreciacao_total), icon: 'bi-arrow-down-circle', color: 'text-danger' },
                        ].map((card) => (_jsx("div", { className: "col-6 col-lg", children: _jsx("div", { className: "card border-0 shadow-sm h-100", style: { borderLeft: '3px solid #8B4513' }, children: _jsxs("div", { className: "card-body py-2 px-3", children: [_jsxs("div", { className: "d-flex align-items-center mb-1", children: [_jsx("i", { className: `bi ${card.icon} me-2 text-muted` }), _jsx("small", { className: "text-muted", children: card.label })] }), _jsx("h5", { className: `mb-0 ${card.color}`, children: card.value })] }) }) }, card.label))) }), _jsxs("div", { className: "row g-3 mb-4", children: [equipDoughnutData && (_jsx("div", { className: "col-12 col-md-5", children: _jsxs("div", { className: "card border-0 shadow-sm h-100", children: [_jsx("div", { className: "card-header bg-white border-0", children: _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-pie-chart me-2" }), "Status dos Equipamentos"] }) }), _jsx("div", { className: "card-body d-flex justify-content-center align-items-center", children: _jsx("div", { style: { maxWidth: 260 }, children: _jsx(Doughnut, { data: equipDoughnutData, options: {
                                                        responsive: true,
                                                        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
                                                    } }) }) })] }) })), ordensBarData && (_jsx("div", { className: "col-12 col-md-7", children: _jsxs("div", { className: "card border-0 shadow-sm h-100", children: [_jsx("div", { className: "card-header bg-white border-0", children: _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-clipboard-check me-2" }), "Ordens de Servi\u00E7o"] }) }), _jsxs("div", { className: "card-body", children: [_jsx(Bar, { data: ordensBarData, options: {
                                                        responsive: true,
                                                        plugins: { legend: { display: false } },
                                                    } }), ordensData && (_jsxs("p", { className: "text-muted small mt-2 mb-0", children: ["Total: ", fmtNum(ordensData.total), " | Custo total: ", fmt(ordensData.custo_total)] }))] })] }) }))] })] })), abastData && (_jsxs("div", { className: "row g-3 mb-4", children: [_jsx("div", { className: "col-sm-4", children: _jsx("div", { className: "card border-0 shadow-sm h-100", children: _jsxs("div", { className: "card-body", children: [_jsxs("small", { className: "text-muted", children: [_jsx("i", { className: "bi bi-fuel-pump me-1" }), "Abastecimentos (M\u00EAs)"] }), _jsx("h5", { className: "mb-0 mt-1", children: fmtNum(abastData.total_abastecimentos_mes) })] }) }) }), _jsx("div", { className: "col-sm-4", children: _jsx("div", { className: "card border-0 shadow-sm h-100", children: _jsxs("div", { className: "card-body", children: [_jsxs("small", { className: "text-muted", children: [_jsx("i", { className: "bi bi-cash me-1" }), "Custo Combust\u00EDvel (M\u00EAs)"] }), _jsx("h5", { className: "mb-0 mt-1", children: fmt(abastData.custo_total_abastecimentos_mes) })] }) }) }), _jsx("div", { className: "col-sm-4", children: _jsx("div", { className: "card border-0 shadow-sm h-100", children: _jsxs("div", { className: "card-body", children: [_jsxs("small", { className: "text-muted", children: [_jsx("i", { className: "bi bi-speedometer me-1" }), "Consumo M\u00E9dio (L/dia)"] }), _jsx("h5", { className: "mb-0 mt-1", children: abastData.consumo_medio_litros_dia != null ? Number(abastData.consumo_medio_litros_dia).toFixed(1) : '—' })] }) }) })] })), estoque && (_jsxs(_Fragment, { children: [_jsxs("h5", { className: "mb-3", style: { color: '#2d6a4f' }, children: [_jsx("i", { className: "bi bi-box me-2" }), "Estoque e Insumos"] }), _jsx("div", { className: "row g-3 mb-4", children: [
                            { label: 'Valor Total Estoque', value: fmt(estoque.valor_total_estoque), icon: 'bi-cash-stack' },
                            { label: 'Total Produtos', value: fmtNum(estoque.total_produtos), icon: 'bi-box-seam' },
                            { label: 'Abaixo do Mínimo', value: fmtNum(estoque.abaixo_minimo_count), icon: 'bi-exclamation-triangle', color: estoque.abaixo_minimo_count > 0 ? 'text-danger' : 'text-success' },
                            { label: 'Movimentações (7d)', value: fmtNum(estoque.movimentacoes_7d?.total), icon: 'bi-arrow-left-right' },
                        ].map((card) => (_jsx("div", { className: "col-6 col-lg-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "d-flex align-items-center mb-1", children: [_jsx("i", { className: `bi ${card.icon} me-2 text-muted` }), _jsx("small", { className: "text-muted", children: card.label })] }), _jsx("h5", { className: `mb-0 ${card.color ?? ''}`, children: card.value })] }) }) }, card.label))) }), estoque.abaixo_minimo_itens && estoque.abaixo_minimo_itens.length > 0 && (_jsxs("div", { className: "card border-0 shadow-sm mb-4", children: [_jsx("div", { className: "card-header bg-white border-0", children: _jsxs("h6", { className: "mb-0 text-danger", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), "Produtos Abaixo do Estoque M\u00EDnimo"] }) }), _jsx("div", { className: "card-body p-0", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover mb-0", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { children: "Produto" }), _jsx("th", { children: "C\u00F3digo" }), _jsx("th", { className: "text-end", children: "Em Estoque" }), _jsx("th", { className: "text-end", children: "M\u00EDnimo" }), _jsx("th", { className: "text-end", children: "Unidade" })] }) }), _jsx("tbody", { children: estoque.abaixo_minimo_itens.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: item.nome }), _jsx("td", { children: _jsx("code", { children: item.codigo }) }), _jsx("td", { className: "text-end text-danger fw-bold", children: fmtNum(item.quantidade_estoque) }), _jsx("td", { className: "text-end", children: fmtNum(item.estoque_minimo) }), _jsx("td", { className: "text-end", children: item.unidade })] }, item.id))) })] }) }) })] }))] })), _jsxs("div", { className: "row g-3 mt-2", children: [_jsx("div", { className: "col-sm-6 col-md-3", children: _jsx(Link, { to: "/agricultura/safras", className: "card border-0 shadow-sm text-decoration-none h-100", children: _jsxs("div", { className: "card-body text-center py-3", children: [_jsx("i", { className: "bi bi-flower2 fs-3 d-block mb-1", style: { color: '#198754' } }), _jsx("h6", { className: "mb-0 small", children: "Safras" })] }) }) }), _jsx("div", { className: "col-sm-6 col-md-3", children: _jsx(Link, { to: "/maquinas", className: "card border-0 shadow-sm text-decoration-none h-100", children: _jsxs("div", { className: "card-body text-center py-3", children: [_jsx("i", { className: "bi bi-gear fs-3 d-block mb-1", style: { color: '#8B4513' } }), _jsx("h6", { className: "mb-0 small", children: "Equipamentos" })] }) }) }), _jsx("div", { className: "col-sm-6 col-md-3", children: _jsx(Link, { to: "/estoque", className: "card border-0 shadow-sm text-decoration-none h-100", children: _jsxs("div", { className: "card-body text-center py-3", children: [_jsx("i", { className: "bi bi-box fs-3 d-block mb-1 text-primary" }), _jsx("h6", { className: "mb-0 small", children: "Estoque" })] }) }) }), _jsx("div", { className: "col-sm-6 col-md-3", children: _jsx(Link, { to: "/agricultura/talhoes", className: "card border-0 shadow-sm text-decoration-none h-100", children: _jsxs("div", { className: "card-body text-center py-3", children: [_jsx("i", { className: "bi bi-map fs-3 d-block mb-1 text-warning" }), _jsx("h6", { className: "mb-0 small", children: "Talh\u00F5es" })] }) }) })] })] }));
}
