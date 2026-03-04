import React, { useState } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import type { Arrendamento } from '../../types';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ErrorMessage from '../../components/common/ErrorMessage';
import { formatDate, formatCurrency } from '../../utils/formatters';
import ArrendamentoForm from './ArrendamentoForm';

const ArrendamentosList: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingArrendamento, setEditingArrendamento] = useState<Arrendamento | null>(null);

  // Queries
  const { data: arrendamentos = [], isLoading, error } = useApiQuery<Arrendamento[]>(
    ['arrendamentos'],
    '/arrendamentos/'
  );

  const deleteMutation = useApiDelete('/arrendamentos/', [['arrendamentos']]);

  const handleEdit = (arrendamento: Arrendamento) => {
    setEditingArrendamento(arrendamento);
  };

  const handleDelete = async (arrendamento: Arrendamento) => {
    if (!window.confirm(`Tem certeza que deseja remover o arrendamento de "${arrendamento.fazenda_detail?.name}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(arrendamento.id);
    } catch (error) {
      console.error('Error deleting arrendamento:', error);
      alert('Erro ao remover arrendamento. Tente novamente.');
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingArrendamento(null);
  };

  const columns = [
    {
      key: 'arrendador_nome',
      header: 'Arrendador (Dono)',
      render: (_value: any, item: Arrendamento) => (
        <span className="fw-semibold text-dark">
          <i className="bi bi-person-badge me-2 text-primary"></i>
          {item.arrendador_detail?.nome || '-'}
        </span>
      ),
      sortable: true
    },
    {
      key: 'arrendatario_nome',
      header: 'Arrendatário (Usuário)',
      render: (_value: any, item: Arrendamento) => (
        <span className="text-muted">
          <i className="bi bi-person me-1"></i>
          {item.arrendatario_detail?.nome || '-'}
        </span>
      ),
      sortable: true
    },
    {
      key: 'fazenda_name',
      header: 'Fazenda',
      render: (_value: any, item: Arrendamento) => (
        <span className="badge bg-info-subtle text-info">
          <i className="bi bi-building me-1"></i>
          {item.fazenda_detail?.name || '-'}
        </span>
      ),
      sortable: true
    },
    {
      key: 'start_date',
      header: 'Data Início',
      render: (value: any, _item: Arrendamento) => (
        <span className="text-muted">
          <i className="bi bi-calendar-check me-1"></i>
          {formatDate(value as string)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'end_date',
      header: 'Data Fim',
      render: (value: any, _item: Arrendamento) => value ? (
        <span className="text-muted">
          <i className="bi bi-calendar-x me-1"></i>
          {formatDate(value as string)}
        </span>
      ) : (
        <span className="badge bg-success">Ativo</span>
      )
    },
    {
      key: 'custo_sacas_hectare',
      header: 'Custo (sacas/ha)',
      render: (value: number) => (
        <span className="badge bg-warning-subtle text-warning fs-6">
          <i className="bi bi-basket me-1"></i>
          {value} sacas/ha
        </span>
      )
    },
    {
      key: 'custo_total_atual',
      header: 'Custo Total',
      render: (value: number) => value ? (
        <span className="text-success fw-semibold">
          <i className="bi bi-cash-coin me-1"></i>
          {formatCurrency(value)}
        </span>
      ) : '-'
    }
  ];

  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage message="Erro ao carregar arrendamentos" />
      </div>
    );
  }

  const arrendamentosAtivos = arrendamentos.filter(a => !a.end_date || new Date(a.end_date) >= new Date());
  const custoTotal = arrendamentosAtivos.reduce((sum, a) => sum + (a.custo_total_atual || 0), 0);

  return (
    <div className="p-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h2 mb-1">
            <i className="bi bi-file-earmark-text text-primary me-2"></i>
            Arrendamentos
          </h1>
          <p className="text-muted mb-0">Controle de áreas arrendadas</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-success btn-lg shadow-sm"
        >
          <i className="bi bi-plus-circle me-2"></i>
          Novo Arrendamento
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
                  <h3 className="mb-0 fw-bold">{arrendamentos.length}</h3>
                  <small className="text-white-50">contrato{arrendamentos.length !== 1 ? 's' : ''}</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-file-text fs-3"></i>
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
                  <p className="text-white-50 mb-1 small">ATIVOS</p>
                  <h3 className="mb-0 fw-bold">{arrendamentosAtivos.length}</h3>
                  <small className="text-white-50">em vigência</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-check-circle fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm h-100 bg-warning bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">CUSTO TOTAL ATIVOS</p>
                  <h3 className="mb-0 fw-bold">{formatCurrency(custoTotal)}</h3>
                  <small className="text-white-50">{arrendamentosAtivos.length} arrendamento{arrendamentosAtivos.length !== 1 ? 's' : ''} ativo{arrendamentosAtivos.length !== 1 ? 's' : ''}</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-cash-stack fs-3"></i>
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
            Lista de Arrendamentos
            <span className="badge bg-white text-primary ms-2">{arrendamentos.length}</span>
            <span className="badge bg-success ms-2">{arrendamentosAtivos.length} ativo{arrendamentosAtivos.length !== 1 ? 's' : ''}</span>
          </h5>
        </div>
        <div className="card-body p-0">
          <DataTable
            columns={columns}
            data={arrendamentos}
            loading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage="Nenhum arrendamento cadastrado"
          />
        </div>
        {arrendamentosAtivos.length > 0 && (
          <div className="card-footer bg-light border-top">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
              <span className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Resumo de arrendamentos ativos
              </span>
              <div className="d-flex align-items-center gap-3">
                <span className="text-muted">{arrendamentosAtivos.length} ativo{arrendamentosAtivos.length !== 1 ? 's' : ''}</span>
                <span className="badge bg-warning fs-6 px-3 py-2">
                  <i className="bi bi-cash-coin me-2"></i>
                  {formatCurrency(custoTotal)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Create/Edit */}
      <ModalForm
        isOpen={showCreateModal || !!editingArrendamento}
        onClose={handleCloseModal}
        title={editingArrendamento ? 'Editar Arrendamento' : 'Novo Arrendamento'}
      >
        <ArrendamentoForm
          arrendamento={editingArrendamento}
          onSuccess={handleCloseModal}
        />
      </ModalForm>
    </div>
  );
};

export default ArrendamentosList;