import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import Layout from '@/components/Layout';
import RBACGuard from '@/components/RBACGuard';
import Dashboard from '@/pages/Dashboard';

// Module layouts
import AgriculturaLayout from '@/pages/AgriculturaLayout';
import MaquinasLayout from '@/pages/MaquinasLayout';
import EstoqueLayout from '@/pages/EstoqueLayout';
import ComercialLayout from '@/pages/ComercialLayout';
import FinanceiroLayout from '@/pages/FinanceiroLayout';
import FazendasLayout from '@/pages/fazendas/FazendasLayout';

// Module content components (rendered via wildcard routes)
import Agricultura from '@/pages/Agricultura';
import Maquinas from '@/pages/Maquinas';
import Estoque from '@/pages/Estoque';
import Comercial from '@/pages/Comercial';
import Financeiro from '@/pages/Financeiro';
import Administrativo from '@/pages/Administrativo';
import Fiscal from '@/pages/Fiscal';

// Dashboard – Central de Inteligência
import InteligenciaNegocio from '@/pages/dashboard/InteligenciaNegocio';
import SaudePropriedade from '@/pages/dashboard/SaudePropriedade';
import SaudeProducao from '@/pages/dashboard/SaudeProducao';
import SaudeTecnica from '@/pages/dashboard/SaudeTecnica';

// Fazendas sub-pages
import FazendaDashboard from '@/pages/fazendas/FazendaDashboard';
import FazendasList from '@/pages/fazendas/FazendasList';
import ProprietariosList from '@/pages/fazendas/ProprietariosList';
import AreasList from '@/pages/fazendas/AreasList';
import TalhaosList from '@/pages/fazendas/TalhaosList';
import ArrendamentosList from '@/pages/fazendas/ArrendamentosList';
import FazendaMapPage from '@/pages/fazendas/FazendaMapPage';

// Agricultura detail routes
import OperacaoWizard from '@/components/agricultura/OperacaoWizard';
import OperacaoDetalhes from '@/components/agricultura/OperacaoDetalhes';
import OperacoesPage from '@/pages/agricultura/Operacoes';
import CargasList from '@/pages/agricultura/CargasList';
import DiferencasReport from '@/pages/agricultura/DiferencasReport';

// Comercial detail routes
import EmpresaDetail from '@/pages/comercial/EmpresaDetail';
import EmpresaCreate from '@/pages/comercial/EmpresaCreate';
import DespesaPrestadoraCreate from '@/pages/comercial/DespesaPrestadoraCreate';
import CompraCreate from '@/pages/comercial/CompraCreate';
import ClienteCreate from '@/pages/comercial/ClienteCreate';
import VendaCreate from '@/pages/comercial/VendaCreate';
import ContratosList from '@/pages/comercial/ContratosList';
import ContratoDetalhes from '@/pages/comercial/ContratoDetalhes';

// Financeiro detail routes
import RateioDetail from '@/pages/financeiro/RateioDetail';
import FinanciamentoDetail from '@/pages/financeiro/FinanciamentoDetail';
import EmprestimoDetail from '@/pages/financeiro/EmprestimoDetail';

// Auth
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';

// Isidoro Actions
import Actions from '@/pages/Actions';
import { ActionsProvider } from './contexts/ActionsContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuthContext();

  useEffect(() => {
    console.debug('ProtectedRoute auth state', { isAuthenticated, loading })
  }, [isAuthenticated, loading])

  if (loading) {
    return <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border" role="status">
        <span className="visually-hidden">Carregando...</span>
      </div>
    </div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

/** Ponte entre AuthContext e TenantProvider — permite passar is_staff como prop */
const TenantBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const isSuperuser = !!(user as any)?.is_superuser || !!(user as any)?.is_staff;
  return <TenantProvider isSuperuser={isSuperuser}>{children}</TenantProvider>;
};

