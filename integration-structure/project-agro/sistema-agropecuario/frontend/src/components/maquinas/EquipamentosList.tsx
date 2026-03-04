import React, { useState } from 'react';
import { useApiQuery, useApiDelete, useApiCreate, useApiUpdate } from '../../hooks/useApi';
import type { Equipamento } from '../../types';
import DataTable from '../common/DataTable';
import ModalForm from '../common/ModalForm';
import ConfirmDialog from '../common/ConfirmDialog';
import EquipamentoForm from './EquipamentoForm';

const EquipamentosList: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState<Equipamento | null>(null);
  const [deleteEquipamento, setDeleteEquipamento] = useState<Equipamento | null>(null);

  // Queries
  const { data: equipamentos = [], isLoading } = useApiQuery<Equipamento[]>(
    ['equipamentos'],
    '/maquinas/equipamentos/'
  );

  // Mutations
  const deleteMutation = useApiDelete('/maquinas/equipamentos/', [['equipamentos']]);
  const createMutation = useApiCreate('/maquinas/equipamentos/', [['equipamentos']]);
  const updateMutation = useApiUpdate('/maquinas/equipamentos/', [['equipamentos']]);

  const handleEdit = (equipamento: Equipamento) => {
    setEditingEquipamento(equipamento);
  };

  const handleDelete = (equipamento: Equipamento) => {
    setDeleteEquipamento(equipamento);
  };

  const confirmDelete = async () => {
    if (deleteEquipamento) {
      try {
        await deleteMutation.mutateAsync(deleteEquipamento.id);
        setDeleteEquipamento(null);
      } catch (error) {
        console.error('Erro ao excluir equipamento:', error);
      }
    }
  };

  const handleSaveEquipamento = async (equipamentoData: Omit<Equipamento, 'id'> | Partial<Equipamento>) => {
    try {
      console.log('=== DEBUG EQUIPAMENTOS LIST ===');
      console.log('Dados recebidos do form:', equipamentoData);
      console.log('================================');
      
      if (editingEquipamento) {
        // Atualizar equipamento existente
        await updateMutation.mutateAsync({ id: editingEquipamento.id, ...equipamentoData } as any);
      } else {
        // Criar novo equipamento
        await createMutation.mutateAsync(equipamentoData as any);
      }

      // Invalidate and refresh handled by hooks; just close modal
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar equipamento:', error);
      alert('Erro ao salvar equipamento. Tente novamente.');
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingEquipamento(null);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-success';
      case 'inativo':
        return 'bg-secondary';
      case 'manutenção':
        return 'bg-warning text-dark';
      case 'vendido':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  const getMobilidadeIcon = (tipoMobilidade: string) => {
    switch (tipoMobilidade) {
      case 'autopropelido':
        return 'bi-truck';
      case 'estacionario':
        return 'bi-house-gear';
      case 'rebocado':
        return 'bi-link-45deg';
      default:
        return 'bi-gear';
    }
  };

  const columns = [
    {
      key: 'nome',
      header: 'Nome',
      sortable: true,
      render: (value: string, item: Equipamento) => (
        <div>
          <div className="fw-semibold">
            <i className={`bi ${getMobilidadeIcon(item.categoria_detail?.tipo_mobilidade || '')} me-2 text-primary`}></i>
            {value}
          </div>
          <small className="text-muted">
            {item.marca} {item.modelo}
          </small>
        </div>
      )
    },
    {
      key: 'categoria_detail',
      header: 'Categoria',
      render: (_value: any, item: Equipamento) => (
        <span className="badge bg-info-subtle text-info">
          <i className="bi bi-tag me-1"></i>
          {item.categoria_detail?.nome || 'N/A'}
        </span>
      ),
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <span className={`badge ${getStatusBadgeColor(value)}`}>
          {value}
        </span>
      ),
      sortable: true
    },
    {
      key: 'horimetro_atual',
      header: 'Horímetro',
      render: (value: number) => value ? (
        <span className="text-muted">
          <i className="bi bi-clock me-1"></i>
          {value.toLocaleString('pt-BR')} h
        </span>
      ) : '-',
      sortable: true
    },
    {
      key: 'valor_aquisicao',
      header: 'Valor Aquisição',
      render: (value: number) => value ? (
        <span className="text-muted">
          R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ) : '-',
      sortable: true
    },
    {
      key: 'data_aquisicao',
      header: 'Aquisição',
      render: (value: string) => value ? (
        <span className="text-muted">
          {new Date(value).toLocaleDateString('pt-BR')}
        </span>
      ) : '-',
      sortable: true
    }
  ];

  const totalEquipamentos = equipamentos.length;
  const equipamentosAtivos = equipamentos.filter(e => e.status === 'ativo').length;
  const emManutencao = equipamentos.filter(e => e.status === 'manutenção').length;
  const totalHoras = equipamentos.reduce((sum, e) => sum + (e.horimetro_atual || 0), 0);

  return (
    <div className="p-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h2 mb-1">
            <i className="bi bi-gear text-primary me-2"></i>
            Equipamentos
          </h1>
          <p className="text-muted mb-0">Gerencie máquinas e implementos agrícolas</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-success btn-lg shadow-sm"
        >
          <i className="bi bi-plus-circle me-2"></i>
          Novo Equipamento
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
                  <h3 className="mb-0 fw-bold">{totalEquipamentos}</h3>
                  <small className="text-white-50">equipamento{totalEquipamentos !== 1 ? 's' : ''}</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-gear fs-3"></i>
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
                  <h3 className="mb-0 fw-bold">{equipamentosAtivos}</h3>
                  <small className="text-white-50">em operação</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-check-circle fs-3"></i>
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
                  <p className="text-white-50 mb-1 small">MANUTENÇÃO</p>
                  <h3 className="mb-0 fw-bold">{emManutencao}</h3>
                  <small className="text-white-50">em reparo</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-tools fs-3"></i>
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
                  <p className="text-white-50 mb-1 small">HORAS TOTAIS</p>
                  <h3 className="mb-0 fw-bold">{totalHoras.toLocaleString('pt-BR')}</h3>
                  <small className="text-white-50">horas trabalhadas</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-clock fs-3"></i>
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
            Lista de Equipamentos
            <span className="badge bg-white text-primary ms-2">{equipamentos.length}</span>
          </h5>
        </div>
        <div className="card-body p-0">
          <DataTable
            data={equipamentos}
            columns={columns}
            loading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage="Nenhum equipamento cadastrado"
          />
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      <ModalForm
        isOpen={showCreateModal || !!editingEquipamento}
        title={editingEquipamento ? 'Editar Equipamento' : 'Novo Equipamento'}
        onClose={handleCloseModal}
      >
        <EquipamentoForm
          equipamento={editingEquipamento || undefined}
          onSave={handleSaveEquipamento}
          onCancel={handleCloseModal}
        />
      </ModalForm>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={!!deleteEquipamento}
        title="Excluir Equipamento"
        message={`Tem certeza que deseja excluir o equipamento "${deleteEquipamento?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteEquipamento(null)}
      />
    </div>
  );
};

export default EquipamentosList;