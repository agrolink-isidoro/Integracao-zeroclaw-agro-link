import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ModuleLayout from '@/components/ModuleLayout';
const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', path: '/fazendas/dashboard', icon: 'bi bi-speedometer2' },
    { id: 'fazendas', label: 'Fazendas', path: '/fazendas/fazendas', icon: 'bi bi-house-door' },
    { id: 'areas', label: 'Áreas', path: '/fazendas/areas', icon: 'bi bi-geo-alt' },
    { id: 'talhoes', label: 'Talhões', path: '/fazendas/talhoes', icon: 'bi bi-grid-3x3' },
    { id: 'arrendamentos', label: 'Arrendamentos', path: '/fazendas/arrendamentos', icon: 'bi bi-file-text' },
    { id: 'mapa', label: 'Mapa', path: '/fazendas/mapa', icon: 'bi bi-map' },
];
const FazendasLayout = () => (_jsx(ModuleLayout, { title: "Fazendas", subtitle: "Gest\u00E3o de fazendas, \u00E1reas, talh\u00F5es e arrendamentos", menuItems: menuItems }));
export default FazendasLayout;
