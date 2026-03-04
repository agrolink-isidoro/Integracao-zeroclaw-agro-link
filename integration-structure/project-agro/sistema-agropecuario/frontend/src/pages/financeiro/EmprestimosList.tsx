import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import type { Emprestimo } from '@/types/financeiro';
import EmprestimoCreate from '@/pages/financeiro/EmprestimoCreate';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toCSV, downloadCSV } from '@/utils/csv';
import { useToast } from '@/hooks/useToast';

const EmprestimosList: React.FC = () => {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
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
            <div>
              <a className="btn btn-sm btn-outline-primary me-2" href={`/financeiro/emprestimos/${e.id}`}>Ver</a>
              <button className="btn btn-sm btn-outline-secondary" disabled={(gerarMutation as any).isLoading} onClick={() => handleGerarParcelas(e.id)}>Gerar Parcelas</button>
            </div>
          </div>
        ))}
        {!data || data.length === 0 ? <div className="text-muted mt-2">Nenhum empréstimo encontrado.</div> : null}
      </div>
    </div>
  );
};

export default EmprestimosList;
