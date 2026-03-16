import React, { useState } from 'react';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import ModalForm from '@/components/common/ModalForm';
import EmpresaCreate from './EmpresaCreate';
import ComercialService from '@/services/comercial';

const EmpresasList: React.FC = () => {
  const { data, isLoading, error } = useEmpresas();
  const empresas = Array.isArray(data) ? (data as any[]) : [];
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; nome: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  if (isLoading) return <div>Carregando empresas...</div>;
  if (error) return <div className="alert alert-danger">Erro ao carregar empresas.</div>;

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await ComercialService.deleteEmpresa(deleteConfirm.id);
      qc.invalidateQueries({ queryKey: ['empresas'] });
      setDeleteConfirm(null);
    } catch (e) {
      console.error('Erro ao deletar empresa:', e);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Empresas / Prestadoras</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>Nova Empresa</button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CNPJ</th>
                  <th>Contato</th>
                  <th>Endereço</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {empresas.length ? empresas.map((e: any) => (
                  <tr key={e.id}>
                    <td>{e.nome}</td>
                    <td>{e.cnpj}</td>
                    <td>{e.contato || '-'}</td>
                    <td>{e.endereco || '-'}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-info" title="Visualizar" onClick={() => navigate(`/comercial/empresas/${e.id}`)}>
                          <i className="bi bi-eye"></i>
                        </button>
                        <button className="btn btn-outline-warning" title="Editar" onClick={() => setEditingEmpresa(e)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-outline-danger" title="Deletar" onClick={() => setDeleteConfirm({ id: e.id, nome: e.nome })}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="text-center">Nenhuma empresa encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ModalForm isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nova Empresa">
        <EmpresaCreate onSuccess={(data: any) => { setShowCreateModal(false); navigate(`/comercial/empresas/${data.id}`); }} onCancel={() => setShowCreateModal(false)} />
      </ModalForm>

      <ModalForm isOpen={!!editingEmpresa} onClose={() => setEditingEmpresa(null)} title="Editar Empresa">
        <EmpresaCreate initialData={editingEmpresa} onSuccess={() => { setEditingEmpresa(null); qc.invalidateQueries({ queryKey: ['empresas'] }); }} onCancel={() => setEditingEmpresa(null)} />
      </ModalForm>

      {deleteConfirm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger"><i className="bi bi-exclamation-triangle me-2"></i>Confirmar exclusão</h5>
                <button className="btn-close" onClick={() => setDeleteConfirm(null)} disabled={deleteLoading}></button>
              </div>
              <div className="modal-body">
                <p>Tem certeza que deseja excluir <strong>{deleteConfirm.nome}</strong>?</p>
                <p className="text-muted small mb-0">Esta ação não pode ser desfeita.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={deleteLoading}>Cancelar</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleteLoading}>
                  {deleteLoading ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-trash me-1"></i>}
                  Deletar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmpresasList;
