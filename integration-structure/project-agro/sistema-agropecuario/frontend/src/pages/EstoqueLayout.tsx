import React from 'react';
import ModuleLayout from '@/components/ModuleLayout';

const menuItems = [
  { id: 'dashboard', label: 'Visão Geral', path: '/estoque/dashboard', icon: 'bi bi-speedometer2' },
  { id: 'produtos', label: 'Produtos', path: '/estoque/produtos', icon: 'bi bi-box-seam' },
  { id: 'movimentacoes', label: 'Movimentações', path: '/estoque/movimentacoes', icon: 'bi bi-arrow-left-right' },
  { id: 'locais', label: 'Locais', path: '/estoque/locais', icon: 'bi bi-building' },
  { id: 'relatorios', label: 'Relatórios', path: '/estoque/relatorios', icon: 'bi bi-graph-up' },
];

const EstoqueLayout: React.FC = () => (
  <ModuleLayout
    title="Estoque"
    subtitle="Controle de produtos, movimentações e armazenagem"
    menuItems={menuItems}
  />
);

export default EstoqueLayout;
