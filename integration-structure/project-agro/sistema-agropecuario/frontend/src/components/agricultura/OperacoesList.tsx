import React, { useState, useEffect } from 'react';
import operacoesService from '../../services/operacoes';
import type { Operacao } from '../../services/operacoes';

export const OperacoesList: React.FC = () => {
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarOperacoes();
  }, []);

  const carregarOperacoes = async () => {
    try {
      setLoading(true);
      const data = await operacoesService.listar();
      setOperacoes(data);
      setError(null);
    } catch (err: any) {
      setError('Erro ao carregar operações: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConcluir = async (id: number) => {
    if (!window.confirm('Confirma a conclusão desta operação? Essa ação consumirá reservas e finalizará a operação.')) return;
    try {
      await operacoesService.atualizar(id, { status: 'concluida' });
      await carregarOperacoes();
    } catch (err: any) {
      alert('Erro ao concluir operação: ' + err.message);
    }
  };

  const handleCancelar = async (id: number) => {
    if (!window.confirm('Deseja realmente cancelar esta operação?')) return;
    try {
      await operacoesService.atualizar(id, { status: 'cancelada' });
      await carregarOperacoes();
    } catch (err: any) {
      alert('Erro ao cancelar operação: ' + err.message);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'planejada':
        return 'bg-primary';
      case 'em_andamento':
        return 'bg-warning text-dark';
      case 'concluida':
        return 'bg-success';
      case 'cancelada':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-3" role="alert">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
        <button
          onClick={carregarOperacoes}
          className="btn btn-sm btn-outline-danger ms-3"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {operacoes.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-inbox display-1 text-muted"></i>
            <h5 className="mt-3">Nenhuma operação cadastrada</h5>
            <p className="text-muted">Comece criando uma nova operação agrícola.</p>
          </div>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Categoria / Tipo</th>
                  <th scope="col">Data</th>
                  <th scope="col">Área (ha)</th>
                  <th scope="col">Status</th>
                  <th scope="col">Custo Total</th>
                  <th scope="col" className="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {operacoes.map((operacao) => (
                  <tr key={operacao.id}>
                    <td className="fw-semibold">#{operacao.id}</td>
                    <td>
                      <div className="fw-medium">{operacao.categoria_display || operacao.categoria || '-'}</div>
                      <small className="text-muted">{operacao.tipo_display || operacao.tipo || '-'}</small>
                    </td>
                    <td>
                      {operacao.data_operacao ? new Date(operacao.data_operacao).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td>{operacao.area_total_ha ? operacao.area_total_ha.toFixed(2) : '0.00'} ha</td>
                    <td>
                      <span className={`badge ${getStatusBadgeColor(operacao.status)}`}>
                        {operacao.status}
                      </span>
                    </td>
                    <td className="fw-semibold">
                      R$ {(operacao.custo_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-end">
                      <button
                        onClick={() => window.location.href = `/agricultura/operacoes/${operacao.id}`}
                        className="btn btn-sm btn-outline-primary me-1"
                        title="Ver detalhes"
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Implementar modal de edição ou redirecionar
                          window.location.href = `/agricultura/operacoes/${operacao.id}/editar`;
                        }}
                        className="btn btn-sm btn-outline-secondary me-1"
                        title="Editar"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>

                      {(operacao.status !== 'concluida' && operacao.status !== 'cancelada') && (
                        <>
                          <button
                            onClick={() => handleConcluir(operacao.id)}
                            className="btn btn-sm btn-success me-1"
                            title="Concluir"
                          >
                            <i className="bi bi-check2-circle"></i>
                          </button>
                          <button
                            onClick={() => handleCancelar(operacao.id)}
                            className="btn btn-sm btn-outline-danger me-1"
                            title="Cancelar"
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </>
                      )}

                      <button
                        onClick={async () => {
                          if (window.confirm('Deseja realmente excluir esta operação?')) {
                            try {
                              await operacoesService.deletar(operacao.id);
                              carregarOperacoes();
                            } catch (err: any) {
                              alert('Erro ao excluir: ' + err.message);
                            }
                          }
                        }}
                        className="btn btn-sm btn-outline-danger"
                        title="Excluir"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperacoesList;
