import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Link } from 'react-router-dom';
// ---------------------------------------------------------------------------
// Component: GeoSidePanel
// Displays details for a selected feature (Area or Talhao)
// ---------------------------------------------------------------------------
const GeoSidePanel = ({ feature, onClose }) => {
    const p = feature.properties;
    const isArea = p.entity_type === 'area';
    const hectares = isArea ? p.area_hectares : p.area_size_ha;
    return (_jsxs("div", { className: "card shadow-lg position-absolute top-0 end-0 m-3", style: { width: '320px', zIndex: 10, maxHeight: 'calc(100% - 24px)', overflowY: 'auto' }, children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center bg-primary text-white", children: [_jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: `bi ${isArea ? 'bi-map' : 'bi-grid-3x3-gap'} me-2` }), p.name] }), _jsx("button", { className: "btn btn-sm btn-light", onClick: onClose, children: _jsx("i", { className: "bi bi-x-lg" }) })] }), _jsxs("div", { className: "card-body", children: [_jsx("table", { className: "table table-sm mb-3", children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("th", { children: "Tipo" }), _jsx("td", { children: _jsx("span", { className: `badge bg-${isArea ? (p.tipo === 'propria' ? 'success' : 'warning') : 'info'}`, children: isArea ? (p.tipo === 'propria' ? 'Própria' : 'Arrendada') : 'Talhão' }) })] }), _jsxs("tr", { children: [_jsx("th", { children: "Fazenda" }), _jsx("td", { children: p.fazenda_name })] }), !isArea && p.area_name && (_jsxs("tr", { children: [_jsx("th", { children: "\u00C1rea" }), _jsx("td", { children: p.area_name })] })), hectares != null && (_jsxs("tr", { children: [_jsx("th", { children: "Hectares" }), _jsxs("td", { children: [Number(hectares).toLocaleString('pt-BR', { maximumFractionDigits: 2 }), " ha"] })] }))] }) }), _jsxs("div", { className: "d-grid gap-2", children: [isArea ? (_jsxs(Link, { to: `/fazendas/areas`, className: "btn btn-outline-primary btn-sm", children: [_jsx("i", { className: "bi bi-eye me-1" }), "Ver \u00C1reas"] })) : (_jsxs(Link, { to: `/fazendas/talhoes`, className: "btn btn-outline-primary btn-sm", children: [_jsx("i", { className: "bi bi-eye me-1" }), "Ver Talh\u00F5es"] })), _jsxs(Link, { to: `/fazendas/fazendas`, className: "btn btn-outline-secondary btn-sm", children: [_jsx("i", { className: "bi bi-house-door me-1" }), "Ir para Fazenda"] }), _jsxs(Link, { to: "/agricultura/colheitas", className: "btn btn-outline-success btn-sm", children: [_jsx("i", { className: "bi bi-basket me-1" }), "Ver Colheitas"] })] })] })] }));
};
export default GeoSidePanel;
