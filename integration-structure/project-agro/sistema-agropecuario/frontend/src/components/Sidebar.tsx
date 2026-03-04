import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRBAC } from '../hooks/useRBAC';
import type { RBACModule } from '../types/rbac';

interface SubMenuItem {
  name: string;
  path: string;
}

interface MenuItem {
  name: string;
  path: string;
  icon: string;
  /** RBAC module code used for permission filtering */
  rbacModule?: RBACModule;
  /** optional title/tooltip for the menu item */
  title?: string;
  subItems?: SubMenuItem[];
}

const allMenuItems: MenuItem[] = [
  { name: 'Dashboard', path: '/', icon: 'bi-house-door', rbacModule: 'dashboard' },
  { name: 'Central de Inteligência', path: '/dashboard/inteligencia', icon: 'bi-lightbulb-fill', rbacModule: 'dashboard', title: 'Visão consolidada da propriedade' },
  {
    name: 'Fazendas',
    path: '/fazendas',
    icon: 'bi-building',
    rbacModule: 'fazendas',
    subItems: [
      { name: 'Visão Geral', path: '/fazendas/dashboard' },
      { name: 'Mapa', path: '/fazendas/mapa' },
      { name: 'Fazendas', path: '/fazendas/fazendas' },
      { name: 'Proprietários', path: '/fazendas/proprietarios' },
      { name: 'Áreas', path: '/fazendas/areas' },
      { name: 'Talhões', path: '/fazendas/talhoes' },
      { name: 'Arrendamentos', path: '/fazendas/arrendamentos' },
    ]
  },
  {
    name: 'Agricultura',
    path: '/agricultura',
    icon: 'bi-tree',
    rbacModule: 'agricultura',
    subItems: [
      { name: 'Visão Geral', path: '/agricultura/dashboard' },
      { name: 'Safras', path: '/agricultura/safras' },
      { name: 'Operações', path: '/agricultura/operacoes' },
      { name: 'Culturas', path: '/agricultura/culturas' },
      { name: 'Colheitas', path: '/agricultura/colheitas' },
    ]
  },
  { name: 'Máquinas', path: '/maquinas', icon: 'bi-truck', rbacModule: 'maquinas',
    subItems: [
      { name: 'Visão Geral', path: '/maquinas/dashboard' },
      { name: 'Equipamentos', path: '/maquinas/equipamentos' },
      { name: 'Manutenção', path: '/maquinas/manutencao' },
      { name: 'Abastecimentos', path: '/maquinas/abastecimentos' },
    ]
  },
  { name: 'Estoque', path: '/estoque', icon: 'bi-box-seam', rbacModule: 'estoque',
    subItems: [
      { name: 'Visão Geral', path: '/estoque/dashboard' },
      { name: 'Produtos', path: '/estoque/produtos' },
      { name: 'Locais de Armazenagem', path: '/estoque/locais' },
      { name: 'Movimentações', path: '/estoque/movimentacoes' },
    ]
  },
  { name: 'Comercial', path: '/comercial', icon: 'bi-cart', rbacModule: 'comercial',
    subItems: [
      { name: 'Visão Geral', path: '/comercial/dashboard' },
      { name: 'Vendas', path: '/comercial/vendas' },
      { name: 'Contratos', path: '/comercial/contratos' },
      { name: 'Clientes', path: '/comercial/clientes' },
      { name: 'Fornecedores', path: '/comercial/fornecedores' },
    ]
  },
  { name: 'Financeiro', path: '/financeiro', icon: 'bi-cash-coin', rbacModule: 'financeiro',
    subItems: [
      { name: 'Visão Geral', path: '/financeiro/dashboard' },
      { name: 'Despesas & Rateios', path: '/financeiro/rateios' },
      { name: 'Operações', path: '/financeiro/operacoes' },
      { name: 'Fluxo de Caixa', path: '/financeiro/fluxo-caixa' },
      { name: 'Contas Bancárias', path: '/financeiro/contas-bancarias' },
      { name: 'Vencimentos', path: '/financeiro/vencimentos' },
    ]
  },
  { name: 'Administrativo', path: '/administrativo', icon: 'bi-people', rbacModule: 'administrativo' },
  { name: 'Fiscal', path: '/fiscal', icon: 'bi-receipt', rbacModule: 'fiscal' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { visibleModules } = useRBAC();

  // Filter menu items based on RBAC permissions
  const menuItems = useMemo(() => {
    return allMenuItems.filter((item) => {
      if (!item.rbacModule) return true; // No module restriction
      return visibleModules.includes(item.rbacModule);
    });
  }, [visibleModules]);

  const toggleMenu = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const isPathActive = (path: string) => {
    // Root path '/' must be an exact match to avoid highlighting Dashboard for every route
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="bg-dark text-white" style={{ width: '250px', minWidth: '250px', maxWidth: '250px', minHeight: '100vh' }}>
      <div className="p-3">
        <h4 className="mb-0">Agro-link</h4>
      </div>
      <hr className="bg-light" />
      <nav className="nav flex-column">
        {menuItems.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isActive = isPathActive(item.path);
          const isOpen = openMenu === item.name || isActive;

          return (
            <div key={item.path}>
              {hasSubItems ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`nav-link text-white w-100 text-start border-0 d-flex justify-content-between align-items-center ${
                      isActive ? 'bg-primary' : ''
                    }`}
                    style={{ background: 'transparent' }}
                    title={item.title ?? ''}
                  >
                    <span>
                      <i className={`bi ${item.icon} me-2`}></i>
                      {item.name}
                    </span>
                    <i className={`bi bi-chevron-${isOpen ? 'down' : 'right'}`}></i>
                  </button>
                  {isOpen && (
                    <div className="ps-4">
                      {(item.subItems ?? []).map((subItem) => (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          className={`nav-link text-white-50 ${
                            (location.pathname === subItem.path || location.pathname.startsWith(subItem.path + '/')) ? 'bg-secondary text-white' : ''
                          }`}
                          style={{ fontSize: '0.9rem' }}
                          title={subItem.name}
                        >
                          <i className="bi bi-dot me-1"></i>
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  className={`nav-link text-white ${isActive ? 'bg-primary' : ''}`}
                  title={item.title ?? ''}
                  style={item.path === '/dashboard/inteligencia' ? { background: isActive ? undefined : 'linear-gradient(90deg, rgba(253,126,20,0.06), transparent)', borderLeft: '4px solid #fd7e14' } : undefined}
                >
                  <i className={`bi ${item.icon} me-2`} style={item.path === '/dashboard/inteligencia' ? { color: '#fd7e14' } : undefined}></i>
                  {item.name}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;