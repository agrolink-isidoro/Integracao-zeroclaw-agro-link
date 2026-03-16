import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CentrosCustoList from '@/components/administrativo/CentrosCustoList';
import CentroCustoForm from '@/components/administrativo/CentroCustoForm';
import FuncionariosList from '@/components/administrativo/FuncionariosList';
import FolhaPagamento from '@/components/administrativo/FolhaPagamento';
import { useRBAC } from '@/hooks/useRBAC';
import { useAuthContext } from '@/contexts/AuthContext';
const FolhaSummaryCards = React.lazy(() => import('@/components/administrativo/FolhaSummaryCards'));
const GestaoUsuarios = React.lazy(() => import('@/components/administrativo/GestaoUsuarios'));
const PerfisPermissao = React.lazy(() => import('@/components/administrativo/PerfisPermissao'));
const LogAuditoria = React.lazy(() => import('@/components/administrativo/LogAuditoria'));
const GestaoTenants = React.lazy(() => import('@/components/administrativo/GestaoTenants'));

const Administrativo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAdmin, isSuperuser } = useRBAC();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  // isSystemAdmin: only true Django staff users can manage tenants globally.
  // NOTE: is_superuser is synthetically set to true for proprietário (farm owner)
  // users by the RBAC serializer — do NOT use it here. Only real Django is_staff
  // (system administrators) should be able to see and manage tenant configuration.
  const isSystemAdmin = !!(user as any)?.is_staff;

  // Simplified menu for Administrative app: only tabs we implement in MVP
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: 'bi bi-speedometer2' },
    { id: 'funcionarios', label: 'Funcionários', icon: 'bi bi-people' },
    { id: 'folha', label: 'Folha de Pagamento', icon: 'bi bi-cash' },
    // RBAC tabs — visible only for admins / superusers
    ...(isAdmin || isSuperuser
      ? [
          { id: 'usuarios', label: 'Gestão de Usuários', icon: 'bi bi-person-gear' },
          { id: 'perfis', label: 'Perfis de Permissão', icon: 'bi bi-shield-lock' },
          { id: 'auditoria', label: 'Log de Auditoria', icon: 'bi bi-journal-text' },
        ]
      : []),
    // Tenant management — visible only for actual system admins (is_staff or is_superuser)
    ...(isSystemAdmin
      ? [{ id: 'tenants', label: 'Tenants', icon: 'bi bi-building' }]
      : []),
  ];

  // Small wrapper to show list + create modal for Centros de Custo
  const CentroCustoBlock: React.FC = () => {
    const [open, setOpen] = useState(false);

    return (
      <div>
        <CentrosCustoList onOpenCreate={() => setOpen(true)} />

        {open && (
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Novo Centro de Custo</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setOpen(false)} />
                </div>
                <div className="modal-body">
                  <CentroCustoForm onClose={() => setOpen(false)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };



  // Simplified dashboard layout focused on active MVP features
  const renderDashboard = () => (
    <div className="row">
      <div className="col-lg-8 mb-4">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Funcionários</h5>
            <div>
              <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setActiveTab('funcionarios')}>Ver todos</button>
              <button className="btn btn-sm btn-primary" onClick={() => setActiveTab('funcionarios')}>Novo</button>
            </div>
          </div>
          <div className="card-body">
            <p className="text-muted">Lista e gerenciamento de funcionários (cadastro, edição e remoção).</p>
            <FuncionariosList />
          </div>
        </div>

        <div className="card mt-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Centros de Custo</h5>
            <small className="text-muted">Usados por Despesas e Rateios</small>
          </div>
          <div className="card-body">
            <CentroCustoBlock />
          </div>
        </div>
      </div>

      <div className="col-lg-4 mb-4">
        <div className="card border-0 shadow-sm h-100 bg-primary bg-gradient text-white mb-3">
          <div className="d-flex justify-content-between align-items-center px-3 py-2">
            <div>
              <h5 className="mb-0 text-white">Folha — mês anterior</h5>
              <small className="text-white-50">Resumo consolidado</small>
            </div>
            <div>
              <small className="text-white-50">Visão rápida</small>
            </div>
          </div>
          <div className="card-body p-2">
            {/* New infographic cards */}
            <div>
              {/* lazy-load component to keep bundle small */}
              <React.Suspense fallback={<div className="text-center text-white-50">Carregando...</div>}>
                <FolhaSummaryCards />
              </React.Suspense>
            </div>
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-body">
            <h6>Atalhos</h6>
            <div className="d-grid gap-2">
              <button className="btn btn-outline-primary" onClick={() => navigate('/financeiro')}>Ir para Financeiro</button>
              <button className="btn btn-outline-primary" onClick={() => navigate('/fiscal')}>Ir para Fiscal</button>
              <button className="btn btn-outline-primary" onClick={() => navigate('/administrativo')}>Configurações Administrativo</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFuncionarios = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Funcionários</h5>
          </div>
          <div className="card-body">
            <FuncionariosList />
          </div>
        </div>
      </div>
    </div>
  );

  const renderDepartamentos = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Departamentos</h5>
            <button className="btn btn-sm btn-primary">
              <i className="bi bi-plus-circle me-1"></i> Novo Departamento
            </button>
          </div>
          <div className="card-body">
            <p className="text-muted">Módulo de departamentos em desenvolvimento...</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDocumentos = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Documentos</h5>
            <button className="btn btn-sm btn-primary">
              <i className="bi bi-plus-circle me-1"></i> Novo Documento
            </button>
          </div>
          <div className="card-body">
            <p className="text-muted">Módulo de documentos em desenvolvimento...</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRelatorios = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Relatórios Administrativos</h5>
          </div>
          <div className="card-body">
            <p className="text-muted">Módulo de relatórios em desenvolvimento...</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsuarios = () => (
    <React.Suspense fallback={<div className="text-center py-4"><div className="spinner-border" role="status"></div></div>}>
      <GestaoUsuarios />
    </React.Suspense>
  );

  const renderPerfis = () => (
    <React.Suspense fallback={<div className="text-center py-4"><div className="spinner-border" role="status"></div></div>}>
      <PerfisPermissao />
    </React.Suspense>
  );

  const renderAuditoria = () => (
    <React.Suspense fallback={<div className="text-center py-4"><div className="spinner-border" role="status"></div></div>}>
      <LogAuditoria />
    </React.Suspense>
  );

  const renderTenants = () => (
    <React.Suspense fallback={<div className="text-center py-4"><div className="spinner-border" role="status"></div></div>}>
      <GestaoTenants />
    </React.Suspense>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'funcionarios':
        return renderFuncionarios();
      case 'folha':
        return <div>{renderFuncionarios() /* keep list above */}<div className="mt-4"><div className="card"><div className="card-body"><FolhaPagamento /></div></div></div></div>;
      case 'usuarios':
        return renderUsuarios();
      case 'perfis':
        return renderPerfis();
      case 'auditoria':
        return renderAuditoria();
      case 'tenants':
        return renderTenants();
      case 'departamentos':
        return renderDepartamentos();
      case 'documentos':
        return renderDocumentos();
      case 'relatorios':
        return renderRelatorios();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">Administrativo</h1>
          <p className="text-muted">Gestão de recursos humanos e administração</p>
        </div>
      </div>

      <div className="d-flex align-items-center mb-4" style={{ overflowX: 'auto' }}>
        <ul className="nav nav-tabs mb-0 flex-nowrap">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <i className={`${item.icon} me-2`}></i>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {renderContent()}
    </div>
  );
};

export default Administrativo;
