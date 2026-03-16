import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import financeiroService from '@/services/financeiro';
import type { Emprestimo } from '@/types/financeiro';
import EmprestimoCreate from '@/pages/financeiro/EmprestimoCreate';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toCSV, downloadCSV } from '@/utils/csv';
import { useToast } from '@/hooks/useToast';

const EmprestimosList: React.FC = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; nome: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const { data, isLoading, error } = useQuery<Emprestimo[]>({
    queryKey: ['financeiro', 'emprestimos'],
    queryFn: () => financeiroService.getEmprestimos(),
  });

  const gerarMutation = useMutation({
    mutationFn: (id: number) => financeiroService.gerarParcelasEmprestimo(id),
    onSuccess: () => {
      showSuccess('Parcelas geradas com sucesso');
      qc.invalidateQueries({ queryKey: ['financeiro', 'emprestimos'] });
      qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-emprestimo'] });
    },
    onError: (err: unknown) => {
      console.error('Erro ao gerar parcelas', err);
      showError('Erro ao gerar parcelas');
    }
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    const status = (error as any)?.response?.status;
    if (status === 403) {
      return (
        <div className="alert alert-warning">Acesso negado. Por favor, <a href="/login">faça login</a> com uma conta que tenha permissão.</div>
      );
    }
    return <div className="alert alert-danger">Erro ao carregar empréstimos</div>;
  }

  const exportCsv = () => {
    const rows = (data || []).map(e => ({ id: e.id, descricao: e.descricao || '', valor_total: e.valor_emprestimo ?? 0, parcelas: e.numero_parcelas ?? 0, data_contratacao: e.data_contratacao }));
    const csv = toCSV(rows, ['id','descricao','valor_total','parcelas','data_contratacao']);
    downloadCSV('emprestimos.csv', csv);
  };

  const handleGerarParcelas = async (id: number) => {
    if (!window.confirm('Confirma gerar parcelas para este empréstimo?')) return;
    try {
      await financeiroService.gerarParcelasEmprestimo(id);
      showSuccess('Parcelas geradas com sucesso');
      qc.invalidateQueries({ queryKey: ['financeiro', 'emprestimos'] });
      qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-emprestimo'] });
    } catch (err) {
      console.error('Erro ao gerar parcelas', err);
      showError('Erro ao gerar parcelas');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await financeiroService.deleteEmprestimo(deleteConfirm.id);
      showSuccess('Empréstimo excluído');
      qc.invalidateQueries({ queryKey: ['financeiro', 'emprestimos'] });
      setDeleteConfirm(null);
    } catch (e) {
      console.error('Erro ao deletar empréstimo:', e);
      showError('Erro ao excluir empréstimo');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Empréstimos</h4>
        <div>
          <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setShowForm(true)}>Novo</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={exportCsv}>Exportar CSV</button>
        </div>
      </div>

      {showForm && (
        <div className="card mb-3">
          <div className="card-body">
            <EmprestimoCreate onCancel={() => setShowForm(false)} onSuccess={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['financeiro', 'emprestimos'] }); showSuccess('Empréstimo criado'); }} />
          </div>
        </div>
      )}

      <div className="list-group">
        {data?.map((e) => (
          <div key={e.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
            <div>
              <strong>{e.descricao || `#${e.id}`}</strong>
              <div><small>R$ {e.valor_emprestimo ?? 0} — {e.numero_parcelas ?? 0} parcelas</small></div>
            </div>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/financeiro/emprestimos/${e.id}`)}>Ver</button>
              <button className="btn btn-sm btn-outline-secondary" disabled={(gerarMutation as any).isLoading} onClick={() => handleGerarParcelas(e.id)}>Gerar Parcelas</button>
              <button className="btn btn-sm btn-outline-danger" title="Deletar" onClick={() => setDeleteConfirm({ id: e.id, nome: e.descricao || `#${e.id}` })}>
                <i className="bi bi-trash"></i>
              </button>
            </div>
          </div>
        ))}
        {!data || data.length === 0 ? <div className="text-muted mt-2">Nenhum empréstimo encontrado.</div> : null}
      </div>

      {deleteConfirm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger"><i className="bi bi-exclamation-triangle me-2"></i>Confirmar exclusão</h5>
                <button className="btn-close" onClick={() => setDeleteConfirm(null)} disabled={deleteLoading}></button>
              </div>
              <div className="modal-body">
                <p>Excluir empréstimo <strong>{deleteConfirm.nome}</strong>?</p>
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
};

export default EmprestimosList;
