import React, { useState } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import type { Talhao } from '../../types';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorMessage from '../../components/common/ErrorMessage';
import TalhaoForm from './TalhaoForm';

const TalhaosList: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTalhao, setEditingTalhao] = useState<Talhao | null>(null);
  const [deleteTalhao, setDeleteTalhao] = useState<Talhao | null>(null);

  // Queries
  const { data: talhoes = [], isLoading, error } = useApiQuery<Talhao[]>(
    ['talhoes'],
    '/talhoes/'
  );

  // Mutations
  const deleteMutation = useApiDelete('/talhoes/', [['talhoes']]);

  const handleEdit = (talhao: Talhao) => {
    setEditingTalhao(talhao);
  };

  const handleDelete = (talhao: Talhao) => {
    setDeleteTalhao(talhao);
  };

  const confirmDelete = async () => {
    if (deleteTalhao) {
      try {
        await deleteMutation.mutateAsync(deleteTalhao.id);
        setDeleteTalhao(null);
      } catch (error) {
        console.error('Erro ao excluir talhão:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingTalhao(null);
  };

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      sortable: true,
      render: (value: string) => (
        <span className="fw-semibold text-dark">
          <i className="bi bi-grid-3x3-gap-fill me-2 text-primary"></i>
          {value}
        </span>
      )
    },
    {
      key: 'area',
      header: 'Área',
      render: (_value: any, item: Talhao) => (
        <span className="badge bg-success-subtle text-success">
          <i className="bi bi-geo-alt me-1"></i>
          {item.area_detail?.name || `Área ${item.area}`}
        </span>
      ),
      sortable: true
    },
    {
      key: 'fazenda',
      header: 'Fazenda',
      render: (_value: any, item: Talhao) => (
        <span className="text-muted">
          <i className="bi bi-building me-1"></i>
          {item.area_detail?.fazenda_detail?.name || '-'}
        </span>
      ),
    },
    {
      key: 'area_size',
      header: 'Tamanho',
      render: (value: any) => {
        const num = Number(value);
        return (!isNaN(num) && num > 0) ? (
          <span className="badge bg-info-subtle text-info fs-6">
            <i className="bi bi-rulers me-1"></i>
            {num.toFixed(2)} ha
          </span>
        ) : '-';
      },
      sortable: true
    },
    {
      key: 'area_hectares',
      header: 'Área GIS',
      render: (value: any) => {
        const num = Number(value);
        return (!isNaN(num) && num > 0) ? (
          <span className="badge bg-warning-subtle text-warning fs-6">
            <i className="bi bi-pin-map me-1"></i>
            {num.toFixed(2)} ha
          </span>
        ) : '-';
      },
    }
  ];

  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage message="Erro ao carregar talhões" />
      </div>
    );
  }

  const totalHectares = talhoes.reduce((sum, t) => {
    const areaSize = typeof t.area_size === 'string' ? parseFloat(t.area_size) : t.area_size;
    return sum + (areaSize || 0);
  }, 0);

  return (
    <div className="p-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h2 mb-1">
            <i className="bi bi-grid-3x3 text-primary me-2"></i>
            Talhões
          </h1>
          <p className="text-muted mb-0">Divisões das áreas para plantio</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-success btn-lg shadow-sm"
        >
          <i className="bi bi-plus-circle me-2"></i>
          Novo Talhão
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-primary bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">TOTAL</p>
                  <h3 className="mb-0 fw-bold">{talhoes.length}</h3>
                  <small className="text-white-50">talhão{talhoes.length !== 1 ? 'ões' : ''}</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-grid-3x3 fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-success bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">ÁREA TOTAL</p>
                  <h3 className="mb-0 fw-bold">{totalHectares.toFixed(1)}</h3>
                  <small className="text-white-50">hectares</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-rulers fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm h-100 bg-info bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">MÉDIA POR TALHÃO</p>
                  <h3 className="mb-0 fw-bold">
                    {talhoes.length > 0 ? (totalHectares / talhoes.length).toFixed(2) : 0} ha
                  </h3>
                  <small className="text-white-50">hectares por talhão</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-calculator fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-primary text-white py-3">
          <h5 className="mb-0">
            <i className="bi bi-list-ul me-2"></i>
            Lista de Talhões
            <span className="badge bg-white text-primary ms-2">{talhoes.length}</span>
          </h5>
        </div>
        <div className="card-body p-0">
          <DataTable
            columns={columns}
            data={talhoes}
            loading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage="Nenhum talhão cadastrado"
          />
        </div>
        {talhoes.length > 0 && (
          <div className="card-footer bg-light border-top">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
              <span className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Total de talhões cadastrados
              </span>
              <div className="d-flex align-items-center gap-3">
                <span className="text-muted">{talhoes.length} talhão{talhoes.length !== 1 ? 'ões' : ''}</span>
                <span className="badge bg-success fs-6 px-3 py-2">
                  <i className="bi bi-rulers me-2"></i>
                  {totalHectares.toFixed(2)} ha
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Create/Edit */}
      <ModalForm
        isOpen={showCreateModal || !!editingTalhao}
        onClose={handleCloseModal}
        title={editingTalhao ? 'Editar Talhão' : 'Novo Talhão'}
      >
        <TalhaoForm
          talhao={editingTalhao}
          onSuccess={handleCloseModal}
        />
      </ModalForm>

      {/* Modal Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTalhao}
        onCancel={() => setDeleteTalhao(null)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message={`Deseja realmente excluir o talhão "${deleteTalhao?.name}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default TalhaosList;
