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

const FazendasLayout: React.FC = () => (
  <ModuleLayout
    title="Fazendas"
    subtitle="Gestão de fazendas, áreas, talhões e arrendamentos"
    menuItems={menuItems}
  />
);

export default FazendasLayout;
