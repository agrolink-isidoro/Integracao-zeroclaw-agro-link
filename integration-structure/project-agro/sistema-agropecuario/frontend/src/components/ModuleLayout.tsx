import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: string;
}

interface ModuleLayoutProps {
  title: string;
  subtitle: string;
  menuItems: MenuItem[];
}

const ModuleLayout: React.FC<ModuleLayoutProps> = ({ title, subtitle, menuItems }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isTabActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">{title}</h1>
          <p className="text-muted">{subtitle}</p>
        </div>
      </div>

      <div className="d-flex align-items-center mb-4" style={{ overflowX: 'auto' }}>
        <ul className="nav nav-tabs mb-0 flex-nowrap">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-link ${isTabActive(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <i className={`${item.icon} me-2`}></i>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Outlet />
    </div>
  );
};

export default ModuleLayout;
