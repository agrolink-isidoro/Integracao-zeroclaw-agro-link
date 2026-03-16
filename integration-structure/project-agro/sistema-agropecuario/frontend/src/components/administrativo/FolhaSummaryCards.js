import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { useApiQuery } from '@/hooks/useApi';
const currency = (v) => `R$ ${Number(v).toFixed(3)}`;
const gradients = {
    info: 'linear-gradient(90deg,#00c6ff 0%,#0072ff 100%)',
    danger: 'linear-gradient(90deg,#ff6a00 0%,#ee0979 100%)',
    success: 'linear-gradient(90deg,#00b09b 0%,#96c93d 100%)'
};
const Card = ({ title, value, color, icon, subtitle, ratio }) => (_jsx("div", { className: `card text-white mb-3`, style: { minWidth: 180, background: gradients[color] || gradients.info }, children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "d-flex align-items-center", children: [_jsxs("div", { className: "flex-grow-1", children: [_jsx("small", { className: "d-block opacity-75", children: title }), _jsx("div", { className: "h5 mb-1", children: currency(value || 0) }), subtitle && _jsx("small", { className: "opacity-75", children: subtitle })] }), _jsx("div", { className: "ms-3", children: _jsx("i", { className: `${icon} fs-3`, style: { opacity: 0.95 }, "aria-hidden": "true" }) })] }), typeof ratio === 'number' && (_jsx("div", { className: "progress mt-3", style: { height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }, children: _jsx("div", { className: "progress-bar bg-white", role: "progressbar", style: { width: `${Math.min(Math.max(ratio * 100, 0), 100)}%`, opacity: 0.9 }, "aria-valuenow": Math.round((ratio || 0) * 100), "aria-valuemin": 0, "aria-valuemax": 100 }) }))] }) }));
const FolhaSummaryCards = () => {
    const { data, isLoading, refetch } = useApiQuery(['folha', 'summary'], '/administrativo/folha-pagamento/summary/');
    useEffect(() => {
        // ensure we have fresh summary on mount
        refetch();
    }, [refetch]);
    const totalHorasExtra = Number(data?.total_horas_extra_cost || 0);
    const totalInss = Number(data?.total_inss || 0);
    const totalFolha = Number(data?.total_folha || 0);
    const inssRatio = totalFolha ? totalInss / totalFolha : 0;
    const extraRatio = totalFolha ? totalHorasExtra / totalFolha : 0;
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-3", children: [_jsx("h5", { className: "mb-0", children: "Folha (m\u00EAs anterior)" }), _jsx("small", { className: "text-muted", children: "Resumo r\u00E1pido \u2014 dados agregados" })] }), _jsxs("div", { className: "d-grid gap-2", children: [_jsx(Card, { title: "Custo Horas Extras", value: totalHorasExtra, color: "info", icon: "bi bi-clock-history", subtitle: "Impacto em horas extras", ratio: extraRatio }), _jsx(Card, { title: "Descontos INSS", value: totalInss, color: "danger", icon: "bi bi-shield-lock", subtitle: "Percentual da folha", ratio: inssRatio }), _jsx(Card, { title: "Total Folha", value: totalFolha, color: "success", icon: "bi bi-cash-stack", subtitle: "Total l\u00EDquido pago" })] }), _jsx("div", { className: "mt-2", children: _jsx("button", { className: "btn btn-sm btn-outline-light", "aria-label": "Atualizar resumo da folha", onClick: () => refetch(), disabled: isLoading, children: isLoading ? 'Atualizando...' : 'Atualizar' }) })] }));
};
export default FolhaSummaryCards;
