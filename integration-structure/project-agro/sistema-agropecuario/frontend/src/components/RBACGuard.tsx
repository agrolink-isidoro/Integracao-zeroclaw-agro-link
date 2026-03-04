import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRBAC } from '../hooks/useRBAC';
import type { RBACModule } from '../types/rbac';

interface RBACGuardProps {
  /** The RBAC module required to access this content */
  module: RBACModule;
  /** Permission level required (default: can_view) */
  level?: 'can_view' | 'can_edit' | 'can_respond';
  /** Content to render if authorized */
  children: React.ReactNode;
  /** Where to redirect if access denied (default: /) */
  redirectTo?: string;
  /** If true, shows access denied message instead of redirecting */
  showMessage?: boolean;
}

/**
 * Component that guards content based on RBAC module permissions.
 * Use this to wrap routes or sections that require specific permissions.
 */
const RBACGuard: React.FC<RBACGuardProps> = ({
  module,
  level = 'can_view',
  children,
  redirectTo = '/',
  showMessage = false,
}) => {
  const { hasPermission } = useRBAC();

  if (hasPermission(module, level)) {
    return <>{children}</>;
  }

  if (showMessage) {
    return (
      <div className="container-fluid py-5">
        <div className="text-center">
          <i className="bi bi-shield-x text-danger" style={{ fontSize: '4rem' }}></i>
          <h4 className="mt-3">Acesso Negado</h4>
          <p className="text-muted">
            Você não tem permissão para acessar este módulo.
            <br />
            Entre em contato com o administrador do sistema.
          </p>
          <a href="/" className="btn btn-outline-primary">
            <i className="bi bi-house me-1"></i> Voltar ao Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <Navigate to={redirectTo} replace />;
};

export default RBACGuard;
