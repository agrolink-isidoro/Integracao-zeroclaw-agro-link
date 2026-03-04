import React, { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import OperacoesList from '../components/agricultura/OperacoesList';
import DashboardService from '../services/dashboard';
import type { AgriculturaKpis } from '../services/dashboard';
import { formatCurrency } from '../utils/formatters';

const SafrasList = lazy(() => import('./agricultura/SafrasList'));
const CulturasList = lazy(() => import('./agricultura/CulturasList'));
const ColheitasList = lazy(() => import('./agricultura/ColheitasList'));

const Agricultura: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.split('/')[2] || 'dashboard';

  const { data: dash, isLoading } = useQuery<AgriculturaKpis>({
    queryKey: ['dashboard-agricultura'],
    queryFn: () => DashboardService.getAgricultura(),
    staleTime: 30_000,
    enabled: activeTab === 'dashboard',
  });
  const kpis = dash?.kpis;

  const fmt = (n: number | undefined) => n != null ? n.toLocaleString('pt-BR') : '—';
  const fmtDec = (n: number | undefined) => n != null ? n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—';

  const pctProd = kpis && kpis.producao_estimada_sacas_60kg > 0
    ? ((kpis.producao_real_sacas_60kg / kpis.producao_estimada_sacas_60kg) * 100)
    : null;

  const renderDashboard = () => (
    <div className="row">
      {/* KPI Cards */}
      <div className="col-lg-3 col-md-6 mb-4">
        <div className="card border-start border-primary border-4 h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="bi bi-calendar-event fs-2 text-primary flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Plantios Ativos</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-4"></span> : fmt(kpis?.plantios_ativos)}
                </h4>
                <small className="text-muted">{kpis ? `${fmt(kpis.plantios_ano)} no ano` : ''}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6 mb-4">
        <div className="card border-start border-success border-4 h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="bi bi-box-seam fs-2 text-success flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Produção Real</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-6"></span> : `${fmtDec(kpis?.producao_real_sacas_60kg)} sc`}
                </h4>
                <small className="text-muted">{kpis ? `${fmtDec(kpis.producao_real_kg)} kg` : ''}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6 mb-4">
        <div className="card border-start border-warning border-4 h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="bi bi-clipboard-check fs-2 text-warning flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Produção Estimada</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-6"></span> : `${fmtDec(kpis?.producao_estimada_sacas_60kg)} sc`}
                </h4>
                <small className="text-muted">{kpis ? `${fmtDec(kpis.producao_estimada_kg)} kg` : ''}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6 mb-4">
        <div className="card border-start border-info border-4 h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="bi bi-trophy fs-2 text-info flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Colheitas no Ano</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-4"></span> : fmt(kpis?.colheitas_ano)}
                </h4>
                <small className={pctProd != null ? (pctProd >= 100 ? 'text-success' : 'text-warning') : 'text-muted'}>
                  {pctProd != null ? `${pctProd.toFixed(0)}% da meta atingida` : ''}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Produção por Talhão */}
      <div className="col-lg-8 mb-4">
        <div className="card h-100">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-bar-chart me-2"></i>Produção por Talhão (sacas 60kg)</h5>
            <button className="btn btn-sm btn-outline-primary" onClick={() => navigate('/agricultura/colheitas')}>
              <i className="bi bi-arrow-right me-1"></i> Ver colheitas
            </button>
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="text-center py-4"><div className="spinner-border spinner-border-sm" role="status"></div></div>
            ) : dash?.peso_por_talhao && dash.peso_por_talhao.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Talhão</th>
                      <th className="text-end">Sacas (60kg)</th>
                      <th className="text-end">Peso (kg)</th>
                      <th style={{ width: '30%' }}>Proporção</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash.peso_por_talhao.slice(0, 8).map((t) => {
                      const maxSacas = Math.max(...dash.peso_por_talhao.map(x => x.total_sacas_60kg), 1);
                      const pct = (t.total_sacas_60kg / maxSacas) * 100;
                      return (
                        <tr key={t.talhao_id}>
                          <td>{t.talhao_nome}</td>
                          <td className="text-end fw-semibold">{fmtDec(t.total_sacas_60kg)}</td>
                          <td className="text-end text-muted">{fmtDec(t.total_kg)}</td>
                          <td>
                            <div className="progress" style={{ height: '8px' }}>
                              <div className="progress-bar bg-success" style={{ width: `${pct}%` }}></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted mb-0">Nenhuma produção registrada ainda.</p>
            )}
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="col-lg-4 mb-4">
        <div className="card h-100">
          <div className="card-header">
            <h5 className="mb-0"><i className="bi bi-lightning me-2"></i>Ações Rápidas</h5>
          </div>
          <div className="card-body">
            <div className="d-grid gap-2">
              <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/agricultura/safras')}>
                <i className="bi bi-calendar-event me-2"></i> Gerenciar Safras
              </button>
              <button className="btn btn-outline-success btn-sm" onClick={() => navigate('/agricultura/operacoes')}>
                <i className="bi bi-list-check me-2"></i> Gerenciar Operações
              </button>
              <button className="btn btn-outline-info btn-sm" onClick={() => navigate('/agricultura/culturas')}>
                <i className="bi bi-flower1 me-2"></i> Gerenciar Culturas
              </button>
              <button className="btn btn-outline-warning btn-sm" onClick={() => navigate('/agricultura/colheitas')}>
                <i className="bi bi-box-seam me-2"></i> Gerenciar Colheitas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'operacoes':
        return (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Operações Agrícolas</h5>
            </div>
            <OperacoesList />
          </div>
        );
      case 'safras':
        return (
          <Suspense fallback={<div className="text-center py-4"><div className="spinner-border" role="status"></div></div>}>
            <SafrasList />
          </Suspense>
        );
      case 'culturas':
        return (
          <Suspense fallback={<div className="text-center py-4"><div className="spinner-border" role="status"></div></div>}>
            <CulturasList />
          </Suspense>
        );
      case 'colheitas':
        return (
          <Suspense fallback={<div className="text-center py-4"><div className="spinner-border" role="status"></div></div>}>
            <ColheitasList />
          </Suspense>
        );
      case 'relatorios':
        return (
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Relatórios</h5>
            </div>
            <div className="card-body">
              <p className="text-muted">Módulo de relatórios em desenvolvimento...</p>
            </div>
          </div>
        );
      default:
        return renderDashboard();
    }
  };

  return <>{renderContent()}</>;
};

export default Agricultura;