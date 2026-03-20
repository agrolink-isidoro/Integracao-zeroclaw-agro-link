import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);
const ForecastChart = ({ forecast }) => {
    // Parse and prepare forecast data
    const forecastData = useMemo(() => {
        if (!forecast.forecast_7dias || forecast.forecast_7dias.length === 0) {
            return null;
        }
        const days = forecast.forecast_7dias.map((day) => {
            const date = new Date(day.data);
            return date.toLocaleDateString('pt-BR', { weekday: 'short', month: 'numeric', day: 'numeric' });
        });
        return {
            labels: days,
            datasets: [
                {
                    label: 'Temperatura Máxima (°C)',
                    data: forecast.forecast_7dias.map((day) => day.temperatura_maxima),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y',
                },
                {
                    label: 'Temperatura Mínima (°C)',
                    data: forecast.forecast_7dias.map((day) => day.temperatura_minima),
                    borderColor: '#0069d9',
                    backgroundColor: 'rgba(0, 105, 217, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y',
                },
                {
                    label: 'Chance de Chuva (%)',
                    data: forecast.forecast_7dias.map((day) => day.chance_precipitacao),
                    backgroundColor: 'rgba(0, 123, 255, 0.6)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1,
                    type: 'bar',
                    yAxisID: 'y1',
                    order: 1,
                },
            ],
        };
    }, [forecast.forecast_7dias]);
    if (!forecastData) {
        return (_jsx("div", { className: "card border-0 shadow-sm", children: _jsx("div", { className: "card-body p-4", children: _jsx("p", { className: "text-muted mb-0", children: "Sem dados de previs\u00E3o para os pr\u00F3ximos 7 dias." }) }) }));
    }
    const options = {
        responsive: true,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 15,
                },
            },
            title: {
                display: true,
                text: 'Previsão de 7 Dias',
                font: {
                    size: 16,
                    weight: 'bold',
                },
            },
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Temperatura (°C)',
                },
                grid: {
                    drawBorder: false,
                },
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Chance de Chuva (%)',
                },
                max: 100,
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
    };
    return (_jsx("div", { className: "card border-0 shadow-sm", children: _jsxs("div", { className: "card-body p-4", children: [_jsx(Line, { data: forecastData, options: options }), _jsx("div", { className: "table-responsive mt-4", children: _jsxs("table", { className: "table table-sm table-hover mb-0", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { children: "Data" }), _jsx("th", { children: "Max" }), _jsx("th", { children: "Min" }), _jsx("th", { children: "Umidade" }), _jsx("th", { children: "Condi\u00E7\u00E3o" }), _jsx("th", { children: "Vento" }), _jsx("th", { children: "Chuva" })] }) }), _jsx("tbody", { children: forecast.forecast_7dias.map((day, idx) => {
                                    const date = new Date(day.data);
                                    const dateStr = date.toLocaleDateString('pt-BR');
                                    return (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { children: dateStr }) }), _jsx("td", { children: _jsxs("span", { className: "badge bg-danger", children: [day.temperatura_maxima.toFixed(1), "\u00B0"] }) }), _jsx("td", { children: _jsxs("span", { className: "badge bg-info", children: [day.temperatura_minima.toFixed(1), "\u00B0"] }) }), _jsxs("td", { children: [day.umidade_media, "%"] }), _jsx("td", { children: day.condicao }), _jsxs("td", { children: [day.vento_velocidade.toFixed(1), " km/h"] }), _jsxs("td", { children: [_jsx("div", { className: "progress", style: { width: '60px', height: '20px' }, children: _jsx("div", { className: "progress-bar bg-primary", role: "progressbar", style: { width: `${day.chance_precipitacao}%` }, "aria-valuenow": day.chance_precipitacao, "aria-valuemin": 0, "aria-valuemax": 100 }) }), _jsxs("small", { children: [day.chance_precipitacao, "%"] })] })] }, idx));
                                }) })] }) })] }) }));
};
export default ForecastChart;
