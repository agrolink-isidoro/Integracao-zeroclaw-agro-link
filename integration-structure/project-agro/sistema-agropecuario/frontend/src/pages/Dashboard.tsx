import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../hooks/useApi';
import { formatCurrency } from '../utils/formatters';

interface DashboardResumo {
  kpis: {
    areas_cultivadas_ha: number;
    receita_mes: number;
    despesa_mes: number;
    saldo_mes: number;
    produtos_estoque: number;
    produtos_abaixo_minimo: number;
    maquinas_ativas: number;
    maquinas_total: number;
    total_fazendas: number;
    total_areas: number;
    vencimentos_proximos: number;
  };
  last_updated: string;
}

const Dashboard: React.FC = () => {
  const { data: resumo, isLoading } = useApiQuery<DashboardResumo>(
    ['dashboard-resumo'],
    '/dashboard/resumo/'
  );
  const [chatInput, setChatInput] = useState('');

  const kpis = resumo?.kpis;

  const formatNumber = (n: number | undefined) =>
    n != null ? n.toLocaleString('pt-BR') : '—';

  /* Placeholder AI pending tasks — will be populated via real endpoint */
  const aiPendingTasks = [
    { id: 1, title: 'Analisar variação de custos operacionais', status: 'pendente', priority: 'alta', module: 'Financeiro' },
    { id: 2, title: 'Gerar relatório de produtividade por talhão', status: 'em andamento', priority: 'média', module: 'Agricultura' },
    { id: 3, title: 'Classificar notas fiscais importadas', status: 'pendente', priority: 'alta', module: 'Fiscal' },
    { id: 4, title: 'Sugerir reposição de estoque mínimo', status: 'concluído', priority: 'baixa', module: 'Estoque' },
    { id: 5, title: 'Prever manutenção preventiva — frota', status: 'pendente', priority: 'média', module: 'Máquinas' },
  ];

  const statusBadge = (s: string) => {
    switch (s) {
      case 'em andamento': return 'bg-primary';
      case 'concluído': return 'bg-success';
      default: return 'bg-warning text-dark';
    }
  };
  const priorityIcon = (p: string) => {
    switch (p) {
      case 'alta': return 'bi-arrow-up-circle-fill text-danger';
      case 'média': return 'bi-dash-circle-fill text-warning';
      default: return 'bi-arrow-down-circle-fill text-info';
    }
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">Painel Principal</h1>
          <p className="text-muted mb-0">Visão consolidada do Agro-link</p>
        </div>
        {resumo?.last_updated && (
          <small className="text-muted">
            <i className="bi bi-clock me-1"></i>
            Atualizado: {new Date(resumo.last_updated).toLocaleString('pt-BR')}
          </small>
        )}
      </div>

      {/* ─── KPI Cards Row 1 — Financial ─── */}
      <div className="row mb-3">
        <div className="col-xl-3 col-md-6 mb-3">
          <div className={`card border-start border-4 h-100 shadow-sm ${(kpis?.saldo_mes ?? 0) >= 0 ? 'border-success' : 'border-danger'}`}>
            <div className="card-body py-3">
              <div className="d-flex align-items-center">
                <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${(kpis?.saldo_mes ?? 0) >= 0 ? 'bg-success' : 'bg-danger'} bg-opacity-10`} style={{ width: 48, height: 48 }}>
                  <i className={`bi bi-cash-stack fs-4 ${(kpis?.saldo_mes ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}></i>
                </div>
                <div className="ms-3 flex-grow-1">
                  <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Saldo Mensal</small>
                  <h4 className="mb-0 fw-bold">
                    {isLoading ? <span className="placeholder col-8"></span> : formatCurrency(kpis?.saldo_mes ?? 0)}
                  </h4>
                  <div style={{ fontSize: '0.75rem' }}>
                    {kpis ? (<><span className="text-success">+{formatCurrency(kpis.receita_mes)}</span>{' / '}<span className="text-danger">-{formatCurrency(kpis.despesa_mes)}</span></>) : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-start border-success border-4 h-100 shadow-sm">
            <div className="card-body py-3">
              <div className="d-flex align-items-center">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 bg-success bg-opacity-10" style={{ width: 48, height: 48 }}>
                  <i className="bi bi-tree fs-4 text-success"></i>
                </div>
                <div className="ms-3 flex-grow-1">
                  <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Áreas Cultivadas</small>
                  <h4 className="mb-0 fw-bold">
                    {isLoading ? <span className="placeholder col-6"></span> : `${formatNumber(kpis?.areas_cultivadas_ha)} ha`}
                  </h4>
                  <div style={{ fontSize: '0.75rem' }} className="text-muted">
                    {kpis ? `${kpis.total_fazendas} fazendas · ${kpis.total_areas} áreas` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className={`card border-start border-4 h-100 shadow-sm ${(kpis?.produtos_abaixo_minimo ?? 0) > 0 ? 'border-warning' : 'border-success'}`}>
            <div className="card-body py-3">
              <div className="d-flex align-items-center">
                <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${(kpis?.produtos_abaixo_minimo ?? 0) > 0 ? 'bg-warning' : 'bg-success'} bg-opacity-10`} style={{ width: 48, height: 48 }}>
                  <i className={`bi bi-box-seam fs-4 ${(kpis?.produtos_abaixo_minimo ?? 0) > 0 ? 'text-warning' : 'text-success'}`}></i>
                </div>
                <div className="ms-3 flex-grow-1">
                  <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Estoque</small>
                  <h4 className="mb-0 fw-bold">
                    {isLoading ? <span className="placeholder col-6"></span> : `${formatNumber(kpis?.produtos_estoque)} itens`}
                  </h4>
                  <div style={{ fontSize: '0.75rem' }}>
                    {kpis?.produtos_abaixo_minimo
                      ? <span className="text-warning"><i className="bi bi-exclamation-triangle me-1"></i>{kpis.produtos_abaixo_minimo} abaixo do mínimo</span>
                      : <span className="text-success"><i className="bi bi-check-circle me-1"></i>Estoque OK</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card border-start border-info border-4 h-100 shadow-sm">
            <div className="card-body py-3">
              <div className="d-flex align-items-center">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 bg-info bg-opacity-10" style={{ width: 48, height: 48 }}>
                  <i className="bi bi-gear fs-4 text-info"></i>
                </div>
                <div className="ms-3 flex-grow-1">
                  <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Máquinas Ativas</small>
                  <h4 className="mb-0 fw-bold">
                    {isLoading ? <span className="placeholder col-4"></span> : formatNumber(kpis?.maquinas_ativas)}
                  </h4>
                  <div style={{ fontSize: '0.75rem' }} className="text-muted">
                    {kpis ? `de ${kpis.maquinas_total} total` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert: vencimentos próximos */}
      {kpis && kpis.vencimentos_proximos > 0 && (
        <div className="alert alert-warning d-flex align-items-center mb-4 shadow-sm" role="alert">
          <i className="bi bi-bell-fill fs-4 me-3"></i>
          <div className="flex-grow-1">
            <strong>{kpis.vencimentos_proximos} vencimento(s)</strong> nos próximos 7 dias.
          </div>
          <Link to="/financeiro" className="btn btn-sm btn-warning">
            <i className="bi bi-arrow-right me-1"></i>Ver detalhes
          </Link>
        </div>
      )}

      {/* ─── Main Content: 2 columns ─── */}
      <div className="row">
        {/* Left column — AI Chat + Modules */}
        <div className="col-lg-8">
          {/* AI Chat Section */}
          <div className="card mb-4 shadow-sm">
            <div className="card-header bg-dark text-white d-flex align-items-center">
              <i className="bi bi-robot fs-5 me-2"></i>
              <h5 className="mb-0 flex-grow-1">Assistente IA</h5>
              <span className="badge bg-success"><i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>Online</span>
            </div>
            <div className="card-body" style={{ minHeight: 220 }}>
              {/* Chat messages area */}
              <div className="bg-light rounded-3 p-3 mb-3" style={{ minHeight: 140, maxHeight: 300, overflowY: 'auto' }}>
                <div className="d-flex mb-3">
                  <div className="flex-shrink-0">
                    <span className="badge bg-dark rounded-circle p-2"><i className="bi bi-robot"></i></span>
                  </div>
                  <div className="ms-2 bg-white rounded-3 p-2 px-3 shadow-sm" style={{ maxWidth: '85%' }}>
                    <small className="text-muted d-block mb-1" style={{ fontSize: '0.7rem' }}>Assistente IA</small>
                    <span>Olá! Sou o assistente inteligente do Agro-link. Posso ajudar com análises de dados, relatórios, previsões e automações. Como posso ajudar?</span>
                  </div>
                </div>
              </div>
              {/* Input */}
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Pergunte algo ao assistente... Ex: Qual o saldo financeiro do mês?"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                />
                <button className="btn btn-dark" type="button" disabled={!chatInput.trim()}>
                  <i className="bi bi-send"></i>
                </button>
              </div>
              <div className="mt-2 d-flex gap-2 flex-wrap">
                <small className="text-muted">Sugestões:</small>
                <button className="btn btn-outline-secondary btn-sm py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => setChatInput('Resumo financeiro do mês')}>Resumo financeiro</button>
                <button className="btn btn-outline-secondary btn-sm py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => setChatInput('Produtos com estoque crítico')}>Estoque crítico</button>
                <button className="btn btn-outline-secondary btn-sm py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => setChatInput('Previsão de colheita')}>Previsão colheita</button>
                <button className="btn btn-outline-secondary btn-sm py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => setChatInput('Manutenções pendentes')}>Manutenções</button>
              </div>
            </div>
          </div>

          {/* Quick Access Modules */}
          <h6 className="text-muted text-uppercase fw-semibold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            <i className="bi bi-grid-3x3-gap me-2"></i>Acesso Rápido
          </h6>
          <div className="row">
            {[
              { title: 'Agricultura', icon: 'bi-tree', color: 'success', path: '/agricultura', desc: 'Plantios e colheitas' },
              { title: 'Fazendas', icon: 'bi-house-door', color: 'primary', path: '/fazendas', desc: 'Propriedades rurais' },
              { title: 'Estoque', icon: 'bi-box-seam', color: 'warning', path: '/estoque', desc: 'Insumos e produtos' },
              { title: 'Máquinas', icon: 'bi-gear', color: 'info', path: '/maquinas', desc: 'Equipamentos e frota' },
              { title: 'Comercial', icon: 'bi-graph-up', color: 'secondary', path: '/comercial', desc: 'Vendas e contratos' },
              { title: 'Financeiro', icon: 'bi-cash-stack', color: 'danger', path: '/financeiro', desc: 'Finanças e contas' },
              { title: 'Administrativo', icon: 'bi-person-badge', color: 'dark', path: '/administrativo', desc: 'RH e administração' },
              { title: 'Fiscal', icon: 'bi-file-earmark-text', color: 'success', path: '/fiscal', desc: 'Notas e tributos' },
            ].map((m) => (
              <div key={m.title} className="col-lg-3 col-md-4 col-6 mb-3">
                <Link to={m.path} className="text-decoration-none">
                  <div className={`card border-${m.color} h-100 shadow-sm`} style={{ transition: 'transform 0.15s' }} onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={(e) => (e.currentTarget.style.transform = '')}>
                    <div className="card-body text-center py-3">
                      <i className={`bi ${m.icon} fs-2 text-${m.color} d-block mb-1`}></i>
                      <h6 className="card-title mb-0" style={{ fontSize: '0.85rem' }}>{m.title}</h6>
                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>{m.desc}</small>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — AI Pending Tasks */}
        <div className="col-lg-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-dark text-white d-flex align-items-center">
              <i className="bi bi-list-check fs-5 me-2"></i>
              <h5 className="mb-0 flex-grow-1">Pendências IA</h5>
              <span className="badge bg-warning text-dark">{aiPendingTasks.filter(t => t.status !== 'concluído').length}</span>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {aiPendingTasks.map((task) => (
                  <div key={task.id} className={`list-group-item list-group-item-action ${task.status === 'concluído' ? 'bg-light' : ''}`}>
                    <div className="d-flex align-items-start">
                      <i className={`bi ${priorityIcon(task.priority)} flex-shrink-0 mt-1 me-2`}></i>
                      <div className="flex-grow-1">
                        <div className={`fw-semibold ${task.status === 'concluído' ? 'text-decoration-line-through text-muted' : ''}`} style={{ fontSize: '0.85rem' }}>
                          {task.title}
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          <span className={`badge ${statusBadge(task.status)}`} style={{ fontSize: '0.65rem' }}>{task.status}</span>
                          <small className="text-muted" style={{ fontSize: '0.7rem' }}>{task.module}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-footer text-center">
              <button className="btn btn-sm btn-outline-dark">
                <i className="bi bi-plus-circle me-1"></i>Nova tarefa IA
              </button>
            </div>
          </div>

          {/* Quick Stats mini cards */}
          <div className="card shadow-sm">
            <div className="card-header">
              <h6 className="mb-0"><i className="bi bi-speedometer2 me-2"></i>Status Rápido</h6>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                <Link to="/financeiro" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                  <span><i className="bi bi-calendar-check text-warning me-2"></i>Vencimentos (7 dias)</span>
                  <span className={`badge ${(kpis?.vencimentos_proximos ?? 0) > 0 ? 'bg-warning text-dark' : 'bg-success'} rounded-pill`}>
                    {isLoading ? '...' : formatNumber(kpis?.vencimentos_proximos)}
                  </span>
                </Link>
                <Link to="/estoque" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                  <span><i className="bi bi-exclamation-triangle text-warning me-2"></i>Estoque baixo</span>
                  <span className={`badge ${(kpis?.produtos_abaixo_minimo ?? 0) > 0 ? 'bg-warning text-dark' : 'bg-success'} rounded-pill`}>
                    {isLoading ? '...' : formatNumber(kpis?.produtos_abaixo_minimo)}
                  </span>
                </Link>
                <Link to="/fazendas" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                  <span><i className="bi bi-house-door text-primary me-2"></i>Fazendas</span>
                  <span className="badge bg-primary rounded-pill">{isLoading ? '...' : formatNumber(kpis?.total_fazendas)}</span>
                </Link>
                <Link to="/maquinas" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                  <span><i className="bi bi-gear text-info me-2"></i>Máquinas operando</span>
                  <span className="badge bg-info rounded-pill">{isLoading ? '...' : `${formatNumber(kpis?.maquinas_ativas)}/${formatNumber(kpis?.maquinas_total)}`}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;