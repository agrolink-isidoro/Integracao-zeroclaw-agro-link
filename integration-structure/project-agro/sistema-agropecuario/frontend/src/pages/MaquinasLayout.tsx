import React from 'react';
import ModuleLayout from '@/components/ModuleLayout';

const menuItems = [
  { id: 'dashboard', label: 'Visão Geral', path: '/maquinas/dashboard', icon: 'bi bi-speedometer2' },
  { id: 'equipamentos', label: 'Equipamentos', path: '/maquinas/equipamentos', icon: 'bi bi-gear' },
  { id: 'manutencao', label: 'Manutenção', path: '/maquinas/manutencao', icon: 'bi bi-tools' },
  { id: 'abastecimentos', label: 'Abastecimentos', path: '/maquinas/abastecimentos', icon: 'bi bi-fuel-pump' },
  { id: 'relatorios', label: 'Relatórios', path: '/maquinas/relatorios', icon: 'bi bi-graph-up' },
];

const MaquinasLayout: React.FC = () => (
  <ModuleLayout
    title="Máquinas"
    subtitle="Gestão de equipamentos, manutenções e abastecimentos"
    menuItems={menuItems}
  />
);

export default MaquinasLayout;
