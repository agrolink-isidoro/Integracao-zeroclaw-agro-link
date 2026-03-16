import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const VencimentosCalendar = React.lazy(() => import('@/pages/financeiro/VencimentosCalendar'));
import { useQuery } from '@tanstack/react-query';
import { Pie, Bar } from 'react-chartjs-2';
import financeiroService from '@/services/financeiro';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, } from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);
const Dashboard = () => {
    const [dataRef, setDataRef] = React.useState('');
    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['financeiro', 'resumo', dataRef],
        queryFn: () => financeiroService.getResumoFinanceiro(dataRef || undefined),
        staleTime: 1000 * 60 * 5, // cache for 5 minutes
    });
    if (isLoading)
        return _jsx(LoadingSpinner, {});
    if (error)
        return (_jsxs("div", { className: "alert alert-danger", children: [_jsx("div", { children: _jsx("strong", { children: "Erro ao carregar resumo financeiro." }) }), error?.response?.status && (_jsx("div", { className: "mt-1", children: _jsxs("small", { children: ["Status: ", error.response.status, " \u2014 ", error.response.data?.detail ?? JSON.stringify(error.response.data)] }) })), _jsx("div", { className: "mt-2", children: _jsx("button", { className: "btn btn-sm btn-outline-secondary me-2", onClick: () => refetch(), disabled: isFetching, children: "Tentar novamente" }) })] }));
    const pieData = {
        labels: ['Pendente', 'Pago', 'Atrasado'],
        datasets: [
            {
                data: [data?.vencimentos.total_pendente ?? 0, data?.vencimentos.total_pago ?? 0, data?.vencimentos.total_atrasado ?? 0],
                backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
            },
        ],
    };
    const barData = {
        labels: ['Financiamentos', 'Empréstimos'],
        datasets: [
            {
                label: 'Total Pendente',
                data: [data?.financiamentos.total_pendente ?? 0, data?.emprestimos.total_pendente ?? 0],
                backgroundColor: '#60a5fa',
            },
            {
                label: 'Total (Financiado/Emprestado)',
                data: [data?.financiamentos.total_financiado ?? 0, data?.emprestimos.total_emprestado ?? 0],
                backgroundColor: '#f97316',
            },
        ],
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-end align-items-center mb-3", children: [_jsx("label", { htmlFor: "data_referencia", className: "me-2", children: "Data refer\u00EAncia" }), _jsx("input", { id: "data_referencia", type: "date", value: dataRef, onChange: (e) => setDataRef(e.target.value), className: "form-control form-control-sm me-2", style: { width: 160 } }), _jsx("button", { className: "btn btn-sm btn-outline-primary", onClick: () => refetch(), disabled: isFetching, children: "Atualizar" })] }), _jsx("div", { className: "row", children: _jsx("div", { className: "col-12 mb-3", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: "Calend\u00E1rio de Vencimentos" }), _jsx("div", { className: "card-body", children: _jsx(React.Suspense, { fallback: _jsx("div", { className: "text-center py-3", children: _jsx("div", { className: "spinner-border spinner-border-sm", role: "status" }) }), children: _jsx(VencimentosCalendar, {}) }) })] }) }) })] }));
};
export default Dashboard;
