import React from 'react';
const VencimentosCalendar = React.lazy(() => import('@/pages/financeiro/VencimentosCalendar'));
import { useQuery } from '@tanstack/react-query';
import { Pie, Bar } from 'react-chartjs-2';
import financeiroService from '@/services/financeiro';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { ResumoFinanceiro } from '@/types/financeiro';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard: React.FC = () => {
  const [dataRef, setDataRef] = React.useState<string>('');

  const { data, isLoading, error, refetch, isFetching } = useQuery<ResumoFinanceiro>({
    queryKey: ['financeiro', 'resumo', dataRef],
    queryFn: () => financeiroService.getResumoFinanceiro(dataRef || undefined),
    staleTime: 1000 * 60 * 5, // cache for 5 minutes
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return (
    <div className="alert alert-danger">
      <div><strong>Erro ao carregar resumo financeiro.</strong></div>
      {/* Show helpful debug info when available */}
      {(error as any)?.response?.status && (
        <div className="mt-1"><small>
          Status: {(error as any).response.status} — {(error as any).response.data?.detail ?? JSON.stringify((error as any).response.data)}
        </small></div>
      )}
      <div className="mt-2">
        <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => refetch()} disabled={isFetching}>Tentar novamente</button>
      </div>
    </div>
  );

  const pieData = {
    labels: ['Pendente', 'Pago', 'Atrasado'],
    datasets: [
      {
        data: [data?.vencimentos.total_pendente ?? 0, data?.vencimentos.total_pago ?? 0, data?.vencimentos.total_atrasado ?? 0],
        backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
      },
    ],
  };

  const barData = {
    labels: ['Financiamentos', 'Empréstimos'],
    datasets: [
      {
        label: 'Total Pendente',
        data: [data?.financiamentos.total_pendente ?? 0, data?.emprestimos.total_pendente ?? 0],
        backgroundColor: '#60a5fa',
      },
      {
        label: 'Total (Financiado/Emprestado)',
        data: [data?.financiamentos.total_financiado ?? 0, data?.emprestimos.total_emprestado ?? 0],
        backgroundColor: '#f97316',
      },
    ],
  };

  return (
    <div>
      {/* Compact controls: date selector & refresh */}
      <div className="d-flex justify-content-end align-items-center mb-3">
        <label htmlFor="data_referencia" className="me-2">Data referência</label>
        <input id="data_referencia" type="date" value={dataRef} onChange={(e) => setDataRef(e.target.value)} className="form-control form-control-sm me-2" style={{ width: 160 }} />
        <button className="btn btn-sm btn-outline-primary" onClick={() => refetch()} disabled={isFetching}>Atualizar</button>
      </div>

      <div className="row">
        <div className="col-12 mb-3">
          <div className="card">
            <div className="card-header">Calendário de Vencimentos</div>
            <div className="card-body">
              <React.Suspense fallback={<div className="text-center py-3"><div className="spinner-border spinner-border-sm" role="status"></div></div>}>
                <VencimentosCalendar />
              </React.Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;