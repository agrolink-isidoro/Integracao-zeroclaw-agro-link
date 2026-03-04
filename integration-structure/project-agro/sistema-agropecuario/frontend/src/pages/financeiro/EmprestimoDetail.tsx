import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/useToast';
import type { Emprestimo, ParcelaEmprestimo } from '@/types/financeiro';

const EmprestimoDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const emprestimoId = Number(id || 0);

  const { data: emprestimo, isLoading, error } = useQuery<Emprestimo>({
    queryKey: ['financeiro', 'emprestimo', emprestimoId],
    queryFn: () => financeiroService.getEmprestimoById(emprestimoId),
    enabled: !!emprestimoId,
  });

  const { data: parcelas } = useQuery<ParcelaEmprestimo[]>({
    queryKey: ['financeiro', 'parcelas-emprestimo', emprestimoId],
    queryFn: () => financeiroService.getParcelasEmprestimo({}),
    enabled: !!emprestimoId,
  });

  const { showSuccess, showError } = useToast();

  const handleGerarParcelas = async () => {
    if (!emprestimo) return;
    if (!window.confirm('Confirma gerar parcelas para este empréstimo?')) return;
    try {
      await financeiroService.gerarParcelasEmprestimo(emprestimo.id);
      showSuccess('Parcelas geradas com sucesso');
      qc.invalidateQueries({ queryKey: ['financeiro', 'emprestimos'] });
      qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-emprestimo', emprestimo?.id ?? 0] });
    } catch (err) {
      console.error('Erro ao gerar parcelas', err);
      showError('Erro ao gerar parcelas');
    }
  };

  const handleMarcarPago = async (parcelaId: number) => {
    try {
      await financeiroService.marcarParcelaEmprestimoPago(parcelaId);
      showSuccess('Parcela marcada como paga');
      qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-emprestimo', emprestimoId] });
    } catch (err) {
      console.error('Erro ao marcar parcela paga', err);
      showError('Erro ao marcar parcela como paga');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="alert alert-danger">Erro ao carregar empréstimo</div>;
  if (!emprestimo) return <div className="alert alert-warning">Empréstimo não encontrado</div>;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3>{emprestimo.descricao || `#${emprestimo.id}`}</h3>
          <p className="text-muted mb-0">Valor: R$ {emprestimo.valor_emprestimo}</p>
        </div>
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={() => navigate('/financeiro/emprestimos')}>Voltar</button>
          <button className="btn btn-outline-primary" onClick={handleGerarParcelas}>Gerar Parcelas</button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-8">
          <div className="card mb-3">
            <div className="card-header">Parcelas</div>
            <div className="card-body">
              {parcelas?.length ? (
                <div className="list-group">
                  {parcelas.map(p => (
                    <div key={p.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{p.numero_parcela}</strong>
                        <div><small>Venc: {p.data_vencimento}</small></div>
                      </div>
                      <div>
                        <div>R$ {p.valor_parcela}</div>
                        <div className="mt-2">
                          {p.status !== 'pago' && <button className="btn btn-sm btn-outline-success" onClick={() => handleMarcarPago(p.id)}>Marcar pago</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Nenhuma parcela encontrada.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card">
            <div className="card-header">Resumo</div>
            <div className="card-body">
              <p><strong>Parcelas:</strong> {emprestimo.numero_parcelas}</p>
              <p><strong>Valor total:</strong> R$ {emprestimo.valor_emprestimo}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmprestimoDetail;