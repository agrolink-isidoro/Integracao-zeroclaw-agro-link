import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type ModuleTab = { id: string; label: string; icon?: string; to: string };

const ModuleTabs: React.FC<{ tabs: ModuleTab[] }> = ({ tabs }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (to: string) => {
    // consider exact match or startsWith route
    return location.pathname === to || location.pathname.startsWith(to + '/') || location.pathname.startsWith(to + '?');
  };

  return (
    <div className="mb-3">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={isActive(t.to) ? 'btn btn-sm btn-primary me-2' : 'btn btn-sm btn-outline-secondary me-2'}
          onClick={() => navigate(t.to)}
          aria-current={isActive(t.to) ? 'page' : undefined}
        >
          {t.icon ? <i className={`${t.icon} me-1`}></i> : null}
          {t.label}
        </button>
      ))}
    </div>
  );
};

export default ModuleTabs;
