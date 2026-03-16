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
import type { ComercialKpis } from '@/services/dashboard';
import { formatCurrency } from '@/utils/formatters';

const FornecedoresCharts = lazy(() => import('@/components/FornecedoresCharts'));


const Comercial: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.split('/')[2] || 'dashboard';

  const { data: dash, isLoading } = useQuery<ComercialKpis>({
    queryKey: ['dashboard-comercial'],
    queryFn: () => DashboardService.getComercial(),
    staleTime: 30_000,
    enabled: activeTab === 'dashboard',
  });
  const kpis = dash?.kpis;

  const { data: vendas = [], isLoading: vendasLoading } = useQuery<any[]>({ queryKey: ['vendas', 'dashboard'], queryFn: () => ComercialService.getVendasCompras(), staleTime: 60_000 });

  const { data: compras = [], isLoading: comprasLoading } = useQuery<any[]>({ queryKey: ['compras'], queryFn: () => ComercialService.getCompras(), staleTime: 60_000, enabled: activeTab === 'compras' });

  const { data: fornecedoresDashboard, isLoading: fornecedoresLoading } = useQuery<any>({
    queryKey: ['fornecedores', 'dashboard'],
    queryFn: () => ComercialService.getFornecedoresDashboard(),
    staleTime: 60_000,
    retry: false,
  });

  const fmt = (n: number | undefined) => n != null ? n.toLocaleString('pt-BR') : '—';

  const renderDashboard = () => (
    <div className="row">
      {/* KPI Cards — dados reais */}
      <div className="col-lg-3 col-md-6 mb-4">
        <div className="card border-start border-success border-4 h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="bi bi-graph-up fs-2 text-success flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Vendas do Mês</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-6"></span> : formatCurrency(kpis?.vendas_mes?.total ?? 0)}
                </h4>
                <small className="text-muted">{kpis ? `${fmt(kpis.vendas_mes?.count)} vendas realizadas` : ''}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6 mb-4">
        <div className="card border-start border-primary border-4 h-100">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="bi bi-cart-check fs-2 text-primary flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Compras do Mês</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-6"></span> : formatCurrency(kpis?.compras_mes?.total ?? 0)}
                </h4>
                <small className="text-muted">{kpis ? `${fmt(kpis.compras_mes?.count)} compras realizadas` : ''}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6 mb-4">
        <div className={`card border-start border-4 h-100 ${(kpis?.contratos_vencendo_30d ?? 0) > 0 ? 'border-warning' : 'border-success'}`} onClick={() => navigate('/comercial/contratos')} style={{ cursor: 'pointer' }}>
          <div className="card-body">
            <div className="d-flex align-items-center">
              <i className="bi bi-file-earmark-text fs-2 text-warning flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Contratos Ativos</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-4"></span> : fmt(kpis?.contratos_ativos)}
                </h4>
                <small className={kpis?.contratos_vencendo_30d ? 'text-warning' : 'text-muted'}>
                  {kpis?.contratos_vencendo_30d ? (
                    <><i className="bi bi-clock me-1"></i>{fmt(kpis.contratos_vencendo_30d)} vencendo em 30 dias</>
                  ) : ''}
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
              <i className="bi bi-truck fs-2 text-info flex-shrink-0"></i>
              <div className="ms-3">
                <h6 className="card-title mb-1 text-muted">Fornecedores</h6>
                <h4 className="mb-0">
                  {isLoading ? <span className="placeholder col-4"></span> : fmt(kpis?.fornecedores_ativos)}
                </h4>
                <small className="text-muted">{kpis ? `de ${fmt(kpis.fornecedores_total)} total` : ''}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de contratos vencendo */}
      {kpis && kpis.contratos_vencendo_30d > 0 && (
        <div className="col-12 mb-4">
          <div className="alert alert-warning d-flex align-items-center mb-0">
            <i className="bi bi-exclamation-triangle fs-4 me-3"></i>
            <div>
              <strong>{kpis.contratos_vencendo_30d} contrato(s)</strong> vencendo nos próximos 30 dias.
              <button className="btn btn-link btn-sm p-0 ms-2" onClick={() => navigate('/comercial/contratos')}>
                Ver contratos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fornecedores - dados reais existentes */}
      <div className="col-lg-8 mb-4">
        <div className="card h-100">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="bi bi-truck me-2"></i>Fornecedores</h5>
            <button className="btn btn-sm btn-outline-primary" onClick={() => navigate('/comercial/fornecedores')}>
              <i className="bi bi-arrow-right me-1"></i> Ver todos
            </button>
          </div>
          <div className="card-body">
            {fornecedoresLoading ? (
              <div className="text-center py-3"><div className="spinner-border spinner-border-sm" role="status"></div></div>
            ) : fornecedoresDashboard ? (
              <>
                <div className="row mb-3">
                  <div className="col-4 text-center">
                    <div className="border rounded p-2">
                      <h5 className="mb-0">{fornecedoresDashboard.total_fornecedores}</h5>
                      <small className="text-muted">Total</small>
                    </div>
                  </div>
                  <div className="col-4 text-center">
                    <div className="border rounded p-2 border-warning">
                      <h5 className="mb-0 text-warning">{fornecedoresDashboard.documentos_vencendo_count}</h5>
                      <small className="text-muted">Docs Vencendo</small>
                    </div>
                  </div>
                  <div className="col-4 text-center">
                    <div className="border rounded p-2 border-danger">
                      <h5 className="mb-0 text-danger">{fornecedoresDashboard.documentos_vencidos_count}</h5>
                      <small className="text-muted">Docs Vencidos</small>
                    </div>
                  </div>
                </div>
                <h6 className="text-muted mb-2">Top Fornecedores (Gastos)</h6>
                {fornecedoresDashboard.top_fornecedores_gastos?.length ? (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead>
                        <tr><th>Fornecedor</th><th className="text-end">Total Compras</th></tr>
                      </thead>
                      <tbody>
                        {fornecedoresDashboard.top_fornecedores_gastos.map((f: any) => (
                          <tr key={f.id}>
                            <td>{f.nome}</td>
                            <td className="text-end fw-semibold">{formatCurrency(Number(f.total_compras || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted mb-0">Nenhum fornecedor encontrado.</p>
                )}
              </>
            ) : (
              <p className="text-muted mb-0">Sem dados de fornecedores.</p>
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
              <button className="btn btn-outline-success btn-sm" onClick={() => navigate('/comercial/vendas')}>
                <i className="bi bi-graph-up me-2"></i> Gerenciar Vendas
              </button>
              <button className="btn btn-outline-success btn-sm" onClick={() => navigate('/comercial/compras')}>
                <i className="bi bi-bag me-2"></i> Gerenciar Compras
              </button>
              <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/comercial/contratos')}>
                <i className="bi bi-file-earmark-text me-2"></i> Gerenciar Contratos
              </button>
              <button className="btn btn-outline-info btn-sm" onClick={() => navigate('/comercial/clientes')}>
                <i className="bi bi-people me-2"></i> Gerenciar Clientes
              </button>
              <button className="btn btn-outline-warning btn-sm" onClick={() => navigate('/comercial/fornecedores')}>
                <i className="bi bi-truck me-2"></i> Gerenciar Fornecedores
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts for Fornecedores */}
      {fornecedoresDashboard && (
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-body">
              <React.Suspense fallback={<div className="text-center py-3"><div className="spinner-border spinner-border-sm" role="status"></div></div>}>
                <FornecedoresCharts
                  topFornecedores={fornecedoresDashboard.top_fornecedores_gastos}
                  documentosVencendo={fornecedoresDashboard.documentos_vencendo_count}
                  documentosVencidos={fornecedoresDashboard.documentos_vencidos_count}
                />
              </React.Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const [showVendaModal, setShowVendaModal] = useState(false);
  const [showContratoTypeSelector, setShowContratoTypeSelector] = useState(false);
  const [showContratoCompra, setShowContratoCompra] = useState(false);
  const [showContratoVenda, setShowContratoVenda] = useState(false);
  const [showContratoFinanceiro, setShowContratoFinanceiro] = useState(false);
  const [showClienteModal, setShowClienteModal] = useState(false);

  // State for delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; tipo: string; nome: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewingContrato, setViewingContrato] = useState<any | null>(null);
  const [editingContrato, setEditingContrato] = useState<any | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      if (deleteConfirm.tipo === 'cliente') await ComercialService.deleteCliente(deleteConfirm.id);
      else if (deleteConfirm.tipo === 'venda') await ComercialService.deleteVendaCompra(deleteConfirm.id);
      else if (deleteConfirm.tipo === 'contrato') await ComercialService.deleteContrato(deleteConfirm.id);
      else if (deleteConfirm.tipo === 'contrato-compra') await ComercialService.deleteContratoCompra(deleteConfirm.id);
      else if (deleteConfirm.tipo === 'contrato-venda') await ComercialService.deleteContratoVenda(deleteConfirm.id);
      else if (deleteConfirm.tipo === 'contrato-financeiro') await ComercialService.deleteContratoFinanceiro(deleteConfirm.id);
      setDeleteConfirm(null);
      // Refresh queries
      window.location.reload();
    } catch (err) {
      console.error('Erro ao deletar:', err);
    } finally {
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

  const renderVendas = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Vendas</h5>
            <button className="btn btn-sm btn-primary" onClick={handleOpenVendaModal}>
              <i className="bi bi-plus-circle me-1"></i> Nova Venda
            </button>
          </div>
          <div className="card-body">
            {vendasLoading ? (
              <div>Carregando vendas...</div>
            ) : vendas && vendas.length ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Produto</th>
                      <th>Valor</th>
                      <th>Data</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendas.slice(0, 10).map((v: any) => (
                      <tr key={v.id}>
                        <td>{v.cliente_nome || (v.cliente && v.cliente.nome) || '-'}</td>
                        <td>{v.itens?.[0]?.descricao || v.produto || '-'}</td>
                        <td>R$ {Number(v.valor_total || v.valor || 0).toFixed(2)}</td>
                        <td>{v.data_venda || v.data || '-'}</td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-info" title="Visualizar" onClick={() => navigate(`/comercial/vendas/${v.id}`)}>
                              <i className="bi bi-eye"></i>
                            </button>
                            <button className="btn btn-outline-warning" title="Editar" onClick={() => navigate(`/comercial/vendas/${v.id}`)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-outline-danger" title="Deletar" onClick={() => setDeleteConfirm({ id: v.id, tipo: 'venda', nome: v.cliente_nome || `Venda #${v.id}` })}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">Nenhuma venda encontrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const { data: contratos = [], isLoading: contratosLoading } = useQuery<any[]>({ queryKey: ['contratos', 'dashboard'], queryFn: () => ComercialService.getContratos(), staleTime: 60_000 });
  const { data: contratosCompra = [] } = useQuery<any[]>({ queryKey: ['contratos-compra'], queryFn: () => ComercialService.getContratosCompra(), staleTime: 60_000 });
  const { data: contratosVenda = [] } = useQuery<any[]>({ queryKey: ['contratos-venda'], queryFn: () => ComercialService.getContratosVenda(), staleTime: 60_000 });
  const { data: contratosFinanceiro = [] } = useQuery<any[]>({ queryKey: ['contratos-financeiro'], queryFn: () => ComercialService.getContratosFinanceiro(), staleTime: 60_000 });

  // Agrega todos os tipos de contrato (legacy + novos split models)
  const todosContratos = [
    ...contratos,
    ...contratosCompra.map((c: any) => ({ ...c, _tipo: 'Compra' })),
    ...contratosVenda.map((c: any) => ({ ...c, _tipo: 'Venda' })),
    ...contratosFinanceiro.map((c: any) => ({ ...c, _tipo: 'Financeiro' })),
  ];
  const contratosLoading2 = contratosLoading;

  const renderContratos = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Contratos</h5>
            <button className="btn btn-sm btn-primary" onClick={() => setShowContratoTypeSelector(true)}>
              <i className="bi bi-plus-circle me-1"></i> Novo Contrato
            </button>
          </div>
          <div className="card-body">
            {contratosLoading2 ? (
              <div>Carregando contratos...</div>
            ) : todosContratos && todosContratos.length ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Título / Número</th>
                      <th>Parte</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todosContratos.slice(0, 20).map((c: any, idx: number) => (
                      <tr key={`${c._tipo || 'legacy'}-${c.id}-${idx}`}>
                        <td><span className="badge bg-secondary">{c._tipo || 'Legado'}</span></td>
                        <td>{c.titulo || c.numero_contrato || '-'}</td>
                        <td>{c.cliente_nome || c.fornecedor_nome || c.partes?.[0]?.entidade_nome || '-'}</td>
                        <td>R$ {Number(c.valor_total || 0).toFixed(2)}</td>
                        <td><span className={`badge bg-${c.status === 'ativo' || c.status === 'assinado' ? 'success' : c.status === 'rascunho' ? 'secondary' : 'warning'}`}>{c.status_display || c.status || '-'}</span></td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-info" title="Visualizar" onClick={() => {
                              if (!c._tipo) navigate(`/comercial/contratos/${c.id}`);
                              else setViewingContrato(c);
                            }}>
                              <i className="bi bi-eye"></i>
                            </button>
                            <button className="btn btn-outline-warning" title="Editar" onClick={() => {
                              if (!c._tipo) navigate(`/comercial/contratos/${c.id}`);
                              else setEditingContrato(c);
                            }}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-outline-danger" title="Deletar" onClick={() => {
                              const tipoMap: Record<string, string> = { Compra: 'contrato-compra', Venda: 'contrato-venda', Financeiro: 'contrato-financeiro' };
                              const tipo = c._tipo ? (tipoMap[c._tipo] || 'contrato') : 'contrato';
                              setDeleteConfirm({ id: c.id, tipo, nome: c.titulo || c.numero_contrato || `Contrato #${c.id}` });
                            }}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">Nenhum contrato encontrado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const { data: clientes = [], isLoading: clientesLoading } = useQuery<any[]>({ queryKey: ['clientes', 'dashboard'], queryFn: () => ComercialService.getClientes(), staleTime: 60_000 });

  const renderClientes = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Clientes</h5>
            <button className="btn btn-sm btn-primary" onClick={() => setShowClienteModal(true)}>
              <i className="bi bi-plus-circle me-1"></i> Novo Cliente
            </button>
          </div>
          <div className="card-body">
            {clientesLoading ? (
              <div>Carregando clientes...</div>
            ) : clientes && clientes.length ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>CPF/CNPJ</th>
                      <th>Cidade/UF</th>
                      <th>Contato</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.slice(0, 10).map((c: any) => (
                      <tr key={c.id}>
                        <td>{c.nome || '-'}</td>
                        <td>{c.tipo_pessoa === 'pf' ? 'PF' : 'PJ'}</td>
                        <td>{c.cpf_cnpj || '-'}</td>
                        <td>{c.cidade && c.estado ? `${c.cidade}/${c.estado}` : (c.cidade || c.estado || '-')}</td>
                        <td>{c.celular || c.telefone || c.email || '-'}</td>
                        <td>
                          <span className={`badge bg-${c.status === 'ativo' ? 'success' : c.status === 'bloqueado' ? 'danger' : 'secondary'}`}>
                            {c.status === 'ativo' ? 'Ativo' : c.status === 'bloqueado' ? 'Bloqueado' : 'Inativo'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-info" title="Visualizar" onClick={() => navigate(`/comercial/clientes/${c.id}`)}>
                              <i className="bi bi-eye"></i>
                            </button>
                            <button className="btn btn-outline-warning" title="Editar" onClick={() => navigate(`/comercial/clientes/${c.id}/editar`)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-outline-danger" title="Deletar" onClick={() => setDeleteConfirm({ id: c.id, tipo: 'cliente', nome: c.nome || `Cliente #${c.id}` })}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">Nenhum cliente encontrado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderFornecedores = () => (
    <div className="row">
      <div className="col-12">
        <FornecedoresList />
      </div>
    </div>
  );

  const renderCompras = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Compras</h5>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/comercial/compras/new')}>
              <i className="bi bi-plus-circle me-1"></i> Nova Compra
            </button>
          </div>
          <div className="card-body">
            {comprasLoading ? (
              <div>Carregando compras...</div>
            ) : compras && compras.length ? (
              <div className="table-responsive">
                <table className="table table-hover" data-testid="compras-list">
                  <thead>
                    <tr>
                      <th>Fornecedor</th>
                      <th>Descrição</th>
                      <th>Valor</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compras.slice(0, 10).map((c: any) => (
                      <tr key={c.id}>
                        <td>{c.fornecedor_nome || (c.fornecedor && c.fornecedor.razao_social) || '-'}</td>
                        <td>{c.itens?.[0]?.descricao || c.descricao || '-'}</td>
                        <td>R$ {Number(c.valor_total || c.valor || 0).toFixed(2)}</td>
                        <td>{c.data_compra || c.data || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">Nenhuma compra encontrada.</p>
            )}
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
            <h5 className="mb-0">Relatórios</h5>
          </div>
          <div className="card-body">
            <p className="text-muted">Módulo de relatórios em desenvolvimento...</p>
          </div>
        </div>
      </div>
    </div>
  );

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

  return (
    <>
      {renderContent()}

      {/* Modals for create forms */}
      <ModalForm isOpen={showVendaModal} onClose={() => setShowVendaModal(false)} title="Nova Venda" size="lg">
        <VendaCreate onSuccess={(data: any) => { setShowVendaModal(false); navigate(`/comercial/vendas/${data.id}`); }} onCancel={() => setShowVendaModal(false)} />
      </ModalForm>

      <ContratoTypeSelector 
        isOpen={showContratoTypeSelector}
        onClose={() => setShowContratoTypeSelector(false)}
        onSelectCompra={() => {
          setShowContratoTypeSelector(false);
          setShowContratoCompra(true);
        }}
        onSelectVenda={() => {
          setShowContratoTypeSelector(false);
          setShowContratoVenda(true);
        }}
        onSelectFinanceiro={() => {
          setShowContratoTypeSelector(false);
          setShowContratoFinanceiro(true);
        }}
      />

      <ContratoCompraForm
        isOpen={showContratoCompra || editingContrato?._tipo === 'Compra'}
        onClose={() => { setShowContratoCompra(false); setEditingContrato(null); }}
        initialData={editingContrato?._tipo === 'Compra' ? editingContrato : undefined}
        onSubmit={async (data: any) => {
          try {
            if (editingContrato?._tipo === 'Compra') {
              await ComercialService.updateContratoCompra(editingContrato.id, data);
              setEditingContrato(null);
            } else {
              await ComercialService.createContratoCompra(data);
            }
            setShowContratoCompra(false);
          } catch (err) {
            console.error('Erro ao salvar contrato de compra:', err);
          }
        }}
      />

      <ContratoVendaForm
        isOpen={showContratoVenda || editingContrato?._tipo === 'Venda'}
        onClose={() => { setShowContratoVenda(false); setEditingContrato(null); }}
        initialData={editingContrato?._tipo === 'Venda' ? editingContrato : undefined}
        onSubmit={async (data: any) => {
          try {
            if (editingContrato?._tipo === 'Venda') {
              await ComercialService.updateContratoVenda(editingContrato.id, data);
              setEditingContrato(null);
            } else {
              await ComercialService.createContratoVenda(data);
            }
            setShowContratoVenda(false);
          } catch (err) {
            console.error('Erro ao salvar contrato de venda:', err);
          }
        }}
      />

      <ContratoFinanceiroForm
        isOpen={showContratoFinanceiro || editingContrato?._tipo === 'Financeiro'}
        onClose={() => { setShowContratoFinanceiro(false); setEditingContrato(null); }}
        initialData={editingContrato?._tipo === 'Financeiro' ? editingContrato : undefined}
        onSubmit={async (data: any) => {
          try {
            if (editingContrato?._tipo === 'Financeiro') {
              await ComercialService.updateContratoFinanceiro(editingContrato.id, data);
              setEditingContrato(null);
            } else {
              await ComercialService.createContratoFinanceiro(data);
            }
            setShowContratoFinanceiro(false);
          } catch (err) {
            console.error('Erro ao salvar contrato financeiro:', err);
          }
        }}
      />

      <ModalForm isOpen={showClienteModal} onClose={() => setShowClienteModal(false)} title="Novo Cliente">
        <ClienteCreate onSuccess={(data: any) => { setShowClienteModal(false); navigate(`/comercial/clientes/${data.id}`); }} onCancel={() => setShowClienteModal(false)} />
      </ModalForm>

      {/* Contrato split view modal */}
      {viewingContrato && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <span className="badge bg-secondary me-2">{viewingContrato._tipo}</span>
                  {viewingContrato.titulo || viewingContrato.numero_contrato || `Contrato #${viewingContrato.id}`}
                </h5>
                <button type="button" className="btn-close" onClick={() => setViewingContrato(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><strong>Número:</strong> {viewingContrato.numero_contrato || '-'}</div>
                  <div className="col-md-6"><strong>Tipo:</strong> {viewingContrato._tipo || 'Legado'}</div>
                  <div className="col-md-6"><strong>Status:</strong> <span className={`badge bg-${viewingContrato.status === 'ativo' || viewingContrato.status === 'assinado' ? 'success' : viewingContrato.status === 'rascunho' ? 'secondary' : 'warning'}`}>{viewingContrato.status_display || viewingContrato.status || '-'}</span></div>
                  <div className="col-md-6"><strong>Valor Total:</strong> R$ {Number(viewingContrato.valor_total || 0).toFixed(2)}</div>
                  <div className="col-md-6"><strong>Data Início:</strong> {viewingContrato.data_inicio || viewingContrato.data_contratacao || '-'}</div>
                  <div className="col-md-6"><strong>Data Fim:</strong> {viewingContrato.data_fim || viewingContrato.data_vigencia || '-'}</div>
                  {(viewingContrato.cliente_nome || viewingContrato.fornecedor_nome) && (
                    <div className="col-md-6"><strong>Parte:</strong> {viewingContrato.cliente_nome || viewingContrato.fornecedor_nome}</div>
                  )}
                  {viewingContrato.produto && <div className="col-md-6"><strong>Produto/Cultura:</strong> {viewingContrato.produto || viewingContrato.cultura || '-'}</div>}
                  {viewingContrato.quantidade && <div className="col-md-6"><strong>Quantidade:</strong> {viewingContrato.quantidade} {viewingContrato.unidade_medida || ''}</div>}
                  {viewingContrato.observacoes && <div className="col-12"><strong>Observações:</strong> {viewingContrato.observacoes}</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setViewingContrato(null)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger"><i className="bi bi-exclamation-triangle me-2"></i>Confirmar exclusão</h5>
                <button type="button" className="btn-close" onClick={() => setDeleteConfirm(null)} disabled={deleteLoading}></button>
              </div>
              <div className="modal-body">
                <p>Tem certeza que deseja excluir <strong>{deleteConfirm.nome}</strong>?</p>
                <p className="text-muted small mb-0">Esta ação não pode ser desfeita.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={deleteLoading}>Cancelar</button>
                <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={deleteLoading}>
                  {deleteLoading ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-trash me-1"></i>}
                  Deletar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Comercial;
