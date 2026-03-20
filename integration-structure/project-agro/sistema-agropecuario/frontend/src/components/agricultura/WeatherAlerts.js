import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const WeatherAlerts = ({ alerts }) => {
    if (!alerts || alerts.length === 0) {
        return null;
    }
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'BAIXA':
                return '#0dcaf0'; // cyan
            case 'MEDIA':
                return '#ffc107'; // yellow
            case 'ALTA':
                return '#fd7e14'; // orange
            case 'CRITICA':
                return '#dc3545'; // red
            default:
                return '#6c757d'; // gray
        }
    };
    const getSeverityBadgeClass = (severity) => {
        switch (severity) {
            case 'BAIXA':
                return 'bg-info';
            case 'MEDIA':
                return 'bg-warning text-dark';
            case 'ALTA':
                return 'bg-warning';
            case 'CRITICA':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    };
    const getAlertIcon = (tipo) => {
        const tipoLower = tipo.toLowerCase();
        if (tipoLower.includes('chuva'))
            return 'cloud-rain';
        if (tipoLower.includes('granizo'))
            return 'snow';
        if (tipoLower.includes('vento'))
            return 'wind';
        if (tipoLower.includes('geada'))
            return 'snow2';
        if (tipoLower.includes('estiagem'))
            return 'sun';
        if (tipoLower.includes('raio') || tipoLower.includes('tempestade'))
            return 'cloud-lightning';
        return 'exclamation-triangle';
    };
    const criticalAlerts = alerts.filter(a => a.severidade === 'CRITICA');
    const otherAlerts = alerts.filter(a => a.severidade !== 'CRITICA');
    return (_jsxs("div", { className: "alert-container", children: [criticalAlerts.length > 0 && (_jsx("div", { className: "mb-3", children: _jsx("div", { className: "alert alert-danger border-2 border-danger mb-3", children: _jsxs("div", { className: "d-flex align-items-start", children: [_jsx("i", { className: "bi bi-exclamation-triangle-fill fs-5 me-3 flex-shrink-0" }), _jsxs("div", { className: "flex-grow-1", children: [_jsx("h5", { className: "alert-heading mb-2", children: "\u26A0\uFE0F Alerta Cr\u00EDtico" }), criticalAlerts.map((alert, idx) => (_jsxs("div", { className: idx > 0 ? 'mt-2 pt-2 border-top border-danger-light' : '', children: [_jsx("strong", { children: alert.tipo_display }), alert.talhao_name && (_jsxs("p", { className: "mb-1 small", children: [_jsx("i", { className: "bi bi-geo-alt me-1" }), alert.talhao_name] })), _jsx("p", { className: "mb-0 small", children: alert.descricao }), _jsxs("small", { className: "text-muted d-block mt-1", children: ["De ", new Date(alert.data_inicio_prevista).toLocaleString('pt-BR'), " at\u00E9", ' ', new Date(alert.data_fim_prevista).toLocaleString('pt-BR')] })] }, idx)))] })] }) }) })), otherAlerts.length > 0 && (_jsx("div", { className: "row g-2", children: otherAlerts.map((alert) => (_jsx("div", { className: "col-12 col-md-6", children: _jsx("div", { className: "alert mb-0", style: {
                            borderLeft: `4px solid ${getSeverityColor(alert.severidade)}`,
                            backgroundColor: getSeverityColor(alert.severidade) + '15',
                        }, children: _jsxs("div", { className: "d-flex align-items-start", children: [_jsx("i", { className: `bi bi-${getAlertIcon(alert.tipo)} me-2 flex-shrink-0`, style: { color: getSeverityColor(alert.severidade) } }), _jsxs("div", { className: "flex-grow-1", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-1", children: [_jsx("strong", { className: "small", children: alert.tipo_display }), _jsx("span", { className: `badge ${getSeverityBadgeClass(alert.severidade)} text-nowrap ms-2`, children: alert.severidade })] }), alert.talhao_name && (_jsxs("small", { className: "text-muted d-block mb-1", children: [_jsx("i", { className: "bi bi-geo-alt me-1" }), alert.talhao_name] })), _jsx("small", { className: "d-block mb-2", children: alert.descricao }), _jsxs("small", { className: "text-muted", children: [new Date(alert.data_inicio_prevista).toLocaleDateString('pt-BR'), " at\u00E9", ' ', new Date(alert.data_fim_prevista).toLocaleDateString('pt-BR')] })] })] }) }) }, alert.id))) }))] }));
};
export default WeatherAlerts;
