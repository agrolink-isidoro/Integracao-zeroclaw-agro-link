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

const AgriculturaLayout: React.FC = () => (
  <ModuleLayout
    title="Agricultura"
    subtitle="Gestão de operações agrícolas, safras e ciclos de produção"
    menuItems={menuItems}
  />
);

export default AgriculturaLayout;
