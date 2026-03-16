import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ModuleLayout from '@/components/ModuleLayout';
const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', path: '/agricultura/dashboard', icon: 'bi bi-speedometer2' },
    { id: 'safras', label: 'Safras', path: '/agricultura/safras', icon: 'bi bi-calendar-event' },
    { id: 'operacoes', label: 'Operações', path: '/agricultura/operacoes', icon: 'bi bi-list-check' },
    { id: 'culturas', label: 'Culturas', path: '/agricultura/culturas', icon: 'bi bi-flower1' },
    { id: 'colheitas', label: 'Colheitas', path: '/agricultura/colheitas', icon: 'bi bi-box-seam' },
    { id: 'relatorios', label: 'Relatórios', path: '/agricultura/relatorios', icon: 'bi bi-graph-up' },
];
const AgriculturaLayout = () => (_jsx(ModuleLayout, { title: "Agricultura", subtitle: "Gest\u00E3o de opera\u00E7\u00F5es agr\u00EDcolas, safras e ciclos de produ\u00E7\u00E3o", menuItems: menuItems }));
export default AgriculturaLayout;
