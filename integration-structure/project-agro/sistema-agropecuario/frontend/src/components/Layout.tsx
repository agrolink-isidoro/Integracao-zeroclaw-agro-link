import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useTenant } from '../hooks/useTenant';
import Sidebar from './Sidebar';
import Notifications from './common/Notifications';

const Layout: React.FC = () => {
  const { user, logout } = useAuthContext();
  const { tenantName, isSuperuser } = useTenant();

  const handleLogout = async () => {
    await logout();
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="d-flex vh-100 bg-light">
      {/* Desktop sidebar */}
      <div className="d-none d-lg-block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-lg-none"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1040 }}
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className="position-fixed top-0 start-0 h-100 d-lg-none"
            style={{ zIndex: 1050, width: '250px' }}
          >
            <Sidebar />
          </div>
        </>
      )}

      <main className="d-flex flex-column flex-fill overflow-auto">
        <header className="bg-white border-bottom p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center">
            <button
              className="btn btn-outline-secondary d-lg-none me-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <i className="bi bi-list"></i>
            </button>
            <h5 className="mb-0">Agro-link - Sua gestão otimizada via inteligência artificial</h5>
          </div>
          <div className="d-flex align-items-center">
            <Notifications />
            {tenantName && (
              <span
                className={`badge me-3 ${isSuperuser ? 'bg-warning text-dark' : 'bg-success'}`}
                title={isSuperuser ? 'Superuser — tenant selecionado' : 'Tenant ativo'}
              >
                <i className="bi bi-building me-1"></i>
                {tenantName}
              </span>
            )}
            <span className="me-3">Olá, {user?.username || 'Usuário'}</span>
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={handleLogout}
            >
              Sair
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
