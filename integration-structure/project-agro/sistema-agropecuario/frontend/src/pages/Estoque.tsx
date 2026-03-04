import React, { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ProdutosList from '../components/estoque/ProdutosList';
import DashboardService from '../services/dashboard';
import type { EstoqueKpis } from '../services/dashboard';
import { formatCurrency } from '../utils/formatters';

const MovimentacoesPage = lazy(() => import('./estoque/Movimentacoes'));
const LocaisArmazenagemList = lazy(() => import('./estoque/LocaisArmazenagemList'));

const Estoque: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.split('/')[2] || 'dashboard';

  const { data: dash, isLoading } = useQuery<EstoqueKpis>({
    queryKey: ['dashboard-estoque'],
    queryFn: () => DashboardService.getEstoque(),
    staleTime: 30_000,
    enabled: activeTab === 'dashboard',
  });
  const kpis = dash?.kpis;

  const fmt = (n: number | undefined) => n != null ? n.toLocaleString('pt-BR') : '—';

  const renderDashboard = () => (
    <div className="row">
      {/* KPI Cards */}
      <div className="col-lg-3 col-md-6 mb-4">
        <div className="card border-start border-primary border-4 h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="bi bi-box-seam fs-2 text-primary flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Produtos Cadastrados</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-4"></span> : fmt(kpis?.total_produtos)}
                </h4>
                <small className="text-muted">Total no sistema</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6 mb-4">
        <div className="card border-start border-success border-4 h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="bi bi-cash-coin fs-2 text-success flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Valor Total em Estoque</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-6"></span> : formatCurrency(kpis?.valor_total_estoque ?? 0)}
                </h4>
                <small className="text-success">Soma do estoque</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6 mb-4">
        <div className={`card border-start border-4 h-100 ${(kpis?.abaixo_minimo_count ?? 0) > 0 ? 'border-warning' : 'border-success'}`}>
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className={`bi ${(kpis?.abaixo_minimo_count ?? 0) > 0 ? 'bi-exclamation-triangle text-warning' : 'bi-check-circle text-success'} fs-2 flex-shrink-0`}></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Estoque Baixo</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-4"></span> : fmt(kpis?.abaixo_minimo_count)}
                </h4>
                <small className={kpis?.abaixo_minimo_count ? 'text-warning' : 'text-success'}>
                  {kpis?.abaixo_minimo_count ? 'Produtos abaixo do mínimo' : 'Estoque OK'}
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
              <i className="bi bi-arrow-left-right fs-2 text-info flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Movimentações (7 dias)</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-4"></span> : fmt(kpis?.movimentacoes_7d?.total)}
                </h4>
                <small className="text-muted">
                  {kpis?.movimentacoes_7d ? (
                    <>
                      <span className="text-success">{fmt(kpis.movimentacoes_7d.entradas)} entradas</span>
                      {' · '}
                      <span className="text-danger">{fmt(kpis.movimentacoes_7d.saidas)} saídas</span>
                    </>
                  ) : ''}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de produtos abaixo do mínimo */}
      {kpis && kpis.abaixo_minimo_count > 0 && (
        <div className="col-12 mb-4">
          <div className="alert alert-warning mb-0">
            <div className="d-flex align-items-center mb-2">
              <i className="bi bi-exclamation-triangle fs-4 me-3"></i>
              <strong>{kpis.abaixo_minimo_count} produto(s) abaixo do estoque mínimo</strong>
            </div>
            {kpis.abaixo_minimo_itens && kpis.abaixo_minimo_itens.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm table-warning mb-0">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Produto</th>
                      <th className="text-end">Atual</th>
                      <th className="text-end">Mínimo</th>
                      <th className="text-end">Déficit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.abaixo_minimo_itens.slice(0, 5).map((item) => (
                      <tr key={item.id}>
                        <td><code>{item.codigo}</code></td>
                        <td>{item.nome}</td>
                        <td className="text-end text-danger fw-bold">{item.quantidade_estoque} {item.unidade}</td>
                        <td className="text-end">{item.estoque_minimo} {item.unidade}</td>
                        <td className="text-end text-danger">-{(item.estoque_minimo - item.quantidade_estoque).toFixed(1)} {item.unidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ações Rápidas */}
      <div className="col-lg-8 mb-4">
        <div className="card h-100">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-clock-history me-2"></i>Resumo de Movimentações</h5>
            <button className="btn btn-sm btn-outline-primary" onClick={() => navigate('/estoque/movimentacoes')}>
              <i className="bi bi-arrow-right me-1"></i> Ver todas
            </button>
          </div>
          <div className="card-body">
            {kpis?.movimentacoes_7d ? (
              <div className="row text-center">
                <div className="col-4">
                  <div className="border rounded p-3">
                    <i className="bi bi-arrow-down-circle text-success fs-3"></i>
                    <h3 className="mt-2 mb-0">{fmt(kpis.movimentacoes_7d.entradas)}</h3>
                    <small className="text-muted">Entradas</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="border rounded p-3">
                    <i className="bi bi-arrow-up-circle text-danger fs-3"></i>
                    <h3 className="mt-2 mb-0">{fmt(kpis.movimentacoes_7d.saidas)}</h3>
                    <small className="text-muted">Saídas</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="border rounded p-3">
                    <i className="bi bi-arrow-left-right text-info fs-3"></i>
                    <h3 className="mt-2 mb-0">{fmt(kpis.movimentacoes_7d.total)}</h3>
                    <small className="text-muted">Total</small>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted mb-0">Carregando movimentações...</p>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-4 mb-4">
        <div className="card h-100">
          <div className="card-header">
            <h5 className="mb-0"><i className="bi bi-lightning me-2"></i>Ações Rápidas</h5>
          </div>
          <div className="card-body">
            <div className="d-grid gap-2">
              <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/estoque/produtos')}>
                <i className="bi bi-box-seam me-2"></i> Gerenciar Produtos
              </button>
              <button className="btn btn-outline-success btn-sm" onClick={() => navigate('/estoque/movimentacoes')}>
                <i className="bi bi-arrow-left-right me-2"></i> Movimentações
              </button>
              <button className="btn btn-outline-info btn-sm" onClick={() => navigate('/estoque/locais')}>
                <i className="bi bi-building me-2"></i> Locais de Armazenagem
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
      case 'produtos':
        return <ProdutosList />;
      case 'movimentacoes':
        return (
          <Suspense fallback={<div className="text-center py-4"><div className="spinner-border" role="status"></div></div>}>
            <MovimentacoesPage />
          </Suspense>
        );
      case 'locais':
        return (
          <Suspense fallback={<div className="text-center py-4"><div className="spinner-border" role="status"></div></div>}>
            <LocaisArmazenagemList />
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

export default Estoque;