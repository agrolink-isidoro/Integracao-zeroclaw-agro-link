import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/useToast';
import type { Financiamento, ParcelaFinanciamento } from '@/types/financeiro';

const FinanciamentoDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const financiamentoId = Number(id || 0);

  const { data: financiamento, isLoading, error } = useQuery<Financiamento>({
    queryKey: ['financeiro', 'financiamento', financiamentoId],
    queryFn: () => financeiroService.getFinanciamentoById(financiamentoId),
    enabled: !!financiamentoId,
  });

  const { data: parcelas } = useQuery<ParcelaFinanciamento[]>({
    queryKey: ['financeiro', 'parcelas-financiamento', financiamentoId],
    queryFn: () => financeiroService.getParcelasFinanciamento({}),
    enabled: !!financiamentoId,
  });

  const { showSuccess, showError } = useToast();

  const handleGerarParcelas = async () => {
    if (!financiamento) return;
    if (!window.confirm('Confirma gerar parcelas para este financiamento?')) return;
    try {
      await financeiroService.gerarParcelasFinanciamento(financiamento.id);
      showSuccess('Parcelas geradas com sucesso');
      qc.invalidateQueries({ queryKey: ['financeiro', 'financiamentos'] });
      qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-financiamento', financiamento?.id ?? 0] });
    } catch (err) {
      console.error('Erro ao gerar parcelas', err);
      showError('Erro ao gerar parcelas');
    }
  };

  const handleMarcarPago = async (parcelaId: number) => {
    try {
      await financeiroService.marcarParcelaFinanciamentoPago(parcelaId);
      showSuccess('Parcela marcada como paga');
      qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-financiamento', financiamentoId] });
    } catch (err) {
      console.error('Erro ao marcar parcela paga', err);
      showError('Erro ao marcar parcela como paga');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="alert alert-danger">Erro ao carregar financiamento</div>;
  if (!financiamento) return <div className="alert alert-warning">Financiamento não encontrado</div>;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3>{financiamento.descricao || `#${financiamento.id}`}</h3>
          <p className="text-muted mb-0">Valor: R$ {financiamento.valor_financiado}</p>
        </div>
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={() => navigate('/financeiro/financiamentos')}>Voltar</button>
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
              <p><strong>Parcelas:</strong> {financiamento.numero_parcelas}</p>
              <p><strong>Valor financiado:</strong> R$ {financiamento.valor_financiado}</p>
              <p><strong>Taxa de juros:</strong> {financiamento.taxa_juros}% / {financiamento.frequencia_taxa}</p>
              <p><strong>1º vencimento:</strong> {financiamento.data_primeiro_vencimento || '—'}</p>
              <p><strong>Prazo (meses):</strong> {financiamento.prazo_meses}</p>
              <p><strong>Carência (meses):</strong> {(financiamento as any).carencia_meses ?? 0} {((financiamento as any).juros_embutidos) ? '• Juros embutidos' : ''}</p>
              <p><strong>Tipo:</strong> {financiamento.tipo_financiamento}</p>
              <p><strong>Nº contrato:</strong> {financiamento.numero_contrato || '—'}</p>
              {/* compute juros acumulado if parcelas are present, otherwise estimate */}
              <p><strong>Juros acumulado (parcelas):</strong> {parcelas && parcelas.length ? parcelas.reduce((s, p) => s + (Number((p as any).juros) || 0), 0).toFixed(2) : (() => {
                const est = (Number(financiamento.valor_financiado) || 0) * ((Number(financiamento.taxa_juros) || 0) / 100) * ((Number(financiamento.prazo_meses) || 0) / 12);
                return est.toFixed(2);
              })()}</p>
              <p><strong>Valor total estimado (principal + juros):</strong> R$ {((Number(financiamento.valor_financiado) || 0) + (parcelas && parcelas.length ? parcelas.reduce((s, p) => s + (Number((p as any).juros) || 0), 0) : ((Number(financiamento.valor_financiado) || 0) * ((Number(financiamento.taxa_juros) || 0) / 100) * ((Number(financiamento.prazo_meses) || 0) / 12)))).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanciamentoDetail;