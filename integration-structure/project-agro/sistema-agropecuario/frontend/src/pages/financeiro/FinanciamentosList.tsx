import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import financeiroService from '@/services/financeiro';
import type { Financiamento } from '@/types/financeiro';
import FinanciamentoCreate from '@/pages/financeiro/FinanciamentoCreate';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toCSV, downloadCSV } from '@/utils/csv';
import { useToast } from '@/hooks/useToast';

const FinanciamentosList: React.FC = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; nome: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const { data, isLoading, error } = useQuery<Financiamento[]>({
    queryKey: ['financeiro', 'financiamentos'],
    queryFn: () => financeiroService.getFinanciamentos(),
  });

  const gerarMutation = useMutation({
    mutationFn: (id: number) => financeiroService.gerarParcelasFinanciamento(id),
    onSuccess: () => {
      showSuccess('Parcelas geradas com sucesso');
      qc.invalidateQueries({ queryKey: ['financeiro', 'financiamentos'] });
      qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-financiamento'] });
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
    return <div className="alert alert-danger">Erro ao carregar financiamentos</div>;
  }

  const exportCsv = () => {
    const rows = (data || []).map(f => ({ id: f.id, descricao: f.descricao || '', valor_total: f.valor_financiado ?? 0, parcelas: f.numero_parcelas ?? 0, data_contratacao: f.data_contratacao }));
    const csv = toCSV(rows, ['id','descricao','valor_total','parcelas','data_contratacao']);
    downloadCSV('financiamentos.csv', csv);
  };

  const handleGerarParcelas = async (id: number) => {
    if (!window.confirm('Confirma gerar parcelas para este financiamento?')) return;
    try {
      await financeiroService.gerarParcelasFinanciamento(id);
      showSuccess('Parcelas geradas com sucesso');
      qc.invalidateQueries({ queryKey: ['financeiro', 'financiamentos'] });
      qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-financiamento'] });
    } catch (err) {
      console.error('Erro ao gerar parcelas', err);
      showError('Erro ao gerar parcelas');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await financeiroService.deleteFinanciamento(deleteConfirm.id);
      showSuccess('Financiamento excluído');
      qc.invalidateQueries({ queryKey: ['financeiro', 'financiamentos'] });
      setDeleteConfirm(null);
    } catch (e) {
      console.error('Erro ao deletar financiamento:', e);
      showError('Erro ao excluir financiamento');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Financiamentos</h4>
        <div>
          <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setShowForm(true)}>Novo</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={exportCsv}>Exportar CSV</button>
        </div>
      </div>

      {showForm && (
        <div className="card mb-3">
          <div className="card-body">
            <FinanciamentoCreate onCancel={() => setShowForm(false)} onSuccess={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['financeiro', 'financiamentos'] }); showSuccess('Financiamento criado'); }} />
          </div>
        </div>
      )}

      <div className="list-group">
        {data?.map((f) => {
          const toNum = (v: any) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
          };

          const valorFin = toNum((f as any).valor_financiado ?? (f as any).valor_total ?? 0);
          const taxa = toNum((f as any).taxa_juros ?? 0);
          const prazo = toNum((f as any).prazo_meses ?? (f as any).numero_parcelas ?? 0);
          const jurosEstimado = toNum((f as any).juros ?? (valorFin * (taxa / 100) * (prazo / 12)));
          const valorFinalEstimado = valorFin + jurosEstimado;

          return (
            <div key={f.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
              <div>
                <strong>{f.titulo || f.descricao || `#${f.id}`}</strong>
                <div>
                  <small>
                    R$ {valorFin} — {f.numero_parcelas ?? 0} parcelas • Taxa: {taxa}%/{f.frequencia_taxa || 'mensal'}
                  </small>
                </div>
                <div>
                  <small className="text-muted">Juros acumulado (est.): R$ {jurosEstimado.toFixed(2)} • Valor final (est.): R$ {valorFinalEstimado.toFixed(2)}</small>
                </div>
                <div>
                  <small className="text-muted">1º Venc.: {f.data_primeiro_vencimento || f.data_contratacao || '-'}</small>
                </div>
              </div>
              <div>
                <a className="btn btn-sm btn-outline-primary me-2" onClick={() => navigate(`/financeiro/financiamentos/${f.id}`)}>Ver</a>
                <button className="btn btn-sm btn-outline-secondary" disabled={(gerarMutation as any).isLoading} onClick={() => handleGerarParcelas(f.id)}>Gerar Parcelas</button>
                <button className="btn btn-sm btn-outline-danger ms-1" title="Deletar" onClick={() => setDeleteConfirm({ id: f.id, nome: f.titulo || f.descricao || `#${f.id}` })}>
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
          );
        })}
        {!data || data.length === 0 ? <div className="text-muted mt-2">Nenhum financiamento encontrado.</div> : null}
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
                <p>Excluir financiamento <strong>{deleteConfirm.nome}</strong>?</p>
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

export default FinanciamentosList;
