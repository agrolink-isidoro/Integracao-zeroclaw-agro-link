import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
/**
 * Componente para cálculo de sementes em operações de plantio
 *
 * Fórmula:
 * - Sementes/ha = Estande Desejado / (Pureza % × Germinação %)
 * - Kg/ha = (Sementes/ha × PMS) / 1000
 * - Kg Total = Kg/ha × Área Total
 */
export const SeedCalculator = ({ areaHa, onCalculate }) => {
    const [estande, setEstande] = useState(65000); // plantas/ha
    const [pureza, setPureza] = useState(98); // %
    const [germinacao, setGerminacao] = useState(90); // %
    const [pms, setPms] = useState(350); // gramas (Peso de Mil Sementes)
    useEffect(() => {
        // Validação básica
        if (pureza <= 0 || pureza > 100 || germinacao <= 0 || germinacao > 100 || pms <= 0 || estande <= 0) {
            return;
        }
        // Cálculo de sementes por hectare
        const sementes_ha = estande / ((pureza / 100) * (germinacao / 100));
        // Cálculo de kg por hectare
        const kg_ha = (sementes_ha * pms) / 1000 / 1000; // PMS em gramas, converter para kg
        // Total em kg para a área selecionada
        const kg_total = kg_ha * areaHa;
        onCalculate({ sementes_ha, kg_ha, kg_total });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estande, pureza, germinacao, pms, areaHa]);
    // Cálculo para exibição
    const sementes_ha = pureza > 0 && germinacao > 0 ? estande / ((pureza / 100) * (germinacao / 100)) : 0;
    const kg_ha = sementes_ha > 0 && pms > 0 ? (sementes_ha * pms) / 1000 / 1000 : 0;
    const kg_total = kg_ha * areaHa;
    return (_jsxs("div", { className: "bg-light border border-primary rounded p-3 p-md-4", children: [_jsxs("h3", { className: "fs-5 fw-semibold text-primary d-flex align-items-center gap-2 mb-3", children: [_jsx("i", { className: "bi bi-calculator-fill", "aria-hidden": "true" }), _jsx("span", { className: "text-nowrap", children: "Calculadora de Sementes" })] }), _jsxs("div", { className: "row g-2 g-md-3 mb-3", children: [_jsxs("div", { className: "col-12 col-sm-6", children: [_jsx("label", { className: "form-label", children: "Estande Desejado (plantas/ha)" }), _jsx("input", { type: "number", value: estande, onChange: (e) => setEstande(Number(e.target.value)), className: "form-control", min: "0", step: "1000" })] }), _jsxs("div", { className: "col-12 col-sm-6", children: [_jsx("label", { className: "form-label", children: "PMS - Peso de Mil Sementes (g)" }), _jsx("input", { type: "number", value: pms, onChange: (e) => setPms(Number(e.target.value)), className: "form-control", min: "0", step: "10" })] }), _jsxs("div", { className: "col-12 col-sm-6", children: [_jsx("label", { className: "form-label", children: "Pureza (%)" }), _jsx("input", { type: "number", value: pureza, onChange: (e) => setPureza(Number(e.target.value)), className: "form-control", min: "0", max: "100", step: "0.1" })] }), _jsxs("div", { className: "col-12 col-sm-6", children: [_jsx("label", { className: "form-label", children: "Germina\u00E7\u00E3o (%)" }), _jsx("input", { type: "number", value: germinacao, onChange: (e) => setGerminacao(Number(e.target.value)), className: "form-control", min: "0", max: "100", step: "0.1" })] })] }), _jsxs("div", { className: "bg-white rounded p-3 mb-3", children: [_jsx("h4", { className: "fw-semibold text-dark small mb-2", children: "Resultados:" }), _jsxs("div", { className: "row g-2 g-md-3 small", children: [_jsxs("div", { className: "col-12 col-md-4", children: [_jsx("span", { className: "text-muted", children: "Sementes/ha:" }), _jsx("p", { className: "fw-bold text-primary mb-0", children: sementes_ha.toFixed(0) })] }), _jsxs("div", { className: "col-12 col-md-4", children: [_jsx("span", { className: "text-muted", children: "Kg/ha:" }), _jsx("p", { className: "fw-bold text-primary mb-0", children: kg_ha.toFixed(2) })] }), _jsxs("div", { className: "col-12 col-md-4", children: [_jsxs("span", { className: "text-muted", children: ["Total (", areaHa.toFixed(1), " ha):"] }), _jsxs("p", { className: "fw-bold text-success mb-0", children: [kg_total.toFixed(2), " kg"] })] })] })] }), _jsxs("div", { className: "small text-muted", children: [_jsx("p", { children: _jsx("strong", { children: "F\u00F3rmula:" }) }), _jsx("p", { children: "\u2022 Sementes/ha = Estande \u00F7 (Pureza \u00D7 Germina\u00E7\u00E3o)" }), _jsx("p", { children: "\u2022 Kg/ha = (Sementes/ha \u00D7 PMS) \u00F7 1.000.000" }), _jsx("p", { children: "\u2022 Total = Kg/ha \u00D7 \u00C1rea Total" })] })] }));
};
