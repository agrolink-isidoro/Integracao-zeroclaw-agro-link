import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ModuleLayout from '@/components/ModuleLayout';
const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', path: '/maquinas/dashboard', icon: 'bi bi-speedometer2' },
    { id: 'equipamentos', label: 'Equipamentos', path: '/maquinas/equipamentos', icon: 'bi bi-gear' },
    { id: 'manutencao', label: 'Manutenção', path: '/maquinas/manutencao', icon: 'bi bi-tools' },
    { id: 'abastecimentos', label: 'Abastecimentos', path: '/maquinas/abastecimentos', icon: 'bi bi-fuel-pump' },
    { id: 'relatorios', label: 'Relatórios', path: '/maquinas/relatorios', icon: 'bi bi-graph-up' },
];
const MaquinasLayout = () => (_jsx(ModuleLayout, { title: "M\u00E1quinas", subtitle: "Gest\u00E3o de equipamentos, manuten\u00E7\u00F5es e abastecimentos", menuItems: menuItems }));
export default MaquinasLayout;
