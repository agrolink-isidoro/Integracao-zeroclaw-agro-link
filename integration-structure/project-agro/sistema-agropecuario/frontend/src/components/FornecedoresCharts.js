import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title, } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);
const FornecedoresCharts = ({ topFornecedores = [], documentosVencendo = 0, documentosVencidos = 0 }) => {
    const barData = {
        labels: topFornecedores.map((f) => f.nome),
        datasets: [
            {
                label: 'Gastos (R$)',
                data: topFornecedores.map((f) => Number(f.total_compras || 0)),
                backgroundColor: '#2563eb',
                borderColor: '#1e40af',
                borderWidth: 1,
            },
        ],
    };
    const pieData = {
        labels: ['Vencendo', 'Vencidos'],
        datasets: [
            {
                data: [documentosVencendo, documentosVencidos],
                backgroundColor: ['#f59e0b', '#ef4444'],
            },
        ],
    };
    return (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("figure", { role: "group", "aria-labelledby": "fornecedores-charts-title", className: "mb-4", children: [_jsx("figcaption", { id: "fornecedores-charts-title", className: "visually-hidden", children: "Gr\u00E1ficos de fornecedores: gastos por fornecedor e status de documentos (vencendo VS vencidos)." }), _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-md-8 mb-4", children: _jsxs("div", { className: "card h-100", children: [_jsx("div", { className: "card-header", children: _jsx("h5", { className: "mb-0", children: "Top Fornecedores \u2014 Gastos" }) }), _jsx("div", { className: "card-body", children: topFornecedores && topFornecedores.length ? (_jsx("div", { role: "img", "aria-label": "Gr\u00E1fico de barras mostrando gastos dos top fornecedores", tabIndex: 0, className: "chart-focusable", children: _jsx(Bar, { data: barData, options: { responsive: true, plugins: { legend: { display: false } } } }) })) : (_jsx("p", { className: "text-muted", children: "Nenhum dado dispon\u00EDvel para os fornecedores." })) })] }) }), _jsx("div", { className: "col-md-4 mb-4", children: _jsxs("div", { className: "card h-100", children: [_jsx("div", { className: "card-header", children: _jsx("h5", { className: "mb-0", children: "Status de Documentos" }) }), _jsx("div", { className: "card-body d-flex align-items-center justify-content-center", children: _jsx("div", { role: "img", "aria-label": "Gr\u00E1fico de pizza mostrando documentos vencendo e vencidos", tabIndex: 0, className: "chart-focusable", children: _jsx(Pie, { data: pieData, options: { responsive: true, plugins: { legend: { position: 'bottom' } } } }) }) })] }) })] }), _jsxs("table", { className: "visually-hidden", "aria-hidden": false, "aria-label": "Dados do gr\u00E1fico de fornecedores", children: [_jsx("caption", { className: "visually-hidden", children: "Dados do gr\u00E1fico de fornecedores e status dos documentos." }), _jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Fornecedor" }), _jsx("th", { children: "Gastos (R$)" })] }) }), _jsx("tbody", { children: topFornecedores && topFornecedores.length ? (topFornecedores.map((f) => (_jsxs("tr", { children: [_jsx("td", { children: f.nome }), _jsx("td", { children: Number(f.total_compras || 0).toFixed(2) })] }, `sr-${f.id}`)))) : (_jsx("tr", { children: _jsx("td", { colSpan: 2, children: "Nenhum fornecedor dispon\u00EDvel" }) })) }), _jsxs("tfoot", { children: [_jsxs("tr", { children: [_jsx("td", { children: "Documentos vencendo" }), _jsx("td", { children: documentosVencendo })] }), _jsxs("tr", { children: [_jsx("td", { children: "Documentos vencidos" }), _jsx("td", { children: documentosVencidos })] })] })] })] }) }) }));
};
export default FornecedoresCharts;
