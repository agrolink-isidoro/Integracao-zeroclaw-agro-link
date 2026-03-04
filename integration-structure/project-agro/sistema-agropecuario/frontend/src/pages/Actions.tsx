import React, { useState } from 'react';
import ActionsPanel from '../components/actions/ActionsPanel';
import FileUploadHandler from '../components/actions/FileUploadHandler';
import { useActions } from '../contexts/ActionsContext';

type ActiveTab = 'fila' | 'upload';

const Actions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('fila');
  const { pendingActions } = useActions();
  const pendingCount = pendingActions.length;

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

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'fila' ? 'active' : ''}`}
            onClick={() => setActiveTab('fila')}
          >
            <i className="bi bi-list-check me-1"></i>
            Fila de Ações
            {pendingCount > 0 && (
              <span className="badge bg-warning text-dark ms-1">{pendingCount}</span>
            )}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <i className="bi bi-cloud-upload me-1"></i>
            Upload de Arquivo
          </button>
        </li>
      </ul>

      {/* Tab content */}
      {activeTab === 'fila' && <ActionsPanel />}
      {activeTab === 'upload' && (
        <div className="row justify-content-center">
          <div className="col-xl-9">
            <FileUploadHandler />
          </div>
        </div>
      )}
    </div>
  );
};

export default Actions;
