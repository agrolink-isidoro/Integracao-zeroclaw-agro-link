import React, { useState } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import type { Proprietario } from '../../types';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorMessage from '../../components/common/ErrorMessage';
import { formatCPFCNPJ, formatPhone } from '../../utils/formatters';
import ProprietarioForm from './ProprietarioForm';

const ProprietariosList: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProprietario, setEditingProprietario] = useState<Proprietario | null>(null);
  const [deleteProprietario, setDeleteProprietario] = useState<Proprietario | null>(null);

  // Queries
  const { data: proprietarios = [], isLoading, error } = useApiQuery<Proprietario[]>(
    ['proprietarios'],
    '/proprietarios/'
  );

  // Mutations
  const deleteMutation = useApiDelete('/proprietarios/', [['proprietarios']]);

  const handleEdit = (proprietario: Proprietario) => {
    setEditingProprietario(proprietario);
  };

  const handleDelete = (proprietario: Proprietario) => {
    setDeleteProprietario(proprietario);
  };

  const confirmDelete = async () => {
    if (deleteProprietario) {
      try {
        await deleteMutation.mutateAsync(deleteProprietario.id);
        setDeleteProprietario(null);
      } catch (error) {
        console.error('Erro ao excluir proprietário:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingProprietario(null);
  };

  const columns = [
    {
      key: 'nome',
      header: 'Nome',
      sortable: true,
      render: (value: string) => (
        <span className="fw-semibold text-dark">
          <i className="bi bi-person-circle me-2 text-primary"></i>
          {value}
        </span>
      )
    },
    {
      key: 'cpf_cnpj',
      header: 'CPF/CNPJ',
      render: (value: any, _item: Proprietario) => (
        <span className="badge bg-info-subtle text-info font-monospace">
          <i className="bi bi-card-text me-1"></i>
          {formatCPFCNPJ(value as string)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'telefone',
      header: 'Telefone',
      render: (value: any, _item: Proprietario) => (
        <span className="text-muted">
          <i className="bi bi-telephone me-1"></i>
          {formatPhone(value as string) || '-'}
        </span>
      )
    },
    {
      key: 'email',
      header: 'Email',
      render: (value: string) => (
        <span className="text-muted">
          <i className="bi bi-envelope me-1"></i>
          {value || '-'}
        </span>
      )
    }
  ];

  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage message="Erro ao carregar proprietários" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h2 mb-1">
            <i className="bi bi-people text-primary me-2"></i>
            Proprietários
          </h1>
          <p className="text-muted mb-0">Gerencie os donos das propriedades</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-success btn-lg shadow-sm"
        >
          <i className="bi bi-plus-circle me-2"></i>
          Novo Proprietário
        </button>
      </div>

      {/* Card de Estatísticas */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm h-100 bg-primary bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">TOTAL</p>
                  <h3 className="mb-0 fw-bold">{proprietarios.length}</h3>
                  <small className="text-white-50">proprietário{proprietarios.length !== 1 ? 's' : ''}</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-people fs-3"></i>
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
            Lista de Proprietários
            <span className="badge bg-white text-primary ms-2">{proprietarios.length}</span>
          </h5>
        </div>
        <div className="card-body p-0">
          <DataTable
            data={proprietarios}
            columns={columns}
            loading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage="Nenhum proprietário cadastrado"
          />
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      <ModalForm
        isOpen={showCreateModal || !!editingProprietario}
        title={editingProprietario ? 'Editar Proprietário' : 'Novo Proprietário'}
        onClose={handleCloseModal}
      >
        <ProprietarioForm
          proprietario={editingProprietario}
          onSuccess={handleCloseModal}
        />
      </ModalForm>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={!!deleteProprietario}
        title="Excluir Proprietário"
        message={`Tem certeza que deseja excluir o proprietário "${deleteProprietario?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteProprietario(null)}
      />
    </div>
  );
};

export default ProprietariosList;