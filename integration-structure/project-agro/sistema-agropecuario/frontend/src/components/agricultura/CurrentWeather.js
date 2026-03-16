import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const CurrentWeather = ({ forecast }) => {
    const getWeatherIcon = (condition) => {
        const conditionLower = condition.toLowerCase();
        if (conditionLower.includes('rain') || conditionLower.includes('chuva'))
            return 'cloud-rain';
        if (conditionLower.includes('cloud') || conditionLower.includes('nuvem'))
            return 'cloud';
        if (conditionLower.includes('clear') || conditionLower.includes('limpo'))
            return 'sun';
        if (conditionLower.includes('snow') || conditionLower.includes('neve'))
            return 'snow';
        if (conditionLower.includes('storm') || conditionLower.includes('tempestade'))
            return 'cloud-lightning';
        if (conditionLower.includes('fog') || conditionLower.includes('neblina'))
            return 'cloud-fog';
        return 'cloud';
    };
    const getTemperatureColor = (temp) => {
        if (temp < 5)
            return '#0069d9'; // blue - cold
        if (temp < 15)
            return '#28a745'; // green - cool
        if (temp < 25)
            return '#ffc107'; // yellow - warm
        if (temp < 35)
            return '#fd7e14'; // orange - hot
        return '#dc3545'; // red - very hot
    };
    const temp = forecast.temperatura_atual;
    const humidity = forecast.umidade_atual;
    const windSpeed = forecast.vento_velocidade;
    const condition = forecast.condicao_atual;
    const uvIndex = forecast.indice_uv || 0;
    return (_jsx("div", { className: "card h-100 border-0 shadow-sm", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "mb-4 pb-3 border-bottom", children: [_jsxs("h5", { className: "card-title mb-1", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), forecast.talhao_name || forecast.municipio || 'Localização'] }), _jsxs("small", { className: "text-muted", children: ["Dados de ", forecast.fonte_dados] })] }), _jsxs("div", { className: "text-center mb-4", children: [_jsx("div", { className: "position-relative d-inline-block", children: _jsx("i", { className: `bi bi-${getWeatherIcon(condition)} fs-1`, style: { color: getTemperatureColor(temp) } }) }), _jsxs("div", { className: "mt-3", children: [_jsxs("div", { className: "display-4 fw-bold", style: { color: getTemperatureColor(temp) }, children: [temp.toFixed(1), "\u00B0"] }), _jsx("p", { className: "text-muted mb-2", children: condition }), forecast.temperatura_sensacao && (_jsxs("small", { className: "text-muted", children: ["Sensa\u00E7\u00E3o t\u00E9rmica: ", forecast.temperatura_sensacao.toFixed(1), "\u00B0"] }))] })] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-6", children: _jsxs("div", { className: "p-2 bg-light rounded", children: [_jsx("small", { className: "text-muted d-block", children: "Umidade" }), _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-droplet text-info me-1" }), humidity, "%"] })] }) }), _jsx("div", { className: "col-6", children: _jsxs("div", { className: "p-2 bg-light rounded", children: [_jsx("small", { className: "text-muted d-block", children: "Vento" }), _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-wind text-warning me-1" }), windSpeed.toFixed(1), " km/h"] })] }) }), uvIndex > 0 && (_jsx("div", { className: "col-6", children: _jsxs("div", { className: "p-2 bg-light rounded", children: [_jsx("small", { className: "text-muted d-block", children: "\u00CDndice UV" }), _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-sun text-danger me-1" }), uvIndex.toFixed(1)] })] }) })), forecast.ponto_orvalho && (_jsx("div", { className: "col-6", children: _jsxs("div", { className: "p-2 bg-light rounded", children: [_jsx("small", { className: "text-muted d-block", children: "Ponto de Orvalho" }), _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-moisture text-primary me-1" }), forecast.ponto_orvalho.toFixed(1), "\u00B0"] })] }) })), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "p-2 bg-light rounded", children: [_jsx("small", { className: "text-muted d-block", children: "Cobertura de Nuvens" }), _jsx("div", { className: "progress", style: { height: '8px' }, children: _jsx("div", { className: "progress-bar bg-info", role: "progressbar", style: { width: `${forecast.cobertura_nuvens}%` }, "aria-valuenow": forecast.cobertura_nuvens, "aria-valuemin": 0, "aria-valuemax": 100 }) }), _jsxs("small", { className: "text-muted", children: [forecast.cobertura_nuvens, "%"] })] }) }), forecast.pressao && (_jsx("div", { className: "col-12", children: _jsxs("div", { className: "p-2 bg-light rounded", children: [_jsx("small", { className: "text-muted d-block", children: "Press\u00E3o Atmosf\u00E9rica" }), _jsxs("h6", { className: "mb-0", children: [forecast.pressao.toFixed(0), " hPa"] })] }) }))] }), _jsxs("div", { className: "mt-3 p-3 bg-warning bg-opacity-10 rounded", children: [_jsx("small", { className: "text-muted d-block mb-1", children: "Chance de Chuva" }), _jsx("div", { className: "progress", style: { height: '12px' }, children: _jsx("div", { className: "progress-bar bg-warning", role: "progressbar", style: { width: `${forecast.chance_precipitacao}%` }, "aria-valuenow": forecast.chance_precipitacao, "aria-valuemin": 0, "aria-valuemax": 100 }) }), _jsxs("small", { className: "text-muted", children: [forecast.chance_precipitacao, "%"] })] })] }) }));
};
export default CurrentWeather;
