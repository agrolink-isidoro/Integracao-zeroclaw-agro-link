import React, { useState } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import type { Cultura, Plantio } from '../../types/agricultura';
import { TIPO_CULTURA_CHOICES } from '../../types/agricultura';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorMessage from '../../components/common/ErrorMessage';
import CulturaForm from './CulturaForm';

const CulturasList: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCultura, setEditingCultura] = useState<Cultura | null>(null);
  const [deleteCultura, setDeleteCultura] = useState<Cultura | null>(null);

  // Queries
  const { data: culturas = [], isLoading, error } = useApiQuery<Cultura[]>(
    ['culturas'],
    '/agricultura/culturas/'
  );

  // Buscar plantios para contar safras em andamento
  const { data: plantios = [] } = useApiQuery<Plantio[]>(
    ['plantios'],
    '/agricultura/plantios/'
  );

  // Mutations
  const deleteMutation = useApiDelete('/agricultura/culturas/', [['culturas']]);

  const handleEdit = (cultura: Cultura) => {
    setEditingCultura(cultura);
  };

  const handleDelete = (cultura: Cultura) => {
    setDeleteCultura(cultura);
  };

  const confirmDelete = async () => {
    if (deleteCultura) {
      try {
        console.log('Deletando cultura:', deleteCultura.id);
        await deleteMutation.mutateAsync(deleteCultura.id);
        console.log('Cultura deletada com sucesso');
        setDeleteCultura(null);
      } catch (error) {
        console.error('Erro ao excluir cultura:', error);
        alert('Erro ao excluir cultura. Verifique o console para mais detalhes.');
      }
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingCultura(null);
  };

  const getTipoLabel = (tipo: string) => {
    const choice = TIPO_CULTURA_CHOICES.find(c => c.value === tipo);
    return choice?.label || tipo;
  };

  const getTipoBadgeColor = (tipo: string) => {
    const colors: Record<string, string> = {
      graos: 'warning',
      hortalicas: 'success',
      fruticultura: 'danger',
      outros: 'info',
    };
    return colors[tipo] || 'secondary';
  };

  const columns = [
    {
      key: 'nome',
      header: 'Nome',
      sortable: true,
      render: (value: string, item: Cultura) => (
        <span className="fw-semibold text-dark">
          <i className="bi bi-flower1 me-2 text-success"></i>
          {value}
          {!item.ativo && (
            <span className="badge bg-secondary ms-2">Inativo</span>
          )}
        </span>
      )
    },
    {
      key: 'tipo',
      header: 'Tipo',
      sortable: true,
      render: (value: string) => (
        <span className={`badge bg-${getTipoBadgeColor(value)}-subtle text-${getTipoBadgeColor(value)} fs-6`}>
          {getTipoLabel(value)}
        </span>
      )
    },
    {
      key: 'ciclo_dias',
      header: 'Ciclo',
      sortable: true,
      render: (value: number | null) => (
        <span className="text-muted">
          <i className="bi bi-calendar-event me-1"></i>
          {value ? `${value} dias` : '-'}
        </span>
      )
    },
    {
      key: 'zoneamento_apto',
      header: 'Zoneamento',
      render: (value: boolean) => value ? (
        <span className="badge bg-success">
          <i className="bi bi-check-circle me-1"></i>
          Apto
        </span>
      ) : (
        <span className="badge bg-warning">
          <i className="bi bi-exclamation-triangle me-1"></i>
          Não Apto
        </span>
      )
    },
  ];

  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage message="Erro ao carregar culturas" />
      </div>
    );
  }

  // Estatísticas
  const totalAtivas = culturas.filter(c => c.ativo).length;
  const safrasEmAndamento = plantios.filter((p: Plantio) => p.status === 'em_andamento').length;

  return (
    <div className="p-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h2 mb-1">
            <i className="bi bi-flower1 text-success me-2"></i>
            Culturas
          </h1>
          <p className="text-muted mb-0">Gerencie as culturas disponíveis para plantio</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-success btn-lg shadow-sm"
        >
          <i className="bi bi-plus-circle me-2"></i>
          Nova Cultura
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100 bg-primary bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">TOTAL</p>
                  <h3 className="mb-0 fw-bold">{culturas.length}</h3>
                  <small className="text-white-50">cultura{culturas.length !== 1 ? 's' : ''}</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-flower1 fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100 bg-success bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">SAFRAS EM ANDAMENTO</p>
                  <h3 className="mb-0 fw-bold">{safrasEmAndamento}</h3>
                  <small className="text-white-50">safra{safrasEmAndamento !== 1 ? 's' : ''} ativa{safrasEmAndamento !== 1 ? 's' : ''}</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-arrow-repeat fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100 bg-info bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">DISPONÍVEIS</p>
                  <h3 className="mb-0 fw-bold">{totalAtivas}</h3>
                  <small className="text-white-50">habilitada{totalAtivas !== 1 ? 's' : ''}</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-check-circle fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-success text-white py-3">
          <h5 className="mb-0">
            <i className="bi bi-list-ul me-2"></i>
            Lista de Culturas
            <span className="badge bg-white text-success ms-2">{culturas.length}</span>
          </h5>
        </div>
        <div className="card-body p-0">
          <DataTable
            data={culturas}
            columns={columns}
            loading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage="Nenhuma cultura cadastrada"
          />
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      <ModalForm
        isOpen={showCreateModal || !!editingCultura}
        title={editingCultura ? 'Editar Cultura' : 'Nova Cultura'}
        onClose={handleCloseModal}
      >
        <CulturaForm
          cultura={editingCultura}
          onSuccess={handleCloseModal}
        />
      </ModalForm>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={!!deleteCultura}
        title="Excluir Cultura"
        message={`Tem certeza que deseja excluir a cultura "${deleteCultura?.nome}"? Esta ação não pode ser desfeita e pode afetar plantios existentes.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteCultura(null)}
      />
    </div>
  );
};

export default CulturasList;
