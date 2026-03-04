import React, { useState } from 'react';
import NfeList from '../components/fiscal/NfeList';
import NfeListImpostos from '../components/fiscal/NfeListImpostos';
import FiscalDashboard from '../components/fiscal/FiscalDashboard';
import CertificadosList from '../components/fiscal/CertificadosList';
import NfeUploadModal from '../components/fiscal/NfeUploadModal';
import { useDragDrop } from '../hooks/useDragDrop';
import { Button } from '@mui/material';

const Fiscal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [importedNfeForEdit, setImportedNfeForEdit] = useState<any | null>(null);
  const { isDragging } = useDragDrop({
    onFilesDragged: (files) => {
      setDraggedFiles(files);
      setUploadModalOpen(true);
    },
    acceptedTypes: ['.xml'],
  });

  const handleRefreshData = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: 'bi bi-speedometer2' },
    { id: 'impostos', label: 'Impostos', icon: 'bi bi-receipt' },
    { id: 'notas-fiscais', label: 'Notas Fiscais', icon: 'bi bi-file-earmark-text' },
    { id: 'baixar-nfes', label: 'Baixar NFes', icon: 'bi bi-cloud-arrow-down' },
    { id: 'certificados', label: 'Certificados', icon: 'bi bi-shield-lock' },
    { id: 'relatorios', label: 'Relatórios', icon: 'bi bi-bar-chart' }
  ];

  const renderDashboard = () => (
    <FiscalDashboard key={`dashboard-${refreshKey}`} />
  );

  const renderImpostos = () => (
    <NfeListImpostos key={`impostos-${refreshKey}`} />
  );

  const renderNotasFiscais = () => (
    <div className="row">
      <div className="col-12">
        {/* Show local NFes only in this view */}
        <NfeList key={`nfes-${refreshKey}`} forceLocal autoOpenEditNfeId={importedNfeForEdit?.id ?? null} />
      </div>
    </div>
  );

  const renderBaixarNfes = () => (
    <div className="row">
      <div className="col-12">
        {/* Dedicated view for downloading NFes from SEFAZ */}
        <NfeList key={`baixar-${refreshKey}`} forceRemote />
      </div>
    </div>
  );

  const renderCertificados = () => (
    <div className="row">
      <div className="col-12">
        <CertificadosList key={`certificados-${refreshKey}`} />
      </div>
    </div>
  );



  const renderRelatorios = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Relatórios Fiscais</h5>
          </div>
          <div className="card-body">
            <p className="text-muted">Módulo de relatórios em desenvolvimento...</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'impostos':
        return renderImpostos();
      case 'notas-fiscais':
        return renderNotasFiscais();
      case 'baixar-nfes':
        return renderBaixarNfes();
      case 'certificados':
        return renderCertificados();
      case 'relatorios':
        return renderRelatorios();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">Fiscal</h1>
          <p className="text-muted">Controle fiscal e conformidade tributária</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setUploadModalOpen(true)}
            startIcon={<i className="bi bi-plus-circle"></i>}
          >
            IMPORTAR XML
          </Button>
        </div>
      </div>

      <div className="d-flex align-items-center mb-4" style={{ overflowX: 'auto' }}>
        <ul className="nav nav-tabs mb-0 flex-nowrap">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <i className={`${item.icon} me-2`}></i>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {renderContent()}

      {/* Upload Modal com drag-and-drop */}
      <NfeUploadModal
        open={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setDraggedFiles([]);
        }}
        onSuccess={(createdNfe?: any) => {
          handleRefreshData();
          if (createdNfe && createdNfe.id) {
            // Request NFe list to refresh and store id for auto-open by NfeList
            setImportedNfeForEdit(createdNfe);
          }
        }}
        initialFiles={draggedFiles}
      />

      {/* Visual feedback quando arrastando arquivo */}
      {isDragging && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <i
              className="bi bi-cloud-arrow-down"
              style={{ fontSize: '2rem', color: '#0d6efd', marginBottom: '0.5rem' }}
            ></i>
            <h5 style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              Solte para importar XML
            </h5>
            <p style={{ color: '#6c757d', marginTop: '0.25rem', marginBottom: 0 }}>
              Nota Fiscal Eletrônica (.xml)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fiscal;
