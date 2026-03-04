import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ModalForm from '@/components/common/ModalForm';
import DespesasList from '@/components/financeiro/DespesasList';
import DespesaForm from '@/components/financeiro/DespesaForm';
import PendingRateios from '@/components/financeiro/PendingRateios';
import ContaForm from '@/components/financeiro/ContaForm';
import InstituicaoForm from '@/components/financeiro/InstituicaoForm';
import VencimentoForm from '@/components/financeiro/VencimentoForm';
import DashboardService from '@/services/dashboard';
import type { FinanceiroKpis } from '@/services/dashboard';
import { formatCurrency } from '@/utils/formatters';

const Dashboard = React.lazy(() => import('@/pages/financeiro/Dashboard'));
const RateiosList = React.lazy(() => import('@/pages/financeiro/RateiosList'));
const RateioForm = React.lazy(() => import('@/pages/financeiro/RateioForm'));
const ContasBancariasList = React.lazy(() => import('@/pages/financeiro/ContasBancariasList'));
const InstituicoesList = React.lazy(() => import('@/pages/financeiro/InstituicoesList'));
const ExtratosUpload = React.lazy(() => import('@/pages/financeiro/ExtratosUpload'));
const VencimentosList = React.lazy(() => import('@/pages/financeiro/VencimentosList'));
const VencimentosCalendar = React.lazy(() => import('@/pages/financeiro/VencimentosCalendar'));

const Operacoes = React.lazy(() => import('@/pages/financeiro/Operacoes'));
const FluxoCaixa = React.lazy(() => import('@/pages/financeiro/FluxoCaixa'));
const CartoesList = React.lazy(() => import('@/pages/financeiro/CartoesList'));
const LivroCaixa = React.lazy(() => import('@/pages/financeiro/LivroCaixa'));
const TransferenciasList = React.lazy(() => import('@/pages/financeiro/TransferenciasList'));

