import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const TransportFields = ({ value = {}, onChange, readOnly = false, showMotorista = true, showDescontos = true, showCusto = true }) => {
    const v = value || {};
    const set = (k, val) => {
        const next = { ...v, [k]: val };
        // compute peso_liquido when possible — guard against bad numeric inputs
        try {
            const pb = Number(next.peso_bruto ?? v.peso_bruto ?? 0);
            const ta = Number(next.tara ?? v.tara ?? 0);
            const ds = Number(next.descontos ?? v.descontos ?? 0);
            if (!Number.isNaN(pb) && !Number.isNaN(ta))
                next.peso_liquido = Math.max(0, pb - ta - ds);
        }
        catch (err) {
            // If something unexpected happens, log for diagnostics but continue
            console.error('TransportFields: error computing peso_liquido', err);
        }
        onChange(next);
    };
    // O Total é o próprio Custo Transporte (valor total já declarado)
    const obterCustoTotal = () => {
        const custo = v.custo_transporte;
        if (custo === undefined || custo === null)
            return null;
        return Number(custo);
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Placa" }), _jsx("input", { "aria-label": "Placa", className: "form-control", value: v.placa || '', onChange: (e) => set('placa', e.target.value), readOnly: readOnly })] }), showMotorista && (_jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Motorista (nome livre)" }), _jsx("input", { "aria-label": "Motorista (nome livre)", className: "form-control", value: v.motorista || '', onChange: (e) => set('motorista', e.target.value), readOnly: readOnly })] })), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Tara (kg)" }), _jsx("input", { "aria-label": "Tara (kg)", type: "number", step: "0.001", className: "form-control", value: v.tara ?? '', onChange: (e) => set('tara', e.target.value === '' ? undefined : Number(e.target.value)), readOnly: readOnly })] })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Peso Bruto (kg)" }), _jsx("input", { "aria-label": "Peso Bruto (kg)", type: "number", step: "0.001", className: "form-control", value: v.peso_bruto ?? '', onChange: (e) => set('peso_bruto', e.target.value === '' ? undefined : Number(e.target.value)), readOnly: readOnly })] }), showDescontos && (_jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Descontos (kg)" }), _jsx("input", { "aria-label": "Descontos (kg)", type: "number", step: "0.01", className: "form-control", value: (v.descontos ?? 0), onChange: (e) => set('descontos', e.target.value === '' ? undefined : Number(e.target.value)), readOnly: readOnly })] })), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Peso L\u00EDquido (kg)" }), _jsx("input", { "aria-label": "Peso L\u00EDquido (kg)", className: "form-control", value: v.peso_liquido ?? '', readOnly: true })] })] }), showCusto && (_jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Custo Transporte" }), _jsx("input", { "aria-label": "Custo Transporte", type: "number", step: "0.01", className: "form-control", value: v.custo_transporte ?? '', onChange: (e) => set('custo_transporte', e.target.value === '' ? undefined : Number(e.target.value)), readOnly: readOnly })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Unidade do custo" }), _jsxs("select", { "aria-label": "Unidade do custo de transporte", className: "form-select", value: v.custo_transporte_unidade ?? 'total', onChange: (e) => set('custo_transporte_unidade', e.target.value), disabled: readOnly, children: [_jsx("option", { value: "total", children: "R$ Total" }), _jsx("option", { value: "tonelada", children: "R$ por Tonelada" }), _jsx("option", { value: "saca", children: "R$ por Saca" }), _jsx("option", { value: "unidade", children: "R$ por Unidade" })] })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Total" }), _jsx("div", { className: "form-control bg-light d-flex align-items-center", style: { minHeight: '38px' }, children: obterCustoTotal() !== null ? (_jsxs("strong", { children: ["R$ ", obterCustoTotal()?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })] })) : (_jsx("span", { className: "text-muted", children: "\u2014" })) })] })] }))] }));
};
export default TransportFields;
