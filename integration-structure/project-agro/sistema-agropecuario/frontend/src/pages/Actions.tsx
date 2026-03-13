import React from 'react';
import ActionsPanel from '../components/actions/ActionsPanel';

const Actions: React.FC = () => {

  return (
    <div className="container-fluid py-4">
      {/* Page header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-robot text-success"></i>
            Isidoro — Fila de Ações IA
          </h4>
          <p className="text-muted small mb-0">
            Revise, edite e aprove as ações geradas pelo assistente Isidoro antes de aplicá-las ao sistema.
          </p>
        </div>
      </div>

      {/* Content */}
      <ActionsPanel />
    </div>
  );
};

export default Actions;
