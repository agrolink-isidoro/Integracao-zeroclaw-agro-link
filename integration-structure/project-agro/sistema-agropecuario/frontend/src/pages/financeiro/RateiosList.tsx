import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import type { RateioCusto } from '@/types/financeiro';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const DESTINO_LABEL: Record<string, string> = {
  operacional: 'Operacional',
  manutencao: 'Manutenção',
  combustivel: 'Combustível',
  despesa_adm: 'Desp. Adm.',
  investimento: 'Investimento',
  benfeitoria: 'Benfeitoria',
  financeiro: 'Financeiro',
};

const DESTINO_COLOR: Record<string, string> = {
  operacional: 'success',
  manutencao: 'warning',
  combustivel: 'info',
  despesa_adm: 'secondary',
  investimento: 'primary',
  benfeitoria: 'dark',
  financeiro: 'danger',
};

function formatCurrency(value: number | string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}

const RateioCard: React.FC<{
  rateio: RateioCusto;
  onApprove?: (approvalId: number) => void;
  onReject?: (approvalId: number) => void;
  isPending?: boolean;
  approving?: boolean;
}> = ({ rateio, onApprove, isPending, approving }) => {
  const rateioNum = String(rateio.id).padStart(4, '0');
  const destino = rateio.destino || 'operacional';

  return (
    <div className={`card mb-2 border-start border-4 border-${DESTINO_COLOR[destino] || 'secondary'}`}>
      <div className="card-body py-2 px-3">
        <div className="row align-items-center g-2">
          {/* Number + title */}
          <div className="col-12 col-md-5">
            <div className="d-flex align-items-start gap-2">
              <span className="badge bg-secondary font-monospace">#{rateioNum}</span>
              <div>
                <div className="fw-semibold lh-sm">{rateio.titulo}</div>
                {rateio.descricao && (
                  <small className="text-muted">{rateio.descricao}</small>
                )}
                {rateio.origem_display && (
                  <small className="text-muted d-block">
                    <i className="bi bi-link-45deg me-1"></i>
                    {rateio.origem_display}
                  </small>
                )}
              </div>
            </div>
          </div>

          {/* Destino + data */}
          <div className="col-6 col-md-2">
            <span className={`badge bg-${DESTINO_COLOR[destino] || 'secondary'} bg-opacity-10 text-${DESTINO_COLOR[destino] || 'secondary'} border border-${DESTINO_COLOR[destino] || 'secondary'} border-opacity-25`}>
              {DESTINO_LABEL[destino] || destino}
            </span>
            <div className="small text-muted mt-1">{formatDate(rateio.data_rateio)}</div>
          </div>

          {/* Value */}
          <div className="col-6 col-md-2 text-end text-md-start">
            <span className="fw-bold text-dark">{formatCurrency(rateio.valor_total)}</span>
            {rateio.area_total_hectares && (
              <div className="small text-muted">{Number(rateio.area_total_hectares).toFixed(2)} ha</div>
            )}
          </div>

          {/* Status / Actions */}
          <div className="col-12 col-md-3 d-flex align-items-center justify-content-md-end gap-2">
            {isPending ? (
              <>
                {rateio.approval_id ? (
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => onApprove?.(rateio.approval_id!)}
                    disabled={approving}
                    title="Confirmar / Aprovar rateio"
                  >
                    {approving ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : (
                      <i className="bi bi-check-circle me-1"></i>
                    )}
                    Confirmar
                  </button>
                ) : (
                  <span className="badge bg-warning text-dark">
                    <i className="bi bi-exclamation-triangle me-1"></i>Sem aprovação
                  </span>
                )}
              </>
            ) : (
              <div className="text-end">
                <span className="badge bg-success">
                  <i className="bi bi-check-circle me-1"></i>Aprovado
                </span>
                {rateio.approval_aprovado_em && (
                  <div className="small text-muted mt-1">
                    {rateio.approval_aprovado_por_nome && (
                      <span>{rateio.approval_aprovado_por_nome} — </span>
                    )}
                    {new Date(rateio.approval_aprovado_em).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const RateiosList: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pendentes' | 'aprovados'>('pendentes');
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const { data = [], isLoading, error } = useQuery<RateioCusto[]>({
    queryKey: ['financeiro', 'rateios'],
    queryFn: () => financeiroService.getRateios(),
  });

  const approveMutation = useMutation({
    mutationFn: (approvalId: number) => financeiroService.approveRateio(approvalId),
    onMutate: (approvalId) => setApprovingId(approvalId),
    onSettled: () => {
      setApprovingId(null);
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'rateios'] });
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="alert alert-danger">Erro ao carregar rateios</div>;

  const pendentes = data.filter(r => r.approval_status === 'pending' || r.approval_status === null);
  const aprovados = data.filter(r => r.approval_status === 'approved');
  const rejeitados = data.filter(r => r.approval_status === 'rejected');

  const totalPendente = pendentes.reduce((s, r) => s + Number(r.valor_total), 0);
  const totalAprovado = aprovados.reduce((s, r) => s + Number(r.valor_total), 0);

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0">
            <i className="bi bi-diagram-3 me-2 text-primary"></i>
            Rateios de Custo
          </h4>
          <small className="text-muted">{data.length} rateio(s) total</small>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => window.location.href = '/financeiro/rateios/create'}
        >
          <i className="bi bi-plus-circle me-1"></i>Novo Rateio
        </button>
      </div>

      {/* Summaries */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-md-4">
          <div className="card border-warning">
            <div className="card-body text-center py-2">
              <div className="h5 mb-0 text-warning fw-bold">{pendentes.length}</div>
              <div className="small text-muted">Pendentes</div>
              <div className="fw-semibold">{formatCurrency(totalPendente)}</div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-md-4">
          <div className="card border-success">
            <div className="card-body text-center py-2">
              <div className="h5 mb-0 text-success fw-bold">{aprovados.length}</div>
              <div className="small text-muted">Aprovados</div>
              <div className="fw-semibold">{formatCurrency(totalAprovado)}</div>
            </div>
          </div>
        </div>
        {rejeitados.length > 0 && (
          <div className="col-sm-6 col-md-4">
            <div className="card border-danger">
              <div className="card-body text-center py-2">
                <div className="h5 mb-0 text-danger fw-bold">{rejeitados.length}</div>
                <div className="small text-muted">Rejeitados</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'pendentes' ? 'active' : ''}`}
            onClick={() => setActiveTab('pendentes')}
          >
            <i className="bi bi-hourglass-split me-1 text-warning"></i>
            Pendentes
            {pendentes.length > 0 && (
              <span className="badge bg-warning text-dark ms-2">{pendentes.length}</span>
            )}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'aprovados' ? 'active' : ''}`}
            onClick={() => setActiveTab('aprovados')}
          >
            <i className="bi bi-check-circle me-1 text-success"></i>
            Confirmados
            {aprovados.length > 0 && (
              <span className="badge bg-success ms-2">{aprovados.length}</span>
            )}
          </button>
        </li>
      </ul>

      {/* Content */}
      {activeTab === 'pendentes' && (
        <div>
          {pendentes.length === 0 ? (
            <div className="alert alert-success d-flex align-items-center gap-2">
              <i className="bi bi-check-circle-fill fs-5"></i>
              <span>Nenhum rateio pendente de confirmação.</span>
            </div>
          ) : (
            <>
              <div className="alert alert-warning d-flex align-items-center gap-2 py-2">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <span>
                  <strong>{pendentes.length} rateio(s)</strong> aguardando confirmação —{' '}
                  total de {formatCurrency(totalPendente)}.
                </span>
              </div>
              {pendentes.map(r => (
                <RateioCard
                  key={r.id}
                  rateio={r}
                  isPending
                  onApprove={(approvalId) => approveMutation.mutate(approvalId)}
                  approving={approvingId === r.approval_id}
                />
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'aprovados' && (
        <div>
          {aprovados.length === 0 ? (
            <div className="alert alert-info">Nenhum rateio confirmado ainda.</div>
          ) : (
            aprovados.map(r => (
              <RateioCard key={r.id} rateio={r} isPending={false} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RateiosList;

