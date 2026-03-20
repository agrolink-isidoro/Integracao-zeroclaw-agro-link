import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const AgriculturalRecommendations = ({ forecast }) => {
    const getRiskColor = (risk) => {
        switch (risk) {
            case 'BAIXO':
                return '#28a745'; // green
            case 'MEDIO':
                return '#ffc107'; // yellow
            case 'ALTO':
                return '#dc3545'; // red
            default:
                return '#6c757d'; // gray
        }
    };
    const getRiskBadgeClass = (risk) => {
        switch (risk) {
            case 'BAIXO':
                return 'bg-success';
            case 'MEDIO':
                return 'bg-warning text-dark';
            case 'ALTO':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    };
    const getRiskLabel = (risk) => {
        switch (risk) {
            case 'BAIXO':
                return 'Baixo';
            case 'MEDIO':
                return 'Médio';
            case 'ALTO':
                return 'Alto';
            default:
                return risk;
        }
    };
    const getAridityLabel = (index) => {
        if (index < 0.2)
            return 'Muito Úmido';
        if (index < 0.4)
            return 'Úmido';
        if (index < 0.6)
            return 'Normal';
        if (index < 0.8)
            return 'Seco';
        return 'Muito Seco';
    };
    const getAridityColor = (index) => {
        if (index < 0.2)
            return '#0069d9'; // blue
        if (index < 0.4)
            return '#28a745'; // green
        if (index < 0.6)
            return '#20c997'; // teal
        if (index < 0.8)
            return '#ffc107'; // yellow
        return '#dc3545'; // red
    };
    const riskLevel = forecast.risco_doenca_fungica;
    const aridityIndex = forecast.indice_aridez;
    const recommendations = forecast.recomendacao_pulverizacao;
    return (_jsx("div", { className: "card h-100 border-0 shadow-sm", children: _jsxs("div", { className: "card-body", children: [_jsxs("h5", { className: "card-title mb-4", children: [_jsx("i", { className: "bi bi-capsule me-2" }), "Recomenda\u00E7\u00F5es Agr\u00EDcolas"] }), _jsxs("div", { className: "mb-4 pb-4 border-bottom", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-3", children: [_jsxs("div", { children: [_jsx("h6", { className: "mb-1", children: "Risco de Doen\u00E7a F\u00FAngica" }), _jsx("small", { className: "text-muted", children: "Baseado em temperatura e umidade" })] }), _jsx("span", { className: `badge ${getRiskBadgeClass(riskLevel)} fs-6`, children: getRiskLabel(riskLevel) })] }), _jsx("div", { className: "progress mb-2", style: { height: '30px' }, children: _jsx("div", { className: `progress-bar ${getRiskBadgeClass(riskLevel)}`, role: "progressbar", style: {
                                    width: riskLevel === 'BAIXO' ? '33%' : riskLevel === 'MEDIO' ? '66%' : '100%',
                                }, "aria-valuenow": 33, "aria-valuemin": 0, "aria-valuemax": 100, children: _jsx("span", { className: "position-absolute top-50 start-50 translate-middle text-white fw-bold", children: getRiskLabel(riskLevel) }) }) }), _jsxs("div", { className: "alert alert-light mb-0 py-2", children: [riskLevel === 'BAIXO' && (_jsxs("small", { children: [_jsx("i", { className: "bi bi-check-circle text-success me-2" }), "Condi\u00E7\u00F5es desfavor\u00E1veis para o desenvolvimento de doen\u00E7as f\u00FAngicas."] })), riskLevel === 'MEDIO' && (_jsxs("small", { children: [_jsx("i", { className: "bi bi-exclamation-circle text-warning me-2" }), "Monitorar as plantas regularmente. Condi\u00E7\u00F5es moderadamente favor\u00E1veis para fungos."] })), riskLevel === 'ALTO' && (_jsxs("small", { children: [_jsx("i", { className: "bi bi-exclamation-triangle text-danger me-2" }), "Condi\u00E7\u00F5es altamente favor\u00E1veis para fungos. Considere pulveriza\u00E7\u00E3o preventiva."] }))] })] }), _jsxs("div", { className: "mb-4 pb-4 border-bottom", children: [_jsx("h6", { className: "mb-3", children: "Recomenda\u00E7\u00F5es de Pulveriza\u00E7\u00E3o" }), _jsx("div", { className: "p-3 bg-info bg-opacity-10 rounded", children: _jsxs("small", { children: [_jsx("i", { className: "bi bi-info-circle text-info me-2" }), recommendations || 'Não há recomendações específicas no momento.'] }) })] }), _jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-3", children: [_jsxs("div", { children: [_jsx("h6", { className: "mb-1", children: "\u00CDndice de Aridez" }), _jsx("small", { className: "text-muted", children: "Condi\u00E7\u00E3o de umidade do solo" })] }), _jsxs("span", { className: "badge bg-light text-dark", style: { backgroundColor: getAridityColor(aridityIndex) }, children: [(aridityIndex * 100).toFixed(0), "%"] })] }), _jsx("div", { className: "progress mb-2", style: { height: '25px' }, children: _jsx("div", { className: "progress-bar", role: "progressbar", style: {
                                    width: `${aridityIndex * 100}%`,
                                    backgroundColor: getAridityColor(aridityIndex),
                                }, "aria-valuenow": aridityIndex * 100, "aria-valuemin": 0, "aria-valuemax": 100 }) }), _jsxs("div", { className: "d-flex justify-content-between mb-3", children: [_jsx("small", { className: "text-muted", children: "Muito \u00DAmido" }), _jsx("small", { className: "text-muted", children: "Muito Seco" })] }), _jsx("div", { className: "alert alert-light mb-0 py-2", children: _jsxs("small", { children: [_jsxs("strong", { children: [getAridityLabel(aridityIndex), ":"] }), " ", ' ', aridityIndex < 0.2 && 'Solo com alta disponibilidade de água. Pode favorecer doenças fúngicas.', aridityIndex >= 0.2 && aridityIndex < 0.4 && 'Umidade adequada. Condições favoráveis para o crescimento das plantas.', aridityIndex >= 0.4 && aridityIndex < 0.6 && 'Umidade normal. Condições ideais para a maioria das culturas.', aridityIndex >= 0.6 && aridityIndex < 0.8 && 'Solo com déficit de água. Pode ser necessário irrigar.', aridityIndex >= 0.8 && 'Solo muito seco. Irrigação urgente recomendada.'] }) })] }), _jsxs("div", { className: "mt-4 pt-3 border-top", children: [_jsx("h6", { className: "mb-3 small", children: "A\u00E7\u00F5es Recomendadas" }), _jsxs("div", { className: "d-grid gap-2", children: [riskLevel === 'ALTO' && (_jsxs("button", { className: "btn btn-sm btn-outline-danger", type: "button", children: [_jsx("i", { className: "bi bi-shield-check me-2" }), "Programar Pulveriza\u00E7\u00E3o"] })), aridityIndex > 0.7 && (_jsxs("button", { className: "btn btn-sm btn-outline-warning", type: "button", children: [_jsx("i", { className: "bi bi-droplet me-2" }), "Ativar Irriga\u00E7\u00E3o"] })), _jsxs("button", { className: "btn btn-sm btn-outline-secondary", type: "button", children: [_jsx("i", { className: "bi bi-eye me-2" }), "Ver Hist\u00F3rico"] })] })] })] }) }));
};
export default AgriculturalRecommendations;
