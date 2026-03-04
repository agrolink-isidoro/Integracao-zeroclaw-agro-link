import React, { useState } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import type { LocalArmazenagem } from '../../types/estoque_maquinas';
import { getUnitLabel } from '../../utils/units';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorMessage from '../../components/common/ErrorMessage';
import LocalArmazenagemForm from './LocalArmazenagemForm';

const LocaisArmazenagemList: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLocal, setEditingLocal] = useState<LocalArmazenagem | null>(null);
  const [deleteLocal, setDeleteLocal] = useState<LocalArmazenagem | null>(null);

  const { data: locais = [], isLoading, error, refetch } = useApiQuery<LocalArmazenagem[]>(['locais-armazenamento'], '/estoque/locais-armazenamento/');
  const deleteMutation = useApiDelete('/estoque/locais-armazenamento/', [['locais-armazenamento']]);

  const handleEdit = (local: LocalArmazenagem) => setEditingLocal(local);
  const handleDelete = (local: LocalArmazenagem) => setDeleteLocal(local);

  const confirmDelete = async () => {
    if (!deleteLocal) return;
    try {
      await deleteMutation.mutateAsync(deleteLocal.id);
      setDeleteLocal(null);
    } catch (err) {
      console.error('Erro ao excluir local:', err);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingLocal(null);
  };

  const columns = [
    { key: 'nome', header: 'Nome', sortable: true },
    { key: 'tipo_local', header: 'Int/Ext', render: (v: any) => v === 'externo'
      ? <span className="badge bg-warning text-dark"><i className="bi bi-truck me-1"/>Externo</span>
      : <span className="badge bg-info text-dark"><i className="bi bi-house-door me-1"/>Interno</span>
    },
    { key: 'tipo', header: 'Tipo', render: (v: any) => <span className="badge bg-light text-dark">{String(v)}</span> },
    { key: 'capacidade_total', header: 'Capacidade Máx', render: (v: any, item: LocalArmazenagem) => {
      const value = v ?? (item as any).capacidade_maxima;
      if (value != null) {
        return `${Number(value).toLocaleString('pt-BR')} ${getUnitLabel(item.unidade_capacidade)}`;
      }
      return '-';
    } },
    { key: 'fazenda_nome', header: 'Fazenda / Fornecedor', render: (_v: any, item: LocalArmazenagem) => {
      if (item.tipo_local === 'externo') {
        return (item as any).fornecedor_nome ?? '-';
      }
      return (item as any).fazenda_nome ?? item.fazenda ?? '-';
    } },
    { key: 'ativo', header: 'Ativo', render: (v: boolean) => v ? <span className="badge bg-success">Sim</span> : <span className="badge bg-secondary">Não</span> }
  ];

  if (error) return <div className="p-4"><ErrorMessage message="Erro ao carregar locais" /></div>;

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-0"><i className="bi bi-box-seam me-2 text-primary"/>Locais de Armazenamento</h1>
          <p className="text-muted mb-0">Gerencie silos, armazéns e locais de estoque (internos e externos)</p>
        </div>
        <div>
          <button className="btn btn-success" onClick={() => setShowCreateModal(true)}>
            <i className="bi bi-plus-circle me-2"></i> Novo Local
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <DataTable
            columns={columns}
            data={locais}
            loading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyMessage="Nenhum local cadastrado"
          />
        </div>
      </div>

      <ModalForm isOpen={showCreateModal || !!editingLocal} onClose={handleCloseModal} title={editingLocal ? 'Editar Local' : 'Novo Local'}>
        <LocalArmazenagemForm local={editingLocal} onSuccess={() => { handleCloseModal(); refetch(); }} />
      </ModalForm>

      <ConfirmDialog
        isOpen={!!deleteLocal}
        title="Excluir local"
        message={deleteLocal ? `Tem certeza que deseja excluir o local "${deleteLocal.nome}"?` : 'Tem certeza?'}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteLocal(null)}
      />
    </div>
  );
};

export default LocaisArmazenagemList;
