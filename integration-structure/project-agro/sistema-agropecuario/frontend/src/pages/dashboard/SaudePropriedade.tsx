import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler, Title,
} from 'chart.js';
import DashboardService from '../../services/dashboard';
import type { FinanceiroKpis, AdministrativoKpis } from '../../services/dashboard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Title);

const fmt = (v: number | undefined) =>
  v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ —';

const fmtPct = (v: number | undefined) =>
  v != null ? `${v.toFixed(1)}%` : '—';

export default function SaudePropriedade() {
  const { data: finData, isLoading: finLoading, isError: finError } = useQuery<FinanceiroKpis>({
    queryKey: ['dashboard-financeiro-kpis-ci'],
    queryFn: () => DashboardService.getFinanceiro(90),
    staleTime: 5 * 60 * 1000,
  });

  const { data: admData, isLoading: admLoading } = useQuery<AdministrativoKpis>({
    queryKey: ['dashboard-administrativo-ci'],
    queryFn: () => DashboardService.getAdministrativo(),
    staleTime: 5 * 60 * 1000,
  });

  const kpis = finData?.kpis;
  const admKpis = admData?.kpis;
  const isLoading = finLoading || admLoading;

  // Fluxo de Caixa chart data
  const fluxoChartData = useMemo(() => {
    const fluxo = finData?.fluxo_caixa_mensal ?? finData?.fluxo_caixa_diario ?? [];
    if (!fluxo.length) return null;
    return {
      labels: fluxo.map((f) => f.date),
      datasets: [
        {
          label: 'Entradas',
          data: fluxo.map((f) => f.entradas),
          borderColor: '#198754',
          backgroundColor: 'rgba(25, 135, 84, 0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Saídas',
          data: fluxo.map((f) => f.saidas),
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Saldo',
          data: fluxo.map((f) => f.saldo),
          borderColor: '#0d6efd',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.3,
        },
      ],
    };
  }, [finData]);

  // Despesas pie data
  const despesasPieData = useMemo(() => {
    if (!admKpis || !kpis) return null;
    const items = [
      { label: 'Folha Pagamento', value: admKpis.folha_mes?.total ?? 0 },
      { label: 'Despesas Adm.', value: admKpis.despesas_administrativas_mes?.total ?? 0 },
      { label: 'Financiamentos', value: kpis.financiamento_total ?? 0 },
      { label: 'Empréstimos', value: kpis.emprestimos_total ?? 0 },
    ].filter(i => i.value > 0);
    if (!items.length) return null;
    return {
      labels: items.map(i => i.label),
      datasets: [{
        data: items.map(i => i.value),
        backgroundColor: ['#198754', '#8B4513', '#ffc107', '#dc3545'],
        borderWidth: 1,
      }],
    };
  }, [kpis, admKpis]);

  // Vencimentos status
  const vencAtrasados = kpis?.vencimentos_atrasados;
  const vencProximos = kpis?.vencimentos_proximos;

  // Dívida ratio indicator (simplified)
  const dividaTotal = (kpis?.financiamento_total ?? 0) + (kpis?.emprestimos_total ?? 0);
  const saldoContas = kpis?.saldo_contas ?? 0;
  const dividaRatio = saldoContas > 0 ? (dividaTotal / saldoContas * 100) : 0;
  const dividaStatus = dividaRatio < 30 ? 'success' : dividaRatio < 60 ? 'warning' : 'danger';

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <Link to="/dashboard/inteligencia" className="text-decoration-none text-muted small">
            <i className="bi bi-arrow-left me-1" />Central de Inteligência
          </Link>
          <h2 className="mb-0 mt-1" style={{ color: '#198754' }}>
            <i className="bi bi-bank me-2" />
            Dados Financeiros
          </h2>
        </div>
        <div className="d-flex gap-2">
          <Link to="/financeiro" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-cash-coin me-1" />Ir ao Financeiro
          </Link>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {finError && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2" />Erro ao carregar dados financeiros.
        </div>
      )}

      {kpis && (
        <>
          {/* KPI Cards — Row 1 */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Saldo Total Contas', value: fmt(kpis.saldo_contas), icon: 'bi-wallet2', color: (kpis.saldo_contas ?? 0) >= 0 ? 'text-success' : 'text-danger' },
              { label: 'Caixa Período (90d)', value: fmt(kpis.caixa_periodo), icon: 'bi-cash-stack', color: (kpis.caixa_periodo ?? 0) >= 0 ? 'text-success' : 'text-danger' },
              { label: 'Dívida Total', value: fmt(dividaTotal), icon: 'bi-credit-card-2-front', color: `text-${dividaStatus}` },
              { label: 'Razão Dívida/Saldo', value: fmtPct(dividaRatio), icon: 'bi-speedometer2', color: `text-${dividaStatus}` },
            ].map((card) => (
              <div key={card.label} className="col-sm-6 col-lg-3">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-1">
                      <i className={`bi ${card.icon} me-2 text-muted`} />
                      <h6 className="card-subtitle text-muted mb-0 small">{card.label}</h6>
                    </div>
                    <h4 className={`card-title mb-0 ${card.color}`}>{card.value}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* KPI Cards — Row 2 */}
          <div className="row g-3 mb-4">
            {[
              { label: 'EBITDA', value: fmt(kpis.ebitda), icon: 'bi-graph-up', color: '' },
              { label: 'Gasto / Hectare', value: fmt(kpis.gasto_por_hectare), icon: 'bi-rulers', color: '' },
              { label: 'Venc. Atrasados', value: `${vencAtrasados?.count ?? 0} (${fmt(vencAtrasados?.total ?? 0)})`, icon: 'bi-exclamation-triangle', color: (vencAtrasados?.count ?? 0) > 0 ? 'text-danger' : 'text-success' },
              { label: 'Venc. Próximos', value: `${vencProximos?.count ?? 0} (${fmt(vencProximos?.total ?? 0)})`, icon: 'bi-calendar-check', color: 'text-warning' },
            ].map((card) => (
              <div key={card.label} className="col-sm-6 col-lg-3">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-1">
                      <i className={`bi ${card.icon} me-2 text-muted`} />
                      <h6 className="card-subtitle text-muted mb-0 small">{card.label}</h6>
                    </div>
                    <h5 className={`card-title mb-0 ${card.color}`}>{card.value}</h5>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Alerta de dívida */}
          {dividaRatio > 50 && (
            <div className="alert alert-warning border-0 d-flex align-items-center mb-4" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2 fs-5" />
              <div>
                <strong>Atenção:</strong> A razão dívida/saldo está em {fmtPct(dividaRatio)} — acima do recomendado (50%).
                Considere renegociar prazos ou reduzir endividamento.
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="row g-3 mb-4">
            {/* Fluxo de Caixa */}
            {fluxoChartData && (
              <div className="col-12 col-lg-7">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0">
                    <h6 className="mb-0"><i className="bi bi-graph-up me-2" />Fluxo de Caixa</h6>
                  </div>
                  <div className="card-body">
                    <Line data={fluxoChartData} options={{
                      responsive: true,
                      interaction: { intersect: false, mode: 'index' },
                      plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12 } },
                        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } },
                      },
                      scales: {
                        y: { ticks: { callback: (v) => `R$ ${Number(v).toLocaleString('pt-BR')}` } },
                        x: { ticks: { maxTicksLimit: 8 } },
                      },
                    }} />
                  </div>
                </div>
              </div>
            )}

            {/* Despesas Breakdown */}
            {despesasPieData && (
              <div className="col-12 col-lg-5">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0">
                    <h6 className="mb-0"><i className="bi bi-pie-chart me-2" />Composição de Despesas</h6>
                  </div>
                  <div className="card-body d-flex justify-content-center align-items-center">
                    <div style={{ maxWidth: 300 }}>
                      <Pie data={despesasPieData} options={{
                        responsive: true,
                        plugins: {
                          legend: { position: 'bottom', labels: { boxWidth: 12 } },
                          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmt(ctx.parsed)}` } },
                        },
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Admin summary */}
          {admKpis && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0">
                <h6 className="mb-0"><i className="bi bi-people me-2" />Resumo Administrativo (Mês)</h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr><th>Item</th><th className="text-end">Qtde</th><th className="text-end">Valor (R$)</th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><i className="bi bi-person-badge me-2" />Funcionários Ativos</td>
                        <td className="text-end">{admKpis.funcionarios?.ativos ?? '—'}</td>
                        <td className="text-end">—</td>
                      </tr>
                      <tr>
                        <td><i className="bi bi-cash me-2" />Folha de Pagamento</td>
                        <td className="text-end">{admKpis.folha_mes?.count ?? '—'}</td>
                        <td className="text-end">{fmt(admKpis.folha_mes?.total)}</td>
                      </tr>
                      <tr>
                        <td><i className="bi bi-receipt me-2" />Despesas Administrativas</td>
                        <td className="text-end">{admKpis.despesas_administrativas_mes?.count ?? '—'}</td>
                        <td className="text-end">{fmt(admKpis.despesas_administrativas_mes?.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Drill-down links */}
          <div className="row g-3">
            <div className="col-sm-6 col-md-3">
              <Link to="/financeiro/vencimentos" className="card border-0 shadow-sm text-decoration-none h-100">
                <div className="card-body text-center py-3">
                  <i className="bi bi-calendar-event fs-3 d-block mb-1" style={{ color: '#198754' }} />
                  <h6 className="mb-0 small">Vencimentos</h6>
                </div>
              </Link>
            </div>
            <div className="col-sm-6 col-md-3">
              <Link to="/financeiro/contas-bancarias" className="card border-0 shadow-sm text-decoration-none h-100">
                <div className="card-body text-center py-3">
                  <i className="bi bi-bank fs-3 d-block mb-1" style={{ color: '#8B4513' }} />
                  <h6 className="mb-0 small">Contas Bancárias</h6>
                </div>
              </Link>
            </div>
            <div className="col-sm-6 col-md-3">
              <Link to="/financeiro/operacoes" className="card border-0 shadow-sm text-decoration-none h-100">
                <div className="card-body text-center py-3">
                  <i className="bi bi-arrow-left-right fs-3 d-block mb-1 text-primary" />
                  <h6 className="mb-0 small">Operações</h6>
                </div>
              </Link>
            </div>
            <div className="col-sm-6 col-md-3">
              <Link to="/financeiro/fluxo-caixa" className="card border-0 shadow-sm text-decoration-none h-100">
                <div className="card-body text-center py-3">
                  <i className="bi bi-graph-up fs-3 d-block mb-1 text-warning" />
                  <h6 className="mb-0 small">Fluxo de Caixa</h6>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
