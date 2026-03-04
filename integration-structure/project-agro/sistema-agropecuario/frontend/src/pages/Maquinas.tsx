import React, { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import EquipamentosList from '../components/maquinas/EquipamentosList';
import DashboardService from '../services/dashboard';
import { formatCurrency } from '../utils/formatters';

const Manutencao = lazy(() => import('./Manutencao'));
const Abastecimentos = lazy(() => import('./maquinas/Abastecimentos'));

const Maquinas: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.split('/')[2] || 'dashboard';

  const { data: equipKpis, isLoading: loadEq } = useQuery({
    queryKey: ['maquinas-dashboard-equip'],
    queryFn: () => DashboardService.getMaquinasEquipamentos(),
    staleTime: 30_000,
    enabled: activeTab === 'dashboard',
  });

  const { data: abastKpis, isLoading: loadAb } = useQuery({
    queryKey: ['maquinas-dashboard-abast'],
    queryFn: () => DashboardService.getMaquinasAbastecimentos(),
    staleTime: 30_000,
    enabled: activeTab === 'dashboard',
  });

  const { data: ordensKpis, isLoading: loadOrd } = useQuery({
    queryKey: ['maquinas-dashboard-ordens'],
    queryFn: () => DashboardService.getMaquinasOrdens(),
    staleTime: 30_000,
    enabled: activeTab === 'dashboard',
  });

  const { data: categorias } = useQuery({
    queryKey: ['maquinas-dashboard-categorias'],
    queryFn: () => DashboardService.getMaquinasCategorias(),
    staleTime: 60_000,
    enabled: activeTab === 'dashboard',
  });

  const isLoading = loadEq || loadAb || loadOrd;
  const fmt = (n: number | undefined) => n != null ? n.toLocaleString('pt-BR') : '—';

  const renderDashboard = () => (
    <div className="row">
      {/* KPI Cards */}
      <div className="col-lg-3 col-md-6 mb-4">
        <div className="card border-start border-primary border-4 h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="bi bi-gear fs-2 text-primary flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Equipamentos Ativos</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-4"></span> : fmt(equipKpis?.equipamentos_ativos)}
                </h4>
                <small className="text-muted">{equipKpis ? `de ${fmt(equipKpis.total_equipamentos)} total` : ''}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6 mb-4">
        <div className={`card border-start border-4 h-100 ${(equipKpis?.equipamentos_manutencao ?? 0) > 0 ? 'border-warning' : 'border-success'}`}>
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="bi bi-tools fs-2 text-warning flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Em Manutenção</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-4"></span> : fmt(equipKpis?.equipamentos_manutencao)}
                </h4>
                <small className="text-muted">
                  {ordensKpis ? `${fmt(ordensKpis.abertas)} ordens abertas` : ''}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6 mb-4">
        <div className="card border-start border-info border-4 h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="bi bi-fuel-pump fs-2 text-info flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Custo Combustível/Mês</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-6"></span> : formatCurrency(abastKpis?.custo_total_abastecimentos_mes ?? 0)}
                </h4>
                <small className="text-muted">
                  {abastKpis ? `${fmt(abastKpis.total_abastecimentos_mes)} abast. · ${Number(abastKpis.consumo_medio_litros_dia ?? 0).toFixed(1)} L/dia` : ''}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6 mb-4">
        <div className="card border-start border-success border-4 h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="bi bi-check-circle fs-2 text-success flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Ordens de Serviço</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-4"></span> : fmt(ordensKpis?.total)}
                </h4>
                <small className="text-muted">
                  {ordensKpis ? `${fmt(ordensKpis.concluidas)} concluídas · ${fmt(ordensKpis.em_andamento)} em andamento` : ''}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas com dados reais */}
      {equipKpis && equipKpis.equipamentos_manutencao > 0 && (
        <div className="col-12 mb-4">
          <div className="alert alert-warning d-flex align-items-center mb-0">
            <i className="bi bi-exclamation-triangle fs-4 me-3"></i>
            <div>
              <strong>{fmt(equipKpis.equipamentos_manutencao)} equipamento(s)</strong> em manutenção.
              {ordensKpis && ordensKpis.abertas > 0 && (
                <> · <strong>{fmt(ordensKpis.abertas)} ordem(ns)</strong> de serviço abertas.</>
              )}
              <button className="btn btn-link btn-sm p-0 ms-2" onClick={() => navigate('/maquinas/manutencao')}>
                Ver manutenções
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Equipamentos por Categoria */}
      <div className="col-lg-8 mb-4">
        <div className="card h-100">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-grid me-2"></i>Equipamentos por Categoria</h5>
            <button className="btn btn-sm btn-outline-primary" onClick={() => navigate('/maquinas/equipamentos')}>
              <i className="bi bi-arrow-right me-1"></i> Ver todos
            </button>
          </div>
          <div className="card-body">
            {categorias && categorias.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Tipo</th>
                      <th className="text-center">Total</th>
                      <th className="text-center">Ativos</th>
                      <th className="text-center">Manutenção</th>
                      <th className="text-end">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map((c) => (
                      <tr key={c.categoria__id}>
                        <td className="fw-semibold">{c.categoria__nome}</td>
                        <td><span className="badge bg-secondary">{c.categoria__tipo_mobilidade}</span></td>
                        <td className="text-center">{c.total}</td>
                        <td className="text-center text-success">{c.ativos}</td>
                        <td className="text-center">{c.em_manutencao > 0 ? <span className="text-warning fw-bold">{c.em_manutencao}</span> : <span className="text-muted">0</span>}</td>
                        <td className="text-end">{formatCurrency(c.valor_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted mb-0">Nenhuma categoria cadastrada.</p>
            )}
          </div>
        </div>
      </div>

      {/* Resumo Financeiro de Máquinas */}
      <div className="col-lg-4 mb-4">
        <div className="card h-100">
          <div className="card-header">
            <h5 className="mb-0"><i className="bi bi-cash-coin me-2"></i>Resumo Financeiro</h5>
          </div>
          <div className="card-body">
            <ul className="list-group list-group-flush">
              <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                <span>Patrimônio em Equipamentos</span>
                <span className="fw-bold">{formatCurrency(equipKpis?.custo_total_equipamentos ?? 0)}</span>
              </li>
              <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                <span>Depreciação Acumulada</span>
                <span className="fw-bold text-danger">{formatCurrency(equipKpis?.depreciacao_total ?? 0)}</span>
              </li>
              <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                <span>Custo Ordens de Serviço</span>
                <span className="fw-bold">{formatCurrency(ordensKpis?.custo_total ?? 0)}</span>
              </li>
              <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                <span>Combustível no Mês</span>
                <span className="fw-bold">{formatCurrency(abastKpis?.custo_total_abastecimentos_mes ?? 0)}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'equipamentos':
        return <EquipamentosList />;
      case 'manutencao':
        return (
          <Suspense fallback={<div className="text-center py-4"><div className="spinner-border" role="status"></div></div>}>
            <Manutencao />
          </Suspense>
        );
      case 'abastecimentos':
        return (
          <Suspense fallback={<div className="text-center py-4"><div className="spinner-border" role="status"></div></div>}>
            <Abastecimentos />
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

export default Maquinas;