const Financeiro: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.split('/')[2] || 'dashboard';
  const [subTab, setSubTab] = useState<string>('');
  const [showDespesaModal, setShowDespesaModal] = useState(false);
  const [showRateioModal, setShowRateioModal] = useState(false);
  const [showContaModal, setShowContaModal] = useState(false);
  const [showInstituicaoModal, setShowInstituicaoModal] = useState(false);
  const [showVencimentoModal, setShowVencimentoModal] = useState(false);

  const { data: dashKpis, isLoading: kpisLoading } = useQuery<FinanceiroKpis>({
    queryKey: ['dashboard-financeiro-kpis'],
    queryFn: () => DashboardService.getFinanceiro(30),
    staleTime: 30_000,
    enabled: activeTab === 'dashboard',
  });
  const kpis = dashKpis?.kpis;
  const fmt = (n: number | undefined) => n != null ? n.toLocaleString('pt-BR') : '—';

  // Reset sub-tab when main tab changes
  useEffect(() => {
    if (activeTab === 'rateios') setSubTab('despesas');
    else setSubTab('');
  }, [activeTab]);

  const getSubTabs = () => {
    if (activeTab === 'rateios') {
      return [
        { id: 'despesas', label: 'Despesas', icon: 'bi bi-receipt' },
        { id: 'rateios-lista', label: 'Rateios', icon: 'bi bi-pie-chart' },
        { id: 'pendentes', label: 'Aprovações Pendentes', icon: 'bi bi-hourglass-split' },
      ];
    }
    if (activeTab === 'contas-bancarias') {
      return [
        { id: 'contas', label: 'Contas Bancárias', icon: 'bi bi-bank' },
        { id: 'transferencias', label: 'Transferências', icon: 'bi bi-arrow-left-right' },
        { id: 'extratos', label: 'Conciliação Bancária', icon: 'bi bi-file-earmark-spreadsheet' },
        { id: 'instituicoes', label: 'Instituições Financeiras', icon: 'bi bi-building' },
        { id: 'cartoes', label: 'Cartões de Crédito', icon: 'bi bi-credit-card' },
      ];
    }
    if (activeTab === 'vencimentos') {
      return [
        { id: 'calendario', label: 'Calendário', icon: 'bi bi-calendar3' },
        { id: 'lista-semana', label: 'Lista da Semana', icon: 'bi bi-list-ul' },
      ];
    }
    return [];
  };

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <>
          {/* KPI cards moved to the end of the dashboard for layout preference */}

          {/* Alerta de atrasados */}
          {kpis && kpis.vencimentos_atrasados && kpis.vencimentos_atrasados.count > 0 && (
            <div className="alert alert-danger d-flex align-items-center mb-4">
              <i className="bi bi-exclamation-triangle fs-4 me-3"></i>
              <div>
                <strong>{fmt(kpis.vencimentos_atrasados.count)} vencimento(s) atrasado(s)</strong> totalizando {formatCurrency(kpis.vencimentos_atrasados.total)}.
                <button className="btn btn-link btn-sm p-0 ms-2 text-danger" onClick={() => navigate('/financeiro/vencimentos')}>
                  Ver vencimentos
                </button>
              </div>
            </div>
          )}

          <div className="row">
            <div className="col-md-8">
              <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Visão Geral Financeira</h5>
                </div>
                <div className="card-body">
                  <React.Suspense fallback={<div className="text-center py-3"><div className="spinner-border spinner-border-sm" role="status"></div></div>}>
                    <Dashboard />
                  </React.Suspense>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card mb-3">
                <div className="card-header">
                  <h6 className="mb-0">KPIs Rápidos</h6>
                </div>
                <div className="card-body p-2">
                  <div className="d-flex flex-column gap-2">
                    <div className="bg-light rounded p-2 d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-muted">Caixa (30d)</small>
                        <div className="fw-bold">{kpisLoading ? <span className="placeholder col-6"></span> : formatCurrency(kpis?.caixa_periodo ?? 0)}</div>
                      </div>
                      <small className="text-muted">{kpis ? `Saldo: ${formatCurrency(kpis.saldo_contas)}` : ''}</small>
                    </div>

                    <div className="bg-light rounded p-2 d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-muted">Vencimentos Próx.</small>
                        <div className="fw-bold">{kpisLoading ? <span className="placeholder col-3"></span> : fmt(kpis?.vencimentos_proximos?.count)}</div>
                      </div>
                      <small className="text-muted">{kpis?.vencimentos_proximos ? formatCurrency(kpis.vencimentos_proximos.total) : ''}</small>
                    </div>

                    <div className="bg-light rounded p-2 d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-muted">Atrasados</small>
                        <div className="fw-bold text-danger">{kpisLoading ? <span className="placeholder col-3"></span> : fmt(kpis?.vencimentos_atrasados?.count)}</div>
                      </div>
                      <small className="text-danger">{kpis?.vencimentos_atrasados?.count ? formatCurrency(kpis.vencimentos_atrasados.total) : ''}</small>
                    </div>

                    <div className="bg-light rounded p-2">
                      <small className="text-muted">Financiamentos / Empréstimos</small>
                      <div className="fw-bold">
                        {kpisLoading ? <span className="placeholder col-6"></span> : (
                          <>
                            <small className="d-block text-muted">Fin: {formatCurrency(kpis?.financiamento_total ?? 0)}</small>
                            <small className="d-block text-muted">Emp: {formatCurrency(kpis?.emprestimos_total ?? 0)}</small>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card mb-3">
                <div className="card-header">
                  <h5 className="mb-0">Rateios Pendentes</h5>
                </div>
                <div className="card-body">
                  <PendingRateios />
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (activeTab === 'rateios') {
      const activeSubTab = subTab || 'despesas';
      return (
        <>
          <ul className="nav nav-pills mb-3">
            {getSubTabs().map((st) => (
              <li key={st.id} className="nav-item">
                <button
                  className={`nav-link ${activeSubTab === st.id ? 'active' : ''}`}
                  onClick={() => setSubTab(st.id)}
                >
                  <i className={`${st.icon} me-1`}></i>
                  {st.label}
                </button>
              </li>
            ))}
          </ul>

          {activeSubTab === 'despesas' && (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Despesas Administrativas</h5>
                <button className="btn btn-primary btn-sm" onClick={() => setShowDespesaModal(true)}>
                  <i className="bi bi-plus-circle me-1"></i>
                  Nova Despesa
                </button>
              </div>
              <div className="card-body">
                <DespesasList onOpenForm={() => setShowDespesaModal(true)} />
              </div>
            </div>
          )}

          {activeSubTab === 'rateios-lista' && (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Rateios de Custos</h5>
                <button className="btn btn-primary btn-sm" onClick={() => setShowRateioModal(true)}>
                  <i className="bi bi-plus-circle me-1"></i>
                  Novo Rateio
                </button>
              </div>
              <div className="card-body">
                <React.Suspense fallback={<div>Carregando...</div>}>
                  <RateiosList />
                </React.Suspense>
              </div>
            </div>
          )}

          {activeSubTab === 'pendentes' && (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Aprovações de Rateio Pendentes</h5>
              </div>
              <div className="card-body">
                <PendingRateios />
              </div>
            </div>
          )}
        </>
      );
    }



    if (activeTab === 'fluxo-caixa') {
      const activeFluxoTab = subTab || 'fluxo';
      return (
        <div>
          <ul className="nav nav-pills mb-3">
            <li className="nav-item">
              <button className={`nav-link ${activeFluxoTab === 'fluxo' ? 'active' : ''}`} onClick={() => setSubTab('fluxo')}>Fluxo</button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${activeFluxoTab === 'livro-caixa' ? 'active' : ''}`} onClick={() => setSubTab('livro-caixa')}>Livro Caixa</button>
            </li>
          </ul>

          {activeFluxoTab === 'fluxo' && (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Fluxo de Caixa</h5>
              </div>
              <div className="card-body">
                <React.Suspense fallback={<div>Carregando...</div>}>
                  <FluxoCaixa />
                </React.Suspense>
              </div>
            </div>
          )}

          {activeFluxoTab === 'livro-caixa' && (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Livro Caixa</h5>
              </div>
              <div className="card-body">
                <React.Suspense fallback={<div>Carregando...</div>}>
                  <LivroCaixa />
                </React.Suspense>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'contas-bancarias') {
      const activeSubTab = subTab || 'contas';
      return (
        <>
          <ul className="nav nav-pills mb-3">
            {getSubTabs().map((st) => (
              <li key={st.id} className="nav-item">
                <button
                  className={`nav-link ${activeSubTab === st.id ? 'active' : ''}`}
                  onClick={() => setSubTab(st.id)}
                >
                  <i className={`${st.icon} me-1`}></i>
                  {st.label}
                </button>
              </li>
            ))}
          </ul>

          {activeSubTab === 'instituicoes' && (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Instituições Financeiras</h5>
                <button className="btn btn-primary btn-sm" onClick={() => setShowInstituicaoModal(true)}>
                  <i className="bi bi-plus-circle me-1"></i>
                  Nova Instituição
                </button>
              </div>
              <div className="card-body">
                <React.Suspense fallback={<div>Carregando...</div>}>
                  <InstituicoesList />
                </React.Suspense>
              </div>
            </div>
          )}


          {activeSubTab === 'contas' && (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Contas Bancárias</h5>
                <button className="btn btn-primary btn-sm" onClick={() => setShowContaModal(true)}>
                  <i className="bi bi-plus-circle me-1"></i>
                  Nova Conta
                </button>
              </div>
              <div className="card-body">
                <React.Suspense fallback={<div>Carregando...</div>}>
                  <ContasBancariasList />
                </React.Suspense>
              </div>
            </div>
          )}

          {activeSubTab === 'extratos' && (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Conciliação Bancária</h5>
              </div>
              <div className="card-body">
                <React.Suspense fallback={<div>Carregando...</div>}>
                  <ExtratosUpload />
                </React.Suspense>
              </div>
            </div>
          )}

          {activeSubTab === 'cartoes' && (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Cartões de Crédito</h5>
              </div>
              <div className="card-body">
                <React.Suspense fallback={<div>Carregando...</div>}>
                  <CartoesList />
                </React.Suspense>
              </div>
            </div>
          )}

          {activeSubTab === 'transferencias' && (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Transferências</h5>
              </div>
              <div className="card-body">
                <React.Suspense fallback={<div>Carregando...</div>}>
                  <TransferenciasList />
                </React.Suspense>
              </div>
            </div>
          )}
        </>
      );
    }

    if (activeTab === 'vencimentos') {
      const activeSubTab = subTab || 'lista-semana';
      return (
        <>
          <ul className="nav nav-pills mb-3">
            {getSubTabs().map((st) => (
              <li key={st.id} className="nav-item">
                <button
                  className={`nav-link ${activeSubTab === st.id ? 'active' : ''}`}
                  onClick={() => setSubTab(st.id)}
                >
                  <i className={`${st.icon} me-1`}></i>
                  {st.label}
                </button>
              </li>
            ))}
          </ul>

          {activeSubTab === 'calendario' && (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Calendário de Vencimentos</h5>
              </div>
              <div className="card-body">
                <React.Suspense fallback={<div>Carregando...</div>}>
                  <VencimentosCalendar />
                </React.Suspense>
              </div>
            </div>
          )}

          {activeSubTab === 'lista-semana' && (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Vencimentos da Semana</h5>
                <button className="btn btn-primary btn-sm" onClick={() => setShowVencimentoModal(true)}>
                  <i className="bi bi-plus-circle me-1"></i>
                  Novo Vencimento
                </button>
              </div>
              <div className="card-body">
                <React.Suspense fallback={<div>Carregando...</div>}>
                  <VencimentosList />
                </React.Suspense>
              </div>
            </div>
          )}
        </>
      );
    }

    if (activeTab === 'operacoes') {
      return (
        <React.Suspense fallback={<div className="text-center py-4"><div className="spinner-border" role="status"></div></div>}>
          <Operacoes />
        </React.Suspense>
      );
    }

    return null;
  };

  return (
    <>
      {renderContent()}

      {/* KPI Cards moved to the end as requested */}
      <div className="row mb-3 mt-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className={`card border-start border-4 h-100 ${(kpis?.caixa_periodo ?? 0) >= 0 ? 'border-success' : 'border-danger'}`}>
            <div className="card-body">
              <div className="d-flex align-items-center">
                <i className="bi bi-cash-stack fs-2 text-success flex-shrink-0"></i>
                <div className="ms-3">
                  <h6 className="card-title mb-1 text-muted">Caixa (30 dias)</h6>
                  <h4 className="mb-0">
                    {kpisLoading ? <span className="placeholder col-6"></span> : formatCurrency(kpis?.caixa_periodo ?? 0)}
                  </h4>
                  <small className="text-muted">
                    {kpis ? `Saldo contas: ${formatCurrency(kpis.saldo_contas)}` : ''}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className={`card border-start border-4 h-100 ${(kpis?.vencimentos_proximos?.count ?? 0) > 0 ? 'border-warning' : 'border-success'}`} onClick={() => navigate('/financeiro/vencimentos')} style={{ cursor: 'pointer' }}>
            <div className="card-body">
              <div className="d-flex align-items-center">
                <i className="bi bi-calendar-check fs-2 text-warning flex-shrink-0"></i>
                <div className="ms-3">
                  <h6 className="card-title mb-1 text-muted">Vencimentos Próximos</h6>
                  <h4 className="mb-0">
                    {kpisLoading ? <span className="placeholder col-4"></span> : fmt(kpis?.vencimentos_proximos?.count)}
                  </h4>
                  <small className="text-muted">
                    {kpis?.vencimentos_proximos ? formatCurrency(kpis.vencimentos_proximos.total) : ''}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className={`card border-start border-4 h-100 ${(kpis?.vencimentos_atrasados?.count ?? 0) > 0 ? 'border-danger' : 'border-success'}`}>
            <div className="card-body">
              <div className="d-flex align-items-center">
                <i className={`bi ${(kpis?.vencimentos_atrasados?.count ?? 0) > 0 ? 'bi-exclamation-triangle text-danger' : 'bi-check-circle text-success'} fs-2 flex-shrink-0`}></i>
                <div className="ms-3">
                  <h6 className="card-title mb-1 text-muted">Atrasados</h6>
                  <h4 className="mb-0">
                    {kpisLoading ? <span className="placeholder col-4"></span> : fmt(kpis?.vencimentos_atrasados?.count)}
                  </h4>
                  <small className={kpis?.vencimentos_atrasados?.count ? 'text-danger' : 'text-success'}>
                    {kpis?.vencimentos_atrasados?.count ? formatCurrency(kpis.vencimentos_atrasados.total) : 'Nenhum atraso'}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className={`card border-start border-info border-4 h-100`}>
            <div className="card-body">
              <div className="d-flex align-items-center">
                <i className="bi bi-bank fs-2 text-info flex-shrink-0"></i>
                <div className="ms-3">
                  <h6 className="card-title mb-1 text-muted">Financiamento vs Empréstimos</h6>
                  <h6 className="mb-0">
                    {kpisLoading ? <span className="placeholder col-6"></span> : (
                      <>
                        <small className="d-block text-muted">Financiamentos: {kpis?.financiamento_total != null ? formatCurrency(kpis.financiamento_total) : '—'}</small>
                        <small className="d-block text-muted">Empréstimos: {kpis?.emprestimos_total != null ? formatCurrency(kpis.emprestimos_total) : '—'}</small>
                      </>
                    )}
                  </h6>
                  <small className="text-muted">Clique para ver detalhes</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Linha adicional de KPIs financeiros */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-start border-4 h-100 border-secondary">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <i className="bi bi-graph-up-arrow fs-2 text-secondary flex-shrink-0"></i>
                <div className="ms-3">
                  <h6 className="card-title mb-1 text-muted">Lucro (30d)</h6>
                  <h4 className="mb-0">{kpisLoading ? <span className="placeholder col-4"></span> : (kpis?.lucro != null ? formatCurrency(kpis.lucro) : '—')}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-start border-4 h-100 border-dark">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <i className="bi bi-briefcase fs-2 text-dark flex-shrink-0"></i>
                <div className="ms-3">
                  <h6 className="card-title mb-1 text-muted">EBITDA (30d)</h6>
                  <h4 className="mb-0">{kpisLoading ? <span className="placeholder col-4"></span> : (kpis?.ebitda != null ? formatCurrency(kpis.ebitda) : '—')}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-start border-4 h-100 border-primary">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <i className="bi bi-grid fs-2 text-primary flex-shrink-0"></i>
                <div className="ms-3">
                  <h6 className="card-title mb-1 text-muted">R$/ha Gasto</h6>
                  <h4 className="mb-0">{kpisLoading ? <span className="placeholder col-4"></span> : (kpis?.gasto_por_hectare != null ? `R$ ${kpis.gasto_por_hectare.toLocaleString('pt-BR')}` : '—')}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card border-start border-4 h-100 border-success">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <i className="bi bi-currency-dollar fs-2 text-success flex-shrink-0"></i>
                <div className="ms-3">
                  <h6 className="card-title mb-1 text-muted">R$/ha Faturado</h6>
                  <h4 className="mb-0">{kpisLoading ? <span className="placeholder col-4"></span> : (kpis?.faturado_por_hectare != null ? `R$ ${kpis.faturado_por_hectare.toLocaleString('pt-BR')}` : '—')}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}
      <ModalForm isOpen={showDespesaModal} onClose={() => setShowDespesaModal(false)} title="Nova Despesa" size="lg">
        <DespesaForm onClose={() => setShowDespesaModal(false)} />
      </ModalForm>

      <ModalForm isOpen={showRateioModal} onClose={() => setShowRateioModal(false)} title="Novo Rateio" size="lg">
        <React.Suspense fallback={<div>Carregando...</div>}>
          <RateioForm onClose={() => setShowRateioModal(false)} />
        </React.Suspense>
      </ModalForm>

      <ModalForm isOpen={showContaModal} onClose={() => setShowContaModal(false)} title="Nova Conta Bancária">
        <ContaForm onClose={() => setShowContaModal(false)} />
      </ModalForm>

      <ModalForm isOpen={showInstituicaoModal} onClose={() => setShowInstituicaoModal(false)} title="Nova Instituição Financeira">
        <InstituicaoForm onClose={() => setShowInstituicaoModal(false)} />
      </ModalForm>

      <ModalForm isOpen={showVencimentoModal} onClose={() => setShowVencimentoModal(false)} title="Novo Vencimento">
        <VencimentoForm onClose={() => setShowVencimentoModal(false)} />
      </ModalForm>
    </>
  );
};

export default Financeiro;
