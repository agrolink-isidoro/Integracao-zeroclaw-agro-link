import React from 'react';
import ModuleLayout from '@/components/ModuleLayout';

const menuItems = [
  { id: 'dashboard', label: 'Visão Geral', path: '/comercial/dashboard', icon: 'bi bi-speedometer2' },
  { id: 'vendas', label: 'Vendas', path: '/comercial/vendas', icon: 'bi bi-graph-up' },
  { id: 'contratos', label: 'Contratos', path: '/comercial/contratos', icon: 'bi bi-file-earmark-text' },
  { id: 'clientes', label: 'Clientes', path: '/comercial/clientes', icon: 'bi bi-people' },
  { id: 'fornecedores', label: 'Fornecedores', path: '/comercial/fornecedores', icon: 'bi bi-truck' },
  { id: 'relatorios', label: 'Relatórios', path: '/comercial/relatorios', icon: 'bi bi-bar-chart' },
];

const ComercialLayout: React.FC = () => (
  <ModuleLayout
    title="Comercial"
    subtitle="Gestão de vendas, contratos e clientes"
    menuItems={menuItems}
  />
);

export default ComercialLayout;
