import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import contratosService from '../../services/contratos';
import type { VendaContrato, ParcelaContrato } from '../../types/estoque_maquinas';

const ContratoDetalhes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contrato, setContrato] = useState<VendaContrato | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      carregarContrato(parseInt(id));
    }
  }, [id]);

  const carregarContrato = async (contratoId: number) => {
    setLoading(true);
    setError(null);

    try {
      const data = await contratosService.buscar(contratoId);
      setContrato(data);
    } catch (err) {
      console.error('Erro ao carregar contrato:', err);
      setError('Erro ao carregar contrato');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!contrato || !confirm(`Deseja realmente cancelar o contrato ${contrato.numero_contrato}?`)) {
      return;
    }

    try {
      await contratosService.cancelar(contrato.id);
      alert('Contrato cancelado com sucesso!');
      navigate('/comercial/contratos');
    } catch (err: any) {
      console.error('Erro ao cancelar contrato:', err);
      alert(err.response?.data?.error || 'Erro ao cancelar contrato');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      RASCUNHO: 'bg-secondary',
      ATIVO: 'bg-success',
      ENCERRADO: 'bg-primary',
      CANCELADO: 'bg-danger',
      pendente: 'bg-warning',
      pago: 'bg-success',
      atrasado: 'bg-danger',
      cancelado: 'bg-secondary'
    };
    
    return `badge ${badges[status] || 'bg-secondary'}`;
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-3">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  if (error || !contrato) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error || 'Contrato não encontrado'}
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Cabeçalho */}
          <div className="card mb-3">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="card-title mb-0">
                    <i className="bi bi-file-earmark-text me-2"></i>
                    Contrato {contrato.numero_contrato}
                  </h3>
                  <span className={`${getStatusBadge(contrato.status)} mt-2`}>
                    {contrato.status}
                  </span>
                </div>
                <div className="btn-group">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/comercial/contratos')}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Voltar
                  </button>
                  {contrato.status === 'ATIVO' && (
                    <button
                      className="btn btn-outline-danger"
                      onClick={handleCancelar}
                    >
                      <i className="bi bi-x-circle me-2"></i>
                      Cancelar Contrato
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Informações do Contrato */}
          <div className="row">
            <div className="col-md-6 mb-3">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Informações Gerais</h5>
                </div>
                <div className="card-body">
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <th style={{ width: '40%' }}>Cliente:</th>
                        <td>{contrato.cliente_nome || `#${contrato.cliente}`}</td>
                      </tr>
                      <tr>
                        <th>Produto:</th>
                        <td>{contrato.produto_nome || `#${contrato.produto}`}</td>
                      </tr>
                      <tr>
                        <th>Tipo:</th>
                        <td>
                          <span className="badge bg-info">
                            {contrato.tipo}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <th>Data do Contrato:</th>
                        <td>{new Date(contrato.data_contrato).toLocaleDateString('pt-BR')}</td>
                      </tr>
                      {contrato.data_entrega_prevista && (
                        <tr>
                          <th>Entrega Prevista:</th>
                          <td>{new Date(contrato.data_entrega_prevista).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Valores e Quantidades</h5>
                </div>
                <div className="card-body">
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <th style={{ width: '40%' }}>Quantidade Total:</th>
                        <td>{contrato.quantidade_total.toLocaleString('pt-BR')}</td>
                      </tr>
                      <tr>
                        <th>Preço Unitário:</th>
                        <td>R$ {contrato.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <th>Valor Total:</th>
                        <td>
                          <strong className="text-success">
                            R$ {contrato.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <th>Parcelas:</th>
                        <td>{contrato.numero_parcelas}x ({contrato.periodicidade_parcelas})</td>
                      </tr>
                      <tr>
                        <th>Valor da Parcela:</th>
                        <td>
                          R$ {(contrato.valor_total / contrato.numero_parcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          {contrato.observacoes && (
            <div className="card mb-3">
              <div className="card-header">
                <h5 className="card-title mb-0">Observações</h5>
              </div>
              <div className="card-body">
                <p className="mb-0">{contrato.observacoes}</p>
              </div>
            </div>
          )}

          {/* Parcelas */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-calendar-check me-2"></i>
                Parcelas ({contrato.parcelas?.length || 0})
              </h5>
            </div>
            <div className="card-body">
              {contrato.parcelas && contrato.parcelas.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th className="text-center">Parcela</th>
                        <th>Data de Vencimento</th>
                        <th className="text-end">Valor</th>
                        <th>Vencimento (Financeiro)</th>
                        <th className="text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contrato.parcelas.map((parcela: ParcelaContrato) => (
                        <tr key={parcela.id}>
                          <td className="text-center">
                            <strong>{parcela.numero_parcela}/{contrato.numero_parcelas}</strong>
                          </td>
                          <td>
                            {new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="text-end">
                            R$ {parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            {parcela.vencimento_titulo || '-'}
                          </td>
                          <td className="text-center">
                            {parcela.vencimento_status ? (
                              <span className={getStatusBadge(parcela.vencimento_status)}>
                                {parcela.vencimento_status}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="alert alert-info mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Nenhuma parcela encontrada
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContratoDetalhes;
