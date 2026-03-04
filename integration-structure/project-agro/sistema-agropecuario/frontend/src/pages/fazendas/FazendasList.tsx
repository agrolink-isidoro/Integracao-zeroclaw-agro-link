import React, { useState } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import type { Fazenda } from '../../types';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorMessage from '../../components/common/ErrorMessage';
import FazendaForm from './FazendaForm';

const FazendasList: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFazenda, setEditingFazenda] = useState<Fazenda | null>(null);
  const [deleteFazenda, setDeleteFazenda] = useState<Fazenda | null>(null);

  // Queries
  const { data: fazendas = [], isLoading, error } = useApiQuery<Fazenda[]>(
    ['fazendas'],
    '/fazendas/'
  );

  // Mutations
  const deleteMutation = useApiDelete('/fazendas/', [['fazendas']]);

  const handleEdit = (fazenda: Fazenda) => {
    setEditingFazenda(fazenda);
  };

  const handleDelete = (fazenda: Fazenda) => {
    setDeleteFazenda(fazenda);
  };

  const confirmDelete = async () => {
    if (deleteFazenda) {
      try {
        await deleteMutation.mutateAsync(deleteFazenda.id);
        setDeleteFazenda(null);
      } catch (error) {
        console.error('Erro ao excluir fazenda:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingFazenda(null);
  };

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      sortable: true,
      render: (value: string) => (
        <span className="fw-semibold text-dark">
          <i className="bi bi-building-fill me-2 text-primary"></i>
          {value}
        </span>
      )
    },
    {
      key: 'matricula',
      header: 'Matrícula',
      sortable: true,
      render: (value: string) => (
        <span className="badge bg-info-subtle text-info">
          <i className="bi bi-file-earmark-text me-1"></i>
          {value}
        </span>
      )
    },
    {
      key: 'proprietario_nome',
      header: 'Proprietário',
      render: (value: any, item: Fazenda) => (
        <span className="text-muted">
          <i className="bi bi-person-fill me-1"></i>
          {item.proprietario_detail?.nome || value || '-'}
        </span>
      ),
      sortable: true
    },
    {
      key: 'areas_count',
      header: 'Áreas',
      render: (_value: any, item: Fazenda) => (
        <span className="badge bg-success-subtle text-success fs-6">
          <i className="bi bi-geo-alt-fill me-1"></i>
          {item.areas_count || 0} área{(item.areas_count || 0) !== 1 ? 's' : ''}
        </span>
      )
    },
    {
      key: 'total_hectares',
      header: 'Total (ha)',
      render: (_value: any, item: Fazenda) => (
        <span className="text-dark fw-semibold">
          <i className="bi bi-arrows-angle-expand me-1 text-info"></i>
          {item.total_hectares?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} ha
        </span>
      ),
      sortable: true
    }
  ];

  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage message="Erro ao carregar fazendas" />
      </div>
    );
  }

  const totalAreas = fazendas.reduce((sum, f) => sum + (f.areas_count || 0), 0);
  const totalHectares = fazendas.reduce((sum, f) => sum + (f.total_hectares || 0), 0);

  return (
    <div className="p-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h2 mb-1">
            <i className="bi bi-building text-primary me-2"></i>
            Fazendas
          </h1>
          <p className="text-muted mb-0">Gerencie suas propriedades rurais</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-success btn-lg shadow-sm"
        >
          <i className="bi bi-plus-circle me-2"></i>
          Nova Fazenda
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
                  <h3 className="mb-0 fw-bold">{fazendas.length}</h3>
                  <small className="text-white-50">fazenda{fazendas.length !== 1 ? 's' : ''}</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-building fs-3"></i>
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
                  <p className="text-white-50 mb-1 small">ÁREAS</p>
                  <h3 className="mb-0 fw-bold">{totalAreas}</h3>
                  <small className="text-white-50">cadastrada{totalAreas !== 1 ? 's' : ''}</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-geo-alt fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-warning bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">HECTARES</p>
                  <h3 className="mb-0 fw-bold">{totalHectares.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</h3>
                  <small className="text-white-50">total de área</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-arrows-angle-expand fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-info bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">MÉDIA</p>
                  <h3 className="mb-0 fw-bold">{fazendas.length > 0 ? (totalAreas / fazendas.length).toFixed(1) : 0}</h3>
                  <small className="text-white-50">áreas/fazenda</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-bar-chart fs-3"></i>
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
            Lista de Fazendas
            <span className="badge bg-white text-primary ms-2">{fazendas.length}</span>
          </h5>
        </div>
        <div className="card-body p-0">
          <DataTable
            data={fazendas}
            columns={columns}
            loading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage="Nenhuma fazenda cadastrada"
          />
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      <ModalForm
        isOpen={showCreateModal || !!editingFazenda}
        title={editingFazenda ? 'Editar Fazenda' : 'Nova Fazenda'}
        onClose={handleCloseModal}
      >
        <FazendaForm
          fazenda={editingFazenda}
          onSuccess={handleCloseModal}
        />
      </ModalForm>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={!!deleteFazenda}
        title="Excluir Fazenda"
        message={`Tem certeza que deseja excluir a fazenda "${deleteFazenda?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteFazenda(null)}
      />
    </div>
  );
};

export default FazendasList;