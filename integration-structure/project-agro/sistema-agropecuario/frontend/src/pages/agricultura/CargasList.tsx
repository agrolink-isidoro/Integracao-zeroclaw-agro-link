import React, { useState, useEffect } from 'react';
import cargasService from '../../services/cargas';
import type { MovimentacaoCarga } from '../../types/estoque_maquinas';

const CargasList: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [cargas, setCargas] = useState<MovimentacaoCarga[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Modal de registro de chegada
  const [modalOpen, setModalOpen] = useState(false);
  const [cargaSelecionada, setCargaSelecionada] = useState<MovimentacaoCarga | null>(null);
  const [pesoBalanca, setPesoBalanca] = useState<string>('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarCargas();
  }, []);

  const carregarCargas = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await cargasService.listar();
      setCargas(response.results);
    } catch (err) {
      console.error('Erro ao carregar cargas:', err);
      setError('Erro ao carregar cargas');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalChegada = (carga: MovimentacaoCarga) => {
    setCargaSelecionada(carga);
    setPesoBalanca(carga.peso_bruto?.toString() || '');
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setCargaSelecionada(null);
    setPesoBalanca('');
  };

  const handleRegistrarChegada = async () => {
    if (!cargaSelecionada || !pesoBalanca) return;

    setSalvando(true);
    try {
      await cargasService.registrarChegada(cargaSelecionada.id, {
        peso_balanca: parseFloat(pesoBalanca)
      });
      
      alert('Chegada registrada com sucesso!');
      fecharModal();
      carregarCargas();
    } catch (err: any) {
      console.error('Erro ao registrar chegada:', err);
      alert(err.response?.data?.error || 'Erro ao registrar chegada');
    } finally {
      setSalvando(false);
    }
  };

  const getStatusBadge = (reconciled: boolean) => {
    return reconciled ? 'badge bg-success' : 'badge bg-warning';
  };

  const getStatusLabel = (reconciled: boolean) => {
    return reconciled ? 'Entregue' : 'Em Trânsito';
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-3">Carregando movimentações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="bi bi-truck me-2"></i>
                Movimentações de Carga
              </h3>
            </div>

            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {cargas.length === 0 ? (
                <div className="alert alert-info text-center">
                  <i className="bi bi-info-circle me-2"></i>
                  Nenhuma movimentação encontrada
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Placa</th>
                        <th>Motorista</th>
                        <th className="text-end">Peso Estimado (kg)</th>
                        <th className="text-end">Peso Balança (kg)</th>
                        <th className="text-end">Diferença (kg)</th>
                        <th>Destino</th>
                        <th className="text-center">Status</th>
                        <th className="text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargas.map(carga => {
                        const diferenca = carga.peso_bruto && carga.peso_liquido 
                          ? carga.peso_bruto - carga.peso_liquido 
                          : null;
                        
                        return (
                          <tr key={carga.id}>
                            <td>{carga.placa || '-'}</td>
                            <td>{carga.motorista || '-'}</td>
                            <td className="text-end">
                              {carga.peso_liquido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-'}
                            </td>
                            <td className="text-end">
                              {carga.peso_bruto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-'}
                            </td>
                            <td className="text-end">
                              {diferenca !== null ? (
                                <span className={diferenca > 0 ? 'text-success' : diferenca < 0 ? 'text-danger' : ''}>
                                  {diferenca > 0 ? '+' : ''}{diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              ) : '-'}
                            </td>
                            <td>{carga.local_destino_nome || carga.empresa_destino_nome || '-'}</td>
                            <td className="text-center">
                              <span className={getStatusBadge(carga.reconciled)}>
                                {getStatusLabel(carga.reconciled)}
                              </span>
                            </td>
                            <td className="text-center">
                              {!carga.reconciled && (
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => abrirModalChegada(carga)}
                                  title="Registrar Chegada"
                                >
                                  <i className="bi bi-check-circle me-1"></i>
                                  Registrar Chegada
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Registro de Chegada */}
      {modalOpen && cargaSelecionada && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-truck me-2"></i>
                  Registrar Chegada - {cargaSelecionada.placa}
                </h5>
                <button type="button" className="btn-close" onClick={fecharModal}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Peso Estimado (kg)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={cargaSelecionada.peso_liquido?.toLocaleString('pt-BR') || '-'}
                    disabled
                    style={{ backgroundColor: '#e9ecef' }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Peso da Balança (kg) *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={pesoBalanca}
                    onChange={(e) => setPesoBalanca(e.target.value)}
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                  />
                  <small className="text-muted">Informe o peso real medido na balança</small>
                </div>
                {pesoBalanca && cargaSelecionada.peso_liquido && (
                  <div className="alert alert-info">
                    <strong>Diferença:</strong>{' '}
                    {(parseFloat(pesoBalanca) - cargaSelecionada.peso_liquido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                    {' '}
                    ({((parseFloat(pesoBalanca) - cargaSelecionada.peso_liquido) / cargaSelecionada.peso_liquido * 100).toFixed(2)}%)
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={fecharModal}
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRegistrarChegada}
                  disabled={salvando || !pesoBalanca}
                >
                  {salvando ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Registrar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CargasList;
