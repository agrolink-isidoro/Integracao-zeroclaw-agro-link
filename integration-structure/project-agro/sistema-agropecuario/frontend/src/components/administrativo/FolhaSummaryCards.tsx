import React, { useEffect } from 'react';
import { useApiQuery } from '@/hooks/useApi';

const currency = (v: number) => `R$ ${Number(v).toFixed(3)}`;

const gradients: Record<string, string> = {
  info: 'linear-gradient(90deg,#00c6ff 0%,#0072ff 100%)',
  danger: 'linear-gradient(90deg,#ff6a00 0%,#ee0979 100%)',
  success: 'linear-gradient(90deg,#00b09b 0%,#96c93d 100%)'
};

const Card: React.FC<{ title: string; value: number; color: string; icon: string; subtitle?: string; ratio?: number }> = ({ title, value, color, icon, subtitle, ratio }) => (
  <div className={`card text-white mb-3`} style={{ minWidth: 180, background: gradients[color] || gradients.info }}>
    <div className="card-body">
      <div className="d-flex align-items-center">
        <div className="flex-grow-1">
          <small className="d-block opacity-75">{title}</small>
          <div className="h5 mb-1">{currency(value || 0)}</div>
          {subtitle && <small className="opacity-75">{subtitle}</small>}
        </div>
        <div className="ms-3">
          <i className={`${icon} fs-3`} style={{ opacity: 0.95 }} aria-hidden="true"></i>
        </div>
      </div>
      {typeof ratio === 'number' && (
        <div className="progress mt-3" style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }}>
          <div className="progress-bar bg-white" role="progressbar" style={{ width: `${Math.min(Math.max(ratio * 100, 0), 100)}%`, opacity: 0.9 }} aria-valuenow={Math.round((ratio || 0) * 100)} aria-valuemin={0} aria-valuemax={100}></div>
        </div>
      )}
    </div>
  </div>
);

const FolhaSummaryCards: React.FC = () => {
  const { data, isLoading, refetch } = useApiQuery<any>(['folha', 'summary'], '/administrativo/folha-pagamento/summary/');

  useEffect(() => {
    // ensure we have fresh summary on mount
    refetch();
  }, [refetch]);

  const totalHorasExtra = Number(data?.total_horas_extra_cost || 0);
  const totalInss = Number(data?.total_inss || 0);
  const totalFolha = Number(data?.total_folha || 0);

  const inssRatio = totalFolha ? totalInss / totalFolha : 0;
  const extraRatio = totalFolha ? totalHorasExtra / totalFolha : 0;

  return (
    <div>
      <div className="mb-3">
        <h5 className="mb-0">Folha (mês anterior)</h5>
        <small className="text-muted">Resumo rápido — dados agregados</small>
      </div>
      <div className="d-grid gap-2">
        <Card title="Custo Horas Extras" value={totalHorasExtra} color="info" icon="bi bi-clock-history" subtitle="Impacto em horas extras" ratio={extraRatio} />
        <Card title="Descontos INSS" value={totalInss} color="danger" icon="bi bi-shield-lock" subtitle="Percentual da folha" ratio={inssRatio} />
        <Card title="Total Folha" value={totalFolha} color="success" icon="bi bi-cash-stack" subtitle="Total líquido pago" />
      </div>
      <div className="mt-2">
        <button className="btn btn-sm btn-outline-light" aria-label="Atualizar resumo da folha" onClick={() => refetch()} disabled={isLoading}>{isLoading ? 'Atualizando...' : 'Atualizar'}</button>
      </div>
    </div>
  );
};

export default FolhaSummaryCards;
