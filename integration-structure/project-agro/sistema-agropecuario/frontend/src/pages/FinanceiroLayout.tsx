import React from 'react';
import ModuleLayout from '@/components/ModuleLayout';

const menuItems = [
  { id: 'dashboard', label: 'Visão Geral', path: '/financeiro/dashboard', icon: 'bi bi-speedometer2' },
  { id: 'rateios', label: 'Despesas & Rateios', path: '/financeiro/rateios', icon: 'bi bi-list-check' },
  { id: 'operacoes', label: 'Operações', path: '/financeiro/operacoes', icon: 'bi bi-gear' },
  { id: 'fluxo-caixa', label: 'Fluxo de Caixa', path: '/financeiro/fluxo-caixa', icon: 'bi bi-graph-up' },
  { id: 'contas-bancarias', label: 'Contas Bancárias', path: '/financeiro/contas-bancarias', icon: 'bi bi-wallet2' },
  { id: 'vencimentos', label: 'Vencimentos', path: '/financeiro/vencimentos', icon: 'bi bi-calendar3' },
];

const FinanceiroLayout: React.FC = () => (
  <ModuleLayout
    title="Financeiro"
    subtitle="Gestão financeira e contábil"
    menuItems={menuItems}
  />
);

export default FinanceiroLayout;
