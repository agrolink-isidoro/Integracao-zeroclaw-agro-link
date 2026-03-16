import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import ComercialService from '@/services/comercial';
import { useNavigate, useLocation } from 'react-router-dom';
import ModalForm from '@/components/common/ModalForm';
import FornecedoresList from './comercial/FornecedoresList';
import VendaCreate from './comercial/VendaCreate';
import ContratoTypeSelector from '@/components/comercial/ContratoTypeSelector';
import ContratoCompraForm from '@/components/comercial/ContratoCompraForm';
import ContratoVendaForm from '@/components/comercial/ContratoVendaForm';
import ContratoFinanceiroForm from '@/components/comercial/ContratoFinanceiroForm';
import ClienteCreate from './comercial/ClienteCreate';
import DashboardService from '@/services/dashboard';
import { formatCurrency } from '@/utils/formatters';
const FornecedoresCharts = lazy(() => import('@/components/FornecedoresCharts'));
const Comercial = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const activeTab = location.pathname.split('/')[2] || 'dashboard';
    const { data: dash, isLoading } = useQuery({
        queryKey: ['dashboard-comercial'],
        queryFn: () => DashboardService.getComercial(),
        staleTime: 30_000,
        enabled: activeTab === 'dashboard',
    });
    const kpis = dash?.kpis;
    const { data: vendas = [], isLoading: vendasLoading } = useQuery({ queryKey: ['vendas', 'dashboard'], queryFn: () => ComercialService.getVendasCompras(), staleTime: 60_000 });
    const { data: compras = [], isLoading: comprasLoading } = useQuery({ queryKey: ['compras'], queryFn: () => ComercialService.getCompras(), staleTime: 60_000, enabled: activeTab === 'compras' });
    const { data: fornecedoresDashboard, isLoading: fornecedoresLoading } = useQuery({
        queryKey: ['fornecedores', 'dashboard'],
        queryFn: () => ComercialService.getFornecedoresDashboard(),
        staleTime: 60_000,
        retry: false,
    });
    const fmt = (n) => n != null ? n.toLocaleString('pt-BR') : '—';
    const renderDashboard = () => (_jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-start border-success border-4 h-100", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-graph-up fs-2 text-success flex-shrink-0" }), _jsxs("div", { className: "ms-3", children: [_jsx("h6", { className: "card-title mb-1 text-muted", children: "Vendas do M\u00EAs" }), _jsx("h4", { className: "mb-0", children: isLoading ? _jsx("span", { className: "placeholder col-6" }) : formatCurrency(kpis?.vendas_mes?.total ?? 0) }), _jsx("small", { className: "text-muted", children: kpis ? `${fmt(kpis.vendas_mes?.count)} vendas realizadas` : '' })] })] }) }) }) }), _jsx("div", { className: "col-lg-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-start border-primary border-4 h-100", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-cart-check fs-2 text-primary flex-shrink-0" }), _jsxs("div", { className: "ms-3", children: [_jsx("h6", { className: "card-title mb-1 text-muted", children: "Compras do M\u00EAs" }), _jsx("h4", { className: "mb-0", children: isLoading ? _jsx("span", { className: "placeholder col-6" }) : formatCurrency(kpis?.compras_mes?.total ?? 0) }), _jsx("small", { className: "text-muted", children: kpis ? `${fmt(kpis.compras_mes?.count)} compras realizadas` : '' })] })] }) }) }) }), _jsx("div", { className: "col-lg-3 col-md-6 mb-4", children: _jsx("div", { className: `card border-start border-4 h-100 ${(kpis?.contratos_vencendo_30d ?? 0) > 0 ? 'border-warning' : 'border-success'}`, onClick: () => navigate('/comercial/contratos'), style: { cursor: 'pointer' }, children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-file-earmark-text fs-2 text-warning flex-shrink-0" }), _jsxs("div", { className: "ms-3", children: [_jsx("h6", { className: "card-title mb-1 text-muted", children: "Contratos Ativos" }), _jsx("h4", { className: "mb-0", children: isLoading ? _jsx("span", { className: "placeholder col-4" }) : fmt(kpis?.contratos_ativos) }), _jsx("small", { className: kpis?.contratos_vencendo_30d ? 'text-warning' : 'text-muted', children: kpis?.contratos_vencendo_30d ? (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-clock me-1" }), fmt(kpis.contratos_vencendo_30d), " vencendo em 30 dias"] })) : '' })] })] }) }) }) }), _jsx("div", { className: "col-lg-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-start border-info border-4 h-100", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-truck fs-2 text-info flex-shrink-0" }), _jsxs("div", { className: "ms-3", children: [_jsx("h6", { className: "card-title mb-1 text-muted", children: "Fornecedores" }), _jsx("h4", { className: "mb-0", children: isLoading ? _jsx("span", { className: "placeholder col-4" }) : fmt(kpis?.fornecedores_ativos) }), _jsx("small", { className: "text-muted", children: kpis ? `de ${fmt(kpis.fornecedores_total)} total` : '' })] })] }) }) }) }), kpis && kpis.contratos_vencendo_30d > 0 && (_jsx("div", { className: "col-12 mb-4", children: _jsxs("div", { className: "alert alert-warning d-flex align-items-center mb-0", children: [_jsx("i", { className: "bi bi-exclamation-triangle fs-4 me-3" }), _jsxs("div", { children: [_jsxs("strong", { children: [kpis.contratos_vencendo_30d, " contrato(s)"] }), " vencendo nos pr\u00F3ximos 30 dias.", _jsx("button", { className: "btn btn-link btn-sm p-0 ms-2", onClick: () => navigate('/comercial/contratos'), children: "Ver contratos" })] })] }) })), _jsx("div", { className: "col-lg-8 mb-4", children: _jsxs("div", { className: "card h-100", children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center", children: [_jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-truck me-2" }), "Fornecedores"] }), _jsxs("button", { className: "btn btn-sm btn-outline-primary", onClick: () => navigate('/comercial/fornecedores'), children: [_jsx("i", { className: "bi bi-arrow-right me-1" }), " Ver todos"] })] }), _jsx("div", { className: "card-body", children: fornecedoresLoading ? (_jsx("div", { className: "text-center py-3", children: _jsx("div", { className: "spinner-border spinner-border-sm", role: "status" }) })) : fornecedoresDashboard ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "row mb-3", children: [_jsx("div", { className: "col-4 text-center", children: _jsxs("div", { className: "border rounded p-2", children: [_jsx("h5", { className: "mb-0", children: fornecedoresDashboard.total_fornecedores }), _jsx("small", { className: "text-muted", children: "Total" })] }) }), _jsx("div", { className: "col-4 text-center", children: _jsxs("div", { className: "border rounded p-2 border-warning", children: [_jsx("h5", { className: "mb-0 text-warning", children: fornecedoresDashboard.documentos_vencendo_count }), _jsx("small", { className: "text-muted", children: "Docs Vencendo" })] }) }), _jsx("div", { className: "col-4 text-center", children: _jsxs("div", { className: "border rounded p-2 border-danger", children: [_jsx("h5", { className: "mb-0 text-danger", children: fornecedoresDashboard.documentos_vencidos_count }), _jsx("small", { className: "text-muted", children: "Docs Vencidos" })] }) })] }), _jsx("h6", { className: "text-muted mb-2", children: "Top Fornecedores (Gastos)" }), fornecedoresDashboard.top_fornecedores_gastos?.length ? (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm table-hover mb-0", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Fornecedor" }), _jsx("th", { className: "text-end", children: "Total Compras" })] }) }), _jsx("tbody", { children: fornecedoresDashboard.top_fornecedores_gastos.map((f) => (_jsxs("tr", { children: [_jsx("td", { children: f.nome }), _jsx("td", { className: "text-end fw-semibold", children: formatCurrency(Number(f.total_compras || 0)) })] }, f.id))) })] }) })) : (_jsx("p", { className: "text-muted mb-0", children: "Nenhum fornecedor encontrado." }))] })) : (_jsx("p", { className: "text-muted mb-0", children: "Sem dados de fornecedores." })) })] }) }), _jsx("div", { className: "col-lg-4 mb-4", children: _jsxs("div", { className: "card h-100", children: [_jsx("div", { className: "card-header", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-lightning me-2" }), "A\u00E7\u00F5es R\u00E1pidas"] }) }), _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-grid gap-2", children: [_jsxs("button", { className: "btn btn-outline-success btn-sm", onClick: () => navigate('/comercial/vendas'), children: [_jsx("i", { className: "bi bi-graph-up me-2" }), " Gerenciar Vendas"] }), _jsxs("button", { className: "btn btn-outline-success btn-sm", onClick: () => navigate('/comercial/compras'), children: [_jsx("i", { className: "bi bi-bag me-2" }), " Gerenciar Compras"] }), _jsxs("button", { className: "btn btn-outline-primary btn-sm", onClick: () => navigate('/comercial/contratos'), children: [_jsx("i", { className: "bi bi-file-earmark-text me-2" }), " Gerenciar Contratos"] }), _jsxs("button", { className: "btn btn-outline-info btn-sm", onClick: () => navigate('/comercial/clientes'), children: [_jsx("i", { className: "bi bi-people me-2" }), " Gerenciar Clientes"] }), _jsxs("button", { className: "btn btn-outline-warning btn-sm", onClick: () => navigate('/comercial/fornecedores'), children: [_jsx("i", { className: "bi bi-truck me-2" }), " Gerenciar Fornecedores"] })] }) })] }) }), fornecedoresDashboard && (_jsx("div", { className: "col-12 mb-4", children: _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: _jsx(React.Suspense, { fallback: _jsx("div", { className: "text-center py-3", children: _jsx("div", { className: "spinner-border spinner-border-sm", role: "status" }) }), children: _jsx(FornecedoresCharts, { topFornecedores: fornecedoresDashboard.top_fornecedores_gastos, documentosVencendo: fornecedoresDashboard.documentos_vencendo_count, documentosVencidos: fornecedoresDashboard.documentos_vencidos_count }) }) }) }) }))] }));
    const [showVendaModal, setShowVendaModal] = useState(false);
    const [showContratoTypeSelector, setShowContratoTypeSelector] = useState(false);
    const [showContratoCompra, setShowContratoCompra] = useState(false);
    const [showContratoVenda, setShowContratoVenda] = useState(false);
    const [showContratoFinanceiro, setShowContratoFinanceiro] = useState(false);
    const [showClienteModal, setShowClienteModal] = useState(false);
    const [viewingCliente, setViewingCliente] = useState(null);
    const [editingCliente, setEditingCliente] = useState(null);
    // State for delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [viewingContrato, setViewingContrato] = useState(null);
    const [editingContrato, setEditingContrato] = useState(null);
    const handleConfirmDelete = async () => {
        if (!deleteConfirm)
            return;
        setDeleteLoading(true);
        try {
            if (deleteConfirm.tipo === 'cliente')
                await ComercialService.deleteCliente(deleteConfirm.id);
            else if (deleteConfirm.tipo === 'venda')
                await ComercialService.deleteVendaCompra(deleteConfirm.id);
            else if (deleteConfirm.tipo === 'contrato')
                await ComercialService.deleteContrato(deleteConfirm.id);
            else if (deleteConfirm.tipo === 'contrato-compra')
                await ComercialService.deleteContratoCompra(deleteConfirm.id);
            else if (deleteConfirm.tipo === 'contrato-venda')
                await ComercialService.deleteContratoVenda(deleteConfirm.id);
            else if (deleteConfirm.tipo === 'contrato-financeiro')
                await ComercialService.deleteContratoFinanceiro(deleteConfirm.id);
            setDeleteConfirm(null);
            // Refresh queries
            window.location.reload();
        }
        catch (err) {
            console.error('Erro ao deletar:', err);
        }
        finally {
            setDeleteLoading(false);
        }
    };
    const handleOpenVendaModal = () => {
        setShowVendaModal(true);
        setTimeout(() => {
            const modal = document.querySelector('.modal.show.d-block');
            if (!modal) {
                console.warn('Modal não abriu, re-tentando abrir Nova Venda');
                setShowVendaModal(true);
            }
        }, 400);
    };
    const renderVendas = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center", children: [_jsx("h5", { className: "mb-0", children: "Vendas" }), _jsxs("button", { className: "btn btn-sm btn-primary", onClick: handleOpenVendaModal, children: [_jsx("i", { className: "bi bi-plus-circle me-1" }), " Nova Venda"] })] }), _jsx("div", { className: "card-body", children: vendasLoading ? (_jsx("div", { children: "Carregando vendas..." })) : vendas && vendas.length ? (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Cliente" }), _jsx("th", { children: "Produto" }), _jsx("th", { children: "Valor" }), _jsx("th", { children: "Data" }), _jsx("th", { children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: vendas.slice(0, 10).map((v) => (_jsxs("tr", { children: [_jsx("td", { children: v.cliente_nome || (v.cliente && v.cliente.nome) || '-' }), _jsx("td", { children: v.itens?.[0]?.descricao || v.produto || '-' }), _jsxs("td", { children: ["R$ ", Number(v.valor_total || v.valor || 0).toFixed(2)] }), _jsx("td", { children: v.data_venda || v.data || '-' }), _jsx("td", { children: _jsxs("div", { className: "btn-group btn-group-sm", children: [_jsx("button", { className: "btn btn-outline-info", title: "Visualizar", onClick: () => navigate(`/comercial/vendas/${v.id}`), children: _jsx("i", { className: "bi bi-eye" }) }), _jsx("button", { className: "btn btn-outline-warning", title: "Editar", onClick: () => navigate(`/comercial/vendas/${v.id}`), children: _jsx("i", { className: "bi bi-pencil" }) }), _jsx("button", { className: "btn btn-outline-danger", title: "Deletar", onClick: () => setDeleteConfirm({ id: v.id, tipo: 'venda', nome: v.cliente_nome || `Venda #${v.id}` }), children: _jsx("i", { className: "bi bi-trash" }) })] }) })] }, v.id))) })] }) })) : (_jsx("p", { className: "text-muted", children: "Nenhuma venda encontrada." })) })] }) }) }));
    const { data: contratos = [], isLoading: contratosLoading } = useQuery({ queryKey: ['contratos', 'dashboard'], queryFn: () => ComercialService.getContratos(), staleTime: 60_000 });
    const { data: contratosCompra = [] } = useQuery({ queryKey: ['contratos-compra'], queryFn: () => ComercialService.getContratosCompra(), staleTime: 60_000 });
    const { data: contratosVenda = [] } = useQuery({ queryKey: ['contratos-venda'], queryFn: () => ComercialService.getContratosVenda(), staleTime: 60_000 });
    const { data: contratosFinanceiro = [] } = useQuery({ queryKey: ['contratos-financeiro'], queryFn: () => ComercialService.getContratosFinanceiro(), staleTime: 60_000 });
    // Agrega todos os tipos de contrato (legacy + novos split models)
    const todosContratos = [
        ...contratos,
        ...contratosCompra.map((c) => ({ ...c, _tipo: 'Compra' })),
        ...contratosVenda.map((c) => ({ ...c, _tipo: 'Venda' })),
        ...contratosFinanceiro.map((c) => ({ ...c, _tipo: 'Financeiro' })),
    ];
    const contratosLoading2 = contratosLoading;
    const renderContratos = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center", children: [_jsx("h5", { className: "mb-0", children: "Contratos" }), _jsxs("button", { className: "btn btn-sm btn-primary", onClick: () => setShowContratoTypeSelector(true), children: [_jsx("i", { className: "bi bi-plus-circle me-1" }), " Novo Contrato"] })] }), _jsx("div", { className: "card-body", children: contratosLoading2 ? (_jsx("div", { children: "Carregando contratos..." })) : todosContratos && todosContratos.length ? (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Tipo" }), _jsx("th", { children: "T\u00EDtulo / N\u00FAmero" }), _jsx("th", { children: "Parte" }), _jsx("th", { children: "Valor" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: todosContratos.slice(0, 20).map((c, idx) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("span", { className: "badge bg-secondary", children: c._tipo || 'Legado' }) }), _jsx("td", { children: c.titulo || c.numero_contrato || '-' }), _jsx("td", { children: c.cliente_nome || c.fornecedor_nome || c.partes?.[0]?.entidade_nome || '-' }), _jsxs("td", { children: ["R$ ", Number(c.valor_total || 0).toFixed(2)] }), _jsx("td", { children: _jsx("span", { className: `badge bg-${c.status === 'ativo' || c.status === 'assinado' ? 'success' : c.status === 'rascunho' ? 'secondary' : 'warning'}`, children: c.status_display || c.status || '-' }) }), _jsx("td", { children: _jsxs("div", { className: "btn-group btn-group-sm", children: [_jsx("button", { className: "btn btn-outline-info", title: "Visualizar", onClick: () => {
                                                                    if (!c._tipo)
                                                                        navigate(`/comercial/contratos/${c.id}`);
                                                                    else
                                                                        setViewingContrato(c);
                                                                }, children: _jsx("i", { className: "bi bi-eye" }) }), _jsx("button", { className: "btn btn-outline-warning", title: "Editar", onClick: () => {
                                                                    if (!c._tipo)
                                                                        navigate(`/comercial/contratos/${c.id}`);
                                                                    else
                                                                        setEditingContrato(c);
                                                                }, children: _jsx("i", { className: "bi bi-pencil" }) }), _jsx("button", { className: "btn btn-outline-danger", title: "Deletar", onClick: () => {
                                                                    const tipoMap = { Compra: 'contrato-compra', Venda: 'contrato-venda', Financeiro: 'contrato-financeiro' };
                                                                    const tipo = c._tipo ? (tipoMap[c._tipo] || 'contrato') : 'contrato';
                                                                    setDeleteConfirm({ id: c.id, tipo, nome: c.titulo || c.numero_contrato || `Contrato #${c.id}` });
                                                                }, children: _jsx("i", { className: "bi bi-trash" }) })] }) })] }, `${c._tipo || 'legacy'}-${c.id}-${idx}`))) })] }) })) : (_jsx("p", { className: "text-muted", children: "Nenhum contrato encontrado." })) })] }) }) }));
    const { data: clientes = [], isLoading: clientesLoading } = useQuery({ queryKey: ['clientes', 'dashboard'], queryFn: () => ComercialService.getClientes(), staleTime: 60_000 });
    const renderClientes = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center", children: [_jsx("h5", { className: "mb-0", children: "Clientes" }), _jsxs("button", { className: "btn btn-sm btn-primary", onClick: () => setShowClienteModal(true), children: [_jsx("i", { className: "bi bi-plus-circle me-1" }), " Novo Cliente"] })] }), _jsx("div", { className: "card-body", children: clientesLoading ? (_jsx("div", { children: "Carregando clientes..." })) : clientes && clientes.length ? (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Nome" }), _jsx("th", { children: "Tipo" }), _jsx("th", { children: "CPF/CNPJ" }), _jsx("th", { children: "Cidade/UF" }), _jsx("th", { children: "Contato" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: clientes.slice(0, 10).map((c) => (_jsxs("tr", { children: [_jsx("td", { children: c.nome || '-' }), _jsx("td", { children: c.tipo_pessoa === 'pf' ? 'PF' : 'PJ' }), _jsx("td", { children: c.cpf_cnpj || '-' }), _jsx("td", { children: c.cidade && c.estado ? `${c.cidade}/${c.estado}` : (c.cidade || c.estado || '-') }), _jsx("td", { children: c.celular || c.telefone || c.email || '-' }), _jsx("td", { children: _jsx("span", { className: `badge bg-${c.status === 'ativo' ? 'success' : c.status === 'bloqueado' ? 'danger' : 'secondary'}`, children: c.status === 'ativo' ? 'Ativo' : c.status === 'bloqueado' ? 'Bloqueado' : 'Inativo' }) }), _jsx("td", { children: _jsxs("div", { className: "btn-group btn-group-sm", children: [_jsx("button", { className: "btn btn-outline-info", title: "Visualizar", onClick: () => setViewingCliente(c), children: _jsx("i", { className: "bi bi-eye" }) }), _jsx("button", { className: "btn btn-outline-warning", title: "Editar", onClick: () => setEditingCliente(c), children: _jsx("i", { className: "bi bi-pencil" }) }), _jsx("button", { className: "btn btn-outline-danger", title: "Deletar", onClick: () => setDeleteConfirm({ id: c.id, tipo: 'cliente', nome: c.nome || `Cliente #${c.id}` }), children: _jsx("i", { className: "bi bi-trash" }) })] }) })] }, c.id))) })] }) })) : (_jsx("p", { className: "text-muted", children: "Nenhum cliente encontrado." })) })] }) }) }));
    const renderFornecedores = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsx(FornecedoresList, {}) }) }));
    const renderCompras = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center", children: [_jsx("h5", { className: "mb-0", children: "Compras" }), _jsxs("button", { className: "btn btn-sm btn-primary", onClick: () => navigate('/comercial/compras/new'), children: [_jsx("i", { className: "bi bi-plus-circle me-1" }), " Nova Compra"] })] }), _jsx("div", { className: "card-body", children: comprasLoading ? (_jsx("div", { children: "Carregando compras..." })) : compras && compras.length ? (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover", "data-testid": "compras-list", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Fornecedor" }), _jsx("th", { children: "Descri\u00E7\u00E3o" }), _jsx("th", { children: "Valor" }), _jsx("th", { children: "Data" })] }) }), _jsx("tbody", { children: compras.slice(0, 10).map((c) => (_jsxs("tr", { children: [_jsx("td", { children: c.fornecedor_nome || (c.fornecedor && c.fornecedor.razao_social) || '-' }), _jsx("td", { children: c.itens?.[0]?.descricao || c.descricao || '-' }), _jsxs("td", { children: ["R$ ", Number(c.valor_total || c.valor || 0).toFixed(2)] }), _jsx("td", { children: c.data_compra || c.data || '-' })] }, c.id))) })] }) })) : (_jsx("p", { className: "text-muted", children: "Nenhuma compra encontrada." })) })] }) }) }));
    const renderRelatorios = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsx("h5", { className: "mb-0", children: "Relat\u00F3rios" }) }), _jsx("div", { className: "card-body", children: _jsx("p", { className: "text-muted", children: "M\u00F3dulo de relat\u00F3rios em desenvolvimento..." }) })] }) }) }));
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return renderDashboard();
            case 'vendas':
                return renderVendas();
            case 'compras':
                return renderCompras();
            case 'contratos':
                return renderContratos();
            case 'clientes':
                return renderClientes();
            case 'fornecedores':
                return renderFornecedores();
            case 'relatorios':
                return renderRelatorios();
            default:
                return renderDashboard();
        }
    };
    return (_jsxs(_Fragment, { children: [renderContent(), _jsx(ModalForm, { isOpen: showVendaModal, onClose: () => setShowVendaModal(false), title: "Nova Venda", size: "lg", children: _jsx(VendaCreate, { onSuccess: (data) => { setShowVendaModal(false); navigate(`/comercial/vendas/${data.id}`); }, onCancel: () => setShowVendaModal(false) }) }), _jsx(ContratoTypeSelector, { isOpen: showContratoTypeSelector, onClose: () => setShowContratoTypeSelector(false), onSelectCompra: () => {
                    setShowContratoTypeSelector(false);
                    setShowContratoCompra(true);
                }, onSelectVenda: () => {
                    setShowContratoTypeSelector(false);
                    setShowContratoVenda(true);
                }, onSelectFinanceiro: () => {
                    setShowContratoTypeSelector(false);
                    setShowContratoFinanceiro(true);
                } }), _jsx(ContratoCompraForm, { isOpen: showContratoCompra || editingContrato?._tipo === 'Compra', onClose: () => { setShowContratoCompra(false); setEditingContrato(null); }, initialData: editingContrato?._tipo === 'Compra' ? editingContrato : undefined, onSubmit: async (data) => {
                    try {
                        if (editingContrato?._tipo === 'Compra') {
                            await ComercialService.updateContratoCompra(editingContrato.id, data);
                            setEditingContrato(null);
                        }
                        else {
                            await ComercialService.createContratoCompra(data);
                        }
                        setShowContratoCompra(false);
                    }
                    catch (err) {
                        console.error('Erro ao salvar contrato de compra:', err);
                    }
                } }), _jsx(ContratoVendaForm, { isOpen: showContratoVenda || editingContrato?._tipo === 'Venda', onClose: () => { setShowContratoVenda(false); setEditingContrato(null); }, initialData: editingContrato?._tipo === 'Venda' ? editingContrato : undefined, onSubmit: async (data) => {
                    try {
                        if (editingContrato?._tipo === 'Venda') {
                            await ComercialService.updateContratoVenda(editingContrato.id, data);
                            setEditingContrato(null);
                        }
                        else {
                            await ComercialService.createContratoVenda(data);
                        }
                        setShowContratoVenda(false);
                    }
                    catch (err) {
                        console.error('Erro ao salvar contrato de venda:', err);
                    }
                } }), _jsx(ContratoFinanceiroForm, { isOpen: showContratoFinanceiro || editingContrato?._tipo === 'Financeiro', onClose: () => { setShowContratoFinanceiro(false); setEditingContrato(null); }, initialData: editingContrato?._tipo === 'Financeiro' ? editingContrato : undefined, onSubmit: async (data) => {
                    try {
                        if (editingContrato?._tipo === 'Financeiro') {
                            await ComercialService.updateContratoFinanceiro(editingContrato.id, data);
                            setEditingContrato(null);
                        }
                        else {
                            await ComercialService.createContratoFinanceiro(data);
                        }
                        setShowContratoFinanceiro(false);
                    }
                    catch (err) {
                        console.error('Erro ao salvar contrato financeiro:', err);
                    }
                } }), _jsx(ModalForm, { isOpen: showClienteModal, onClose: () => setShowClienteModal(false), title: "Novo Cliente", size: "xl", children: _jsx(ClienteCreate, { onSuccess: (data) => { setShowClienteModal(false); }, onCancel: () => setShowClienteModal(false) }) }), _jsx(ModalForm, { isOpen: !!editingCliente, onClose: () => setEditingCliente(null), title: "Editar Cliente", size: "xl", children: _jsx(ClienteCreate, { initialData: editingCliente, onSuccess: () => { setEditingCliente(null); }, onCancel: () => setEditingCliente(null) }) }), viewingCliente && (_jsx("div", { className: "modal d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, tabIndex: -1, children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-lg", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("i", { className: "bi bi-person-circle me-2" }), viewingCliente.nome || `Cliente #${viewingCliente.id}`] }), _jsx("button", { type: "button", className: "btn-close", onClick: () => setViewingCliente(null) })] }), _jsx("div", { className: "modal-body", children: _jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Tipo:" }), " ", viewingCliente.tipo_pessoa === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "CPF/CNPJ:" }), " ", viewingCliente.cpf_cnpj || '-'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Status:" }), " ", _jsx("span", { className: `badge bg-${viewingCliente.status === 'ativo' ? 'success' : viewingCliente.status === 'bloqueado' ? 'danger' : 'secondary'}`, children: viewingCliente.status || '-' })] }), viewingCliente.email && _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "E-mail:" }), " ", viewingCliente.email] }), viewingCliente.telefone && _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Telefone:" }), " ", viewingCliente.telefone] }), viewingCliente.celular && _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Celular:" }), " ", viewingCliente.celular] }), viewingCliente.cidade && _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Cidade/UF:" }), " ", viewingCliente.cidade, viewingCliente.estado ? `/${viewingCliente.estado}` : ''] }), viewingCliente.endereco && _jsxs("div", { className: "col-12", children: [_jsx("strong", { children: "Endere\u00E7o:" }), " ", viewingCliente.endereco, viewingCliente.numero ? `, ${viewingCliente.numero}` : '', viewingCliente.bairro ? ` - ${viewingCliente.bairro}` : ''] }), viewingCliente.observacoes && _jsxs("div", { className: "col-12", children: [_jsx("strong", { children: "Observa\u00E7\u00F5es:" }), " ", viewingCliente.observacoes] })] }) }), _jsxs("div", { className: "modal-footer", children: [_jsxs("button", { className: "btn btn-outline-warning", onClick: () => { setEditingCliente(viewingCliente); setViewingCliente(null); }, children: [_jsx("i", { className: "bi bi-pencil me-1" }), "Editar"] }), _jsx("button", { className: "btn btn-secondary", onClick: () => setViewingCliente(null), children: "Fechar" })] })] }) }) })), viewingContrato && (_jsx("div", { className: "modal d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, tabIndex: -1, children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-lg", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("span", { className: "badge bg-secondary me-2", children: viewingContrato._tipo }), viewingContrato.titulo || viewingContrato.numero_contrato || `Contrato #${viewingContrato.id}`] }), _jsx("button", { type: "button", className: "btn-close", onClick: () => setViewingContrato(null) })] }), _jsx("div", { className: "modal-body", children: _jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "N\u00FAmero:" }), " ", viewingContrato.numero_contrato || '-'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Tipo:" }), " ", viewingContrato._tipo || 'Legado'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Status:" }), " ", _jsx("span", { className: `badge bg-${viewingContrato.status === 'ativo' || viewingContrato.status === 'assinado' ? 'success' : viewingContrato.status === 'rascunho' ? 'secondary' : 'warning'}`, children: viewingContrato.status_display || viewingContrato.status || '-' })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Valor Total:" }), " R$ ", Number(viewingContrato.valor_total || 0).toFixed(2)] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Data In\u00EDcio:" }), " ", viewingContrato.data_inicio || viewingContrato.data_contratacao || '-'] }), _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Data Fim:" }), " ", viewingContrato.data_fim || viewingContrato.data_vigencia || '-'] }), (viewingContrato.cliente_nome || viewingContrato.fornecedor_nome) && (_jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Parte:" }), " ", viewingContrato.cliente_nome || viewingContrato.fornecedor_nome] })), viewingContrato.produto && _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Produto/Cultura:" }), " ", viewingContrato.produto || viewingContrato.cultura || '-'] }), viewingContrato.quantidade && _jsxs("div", { className: "col-md-6", children: [_jsx("strong", { children: "Quantidade:" }), " ", viewingContrato.quantidade, " ", viewingContrato.unidade_medida || ''] }), viewingContrato.observacoes && _jsxs("div", { className: "col-12", children: [_jsx("strong", { children: "Observa\u00E7\u00F5es:" }), " ", viewingContrato.observacoes] })] }) }), _jsx("div", { className: "modal-footer", children: _jsx("button", { className: "btn btn-secondary", onClick: () => setViewingContrato(null), children: "Fechar" }) })] }) }) })), deleteConfirm && (_jsx("div", { className: "modal d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, tabIndex: -1, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title text-danger", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), "Confirmar exclus\u00E3o"] }), _jsx("button", { type: "button", className: "btn-close", onClick: () => setDeleteConfirm(null), disabled: deleteLoading })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("p", { children: ["Tem certeza que deseja excluir ", _jsx("strong", { children: deleteConfirm.nome }), "?"] }), _jsx("p", { className: "text-muted small mb-0", children: "Esta a\u00E7\u00E3o n\u00E3o pode ser desfeita." })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setDeleteConfirm(null), disabled: deleteLoading, children: "Cancelar" }), _jsxs("button", { className: "btn btn-danger", onClick: handleConfirmDelete, disabled: deleteLoading, children: [deleteLoading ? _jsx("span", { className: "spinner-border spinner-border-sm me-1" }) : _jsx("i", { className: "bi bi-trash me-1" }), "Deletar"] })] })] }) }) }))] }));
};
export default Comercial;
