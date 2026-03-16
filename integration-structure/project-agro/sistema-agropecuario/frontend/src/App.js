import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
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
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuthContext();
    useEffect(() => {
        console.debug('ProtectedRoute auth state', { isAuthenticated, loading });
    }, [isAuthenticated, loading]);
    if (loading) {
        return _jsx("div", { className: "d-flex justify-content-center align-items-center vh-100", children: _jsx("div", { className: "spinner-border", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Carregando..." }) }) });
    }
    return isAuthenticated ? _jsx(_Fragment, { children: children }) : _jsx(Navigate, { to: "/login", replace: true });
};
/** Ponte entre AuthContext e TenantProvider — permite passar is_staff como prop */
const TenantBridge = ({ children }) => {
    const { user } = useAuthContext();
    const isSuperuser = !!user?.is_superuser || !!user?.is_staff;
    return _jsx(TenantProvider, { isSuperuser: isSuperuser, children: children });
};
function App() {
    return (_jsx(AuthProvider, { children: _jsxs(TenantBridge, { children: [_jsx(Toaster, { position: "top-right" }), _jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsx(Route, { path: "/forgot-password", element: _jsx(ForgotPassword, {}) }), _jsxs(Route, { path: "/", element: _jsx(ProtectedRoute, { children: _jsx(ActionsProvider, { children: _jsx(Layout, {}) }) }), children: [_jsx(Route, { index: true, element: _jsx(Dashboard, {}) }), _jsxs(Route, { path: "dashboard/inteligencia", element: _jsx(RBACGuard, { module: "dashboard", showMessage: true, children: _jsx(InteligenciaNegocio, {}) }), children: [_jsx(Route, { path: "propriedade", element: _jsx(SaudePropriedade, {}) }), _jsx(Route, { path: "producao", element: _jsx(SaudeProducao, {}) }), _jsx(Route, { path: "tecnica", element: _jsx(SaudeTecnica, {}) })] }), _jsxs(Route, { path: "fazendas", element: _jsx(RBACGuard, { module: "fazendas", showMessage: true, children: _jsx(FazendasLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/fazendas/dashboard", replace: true }) }), _jsx(Route, { path: "dashboard", element: _jsx(FazendaDashboard, {}) }), _jsx(Route, { path: "fazendas", element: _jsx(FazendasList, {}) }), _jsx(Route, { path: "proprietarios", element: _jsx(ProprietariosList, {}) }), _jsx(Route, { path: "areas", element: _jsx(AreasList, {}) }), _jsx(Route, { path: "talhoes", element: _jsx(TalhaosList, {}) }), _jsx(Route, { path: "arrendamentos", element: _jsx(ArrendamentosList, {}) }), _jsx(Route, { path: "mapa", element: _jsx(FazendaMapPage, {}) })] }), _jsxs(Route, { path: "agricultura", element: _jsx(RBACGuard, { module: "agricultura", showMessage: true, children: _jsx(AgriculturaLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/agricultura/dashboard", replace: true }) }), _jsx(Route, { path: "operacoes", element: _jsx(OperacoesPage, {}) }), _jsx(Route, { path: "operacoes/:id", element: _jsx(OperacaoDetalhes, {}) }), _jsx(Route, { path: "operacoes/:id/editar", element: _jsx(OperacaoWizard, {}) }), _jsx(Route, { path: "cargas", element: _jsx(CargasList, {}) }), _jsx(Route, { path: "cargas/diferencas", element: _jsx(DiferencasReport, {}) }), _jsx(Route, { path: "*", element: _jsx(Agricultura, {}) })] }), _jsxs(Route, { path: "maquinas", element: _jsx(RBACGuard, { module: "maquinas", showMessage: true, children: _jsx(MaquinasLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/maquinas/dashboard", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Maquinas, {}) })] }), _jsxs(Route, { path: "estoque", element: _jsx(RBACGuard, { module: "estoque", showMessage: true, children: _jsx(EstoqueLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/estoque/dashboard", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Estoque, {}) })] }), _jsxs(Route, { path: "comercial", element: _jsx(RBACGuard, { module: "comercial", showMessage: true, children: _jsx(ComercialLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/comercial/dashboard", replace: true }) }), _jsx(Route, { path: "empresas/new", element: _jsx(EmpresaCreate, {}) }), _jsx(Route, { path: "empresas/:id", element: _jsx(EmpresaDetail, {}) }), _jsx(Route, { path: "despesas-prestadoras/new", element: _jsx(DespesaPrestadoraCreate, {}) }), _jsx(Route, { path: "compras/new", element: _jsx(CompraCreate, {}) }), _jsx(Route, { path: "clientes/new", element: _jsx(ClienteCreate, {}) }), _jsx(Route, { path: "clientes/:id", element: React.createElement(React.lazy(() => import('./pages/comercial/ClienteDetail'))) }), _jsx(Route, { path: "clientes/:id/editar", element: _jsx(ClienteCreate, {}) }), _jsx(Route, { path: "vendas/new", element: _jsx(VendaCreate, {}) }), _jsx(Route, { path: "contratos/novo", element: _jsx(ContratosList, {}) }), _jsx(Route, { path: "contratos/new", element: _jsx(ContratosList, {}) }), _jsx(Route, { path: "contratos/:id", element: _jsx(ContratoDetalhes, {}) }), _jsx(Route, { path: "contratos", element: _jsx(Comercial, {}) }), _jsx(Route, { path: "dashboard", element: _jsx(Comercial, {}) }), _jsx(Route, { path: "vendas", element: _jsx(Comercial, {}) }), _jsx(Route, { path: "clientes", element: _jsx(Comercial, {}) }), _jsx(Route, { path: "fornecedores", element: _jsx(Comercial, {}) }), _jsx(Route, { path: "relatorios", element: _jsx(Comercial, {}) }), _jsx(Route, { path: "*", element: _jsx(Comercial, {}) })] }), _jsxs(Route, { path: "financeiro", element: _jsx(RBACGuard, { module: "financeiro", showMessage: true, children: _jsx(FinanceiroLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/financeiro/dashboard", replace: true }) }), _jsx(Route, { path: "rateios/create", element: React.createElement(React.lazy(() => import('./pages/financeiro/RateioForm'))) }), _jsx(Route, { path: "rateios/:id", element: _jsx(RateioDetail, {}) }), _jsx(Route, { path: "financiamentos/:id", element: _jsx(FinanciamentoDetail, {}) }), _jsx(Route, { path: "emprestimos/:id", element: _jsx(EmprestimoDetail, {}) }), _jsx(Route, { path: "*", element: _jsx(Financeiro, {}) })] }), _jsx(Route, { path: "administrativo", element: _jsx(Administrativo, {}) }), _jsx(Route, { path: "fiscal", element: _jsx(RBACGuard, { module: "fiscal", showMessage: true, children: _jsx(Fiscal, {}) }) }), _jsx(Route, { path: "actions", element: _jsx(RBACGuard, { module: "actions", showMessage: true, children: _jsx(Actions, {}) }) })] })] }) })] }) }));
}
export default App;
