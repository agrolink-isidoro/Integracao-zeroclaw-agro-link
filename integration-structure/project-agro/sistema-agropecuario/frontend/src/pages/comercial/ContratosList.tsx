import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import contratosService from '../../services/contratos';
import type { VendaContrato, StatusContrato, TipoContrato } from '../../types/estoque_maquinas';

const ContratosList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contratos, setContratos] = useState<VendaContrato[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filtros, setFiltros] = useState({
    status: '',
    tipo: '',
    search: ''
  });

  // Paginação
  const [paginacao, setPaginacao] = useState({
    total: 0,
    paginaAtual: 1,
    totalPaginas: 1
  });

  useEffect(() => {
    carregarContratos();
  }, [filtros, paginacao.paginaAtual]);

  const carregarContratos = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = { page: paginacao.paginaAtual };
      
      if (filtros.status) params.status = filtros.status;
      if (filtros.tipo) params.tipo = filtros.tipo;
      if (filtros.search) params.search = filtros.search;

      const response = await contratosService.listar(params);
      
      setContratos(response.results);
      setPaginacao(prev => ({
        ...prev,
        total: response.count,
        totalPaginas: Math.ceil(response.count / 10)
      }));
    } catch (err) {
      console.error('Erro ao carregar contratos:', err);
      setError('Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async (contrato: VendaContrato) => {
    if (!confirm(`Deseja realmente cancelar o contrato ${contrato.numero_contrato}?`)) {
      return;
    }

    try {
      await contratosService.cancelar(contrato.id);
      alert('Contrato cancelado com sucesso!');
      carregarContratos();
    } catch (err: any) {
      console.error('Erro ao cancelar contrato:', err);
      alert(err.response?.data?.error || 'Erro ao cancelar contrato');
    }
  };

  const getStatusBadge = (status: StatusContrato) => {
    const badges = {
      RASCUNHO: 'bg-secondary',
      ATIVO: 'bg-success',
      ENCERRADO: 'bg-primary',
      CANCELADO: 'bg-danger'
    };
    
    return `badge ${badges[status] || 'bg-secondary'}`;
  };

  const getTipoLabel = (tipo: TipoContrato) => {
    const labels = {
      A_VISTA: 'À Vista',
      PARCELADO: 'Parcelado',
      ANTECIPADO: 'Antecipado',
      FUTURO: 'Futuro'
    };
    
    return labels[tipo] || tipo;
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h3 className="card-title">
                  <i className="bi bi-file-earmark-text me-2"></i>
                  Contratos de Venda
                </h3>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/comercial/contratos/novo')}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Novo Contrato
                </button>
              </div>
            </div>

            <div className="card-body">
              {/* Filtros */}
              <div className="row mb-3">
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar..."
                    value={filtros.search}
                    onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={filtros.status}
                    onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
                  >
                    <option value="">Todos os Status</option>
                    <option value="RASCUNHO">Rascunho</option>
                    <option value="ATIVO">Ativo</option>
                    <option value="ENCERRADO">Encerrado</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={filtros.tipo}
                    onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                  >
                    <option value="">Todos os Tipos</option>
                    <option value="A_VISTA">À Vista</option>
                    <option value="PARCELADO">Parcelado</option>
                    <option value="ANTECIPADO">Antecipado</option>
                    <option value="FUTURO">Futuro</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={() => setFiltros({ status: '', tipo: '', search: '' })}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Limpar Filtros
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                  <p className="mt-3">Carregando contratos...</p>
                </div>
              ) : contratos.length === 0 ? (
                <div className="alert alert-info text-center">
                  <i className="bi bi-info-circle me-2"></i>
                  Nenhum contrato encontrado
                </div>
              ) : (
                <>
                  {/* Tabela */}
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Nº Contrato</th>
                          <th>Cliente</th>
                          <th>Produto</th>
                          <th>Tipo</th>
                          <th>Status</th>
                          <th className="text-end">Valor Total</th>
                          <th className="text-center">Parcelas</th>
                          <th>Data</th>
                          <th className="text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contratos.map(contrato => (
                          <tr key={contrato.id}>
                            <td>
                              <strong>{contrato.numero_contrato}</strong>
                            </td>
                            <td>{contrato.cliente_nome || `Cliente #${contrato.cliente}`}</td>
                            <td>{contrato.produto_nome || `Produto #${contrato.produto}`}</td>
                            <td>
                              <span className="badge bg-info">
                                {getTipoLabel(contrato.tipo)}
                              </span>
                            </td>
                            <td>
                              <span className={getStatusBadge(contrato.status)}>
                                {contrato.status}
                              </span>
                            </td>
                            <td className="text-end">
                              R$ {contrato.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="text-center">
                              {contrato.numero_parcelas}x
                            </td>
                            <td>
                              {new Date(contrato.data_contrato).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="text-center">
                              <div className="btn-group btn-group-sm" role="group">
                                <button
                                  className="btn btn-outline-primary"
                                  onClick={() => navigate(`/comercial/contratos/${contrato.id}`)}
                                  title="Visualizar"
                                >
                                  <i className="bi bi-eye"></i>
                                </button>
                                {contrato.status === 'ATIVO' && (
                                  <button
                                    className="btn btn-outline-danger"
                                    onClick={() => handleCancelar(contrato)}
                                    title="Cancelar"
                                  >
                                    <i className="bi bi-x-circle"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação */}
                  {paginacao.totalPaginas > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div>
                        Mostrando {contratos.length} de {paginacao.total} contratos
                      </div>
                      <nav>
                        <ul className="pagination mb-0">
                          <li className={`page-item ${paginacao.paginaAtual === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPaginacao({ ...paginacao, paginaAtual: paginacao.paginaAtual - 1 })}
                            >
                              Anterior
                            </button>
                          </li>
                          {Array.from({ length: paginacao.totalPaginas }, (_, i) => i + 1).map(page => (
                            <li key={page} className={`page-item ${paginacao.paginaAtual === page ? 'active' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => setPaginacao({ ...paginacao, paginaAtual: page })}
                              >
                                {page}
                              </button>
                            </li>
                          ))}
                          <li className={`page-item ${paginacao.paginaAtual === paginacao.totalPaginas ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPaginacao({ ...paginacao, paginaAtual: paginacao.paginaAtual + 1 })}
                            >
                              Próxima
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContratosList;
