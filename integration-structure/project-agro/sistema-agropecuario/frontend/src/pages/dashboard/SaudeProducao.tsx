import React, { useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, Pie } from 'react-chartjs-2';
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
import KpisService from '../../services/kpis';
import type { PlantioListItem } from '../../services/kpis';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import type { SafraKPIs } from '../../types/kpis';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CATEGORY_COLORS = [
  '#1a7340',
  '#2d6a4f',
  '#40916c',
  '#52b788',
  '#74c69d',
  '#95d5b2',
  '#b7e4c7',
  '#0d5c32',
  '#155d27',
  '#081c15',
];

export default function SaudeProducao() {
  const [searchParams, setSearchParams] = useSearchParams();

  const safraId = useMemo(() => {
    const raw = searchParams.get('safraId');
    return raw ? Number(raw) : null;
  }, [searchParams]);

  const { data: safras = [], isLoading: loadingSafras } = useQuery<PlantioListItem[]>({
    queryKey: ['safras-list'],
    queryFn: () => KpisService.listSafras(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: kpis, isLoading, isError, error } = useQuery<SafraKPIs>({
    queryKey: ['safra-kpis', safraId],
    queryFn: () => KpisService.getSafraKPIs(safraId!),
    enabled: !!safraId,
    staleTime: 5 * 60 * 1000,
  });

  const handleSafraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSearchParams(val ? { safraId: val } : {});
  };

  const pieData = useMemo(() => {
    if (!kpis?.costs_by_category?.length) return null;
    return {
      labels: kpis.costs_by_category.map((c) => c.category),
      datasets: [{
        data: kpis.costs_by_category.map((c) => c.total),
        backgroundColor: kpis.costs_by_category.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
        borderWidth: 1,
      }],
    };
  }, [kpis]);

  const barData = useMemo(() => {
    if (!kpis?.costs_by_category?.length) return null;
    return {
      labels: kpis.costs_by_category.map((c) => c.category),
      datasets: [{
        label: 'R$/ha',
        data: kpis.costs_by_category.map((c) => c.per_ha),
        backgroundColor: kpis.costs_by_category.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
      }],
    };
  }, [kpis]);

  const safraInfo = useMemo(() => safras.find((s) => s.id === safraId), [safras, safraId]);

  // Auto-select most relevant safra when user visits the production page without a query param.
  useEffect(() => {
    if (safras.length === 0) return;
    if (safraId) return; // user already selected

    // Prefer an active/ongoing safra, otherwise pick the most recent by plantio date
    const inProgress = safras.find((s) => s.status === 'em_andamento');
    const mostRecent = safras.reduce((a, b) => {
      const da = new Date(a.data_plantio || 0).getTime();
      const db = new Date(b.data_plantio || 0).getTime();
      return db > da ? b : a;
    }, safras[0]);

    const defaultSafra = inProgress ?? mostRecent ?? safras[0];
    // set query param so subsequent KPI query runs
    setSearchParams({ safraId: String(defaultSafra.id) });
  }, [safras, safraId, setSearchParams]);

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <Link to="/dashboard/inteligencia" className="text-decoration-none text-muted small">
            <i className="bi bi-arrow-left me-1" />Central de Inteligência
          </Link>
          <h2 className="mb-0 mt-1" style={{ color: '#2d6a4f' }}>
            <i className="bi bi-graph-up me-2" />
            Dados de Produção
          </h2>
        </div>
      </div>

      {/* Safra Selector */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderLeft: '4px solid #198754' }}>
        <div className="card-body py-3">
          <div className="row align-items-center">
            <div className="col-auto">
              <label htmlFor="safra-select" className="form-label mb-0 fw-semibold">
                <i className="bi bi-tree me-1" />Safra
              </label>
            </div>
            <div className="col-sm-6 col-md-4">
              <select id="safra-select" className="form-select form-select-sm" value={safraId ?? ''} onChange={handleSafraChange} disabled={loadingSafras}>
                <option value="">— Selecione uma safra —</option>
                {safras.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome_safra || s.cultura_nome} — {s.fazenda_nome} ({s.status})
                  </option>
                ))}
              </select>
            </div>
            {safraInfo && (
              <div className="col-auto text-muted small">
                Plantio: {safraInfo.data_plantio} | Área: {safraInfo.area_total_ha} ha
              </div>
            )}
          </div>
        </div>
      </div>

      {!safraId && !loadingSafras && (
        <div className="alert alert-info border-0" style={{ backgroundColor: '#d1e7dd' }}>
          <i className="bi bi-info-circle me-2" />
          Selecione uma safra acima para visualizar os KPIs de produção.
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      {isError && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2" />
          Erro ao carregar KPIs: {(error as Error)?.message ?? 'Erro desconhecido'}
        </div>
      )}

      {kpis && (
        <>
          {/* KPI Cards — Primary */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Custo Total', value: fmt(kpis.custo_total), icon: 'bi-cash-stack', color: '' },
              { label: 'Custo / ha', value: fmt(kpis.custo_por_ha), icon: 'bi-rulers', color: '' },
              {
                label: 'Produtividade',
                value: kpis.unidade_producao === 'saca_60kg'
                  ? `${(kpis.produtividade_display ?? kpis.produtividade_t_ha).toFixed(1)} sc/ha`
                  : kpis.unidade_producao === 'kg'
                    ? `${kpis.produtividade_t_ha.toFixed(1)} kg/ha`
                    : `${kpis.produtividade_t_ha.toFixed(2)} t/ha`,
                icon: 'bi-graph-up-arrow', color: '',
              },
              { label: 'Margem Bruta', value: `${kpis.margem_bruta_pct.toFixed(1)}%`, icon: 'bi-percent', color: kpis.margem_bruta_pct >= 0 ? 'text-success' : 'text-danger' },
            ].map((card) => (
              <div key={card.label} className="col-sm-6 col-lg-3">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-1">
                      <i className={`bi ${card.icon} me-2 text-muted`} />
                      <h6 className="card-subtitle text-muted mb-0">{card.label}</h6>
                    </div>
                    <h4 className={`card-title mb-0 ${card.color}`}>{card.value}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* KPI Cards — Secondary */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Área (ha)', value: kpis.area_ha.toFixed(1), icon: 'bi-map', color: '' },
              {
                label: kpis.unidade_producao === 'saca_60kg' ? 'Produção (sacas)' : 'Produção (t)',
                value: kpis.unidade_producao === 'saca_60kg'
                  ? `${(kpis.producao_sacas ?? 0).toFixed(0)} sc`
                  : `${kpis.producao_t.toFixed(1)} t`,
                icon: 'bi-box-fill', color: '',
              },
              { label: 'Preço Médio (R$/t)', value: fmt(kpis.preco_medio_r_ton), icon: 'bi-tag', color: '' },
              { label: 'Custo / Tonelada', value: fmt(kpis.custo_por_ton), icon: 'bi-box-seam', color: '' },
            ].map((card) => (
              <div key={card.label} className="col-sm-6 col-lg-3">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-1">
                      <i className={`bi ${card.icon} me-2 text-muted`} />
                      <h6 className="card-subtitle text-muted mb-0">{card.label}</h6>
                    </div>
                    <h5 className={`card-title mb-0 ${card.color}`}>{card.value}</h5>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sessões de Colheita e Transporte */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-0">
              <h6 className="mb-0"><i className="bi bi-truck me-2" />Colheita e Logística (Sessões)</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6 col-md-3 text-center">
                  <small className="text-muted d-block">Carregamentos</small>
                  <h5 className="mb-0">{kpis.carregamentos_count ?? 0}</h5>
                </div>
                <div className="col-6 col-md-3 text-center">
                  <small className="text-muted d-block">Volume Colhido (sessões)</small>
                  <h5 className="mb-0">
                    {kpis.unidade_producao === 'saca_60kg'
                      ? `${(((kpis.producao_session_kg ?? 0) / 60)).toFixed(0)} sc`
                      : `${((kpis.producao_session_kg ?? 0) / 1000).toFixed(1)} t`}
                  </h5>
                </div>
                <div className="col-6 col-md-3 text-center">
                  <small className="text-muted d-block">Volume (Colheitas registradas)</small>
                  <h5 className="mb-0">
                    {kpis.unidade_producao === 'saca_60kg'
                      ? `${(((kpis.producao_colheita_kg ?? 0) / 60)).toFixed(0)} sc`
                      : `${((kpis.producao_colheita_kg ?? 0) / 1000).toFixed(1)} t`}
                  </h5>
                </div>
                <div className="col-6 col-md-3 text-center">
                  <small className="text-muted d-block">Custo de Transporte</small>
                  <h5 className="mb-0 text-warning">{fmt(kpis.custo_transporte_total ?? 0)}</h5>
                </div>
              </div>
              {(kpis.custo_transporte_total ?? 0) > 0 && kpis.producao_t > 0 && (
                <div className="mt-3 text-muted small">
                  <i className="bi bi-info-circle me-1" />
                  Custo médio de transporte: {fmt((kpis.custo_transporte_total ?? 0) / kpis.producao_t)} / t
                  {kpis.area_ha > 0 && ` • ${fmt((kpis.custo_transporte_total ?? 0) / kpis.area_ha)} / ha`}
                </div>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="row g-3 mb-4">
            {pieData && (
              <div className="col-12 col-md-5">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0"><h6 className="mb-0"><i className="bi bi-pie-chart me-2" />Distribuição de Custos</h6></div>
                  <div className="card-body d-flex justify-content-center align-items-center">
                    <div style={{ maxWidth: 300 }}>
                      <Pie data={pieData} options={{
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
            {barData && (
              <div className="col-12 col-md-7">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0"><h6 className="mb-0"><i className="bi bi-bar-chart me-2" />Custo por ha — Categorias</h6></div>
                  <div className="card-body">
                    <Bar data={barData} options={{
                      responsive: true,
                      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${fmt(ctx.parsed.y ?? 0)} /ha` } } },
                      scales: { y: { beginAtZero: true, ticks: { callback: (v) => `R$ ${v}` } } },
                    }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table breakdown */}
          {kpis.costs_by_category.length > 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white d-flex justify-content-between align-items-center border-0">
                <h6 className="mb-0"><i className="bi bi-table me-2" />Detalhamento por Categoria</h6>
                <span className="badge" style={{ backgroundColor: '#198754' }}>{kpis.costs_by_category.length} categorias</span>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr><th>Categoria</th><th className="text-end">Total (R$)</th><th className="text-end">Por ha (R$/ha)</th><th className="text-end">% do custo</th></tr>
                    </thead>
                    <tbody>
                      {kpis.costs_by_category.map((c) => (
                        <tr key={c.category}>
                          <td>{c.category}</td>
                          <td className="text-end">{fmt(c.total)}</td>
                          <td className="text-end">{fmt(c.per_ha)}</td>
                          <td className="text-end">{kpis.custo_total ? ((c.total / kpis.custo_total) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr><td>Total</td><td className="text-end">{fmt(kpis.custo_total)}</td><td className="text-end">{fmt(kpis.custo_por_ha)}</td><td className="text-end">100%</td></tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Drill-down links */}
          <div className="row g-3">
            <div className="col-sm-6 col-md-4">
              <Link to={`/financeiro/rateios?safra=${safraId}`} className="card border-0 shadow-sm text-decoration-none h-100">
                <div className="card-body text-center py-4">
                  <i className="bi bi-receipt-cutoff fs-2 d-block mb-2" style={{ color: '#198754' }} />
                  <h6 className="mb-1">Rateios da Safra</h6>
                  <small className="text-muted">{kpis.rateios_pendentes} pendente{kpis.rateios_pendentes !== 1 ? 's' : ''}</small>
                </div>
              </Link>
            </div>
            <div className="col-sm-6 col-md-4">
              <Link to="/financeiro/vencimentos" className="card border-0 shadow-sm text-decoration-none h-100">
                <div className="card-body text-center py-4">
                  <i className="bi bi-calendar-event fs-2 text-warning d-block mb-2" />
                  <h6 className="mb-1">Vencimentos</h6>
                  <small className="text-muted">{fmt(kpis.vencimentos_pendentes)} pendentes</small>
                </div>
              </Link>
            </div>
            <div className="col-sm-6 col-md-4">
              <Link to="/agricultura/safras" className="card border-0 shadow-sm text-decoration-none h-100">
                <div className="card-body text-center py-4">
                  <i className="bi bi-tree fs-2 d-block mb-2" style={{ color: '#2d6a4f' }} />
                  <h6 className="mb-1">Detalhe da Safra</h6>
                  <small className="text-muted">
                    {kpis.unidade_producao === 'saca_60kg'
                      ? `${(kpis.producao_sacas ?? 0).toFixed(0)} sacas produzidas`
                      : `${kpis.producao_t.toFixed(1)} t produzidas`}
                  </small>
                </div>
              </Link>
            </div>
            <div className="col-sm-6 col-md-4">
              <Link to="/agricultura/colheitas" className="card border-0 shadow-sm text-decoration-none h-100">
                <div className="card-body text-center py-4">
                  <i className="bi bi-truck fs-2 d-block mb-2" style={{ color: '#8B4513' }} />
                  <h6 className="mb-1">Sessões de Colheita</h6>
                  <small className="text-muted">
                    {(kpis.carregamentos_count ?? 0) > 0
                      ? `${kpis.carregamentos_count} carregamento${(kpis.carregamentos_count ?? 0) !== 1 ? 's' : ''}`
                      : 'Ver sessões'}
                  </small>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