function App() {
  return (
    <AuthProvider>
      <TenantBridge>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/" element={
            <ProtectedRoute>
              <ActionsProvider>
                <Layout />
              </ActionsProvider>
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            {/* Central de Inteligência – hub + sub-pages */}
            <Route path="dashboard/inteligencia" element={<RBACGuard module="dashboard" showMessage><InteligenciaNegocio /></RBACGuard>}>
              <Route path="propriedade" element={<SaudePropriedade />} />
              <Route path="producao" element={<SaudeProducao />} />
              <Route path="tecnica" element={<SaudeTecnica />} />
            </Route>

            {/* Fazendas - route-based with separate child components */}
            <Route path="fazendas" element={<RBACGuard module="fazendas" showMessage><FazendasLayout /></RBACGuard>}>
              <Route index element={<Navigate to="/fazendas/dashboard" replace />} />
              <Route path="dashboard" element={<FazendaDashboard />} />
              <Route path="fazendas" element={<FazendasList />} />
              <Route path="proprietarios" element={<ProprietariosList />} />
              <Route path="areas" element={<AreasList />} />
              <Route path="talhoes" element={<TalhaosList />} />
              <Route path="arrendamentos" element={<ArrendamentosList />} />
              <Route path="mapa" element={<FazendaMapPage />} />
            </Route>

            {/* Agricultura - layout + wildcard for tab content */}
            <Route path="agricultura" element={<RBACGuard module="agricultura" showMessage><AgriculturaLayout /></RBACGuard>}>
              <Route index element={<Navigate to="/agricultura/dashboard" replace />} />
              <Route path="operacoes" element={<OperacoesPage />} />
              <Route path="operacoes/:id" element={<OperacaoDetalhes />} />
              <Route path="operacoes/:id/editar" element={<OperacaoWizard />} />
              <Route path="cargas" element={<CargasList />} />
              <Route path="cargas/diferencas" element={<DiferencasReport />} />
              <Route path="*" element={<Agricultura />} />
            </Route>

            {/* Máquinas - layout + wildcard for tab content */}
            <Route path="maquinas" element={<RBACGuard module="maquinas" showMessage><MaquinasLayout /></RBACGuard>}>
              <Route index element={<Navigate to="/maquinas/dashboard" replace />} />
              <Route path="*" element={<Maquinas />} />
            </Route>

            {/* Estoque - layout + wildcard for tab content */}
            <Route path="estoque" element={<RBACGuard module="estoque" showMessage><EstoqueLayout /></RBACGuard>}>
              <Route index element={<Navigate to="/estoque/dashboard" replace />} />
              <Route path="*" element={<Estoque />} />
            </Route>

            {/* Comercial - layout + wildcard for tab content, detail routes first */}
            <Route path="comercial" element={<RBACGuard module="comercial" showMessage><ComercialLayout /></RBACGuard>}>
              <Route index element={<Navigate to="/comercial/dashboard" replace />} />
              <Route path="empresas/new" element={<EmpresaCreate />} />
              <Route path="empresas/:id" element={<EmpresaDetail />} />
              <Route path="despesas-prestadoras/new" element={<DespesaPrestadoraCreate />} />
              <Route path="compras/new" element={<CompraCreate />} />
              <Route path="clientes/new" element={<ClienteCreate />} />
              <Route path="clientes/:id" element={React.createElement(React.lazy(() => import('./pages/comercial/ClienteDetail')))} />
              <Route path="clientes/:id/editar" element={<ClienteCreate />} />
              <Route path="vendas/new" element={<VendaCreate />} />
              <Route path="contratos/novo" element={<ContratosList />} />
              <Route path="contratos/new" element={<ContratosList />} />
              <Route path="contratos/:id" element={<ContratoDetalhes />} />
              <Route path="contratos" element={<Comercial />} />
              <Route path="dashboard" element={<Comercial />} />
              <Route path="vendas" element={<Comercial />} />
              <Route path="clientes" element={<Comercial />} />
              <Route path="fornecedores" element={<Comercial />} />
              <Route path="relatorios" element={<Comercial />} />
              <Route path="*" element={<Comercial />} />
            </Route>

            {/* Financeiro - layout + wildcard for tab content, detail routes first */}
            <Route path="financeiro" element={<RBACGuard module="financeiro" showMessage><FinanceiroLayout /></RBACGuard>}>
              <Route index element={<Navigate to="/financeiro/dashboard" replace />} />
              <Route path="rateios/create" element={React.createElement(React.lazy(() => import('./pages/financeiro/RateioForm')))} />
              <Route path="rateios/:id" element={<RateioDetail />} />
              <Route path="financiamentos/:id" element={<FinanciamentoDetail />} />
              <Route path="emprestimos/:id" element={<EmprestimoDetail />} />
              <Route path="*" element={<Financeiro />} />
            </Route>

            <Route path="administrativo" element={<Administrativo />} />
            <Route path="fiscal" element={<RBACGuard module="fiscal" showMessage><Fiscal /></RBACGuard>} />
            <Route path="actions" element={<RBACGuard module="actions" showMessage><Actions /></RBACGuard>} />
          </Route>
        </Routes>
      </Router>
      </TenantBridge>
    </AuthProvider>
  );
}

export default App;
